// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 2.0 - Enhanced Data Fetching
import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const STOCK_LIST_FILE = './china_stocks.json';
const SCRIPT_NAME = "Chinese Stocks Enhanced Update";
const DEBUG = process.env.DEBUG === 'true';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- API请求函数 ---
async function fetchApiData(url, ticker, apiName) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [${ticker}] ${apiName} HTTP Error: ${response.status}`);
      return null;
    }
    const text = await response.text();
    if (!text || !text.startsWith('{')) {
      console.error(`❌ [${ticker}] ${apiName} Invalid Response. Received: ${text.substring(0, 100)}...`);
      return null;
    }
    const data = JSON.parse(text);
    if (Object.keys(data).length === 0) {
        console.warn(`⚠️ [${ticker}] ${apiName} returned empty object.`);
        return null;
    }
    return data;
  } catch (error) {
    console.error(`❌ [${ticker}] ${apiName} Fetch/Parse Error:`, error.message);
    return null;
  }
}

// --- 主函数 ---
async function main() {
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} Job =====`);
  if (!DATABASE_URL || !FINNHUB_API_KEY) {
    console.error("❌ FATAL: Missing DATABASE_URL or FINNHUB_API_KEY env vars.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  let client;
  try {
    client = await pool.connect();
    console.log(`✅ [DB] Connected to Chinese Stocks database.`);
    const tickers = JSON.parse(await fs.readFile(STOCK_LIST_FILE, 'utf-8'));
    console.log(`📋 Found ${tickers.length} stocks to update.`);
    
    let updatedCount = 0;
    let failedCount = 0;

    for (const ticker of tickers) {
      if (DEBUG) console.log(`🔄 Processing ${ticker}...`);

      // 并行获取两种API数据
      const quotePromise = fetchApiData(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Quote');
      const profilePromise = fetchApiData(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Profile');
      
      const [quote, profile] = await Promise.all([quotePromise, profilePromise]);

      if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
        const change_amount = quote.c - quote.pc;
        const change_percent = (change_amount / quote.pc) * 100;
        const volume = quote.v;
        const turnover = volume ? volume * quote.c : null;
        
        // 从profile中提取市值和logo，如果profile获取失败则为null
        const market_cap = profile ? profile.marketCapitalization : null;
        const logo = profile ? profile.logo : null;

        const sql = `
          UPDATE stocks SET 
            last_price = $1, change_amount = $2, change_percent = $3, 
            high_price = $4, low_price = $5, open_price = $6, 
            previous_close = $7, volume = $8, turnover = $9, 
            market_cap = COALESCE($10, market_cap), -- 如果新值为null，则保留旧值
            logo = COALESCE($11, logo),             -- 如果新值为null，则保留旧值
            last_updated = NOW() 
          WHERE ticker = $12;
        `;
        const params = [
            quote.c, change_amount, change_percent, 
            quote.h, quote.l, quote.o, quote.pc,
            volume, turnover, market_cap, logo,
            ticker
        ];
        
        try {
          const result = await client.query(sql, params);
          if (result.rowCount > 0) {
            updatedCount++;
            if (DEBUG) console.log(`   -> ✅ Updated ${ticker} with price ${quote.c} and market cap ${market_cap}`);
          } else {
            console.warn(`   -> ⚠️ No rows updated for ${ticker}.`);
          }
        } catch (dbError) {
          console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`);
          failedCount++;
        }
      } else {
        console.warn(`⏭️ Skipping ${ticker} due to invalid quote data.`);
        failedCount++;
      }

      await delay(1100); // 仍然保持1.1秒延迟，因为两个并行请求几乎同时发出
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