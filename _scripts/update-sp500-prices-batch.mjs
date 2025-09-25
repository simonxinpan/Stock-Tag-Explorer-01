#!/usr/bin/env node

/**
 * 文件: /_scripts/update-sp500-prices-batch.mjs
 * S&P 500 分段式高频价格更新脚本
 * 专门处理单个批次的股票价格更新，支持11个批次的顺序执行
 */

import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

// 配置
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BATCH_NUMBER = parseInt(process.env.BATCH_NUMBER, 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 50;

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [BATCH-${BATCH_NUMBER}] ${message}`);
}

function debug(message) {
  if (process.env.DEBUG === 'true') {
    log(message, 'DEBUG');
  }
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

// 主函数
async function main() {
  log(`🚀 Starting S&P 500 Price Update for Batch ${BATCH_NUMBER}/${Math.ceil(530 / BATCH_SIZE)}`);
  
  // 验证配置
  if (!DATABASE_URL) {
    log('DATABASE_URL is required', 'ERROR');
    process.exit(1);
  }
  
  if (!FINNHUB_API_KEY) {
    log('FINNHUB_API_KEY is required', 'ERROR');
    process.exit(1);
  }
  
  if (!BATCH_NUMBER || BATCH_NUMBER < 1 || BATCH_NUMBER > 11) {
    log('Invalid BATCH_NUMBER. Must be between 1 and 11', 'ERROR');
    process.exit(1);
  }
  
  // 创建数据库连接池
  const pool = new Pool({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  
  let client;
  
  try {
    // 读取股票列表
    const allTickers = JSON.parse(await fs.readFile('./sp500_stocks.json', 'utf-8'));
    
    // 计算当前批次的股票范围
    const startIndex = (BATCH_NUMBER - 1) * BATCH_SIZE;
    const endIndex = Math.min(BATCH_NUMBER * BATCH_SIZE, allTickers.length);
    const batchTickers = allTickers.slice(startIndex, endIndex);

    log(`📈 Processing ${batchTickers.length} stocks from index ${startIndex} to ${endIndex-1}.`);
    
    // 获取数据库连接
    client = await pool.connect();
    log('Connected to database');
    
    // 统计变量
    let processed = 0;
    let updated = 0;
    let errors = 0;

    // 处理当前批次的股票
    for (const tickerObj of batchTickers) {
      // 关键修复：正确提取ticker字符串
      const ticker = tickerObj.symbol || tickerObj.ticker || tickerObj;
      
      if (!ticker || typeof ticker !== 'string') {
        log(`Invalid ticker object: ${JSON.stringify(tickerObj)}`, 'WARN');
        errors++;
        continue;
      }

      try {
        processed++;
        log(`  -> Fetching ${ticker}... (${processed}/${batchTickers.length})`);
        
        // 获取股票报价数据
        const quoteData = await fetchQuoteFromFinnhub(ticker);
        if (!quoteData) {
          errors++;
          await delay(13000); // 即使失败也等待，避免连锁超限
          continue;
        }
        
        // 映射数据到数据库字段
        const mappedData = mapQuoteToDbFields(ticker, quoteData);
        if (!mappedData) {
          errors++;
          await delay(13000);
          continue;
        }
        
        // 更新数据库
        const result = await updateStockInDatabase(client, ticker, mappedData);
        if (result.success) {
          updated++;
          log(`  ✅ Updated ${ticker} (${updated}/${processed})`);
        } else {
          errors++;
          log(`  ❌ Failed to update ${ticker}: ${result.reason}`, 'WARN');
        }
        
        // 强制13秒延迟，避免API限制
        await delay(13000);
        
      } catch (error) {
        log(`Error processing ${ticker}: ${error.message}`, 'ERROR');
        errors++;
        await delay(13000);
      }
    }
    
    // 输出批次统计结果
    log(`🎉 Batch ${BATCH_NUMBER} finished successfully.`);
    log(`📊 Batch Statistics:`);
    log(`   📈 Processed: ${processed} stocks`);
    log(`   ✅ Updated: ${updated} stocks`);
    log(`   ❌ Errors: ${errors} stocks`);
    log(`   📈 Success rate: ${((updated / processed) * 100).toFixed(1)}%`);
    
  } catch (error) {
    log(`❌ Job Failed on Batch ${BATCH_NUMBER}: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    if (client) {
      client.release();
      log('Database client released');
    }
    if (pool) {
      await pool.end();
      log('Database pool closed');
    }
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}