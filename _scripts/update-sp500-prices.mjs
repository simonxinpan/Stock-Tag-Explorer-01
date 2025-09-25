#!/usr/bin/env node

/**
 * 高频数据更新脚本 - 专门更新价格、成交量等实时变化的数据
 * 更新频率：交易时段每15分钟
 * 数据源：Finnhub API /quote 端点
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL,
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  STOCK_LIST_FILE: path.join(__dirname, '..', 'sp500_stocks.json'),
  SCRIPT_NAME: 'update-sp500-prices',
  DEBUG: process.env.DEBUG === 'true',
  DELAY_SECONDS: 0.2, // API调用间隔
  BATCH_SIZE: 50, // 每批处理的股票数量
};

// 高频字段映射 - 只更新实时变化的数据
const HIGH_FREQ_FIELDS = {
  last_price: 'c',           // 最新价
  change_amount: 'change',   // 涨跌额 (计算得出)
  change_percent: 'dp',      // 涨跌幅
  open_price: 'o',          // 开盘价
  high_price: 'h',          // 最高价
  low_price: 'l',           // 最低价
  previous_close: 'pc',     // 昨日收盘价
  last_updated: 'timestamp' // 更新时间
};

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [${CONFIG.SCRIPT_NAME}] ${message}`);
}

function debug(message) {
  if (CONFIG.DEBUG) {
    log(message, 'DEBUG');
  }
}

// 从Finnhub获取股票报价
async function fetchQuoteFromFinnhub(ticker) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${CONFIG.FINNHUB_API_KEY}`;
  
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

// 从Polygon获取股票报价（备用）
async function fetchQuoteFromPolygon(ticker) {
  if (!CONFIG.POLYGON_API_KEY) {
    return null;
  }
  
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apikey=${CONFIG.POLYGON_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    debug(`Polygon response for ${ticker}: ${JSON.stringify(data)}`);
    
    if (!data.results || !data.results[0]) {
      throw new Error('No results from Polygon');
    }
    
    const result = data.results[0];
    
    // 转换为Finnhub格式
    return {
      c: result.c,  // 收盘价作为当前价
      o: result.o,  // 开盘价
      h: result.h,  // 最高价
      l: result.l,  // 最低价
      pc: result.c, // 前一日收盘价
      dp: 0,        // 涨跌幅需要计算
      t: Date.now() // 时间戳
    };
  } catch (error) {
    log(`Error fetching ${ticker} from Polygon: ${error.message}`, 'ERROR');
    return null;
  }
}

// 获取股票报价（优先Finnhub，备用Polygon）
async function fetchQuote(ticker) {
  let data = await fetchQuoteFromFinnhub(ticker);
  
  if (!data && CONFIG.POLYGON_API_KEY) {
    debug(`Fallback to Polygon for ${ticker}`);
    data = await fetchQuoteFromPolygon(ticker);
  }
  
  return data;
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
  log('🚀 Starting S&P 500 High-Frequency Price Update');
  
  // 验证配置
  if (!CONFIG.DATABASE_URL) {
    log('DATABASE_URL is required', 'ERROR');
    process.exit(1);
  }
  
  if (!CONFIG.FINNHUB_API_KEY) {
    log('FINNHUB_API_KEY is required', 'ERROR');
    process.exit(1);
  }
  
  // 读取股票列表
  let stocks;
  try {
    const stocksData = fs.readFileSync(CONFIG.STOCK_LIST_FILE, 'utf8');
    stocks = JSON.parse(stocksData);
    log(`Loaded ${stocks.length} stocks from ${CONFIG.STOCK_LIST_FILE}`);
  } catch (error) {
    log(`Error reading stock list: ${error.message}`, 'ERROR');
    process.exit(1);
  }
  
  // 连接数据库
  const client = new Client({ connectionString: CONFIG.DATABASE_URL });
  
  try {
    await client.connect();
    log('Connected to database');
    
    // 统计变量
    let processed = 0;
    let updated = 0;
    let errors = 0;
    
    // 分批处理股票
    for (let i = 0; i < stocks.length; i += CONFIG.BATCH_SIZE) {
      const batch = stocks.slice(i, i + CONFIG.BATCH_SIZE);
      log(`Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(stocks.length / CONFIG.BATCH_SIZE)} (${batch.length} stocks)`);
      
      // 并行处理批次内的股票
      const batchPromises = batch.map(async (stock) => {
        const ticker = stock.ticker || stock.symbol;
        
        try {
          processed++;
          
          // 获取报价数据
          const quoteData = await fetchQuote(ticker);
          if (!quoteData) {
            errors++;
            return;
          }
          
          // 映射数据
          const mappedData = mapQuoteToDbFields(ticker, quoteData);
          if (!mappedData) {
            errors++;
            return;
          }
          
          // 更新数据库
          const result = await updateStockInDatabase(client, ticker, mappedData);
          if (result.success) {
            updated++;
          } else {
            errors++;
          }
          
          // API调用间隔
          if (CONFIG.DELAY_SECONDS > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_SECONDS * 1000));
          }
          
        } catch (error) {
          log(`Error processing ${ticker}: ${error.message}`, 'ERROR');
          errors++;
        }
      });
      
      await Promise.all(batchPromises);
      
      // 批次间稍作停顿
      if (i + CONFIG.BATCH_SIZE < stocks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 输出统计结果
    log(`✅ High-frequency update completed:`);
    log(`   📊 Processed: ${processed} stocks`);
    log(`   ✅ Updated: ${updated} stocks`);
    log(`   ❌ Errors: ${errors} stocks`);
    log(`   📈 Success rate: ${((updated / processed) * 100).toFixed(1)}%`);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    await client.end();
    log('Database connection closed');
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}