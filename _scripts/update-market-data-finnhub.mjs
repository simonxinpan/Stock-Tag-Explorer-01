// 文件: /_scripts/update-sp500-data.mjs (或 update-market-data-finnhub.mjs) 
// 版本: Final Synchronized Version 
import pg from 'pg'; 
const { Pool } = pg; 
import fs from 'fs/promises'; 
import 'dotenv/config'; 
 
// --- 配置区 --- 
const DATABASE_URL = process.env.DATABASE_URL; 
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY; 
const STOCK_LIST_FILE = './sp500_stocks.json'; // 明确指向标普500列表 
const SCRIPT_NAME = "S&P 500 Robust Update"; 
const DEBUG = process.env.DEBUG === 'true'; 
const DELAY_SECONDS = 4; // 每只股票抓取间隔4秒 
 
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchQuote(ticker) { 
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`; 
  try { 
    const response = await fetch(url); 
    if (!response.ok) { 
      console.error(`❌ [${ticker}] API HTTP Error: ${response.status}`); 
      return null; 
    } 
    const text = await response.text(); 
    if (!text.startsWith('{')) { 
      console.error(`❌ [${ticker}] Invalid API Response (not JSON). Received: ${text.substring(0, 100)}...`); 
      return null; 
    } 
    const data = JSON.parse(text); 
    if (data.c === 0 && data.pc === 0) { 
      console.warn(`⚠️ [${ticker}] Received zero data from API, likely an invalid ticker.`); 
      return null; 
    } 
    return data; 
  } catch (error) { 
    console.error(`❌ [${ticker}] Fetch or Parse Error:`, error.message); 
    return null; 
  } 
}



// 连接重试函数
async function connectWithRetry(pool, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const client = await pool.connect();
            console.log(`✅ Database connected successfully`);
            return client;
        } catch (error) {
            console.warn(`⚠️ Connection attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
            if (i === maxRetries - 1) throw error;
            await delay(2000); // 等待2秒后重试
        }
    }
}

async function main() { 
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} Job =====`); 
  if (!DATABASE_URL || !FINNHUB_API_KEY) { 
    console.error("❌ FATAL: Missing DATABASE_URL or FINNHUB_API_KEY env vars."); 
    process.exit(1); 
  } 
 
  const pool = new Pool({ connectionString: DATABASE_URL }); 
  let client; 
  try { 
    client = await connectWithRetry(pool); 
    console.log(`✅ [DB] Connected to S&P 500 database.`); 
     
    // 关键修正：不再从数据库读取，而是从JSON文件读取列表 
     let tickers = JSON.parse(await fs.readFile(STOCK_LIST_FILE, 'utf-8')); 
     
     // 支持分批处理：检查是否设置了批次范围
     const batchStart = parseInt(process.env.BATCH_START) || 1;
     const batchEnd = parseInt(process.env.BATCH_END) || tickers.length;
     
     if (batchStart > 1 || batchEnd < tickers.length) {
         const originalLength = tickers.length;
         tickers = tickers.slice(batchStart - 1, batchEnd);
         console.log(`🎯 Batch Processing: Processing stocks ${batchStart}-${batchEnd} (${tickers.length} stocks) from total ${originalLength}`);
     }
     
     console.log(`📋 Found ${tickers.length} stocks to update from ${STOCK_LIST_FILE}.`);
      
     let updatedCount = 0; 
    let failedCount = 0; 
 
    for (const ticker of tickers) { 
      if (DEBUG) console.log(`🔄 Processing ${ticker}...`); 
       
      const quote = await fetchQuote(ticker); 
 
      if (quote && typeof quote.pc === 'number' && quote.pc > 0) { 
        const change_amount = quote.c - quote.pc; 
        const change_percent = (change_amount / quote.pc) * 100; 
 
        // 关键修正：使用与中概股脚本一致的、正确的SQL UPDATE语句 
        const sql = ` 
          UPDATE stocks SET  
            last_price = $1,  
            change_amount = $2, 
            change_percent = $3,  
            high_price = $4, 
            low_price = $5, 
            open_price = $6, 
            previous_close = $7, 
            last_updated = NOW()  
          WHERE ticker = $8; 
        `; 
        const params = [quote.c, change_amount, change_percent, quote.h, quote.l, quote.o, quote.pc, ticker]; 
         
        try { 
          const result = await client.query(sql, params); 
          if (result.rowCount > 0) { 
            updatedCount++; 
            if (DEBUG) console.log(`   -> ✅ Updated ${ticker}`); 
          } else { 
            console.warn(`   -> ⚠️ No rows updated for ${ticker}. Check if it exists in DB.`); 
          } 
        } catch (dbError) { 
          console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`); 
          failedCount++; 
        } 
      } else { 
        console.warn(`⏭️ Skipping ${ticker} due to invalid or missing API data.`); 
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