// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 14.0 - Simplified HKD-to-USD Conversion
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const SCRIPT_NAME = "Chinese Stocks Simplified Currency Update";
const DEBUG = process.env.DEBUG === 'true';
const DELAY_SECONDS = 2.1;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchApiData(url, ticker, apiName) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 429) { console.warn(`🔶 [${ticker}] ${apiName} Rate Limit Hit (429).`); }
        else { console.error(`❌ [${ticker}] ${apiName} HTTP Error: ${response.status}`); }
        return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ [${ticker}] ${apiName} Fetch/Parse Error:`, error.message);
    return null;
  }
}

// 精简版：只获取港元汇率
async function getHkdToUsdRate() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/HKD');
        const data = await response.json();
        if (data && data.rates && data.rates.USD) {
            return data.rates.USD;
        }
        throw new Error('Invalid rate API response');
    } catch (error) {
        console.error("❌ Failed to fetch HKD to USD exchange rate, using fallback.", error);
        return 0.128; // 提供稳定的备用汇率
    }
}

async function main() {
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} Job =====`);
  if (!DATABASE_URL || !FINNHUB_API_KEY) {
    console.error("❌ FATAL: Missing DATABASE_URL or FINNHUB_API_KEY env vars.");
    process.exit(1);
  }

  const hkdToUsdRate = await getHkdToUsdRate();
  console.log(`💲 Fetched HKD to USD exchange rate: ${hkdToUsdRate}`);

  const pool = new Pool({ connectionString: DATABASE_URL });
  let client;
  try {
    client = await pool.connect();
    console.log(`✅ [DB] Connected to Chinese Stocks database.`);
    
    const tickerRes = await client.query('SELECT ticker FROM stocks ORDER BY ticker;');
    const tickers = tickerRes.rows.map(r => r.ticker);
    console.log(`📋 Found ${tickers.length} stocks to update.`);
    
    let updatedCount = 0;
    let failedCount = 0;

    for (const [index, ticker] of tickers.entries()) {
      console.log(`[${index + 1}/${tickers.length}] 🔄 Processing ${ticker}...`);

      const quotePromise = fetchApiData(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Finnhub Quote');
      const profilePromise = fetchApiData(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Finnhub Profile');
      
      const [quote, profile] = await Promise.all([quotePromise, profilePromise]);

      if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
        let market_cap_usd = null;
        let market_cap_original = null;
        let currency = null;
        let exchange = null;
        
        if (profile && profile.marketCapitalization > 0) {
            market_cap_original = profile.marketCapitalization * 1000000;
            currency = profile.currency;
            exchange = profile.exchange;
            
            // 关键的、简化的转换逻辑
            if (currency === 'HKD') {
                market_cap_usd = market_cap_original * hkdToUsdRate;
                if (DEBUG) console.log(`   -> 🇭🇰 HKD detected for ${ticker}. Converted to ${market_cap_usd} USD.`);
            } else {
                // 如果不是HKD (无论是USD, CNY, 还是其他), 都直接视为美元
                market_cap_usd = market_cap_original;
            }
        }
        
        const change_amount = quote.c - quote.pc;
        const change_percent = (change_amount / quote.pc) * 100;
        
        const sql = `
          UPDATE stocks SET 
            last_price = $1, change_amount = $2, change_percent = $3,
            market_cap = $4,
            market_cap_original = $5,
            market_cap_currency = $6,
            exchange_name = $7,
            last_updated = NOW() 
          WHERE ticker = $8;
        `;
        const params = [
            quote.c, change_amount, change_percent, 
            market_cap_usd, market_cap_original, currency, exchange,
            ticker
        ];
        
        try {
          const result = await client.query(sql, params);
          if (result.rowCount > 0) updatedCount++;
        } catch (dbError) {
          console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`);
          failedCount++;
        }
      } else {
        console.warn(`⏭️ Skipping ${ticker} due to invalid Finnhub quote data.`);
        failedCount++;
      }
      
      await delay(DELAY_SECONDS * 1000);
    }
    
    console.log(`🎉 ===== Job Finished =====`);
    console.log(`   - Successfully updated: ${updatedCount} stocks`);
    console.log(`   - Failed or skipped: ${failedCount} stocks`);

  } catch (error) {
    console.error("❌ JOB FAILED WITH UNEXPECTED ERROR:", error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
    console.log("🚪 Database connection closed.");
  }
}

main();