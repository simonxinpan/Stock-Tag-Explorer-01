// 文件: /_scripts/update-chinese-stocks-data.mjs (或实际运行的文件)
// 版本: Final Robust Version
import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

// --- 配置区 ---
// 从环境变量读取，YML文件中注入
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const STOCK_LIST_FILE = './china_stocks.json'; // 硬编码，目标明确
const SCRIPT_NAME = "Chinese Stocks Update (Robust)";
const DEBUG = process.env.DEBUG === 'true';

// --- 辅助函数 ---
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- 健壮的API请求函数 ---
async function fetchQuote(ticker) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [${ticker}] API HTTP Error: ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    // 关键错误处理：在解析前检查是否为有效的JSON
    if (!text.startsWith('{')) {
      console.error(`❌ [${ticker}] Invalid API Response (not JSON). Received: ${text.substring(0, 100)}...`);
      return null;
    }

    const data = JSON.parse(text);
    // Finnhub对无效或无数据的ticker通常返回全0
    if (data.c === 0 && data.pc === 0) {
        console.warn(`⚠️ [${ticker}] Received zero data from API, likely an invalid or delisted ticker.`);
        return null;
    }
    return data;

  } catch (error) {
    // 这个catch会捕获JSON.parse错误和网络错误
    console.error(`❌ [${ticker}] Fetch or Parse Error:`, error.message);
    return null;
  }
}

// --- 主函数 ---
async function main() {
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} Job =====`);
  if (!DATABASE_URL || !FINNHUB_API_KEY) {
    console.error("❌ FATAL: Missing DATABASE_URL or FINNHUB_API_KEY environment variables.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  let client;

  try {
    client = await pool.connect();
    console.log(`✅ [DB] Connected to Chinese Stocks database.`);

    const tickers = JSON.parse(await fs.readFile(STOCK_LIST_FILE, 'utf-8'));
    console.log(`📋 Found ${tickers.length} stocks to update from ${STOCK_LIST_FILE}.`);
    
    let updatedCount = 0;
    let failedCount = 0;

    for (const ticker of tickers) {
      if (DEBUG) console.log(`🔄 Processing ${ticker}...`);
      
      const quote = await fetchQuote(ticker);

      // 只有在获取到有效数据时才尝试更新数据库
      if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
        const change_amount = quote.c - quote.pc;
        const change_percent = (change_amount / quote.pc) * 100;

        // 核心修正：使用与数据库表结构完全匹配的SQL语句
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
               if (DEBUG) console.log(`   -> ✅ Updated ${ticker} with price ${quote.c}`);
           } else {
               console.warn(`   -> ⚠️ No rows updated for ${ticker}. Check if it exists in the database.`);
           }
        } catch (dbError) {
           console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`);
           failedCount++;
        }
        
      } else {
        console.warn(`⏭️ Skipping ${ticker} due to invalid or missing API data.`);
        failedCount++;
      }

      // 在每个请求后增加延迟，以遵守Finnhub的速率限制
      await delay(1100); 
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