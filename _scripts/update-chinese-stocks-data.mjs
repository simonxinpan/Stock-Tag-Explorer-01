// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 9.0 - Polygon.io Rate Limit Compliant
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// 使用Node.js内置的fetch (Node 18+)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// --- 配置区 ---
const DATABASE_PATH = path.join(__dirname, '..', 'data', 'chinese_stocks.db');
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
  if (!FINNHUB_API_KEY || !POLYGON_API_KEY) {
    console.error("❌ FATAL: Missing FINNHUB_API_KEY or POLYGON_API_KEY env vars.");
    process.exit(1);
  }
  
  // 创建SQLite数据库连接
  const db = new sqlite3.Database(DATABASE_PATH, (err) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      process.exit(1);
    }
    console.log('✅ SQLite database connected successfully');
  });

  // 将数据库操作Promise化
  const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  };

  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    console.log(`✅ [DB] Connected to Chinese Stocks database.`);
    
    const tickers = await dbAll('SELECT ticker FROM chinese_stocks ORDER BY ticker;');
     const tickerList = tickers.map(r => r.ticker);
     console.log(`📋 Found ${tickerList.length} stocks to update.`);
    console.log(`🐢 Polygon.io Free Tier Compliance: Waiting ${DELAY_SECONDS}s between each stock.`);
    
    let updatedCount = 0;
    let failedCount = 0;

    for (const [index, ticker] of tickerList.entries()) {
      console.log(`[${index + 1}/${tickerList.length}] 🔄 Processing ${ticker}...`);

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
           UPDATE chinese_stocks SET 
             price = ?, change_percent = ?,
             market_cap = COALESCE(?, market_cap), 
             company_name = COALESCE(?, company_name),
             last_updated = datetime('now') 
           WHERE ticker = ?;
         `;
        const params = [
             quote.c, change_percent, 
             polygonResult?.market_cap, polygonResult?.name, ticker
         ];
        
        try {
          const result = await dbRun(sql, params);
          if (result.changes > 0) {
            updatedCount++;
            if (DEBUG) console.log(`   -> ✅ Updated ${ticker}`);
          } else {
            console.warn(`   -> ⚠️ No rows updated for ${ticker}`);
            failedCount++;
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
      if (index < tickerList.length - 1) {
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
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log("🚪 Database connection closed.");
      }
    });
  }
}
main();