// 文件: _scripts/update-sp500-enhanced.mjs
// 版本: Enhanced S&P 500 Data Update with Full Neon DB Field Mapping
// 功能: 完整的S&P 500数据更新，匹配Neon数据库所有字段

import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

// === 配置区 ===
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const STOCK_LIST_FILE = './sp500_stocks.json';
const SCRIPT_NAME = "S&P 500 Enhanced Update";
const DEBUG = process.env.DEBUG === 'true';
const FORCE_UPDATE = process.env.FORCE_UPDATE === 'true';
const DELAY_SECONDS = 4; // 每只股票抓取间隔4秒

// === Neon数据库字段映射配置 ===
const NEON_DB_FIELDS = {
  // 基础信息字段
  ticker: 'ticker',           // 股票代码
  name_en: 'name_en',         // 英文名称
  name_zh: 'name_zh',         // 中文名称
  sector_en: 'sector_en',     // 英文行业
  sector_zh: 'sector_zh',     // 中文行业
  
  // 价格相关字段 (高频更新)
  last_price: 'last_price',           // 最新价格
  change_amount: 'change_amount',     // 价格变动金额
  change_percent: 'change_percent',   // 价格变动百分比
  high_price: 'high_price',           // 当日最高价
  low_price: 'low_price',             // 当日最低价
  open_price: 'open_price',           // 开盘价
  previous_close: 'previous_close',   // 前收盘价
  
  // 财务指标字段
  market_cap: 'market_cap',           // 市值
  pe_ttm: 'pe_ttm',                   // 市盈率TTM
  roe_ttm: 'roe_ttm',                 // 净资产收益率TTM
  dividend_yield: 'dividend_yield',   // 股息收益率
  
  // 52周价格区间
  week_52_high: 'week_52_high',       // 52周最高价
  week_52_low: 'week_52_low',         // 52周最低价
  
  // 系统字段
  last_updated: 'last_updated',       // 最后更新时间
  logo: 'logo'                        // 公司Logo URL
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// === API数据获取函数 ===
async function fetchFinnhubQuote(ticker) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [${ticker}] Finnhub Quote API Error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.c === 0 && data.pc === 0) {
      console.warn(`⚠️ [${ticker}] Finnhub返回零数据，可能是无效股票代码`);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`❌ [${ticker}] Finnhub Quote获取错误:`, error.message);
    return null;
  }
}

async function fetchFinnhubMetrics(ticker) {
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [${ticker}] Finnhub Metrics API Error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.metric || null;
  } catch (error) {
    console.error(`❌ [${ticker}] Finnhub Metrics获取错误:`, error.message);
    return null;
  }
}

async function fetchFinnhubProfile(ticker) {
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [${ticker}] Finnhub Profile API Error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ [${ticker}] Finnhub Profile获取错误:`, error.message);
    return null;
  }
}

async function fetchPolygonData(ticker) {
  if (!POLYGON_API_KEY) {
    if (DEBUG) console.log(`⚠️ [${ticker}] Polygon API Key未配置，跳过Polygon数据`);
    return null;
  }
  
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apikey=${POLYGON_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [${ticker}] Polygon API Error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error(`❌ [${ticker}] Polygon数据获取错误:`, error.message);
    return null;
  }
}

// === 数据处理和映射函数 ===
function mapDataToNeonFields(ticker, finnhubQuote, finnhubMetrics, finnhubProfile, polygonData) {
  const mappedData = {};
  
  // 基础价格数据 (来自Finnhub Quote)
  if (finnhubQuote) {
    mappedData[NEON_DB_FIELDS.last_price] = finnhubQuote.c || null;
    mappedData[NEON_DB_FIELDS.high_price] = finnhubQuote.h || null;
    mappedData[NEON_DB_FIELDS.low_price] = finnhubQuote.l || null;
    mappedData[NEON_DB_FIELDS.open_price] = finnhubQuote.o || null;
    mappedData[NEON_DB_FIELDS.previous_close] = finnhubQuote.pc || null;
    
    if (finnhubQuote.c && finnhubQuote.pc) {
      mappedData[NEON_DB_FIELDS.change_amount] = finnhubQuote.c - finnhubQuote.pc;
      mappedData[NEON_DB_FIELDS.change_percent] = ((finnhubQuote.c - finnhubQuote.pc) / finnhubQuote.pc) * 100;
    }
    
    // 注意：这里的h和l是当日高低价，不是52周高低价
    // 52周数据需要从Metrics API获取
  }
  
  // 财务指标数据 (来自Finnhub Metrics)
  if (finnhubMetrics) {
    mappedData[NEON_DB_FIELDS.market_cap] = finnhubMetrics.marketCapitalization || null;
    mappedData[NEON_DB_FIELDS.pe_ttm] = finnhubMetrics.peTTM || null;
    mappedData[NEON_DB_FIELDS.roe_ttm] = finnhubMetrics.roeTTM || null;
    mappedData[NEON_DB_FIELDS.dividend_yield] = finnhubMetrics.dividendYieldIndicatedAnnual || null;
    
    // 如果Quote中没有52周数据，尝试从Metrics获取
    if (!mappedData[NEON_DB_FIELDS.week_52_high]) {
      mappedData[NEON_DB_FIELDS.week_52_high] = finnhubMetrics['52WeekHigh'] || null;
    }
    if (!mappedData[NEON_DB_FIELDS.week_52_low]) {
      mappedData[NEON_DB_FIELDS.week_52_low] = finnhubMetrics['52WeekLow'] || null;
    }
  }
  
  // 公司信息数据 (来自Finnhub Profile)
  if (finnhubProfile) {
    mappedData[NEON_DB_FIELDS.name_en] = finnhubProfile.name || null;
    mappedData[NEON_DB_FIELDS.sector_en] = finnhubProfile.finnhubIndustry || null;
    mappedData[NEON_DB_FIELDS.logo] = finnhubProfile.logo || null;
    
    // 如果Metrics中没有市值，尝试从Profile获取
    if (!mappedData[NEON_DB_FIELDS.market_cap]) {
      mappedData[NEON_DB_FIELDS.market_cap] = finnhubProfile.marketCapitalization || null;
    }
  }
  
  // Polygon数据补充 (如果可用)
  if (polygonData) {
    // Polygon数据可以作为价格数据的补充验证
    if (!mappedData[NEON_DB_FIELDS.last_price] && polygonData.c) {
      mappedData[NEON_DB_FIELDS.last_price] = polygonData.c;
    }
  }
  
  // 系统字段
  mappedData[NEON_DB_FIELDS.last_updated] = new Date().toISOString();
  
  return mappedData;
}

// === 数据库连接和更新函数 ===
async function connectWithRetry(pool, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      console.log(`✅ 数据库连接成功`);
      return client;
    } catch (error) {
      console.warn(`⚠️ 连接尝试 ${i + 1}/${maxRetries} 失败: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await delay(2000);
    }
  }
}

async function updateStockInDatabase(client, ticker, mappedData) {
  // 构建动态UPDATE语句，只更新有值的字段
  const updateFields = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [field, value] of Object.entries(mappedData)) {
    if (value !== null && value !== undefined) {
      updateFields.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  if (updateFields.length === 0) {
    console.warn(`⚠️ [${ticker}] 没有有效数据可更新`);
    return false;
  }
  
  const updateSQL = `
    UPDATE stocks 
    SET ${updateFields.join(', ')}
    WHERE ticker = $${paramIndex}
  `;
  values.push(ticker);
  
  try {
    const result = await client.query(updateSQL, values);
    if (result.rowCount > 0) {
      if (DEBUG) {
        console.log(`✅ [${ticker}] 数据库更新成功，更新字段: ${Object.keys(mappedData).filter(k => mappedData[k] !== null).join(', ')}`);
      }
      return true;
    } else {
      console.warn(`⚠️ [${ticker}] 数据库中未找到该股票记录`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [${ticker}] 数据库更新失败:`, error.message);
    return false;
  }
}

// === 主处理函数 ===
async function processStock(client, ticker) {
  if (DEBUG) console.log(`🔄 处理股票: ${ticker}`);
  
  try {
    // 并行获取多个数据源 (但要注意API限制)
    const [finnhubQuote, finnhubMetrics, finnhubProfile] = await Promise.all([
      fetchFinnhubQuote(ticker),
      fetchFinnhubMetrics(ticker),
      fetchFinnhubProfile(ticker)
    ]);
    
    // 稍后获取Polygon数据以避免过多并发请求
    await delay(1000);
    const polygonData = await fetchPolygonData(ticker);
    
    // 映射数据到Neon数据库字段
    const mappedData = mapDataToNeonFields(ticker, finnhubQuote, finnhubMetrics, finnhubProfile, polygonData);
    
    // 更新数据库
    const success = await updateStockInDatabase(client, ticker, mappedData);
    
    return success;
  } catch (error) {
    console.error(`❌ [${ticker}] 处理过程中发生错误:`, error.message);
    return false;
  }
}

// === 主函数 ===
async function main() {
  console.log(`🚀 ===== 启动 ${SCRIPT_NAME} =====`);
  
  // 环境变量检查
  if (!DATABASE_URL || !FINNHUB_API_KEY) {
    console.error("❌ 致命错误: 缺少 DATABASE_URL 或 FINNHUB_API_KEY 环境变量");
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  let client;
  
  try {
    client = await connectWithRetry(pool);
    
    // 读取股票列表
    let tickers = JSON.parse(await fs.readFile(STOCK_LIST_FILE, 'utf-8'));
    
    // 支持批次处理
    const batchStart = parseInt(process.env.BATCH_START) || 1;
    const batchEnd = parseInt(process.env.BATCH_END) || tickers.length;
    
    if (batchStart > 1 || batchEnd < tickers.length) {
      const originalLength = tickers.length;
      tickers = tickers.slice(batchStart - 1, batchEnd);
      console.log(`🎯 批次处理: 处理股票 ${batchStart}-${batchEnd} (${tickers.length}只) / 总计${originalLength}只`);
    }
    
    console.log(`📋 准备更新 ${tickers.length} 只S&P 500股票`);
    console.log(`⏱️ 预计耗时: ${Math.ceil(tickers.length * DELAY_SECONDS / 60)} 分钟`);
    
    let updatedCount = 0;
    let failedCount = 0;
    const startTime = Date.now();
    
    // 逐个处理股票
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const progress = `(${i + 1}/${tickers.length})`;
      
      console.log(`📊 ${progress} 处理 ${ticker}...`);
      
      const success = await processStock(client, ticker);
      
      if (success) {
        updatedCount++;
        console.log(`✅ ${progress} ${ticker} 更新成功`);
      } else {
        failedCount++;
        console.log(`❌ ${progress} ${ticker} 更新失败`);
      }
      
      // 延迟以遵守API限制
      if (i < tickers.length - 1) {
        await delay(DELAY_SECONDS * 1000);
      }
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // 最终报告
    console.log(`\n🎉 ===== ${SCRIPT_NAME} 完成 =====`);
    console.log(`📊 处理统计:`);
    console.log(`   ✅ 成功更新: ${updatedCount} 只股票`);
    console.log(`   ❌ 更新失败: ${failedCount} 只股票`);
    console.log(`   📈 成功率: ${((updatedCount / tickers.length) * 100).toFixed(1)}%`);
    console.log(`   ⏱️ 总耗时: ${duration} 秒`);
    console.log(`   🔄 平均每只股票: ${(duration / tickers.length).toFixed(1)} 秒`);
    
    if (failedCount > 0) {
      console.log(`⚠️ 注意: ${failedCount} 只股票更新失败，请检查日志`);
    }
    
  } catch (error) {
    console.error(`❌ 脚本执行失败:`, error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// 启动脚本
main();