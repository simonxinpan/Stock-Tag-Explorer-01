// 文件: /_scripts/update-sp500-prices-by-time.mjs
import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10);
const TOTAL_STOCKS = parseInt(process.env.TOTAL_STOCKS, 10);
const TOTAL_BATCHES = Math.ceil(TOTAL_STOCKS / BATCH_SIZE);
const RUN_INTERVAL_MINUTES = 15;
const DELAY_SECONDS = 13;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [SP500-TIME-BATCH] ${message}`);
}

function debug(message) {
  log(message, 'DEBUG');
}

// 智能计算当前应运行的批次号
function getCurrentBatchNumber() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    
    // 判断是否为夏令时的大致逻辑 (更精确的库如moment-timezone更佳，但此方法够用)
    // 简化的判断：4月到10月视为夏令时
    const isDST = now.getUTCMonth() >= 3 && now.getUTCMonth() <= 9;
    const marketOpenUTCHour = isDST ? 13 : 14;

    const minutesSinceOpen = (utcHour - marketOpenUTCHour) * 60 + (utcMinute - 35);
    if (minutesSinceOpen < 0) {
        // 处理闭市后运行的情况
        if ((isDST && utcHour === 20 && utcMinute >= 35) || (!isDST && utcHour === 21 && utcMinute >= 35)) {
            return TOTAL_BATCHES; // 闭市后运行最后一个批次
        }
        console.log("Not in trading hours, exiting.");
        return null;
    }

    const batchIndex = Math.floor(minutesSinceOpen / RUN_INTERVAL_MINUTES);
    const batchNumber = (batchIndex % TOTAL_BATCHES) + 1;
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

    let successCount = 0;
    let errorCount = 0;

    for (const stockObj of batchStockObjects) {
      const ticker = stockObj.symbol;
      if (!ticker) continue;
      
      log(`Processing ${ticker}...`);
      
      // 获取股票报价数据
      const quoteData = await fetchQuoteFromFinnhub(ticker);
      if (!quoteData) {
        errorCount++;
        continue;
      }
      
      // 映射数据到数据库字段
      const mappedData = mapQuoteToDbFields(ticker, quoteData);
      if (!mappedData) {
        errorCount++;
        continue;
      }
      
      // 更新数据库
      const updateResult = await updateStockInDatabase(client, ticker, mappedData);
      if (updateResult.success) {
        successCount++;
        log(`✅ ${ticker}: Updated successfully`);
      } else {
        errorCount++;
        log(`❌ ${ticker}: Update failed - ${updateResult.reason}`, 'ERROR');
      }
      
      // 强制延迟以避免API限制
      await delay(DELAY_SECONDS * 1000);
    }
    
    log(`🎉 Batch ${batchNumber} finished successfully.`);
    log(`📊 Statistics: ${successCount} successful, ${errorCount} errors`);
    
  } catch (error) {
    console.error(`❌ Job Failed on Batch ${batchNumber}:`, error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
  }
}

main();