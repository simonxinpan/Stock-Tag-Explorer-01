#!/usr/bin/env node

/**
 * 中频财务数据更新脚本 - 专门更新财务指标等每日变化的数据
 * 更新频率：交易日盘前/盘后
 * 数据源：Finnhub API /stock/metric 端点
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
  SCRIPT_NAME: 'update-sp500-financials',
  DEBUG: process.env.DEBUG === 'true',
  DELAY_SECONDS: 0.5, // API调用间隔（财务数据调用频率限制更严格）
  BATCH_SIZE: 30, // 每批处理的股票数量
};

// 中频字段映射 - 财务指标和52周数据
const MEDIUM_FREQ_FIELDS = {
  roe_ttm: 'roeTTM',              // 净资产收益率
  pe_ttm: 'peTTM',                // 市盈率
  week_52_high: '52WeekHigh',     // 52周最高
  week_52_low: '52WeekLow',       // 52周最低
  dividend_yield: 'dividendYieldIndicatedAnnual', // 股息率
  daily_data_last_updated: 'timestamp' // 日更数据更新日期
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

// 从Finnhub获取财务指标
async function fetchMetricsFromFinnhub(ticker) {
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${CONFIG.FINNHUB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    debug(`Finnhub metrics response for ${ticker}: ${JSON.stringify(data)}`);
    
    // 验证数据结构
    if (!data || !data.metric) {
      throw new Error(`Invalid metrics data structure: ${JSON.stringify(data)}`);
    }
    
    return data.metric;
  } catch (error) {
    log(`Error fetching metrics for ${ticker} from Finnhub: ${error.message}`, 'ERROR');
    return null;
  }
}

// 从Polygon获取财务数据（备用）
async function fetchMetricsFromPolygon(ticker) {
  if (!CONFIG.POLYGON_API_KEY) {
    return null;
  }
  
  // Polygon的财务数据需要多个API调用
  const urls = [
    `https://api.polygon.io/v3/reference/tickers/${ticker}?apikey=${CONFIG.POLYGON_API_KEY}`,
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/2023-01-01/2024-12-31?adjusted=true&sort=desc&limit=365&apikey=${CONFIG.POLYGON_API_KEY}`
  ];
  
  try {
    const [detailsResponse, priceResponse] = await Promise.all(
      urls.map(url => fetch(url))
    );
    
    if (!detailsResponse.ok || !priceResponse.ok) {
      throw new Error('Failed to fetch from Polygon');
    }
    
    const [detailsData, priceData] = await Promise.all([
      detailsResponse.json(),
      priceResponse.json()
    ]);
    
    debug(`Polygon details for ${ticker}: ${JSON.stringify(detailsData)}`);
    debug(`Polygon price data for ${ticker}: ${JSON.stringify(priceData)}`);
    
    // 计算52周高低点
    let week52High = null;
    let week52Low = null;
    
    if (priceData.results && priceData.results.length > 0) {
      const prices = priceData.results.map(r => r.h); // 最高价
      const lows = priceData.results.map(r => r.l);   // 最低价
      
      week52High = Math.max(...prices);
      week52Low = Math.min(...lows);
    }
    
    // 构建类似Finnhub的数据结构
    const metrics = {};
    
    if (detailsData.results) {
      const result = detailsData.results;
      if (result.market_cap) {
        // 可以从市值等信息推算一些指标，但Polygon的财务指标有限
      }
    }
    
    if (week52High) metrics['52WeekHigh'] = week52High;
    if (week52Low) metrics['52WeekLow'] = week52Low;
    
    return Object.keys(metrics).length > 0 ? metrics : null;
    
  } catch (error) {
    log(`Error fetching metrics for ${ticker} from Polygon: ${error.message}`, 'ERROR');
    return null;
  }
}

// 获取财务指标（优先Finnhub，备用Polygon）
async function fetchMetrics(ticker) {
  let data = await fetchMetricsFromFinnhub(ticker);
  
  if (!data && CONFIG.POLYGON_API_KEY) {
    debug(`Fallback to Polygon for ${ticker}`);
    data = await fetchMetricsFromPolygon(ticker);
  }
  
  return data;
}

// 映射API数据到数据库字段
function mapMetricsToDbFields(ticker, metricsData) {
  if (!metricsData) return null;
  
  const mappedData = {};
  
  // ROE (净资产收益率)
  if (typeof metricsData.roeTTM === 'number' && !isNaN(metricsData.roeTTM)) {
    mappedData.roe_ttm = metricsData.roeTTM;
  } else if (typeof metricsData.roe === 'number' && !isNaN(metricsData.roe)) {
    mappedData.roe_ttm = metricsData.roe;
  }
  
  // PE Ratio (市盈率)
  if (typeof metricsData.peTTM === 'number' && !isNaN(metricsData.peTTM) && metricsData.peTTM > 0) {
    mappedData.pe_ttm = metricsData.peTTM;
  } else if (typeof metricsData.peBasicExclExtraTTM === 'number' && !isNaN(metricsData.peBasicExclExtraTTM) && metricsData.peBasicExclExtraTTM > 0) {
    mappedData.pe_ttm = metricsData.peBasicExclExtraTTM;
  }
  
  // 52周高点
  if (typeof metricsData['52WeekHigh'] === 'number' && metricsData['52WeekHigh'] > 0) {
    mappedData.week_52_high = metricsData['52WeekHigh'];
  } else if (typeof metricsData.weekHigh52 === 'number' && metricsData.weekHigh52 > 0) {
    mappedData.week_52_high = metricsData.weekHigh52;
  }
  
  // 52周低点
  if (typeof metricsData['52WeekLow'] === 'number' && metricsData['52WeekLow'] > 0) {
    mappedData.week_52_low = metricsData['52WeekLow'];
  } else if (typeof metricsData.weekLow52 === 'number' && metricsData.weekLow52 > 0) {
    mappedData.week_52_low = metricsData.weekLow52;
  }
  
  // 股息率
  if (typeof metricsData.dividendYieldIndicatedAnnual === 'number' && !isNaN(metricsData.dividendYieldIndicatedAnnual)) {
    mappedData.dividend_yield = metricsData.dividendYieldIndicatedAnnual;
  } else if (typeof metricsData.dividendYield === 'number' && !isNaN(metricsData.dividendYield)) {
    mappedData.dividend_yield = metricsData.dividendYield;
  }
  
  // 日更数据更新时间
  mappedData.daily_data_last_updated = new Date().toISOString().split('T')[0]; // 只保留日期部分
  
  debug(`Mapped financial data for ${ticker}: ${JSON.stringify(mappedData)}`);
  return Object.keys(mappedData).length > 1 ? mappedData : null; // 至少要有更新时间以外的数据
}

// 更新数据库中的股票数据
async function updateStockInDatabase(client, ticker, mappedData) {
  if (!mappedData || Object.keys(mappedData).length === 0) {
    debug(`No valid financial data to update for ${ticker}`);
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
    
    debug(`Successfully updated financial data for ${ticker} (${result.rowCount} rows)`);
    return { success: true, rowCount: result.rowCount };
    
  } catch (error) {
    log(`Database error for ${ticker}: ${error.message}`, 'ERROR');
    return { success: false, reason: 'db_error', error: error.message };
  }
}

// 主函数
async function main() {
  log('📊 Starting S&P 500 Medium-Frequency Financial Update');
  
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
      
      // 串行处理批次内的股票（财务API限制更严格）
      for (const stock of batch) {
        const ticker = stock.ticker || stock.symbol;
        
        try {
          processed++;
          
          // 获取财务指标数据
          const metricsData = await fetchMetrics(ticker);
          if (!metricsData) {
            errors++;
            continue;
          }
          
          // 映射数据
          const mappedData = mapMetricsToDbFields(ticker, metricsData);
          if (!mappedData) {
            errors++;
            continue;
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
      }
      
      // 批次间稍作停顿
      if (i + CONFIG.BATCH_SIZE < stocks.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 输出统计结果
    log(`✅ Medium-frequency financial update completed:`);
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