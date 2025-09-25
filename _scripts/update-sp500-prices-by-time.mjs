// 文件: /_scripts/update-sp500-prices-by-time.mjs
// 版本: Final Intelligent Batch Calculator
import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

// --- 从环境变量读取配置 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BATCH_SIZE = 50;
const TOTAL_STOCKS = 530;
const TOTAL_BATCHES = Math.ceil(TOTAL_STOCKS / BATCH_SIZE); // 11
const RUN_INTERVAL_MINUTES = 15;
const API_DELAY_SECONDS = 13; // 遵循您的要求

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function debug(message) {
  if (process.env.DEBUG === 'true') {
    log(message, 'DEBUG');
  }
}

/**
 * 智能计算当前应运行的批次号
 * @returns {number | null} - 返回批次号，如果不在运行时间则返回null
 */
function getCurrentBatchNumber() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    
    // 简化版夏令时判断
    const month = now.getUTCMonth();
    const isDST = month >= 3 && month <= 9;
    
    const marketOpenUTCHour = isDST ? 13 : 14;
    const marketCloseUTCHour = isDST ? 20 : 21;

    // 1. 开市5分钟后启动
    const openTimeInMinutes = marketOpenUTCHour * 60 + 35; // 13:35 UTC
    const currentTimeInMinutes = utcHour * 60 + utcMinute;
    
    // 检查是否在交易时段内 (我们放宽到闭市后半小时)
    if (currentTimeInMinutes < openTimeInMinutes || currentTimeInMinutes > (marketCloseUTCHour * 60 + 30)) {
        console.log("Current time is outside of specified trading hours. Exiting.");
        return null;
    }
    
    // 2. 计算批次
    const minutesSinceRunStart = currentTimeInMinutes - openTimeInMinutes;
    const batchIndex = Math.floor(minutesSinceRunStart / RUN_INTERVAL_MINUTES);
    
    if (batchIndex >= TOTAL_BATCHES) {
        // 如果是闭市后的最后一次运行
        console.log("Post-market run detected. Running final batch.");
        return TOTAL_BATCHES;
    }

    const batchNumber = batchIndex + 1;
    return batchNumber;
}

// 从Finnhub获取股票报价
async function fetchQuoteFromFinnhub(ticker) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    debug(`Finnhub response for ${ticker}: ${JSON.stringify(data)}`);
    
    // 验证数据完整性
    if (!data || typeof data.c !== 'number' || data.c <= 0) {
      throw new Error(`Invalid price data: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    log(`Error fetching ${ticker} from Finnhub: ${error.message}`, 'ERROR');
    return null;
  }
}

// 映射API数据到数据库字段
function mapQuoteToDbFields(ticker, quoteData) {
  if (!quoteData) return null;
  
  const mappedData = {};
  
  // 基础价格数据
  if (typeof quoteData.c === 'number' && quoteData.c > 0) {
    mappedData.last_price = quoteData.c;
  }
  
  if (typeof quoteData.o === 'number' && quoteData.o > 0) {
    mappedData.open_price = quoteData.o;
  }
  
  if (typeof quoteData.h === 'number' && quoteData.h > 0) {
    mappedData.high_price = quoteData.h;
  }
  
  if (typeof quoteData.l === 'number' && quoteData.l > 0) {
    mappedData.low_price = quoteData.l;
  }
  
  if (typeof quoteData.pc === 'number' && quoteData.pc > 0) {
    mappedData.previous_close = quoteData.pc;
  }
  
  // 计算涨跌额和涨跌幅
  if (mappedData.last_price && mappedData.previous_close) {
    mappedData.change_amount = mappedData.last_price - mappedData.previous_close;
    mappedData.change_percent = (mappedData.change_amount / mappedData.previous_close) * 100;
  } else if (typeof quoteData.dp === 'number') {
    mappedData.change_percent = quoteData.dp;
    if (mappedData.last_price && mappedData.change_percent) {
      mappedData.change_amount = (mappedData.last_price * mappedData.change_percent) / 100;
    }
  }
  
  // 更新时间
  mappedData.last_updated = new Date().toISOString();
  
  debug(`Mapped data for ${ticker}: ${JSON.stringify(mappedData)}`);
  return mappedData;
}

// 更新数据库中的股票数据
async function updateStockInDatabase(client, ticker, mappedData) {
  if (!mappedData || Object.keys(mappedData).length === 0) {
    debug(`No valid data to update for ${ticker}`);
    return { success: false, reason: 'no_data' };
  }
  
  // 构建动态SQL
  const fields = Object.keys(mappedData);
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  const values = [ticker, ...fields.map(field => mappedData[field])];
  
  const sql = `
    UPDATE stocks 
    SET ${setClause}
    WHERE ticker = $1
  `;
  
  try {
    debug(`Executing SQL for ${ticker}: ${sql}`);
    debug(`Values: ${JSON.stringify(values)}`);
    
    const result = await client.query(sql, values);
    
    if (result.rowCount === 0) {
      log(`Stock ${ticker} not found in database`, 'WARN');
      return { success: false, reason: 'not_found' };
    }
    
    debug(`Successfully updated ${ticker} (${result.rowCount} rows)`);
    return { success: true, rowCount: result.rowCount };
    
  } catch (error) {
    log(`Database error for ${ticker}: ${error.message}`, 'ERROR');
    return { success: false, reason: 'db_error', error: error.message };
  }
}

// --- 主函数 ---
async function main() {
  const batchNumber = getCurrentBatchNumber();
  if (!batchNumber) {
    return; // 非预定时间，脚本正常退出
  }
  
  console.log(`🚀 Starting S&P 500 Price Update. Time logic dictates: Batch ${batchNumber}/${TOTAL_BATCHES}`);
  
  // 验证配置
  if (!DATABASE_URL) {
    log('DATABASE_URL is required', 'ERROR');
    process.exit(1);
  }
  
  if (!FINNHUB_API_KEY) {
    log('FINNHUB_API_KEY is required', 'ERROR');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  let client;
  
  try {
    const allStockObjects = JSON.parse(await fs.readFile('./sp500_stocks.json', 'utf-8'));
    
    const startIndex = (batchNumber - 1) * BATCH_SIZE;
    const endIndex = batchNumber * BATCH_SIZE;
    const batchStockObjects = allStockObjects.slice(startIndex, endIndex);

    console.log(`📈 Processing ${batchStockObjects.length} stocks for Batch ${batchNumber}...`);
    client = await pool.connect();
    
    // 统计变量
    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const stockObj of batchStockObjects) {
      const ticker = stockObj.symbol || stockObj.ticker;
      if (!ticker) continue;
      
      try {
        processed++;
        console.log(`  -> Fetching ${ticker}...`);
        
        // 获取报价数据
        const quoteData = await fetchQuoteFromFinnhub(ticker);
        if (!quoteData) {
          errors++;
          continue;
        }
        
        // 映射数据
        const mappedData = mapQuoteToDbFields(ticker, quoteData);
        if (!mappedData) {
          errors++;
          continue;
        }
        
        // 更新数据库
        const result = await updateStockInDatabase(client, ticker, mappedData);
        if (result.success) {
          updated++;
          debug(`✅ Successfully updated ${ticker}`);
        } else {
          errors++;
          log(`❌ Failed to update ${ticker}: ${result.reason}`, 'WARN');
        }
        
      } catch (error) {
        log(`Error processing ${ticker}: ${error.message}`, 'ERROR');
        errors++;
      }
      
      // API调用间隔 - 遵循13秒延迟要求
      await delay(API_DELAY_SECONDS * 1000);
    }
    
    // 输出统计结果
    console.log(`🎉 Batch ${batchNumber} finished successfully.`);
    log(`📊 Batch ${batchNumber} Statistics:`);
    log(`   📈 Processed: ${processed} stocks`);
    log(`   ✅ Updated: ${updated} stocks`);
    log(`   ❌ Errors: ${errors} stocks`);
    log(`   📊 Success rate: ${processed > 0 ? ((updated / processed) * 100).toFixed(1) : 0}%`);
    
  } catch (error) {
    console.error(`❌ Job Failed on Batch ${batchNumber}:`, error.message);
    log(`Fatal error in Batch ${batchNumber}: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
    log('Database connection closed');
  }
}

main();