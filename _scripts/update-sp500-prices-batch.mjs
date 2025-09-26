// 文件: /_scripts/update-sp500-prices-batch.mjs
// 版本: Final Complete & Corrected
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BATCH_NUMBER = parseInt(process.env.BATCH_NUMBER, 10);
const BATCH_SIZE = 50;
const DELAY_SECONDS = 13;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  if (isNaN(BATCH_NUMBER)) process.exit(1);
  console.log(`🚀 Starting S&P 500 Price Update for Batch ${BATCH_NUMBER}`);
  
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  let client;
  try {
    client = await pool.connect();
    console.log("  [INFO] Connected to database");
    
    const tickerRes = await client.query('SELECT ticker FROM stocks ORDER BY ticker;');
    const allTickers = tickerRes.rows.map(r => r.ticker);
    
    const startIndex = (BATCH_NUMBER - 1) * BATCH_SIZE;
    const endIndex = BATCH_NUMBER * BATCH_SIZE;
    const batchTickers = allTickers.slice(startIndex, endIndex);

    console.log(`  [INFO] Processing ${batchTickers.length} stocks for Batch ${BATCH_NUMBER}...`);

    for (const [index, ticker] of batchTickers.entries()) {
      console.log(`    -> Fetching ${ticker}... (${index + 1}/${batchTickers.length})`);
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
      
      if (!response.ok) {
        console.error(`    ❌ HTTP Error for ${ticker}: ${response.status}`);
        await delay(DELAY_SECONDS * 1000);
        continue;
      }
      
      const quote = await response.json();
      if (!quote || typeof quote.pc !== 'number' || quote.pc === 0) {
        console.warn(`    ⚠️ Invalid data for ${ticker}. Skipping.`);
        await delay(DELAY_SECONDS * 1000);
        continue;
      }
      
      // ================================================================
      // == 关键的、被补全的SQL定义代码 ==
      // ================================================================
      const change_amount = quote.c - quote.pc;
      const change_percent = (change_amount / quote.pc) * 100;
      const sql = `
        UPDATE stocks SET 
          last_price = $1, change_amount = $2, change_percent = $3,
          high_price = $4, low_price = $5, open_price = $6,
          previous_close = $7, last_updated = NOW()
        WHERE ticker = $8;
      `;
      const params = [
          quote.c, change_amount, change_percent,
          quote.h, quote.l, quote.o, quote.pc,
          ticker
      ];
      // ================================================================
      
      const result = await client.query(sql, params);
      if (result.rowCount > 0) {
        console.log(`    ✅ Updated ${ticker}.`);
      } else {
        console.warn(`    ❌ Failed to update ${ticker} in DB (ticker not found?).`);
      }
      
      await delay(DELAY_SECONDS * 1000);
    }
    console.log(`🎉 Batch ${BATCH_NUMBER} finished successfully.`);
  } catch (error) {
    console.error(`❌ Job Failed on Batch ${BATCH_NUMBER}:`, error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
  }
}
main();