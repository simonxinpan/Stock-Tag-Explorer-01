// 文件: /_scripts/update-sp500-prices-by-time.mjs
// 版本: Final Intelligent Batch Calculator
import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

// --- 从环境变量读取配置 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10);
const TOTAL_STOCKS = parseInt(process.env.TOTAL_STOCKS, 10);
const TOTAL_BATCHES = Math.ceil(TOTAL_STOCKS / BATCH_SIZE);
const RUN_INTERVAL_MINUTES = 15;
const API_DELAY_MS = 1300; // 每个API请求之间的延迟（毫秒）

// --- 辅助函数 ---
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 智能计算当前应运行的批次号
 * @returns {number | null} - 返回批次号 (1-11)，如果不在运行时间则返回null
 */
function getCurrentBatchNumber() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    
    // 简化版夏令时判断 (4月到10月视为夏令时)
    const month = now.getUTCMonth(); // 0-11
    const isDST = month >= 3 && month <= 9;
    
    const marketOpenUTCHour = isDST ? 13 : 14;
    const marketCloseUTCHour = isDST ? 20 : 21;

    // 检查是否在交易时段内 (我们放宽到闭市后一小时，以确保所有批次都能运行)
    if (utcHour < marketOpenUTCHour || utcHour > marketCloseUTCHour + 1) {
        console.log(`Current UTC hour ${utcHour} is outside of trading hours (${marketOpenUTCHour}-${marketCloseUTCHour+1}). Exiting.`);
        return null;
    }

    const minutesSinceMarketOpen = (utcHour - marketOpenUTCHour) * 60 + utcMinute;
    const batchIndex = Math.floor(minutesSinceMarketOpen / RUN_INTERVAL_MINUTES);
    
    // 确保批次号在 1 到 TOTAL_BATCHES 之间循环
    const batchNumber = (batchIndex % TOTAL_BATCHES) + 1;
    return batchNumber;
}

// --- 主函数 ---
async function main() {
  const batchNumber = getCurrentBatchNumber();
  if (!batchNumber) {
    return; // 非预定时间，脚本正常退出
  }
  
  console.log(`🚀 Starting S&P 500 Price Update. Time logic dictates: Batch ${batchNumber}/${TOTAL_BATCHES}`);
  
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  let client;
  try {
    const allStockObjects = JSON.parse(await fs.readFile('./sp500_stocks.json', 'utf-8'));
    
    const startIndex = (batchNumber - 1) * BATCH_SIZE;
    const endIndex = batchNumber * BATCH_SIZE;
    const batchStockObjects = allStockObjects.slice(startIndex, endIndex);

    console.log(`📈 Processing ${batchStockObjects.length} stocks for Batch ${batchNumber}...`);
    client = await pool.connect();

    for (const stockObj of batchStockObjects) {
      const ticker = stockObj.symbol;
      if (!ticker) continue;

      console.log(`  -> Fetching ${ticker}...`);
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
      if (!response.ok) {
        console.error(`  ❌ HTTP Error for ${ticker}: ${response.status}`);
        await delay(API_DELAY_MS);
        continue;
      }
      
      const quote = await response.json();
      if (!quote || typeof quote.pc !== 'number' || quote.pc === 0) {
        console.warn(`  ⚠️ Invalid data for ${ticker}`);
        await delay(API_DELAY_MS);
        continue;
      }
      
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

      await client.query(sql, params);
      console.log(`  ✅ Updated ${ticker}.`);
      await delay(API_DELAY_MS);
    }
    console.log(`🎉 Batch ${batchNumber} finished successfully.`);
  } catch (error) {
    console.error(`❌ Job Failed on Batch ${batchNumber}:`, error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
  }
}

main();