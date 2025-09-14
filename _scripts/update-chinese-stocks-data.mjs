// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 11.0 - Finnhub with Currency Conversion
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const SCRIPT_NAME = "Chinese Stocks Finnhub-Powered Update (with Currency Conversion)";
const DEBUG = process.env.DEBUG === 'true';
const DELAY_SECONDS = 2.1;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchApiData(url, ticker, apiName) {
  // ... (此函数无需修改)
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

// 新增：获取汇率函数
async function getHkdToUsdRate() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/HKD');
        const data = await response.json();
        return data.rates.USD;
    } catch (error) {
        console.error("❌ Failed to fetch HKD to USD exchange rate, using fallback.", error);
        return 0.128; // 提供一个备用汇率
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
      const profilePromise = fetchApiData(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Profile');
      
      const [quote, profile] = await Promise.all([quotePromise, profilePromise]);

      if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
        let market_cap_usd = null;
        
        // 关键变更：检查货币并进行条件转换
        if (profile && profile.marketCapitalization > 0) {
            let market_cap_base = profile.marketCapitalization * 1000000; // 先转换为基础单位
            
            if (profile.currency === 'HKD') {
                market_cap_usd = market_cap_base * hkdToUsdRate;
                if (DEBUG) console.log(`   -> 🇭🇰 HKD detected for ${ticker}. Converted market cap to USD: ${market_cap_usd}`);
            } else {
                // 默认为美元
                market_cap_usd = market_cap_base;
            }
        }
        
        const change_amount = quote.c - quote.pc;
        const change_percent = (change_amount / quote.pc) * 100;
        
        const sql = `
          UPDATE stocks SET 
            last_price = $1, change_amount = $2, change_percent = $3,
            market_cap = COALESCE($4, market_cap),
            last_updated = NOW() 
          WHERE ticker = $5;
        `;
        const params = [
            quote.c, change_amount, change_percent, 
            market_cap_usd,
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