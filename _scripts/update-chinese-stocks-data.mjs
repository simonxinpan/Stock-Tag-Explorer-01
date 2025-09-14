// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 9.0 - Polygon.io Rate Limit Compliant
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const SCRIPT_NAME = "Chinese Stocks Polygon-Compliant Update";
const DEBUG = process.env.DEBUG === 'true';
// 关键变更: 严格遵守Polygon每分钟5次的限制 (12秒/次)，我们设置为13秒以保证安全
const DELAY_SECONDS = 13; 

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
    console.log(`🐢 Polygon.io Free Tier Compliance: Waiting ${DELAY_SECONDS}s between each stock.`);
    
    let updatedCount = 0;
    let failedCount = 0;

    for (const [index, ticker] of tickers.entries()) {
      console.log(`[${index + 1}/${tickers.length}] 🔄 Processing ${ticker}...`);

      // 串行获取，确保每次循环的API消耗可控
      const quote = await fetchApiData(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Finnhub Quote');
      // 在两次API调用之间也增加一个小的延迟
      await delay(500); 
      const polygonDetails = await fetchApiData(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`, ticker, 'Polygon Details');
      const polygonResult = polygonDetails ? polygonDetails.results : null;

      if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
        const change_amount = quote.c - quote.pc;
        const change_percent = (change_amount / quote.pc) * 100;
        
        const market_cap = polygonResult ? polygonResult.market_cap : null;
        const name_en = polygonResult ? polygonResult.name : null;
        const logo_url = polygonResult?.branding?.logo_url ? `${polygonResult.branding.logo_url}?apiKey=${POLYGON_API_KEY}` : null;

        const sql = `
          UPDATE stocks SET 
            last_price = $1, change_amount = $2, change_percent = $3,
            market_cap = COALESCE($4, market_cap), 
            name_en = COALESCE($5, name_en),
            logo = COALESCE($6, logo),
            last_updated = NOW() 
          WHERE ticker = $7;
        `;
        const params = [
            quote.c, change_amount, change_percent, 
            market_cap, name_en, logo_url,
            ticker
        ];
        
        try {
          const result = await client.query(sql, params);
          if (result.rowCount > 0) {
            updatedCount++;
            if (DEBUG) console.log(`   -> ✅ Updated ${ticker}`);
          }
        } catch (dbError) {
          console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`);
          failedCount++;
        }
      } else {
        console.warn(`⏭️ Skipping ${ticker} due to invalid Finnhub quote data.`);
        failedCount++;
      }
      
      // 在处理完一只股票的所有API请求后，进行长延迟
      if (index < tickers.length - 1) {
        console.log(`   ... waiting ${DELAY_SECONDS}s`);
        await delay(DELAY_SECONDS * 1000);
      }
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