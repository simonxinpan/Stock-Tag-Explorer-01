// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 7.0 - Upgraded to Polygon.io for Authoritative Data
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY; // 新增
const SCRIPT_NAME = "Chinese Stocks Polygon-Powered Update";
const DEBUG = process.env.DEBUG === 'true';
const DELAY_SECONDS = 2.1;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- API请求函数 (保持不变) ---
async function fetchApiData(url, ticker, apiName, headers = {}) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(`❌ [${ticker}] ${apiName} HTTP Error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (!data) return null;
    return data;
  } catch (error) {
    console.error(`❌ [${ticker}] ${apiName} Fetch/Parse Error:`, error.message);
    return null;
  }
}

async function main() {
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} Job =====`);
  if (!DATABASE_URL || !FINNHUB_API_KEY || !POLYGON_API_KEY) {
    console.error("❌ FATAL: Missing DATABASE_URL, FINNHUB_API_KEY, or POLYGON_API_KEY env vars.");
    process.exit(1);
  }
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

    for (const ticker of tickers) {
      if (DEBUG) console.log(`🔄 Processing ${ticker}...`);

      // 并行获取Finnhub报价和Polygon详情
      const quotePromise = fetchApiData(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Finnhub Quote');
      const polygonPromise = fetchApiData(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`, ticker, 'Polygon Details');
      
      const [quote, polygonDetails] = await Promise.all([quotePromise, polygonPromise]);
      const polygonResult = polygonDetails ? polygonDetails.results : null;

      if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
        const change_amount = quote.c - quote.pc;
        const change_percent = (change_amount / quote.pc) * 100;
        
        // 关键变更: 优先从Polygon获取核心数据
        const market_cap = polygonResult ? polygonResult.market_cap : null;
        const name_en = polygonResult ? polygonResult.name : null;
        // Polygon的logo需要拼接
        const logo_url = polygonResult && polygonResult.branding && polygonResult.branding.logo_url 
                         ? `${polygonResult.branding.logo_url}?apiKey=${POLYGON_API_KEY}` 
                         : null;

        const sql = `
          UPDATE stocks SET 
            last_price = $1, change_amount = $2, change_percent = $3,
            high_price = $4, low_price = $5, open_price = $6, previous_close = $7,
            market_cap = COALESCE($8, market_cap), 
            name_en = COALESCE($9, name_en),
            logo = COALESCE($10, logo),
            last_updated = NOW() 
          WHERE ticker = $11;
        `;
        const params = [
            quote.c, change_amount, change_percent, 
            quote.h, quote.l, quote.o, quote.pc,
            market_cap, name_en, logo_url,
            ticker
        ];
        
        try {
          const result = await client.query(sql, params);
          if (result.rowCount > 0) {
            updatedCount++;
            if (DEBUG) console.log(`   -> ✅ Updated ${ticker} using Polygon data.`);
          } else {
            console.warn(`   -> ⚠️ No rows updated for ${ticker}.`);
          }
        } catch (dbError) {
          console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`);
          failedCount++;
        }
      } else {
        console.warn(`⏭️ Skipping ${ticker} due to invalid or missing Finnhub quote data.`);
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