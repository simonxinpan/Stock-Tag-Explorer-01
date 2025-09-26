// 文件: /_scripts/update-sp500-prices-batch.mjs
// 版本: Final DB-Driven Version
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BATCH_NUMBER = parseInt(process.env.BATCH_NUMBER, 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10);
const DELAY_SECONDS = 13;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  if (isNaN(BATCH_NUMBER)) process.exit(1);
  console.log(`🚀 Starting S&P 500 Price Update for Batch ${BATCH_NUMBER}`);
  
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  let client;
  try {
    client = await pool.connect();
    
    // ================================================================
    // == 关键变更：直接从数据库获取股票列表 ==
    // ================================================================
    console.log("📰 Reading ticker list directly from the database...");
    const tickerRes = await client.query('SELECT ticker FROM stocks ORDER BY ticker;');
    const allTickers = tickerRes.rows.map(r => r.ticker);
    
    const startIndex = (BATCH_NUMBER - 1) * BATCH_SIZE;
    const endIndex = BATCH_NUMBER * BATCH_SIZE;
    const batchTickers = allTickers.slice(startIndex, endIndex);

    console.log(`📈 Processing ${batchTickers.length} stocks for Batch ${BATCH_NUMBER} (from DB)...`);

    for (const ticker of batchTickers) {
      if (!ticker) continue;

      console.log(`  -> Fetching ${ticker}...`);
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
      if (!response.ok) {
        console.error(`  ❌ HTTP Error for ${ticker}: ${response.status}`);
        await delay(DELAY_SECONDS * 1000);
        continue;
      }
      
      const quote = await response.json();
      if (!quote || typeof quote.pc !== 'number' || quote.pc === 0) {
        console.warn(`  ⚠️ Invalid data for ${ticker} from Finnhub. Skipping.`);
        await delay(DELAY_SECONDS * 1000);
        continue;
      }
      
      // ... (这里是我们之前最健壮的SQL UPDATE逻辑)
      
      const result = await client.query(sql, params);
      if (result.rowCount > 0) {
        console.log(`  ✅ Updated ${ticker}.`);
      } else {
        // 这个警告理论上不应该再出现，因为我们是从数据库读取的
        console.error(`  ❌ CRITICAL: Failed to update ${ticker} in DB despite reading it from DB.`);
      }
      
      await delay(DELAY_SECONDS * 1000);
    }
    console.log(`🎉 Batch ${BATCH_NUMBER} finished.`);
  } catch (error) {
    console.error(`❌ Job Failed on Batch ${BATCH_NUMBER}:`, error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
  }
}
main();