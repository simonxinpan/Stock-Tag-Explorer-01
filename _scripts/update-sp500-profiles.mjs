#!/usr/bin/env node

/**
 * 低频公司信息更新脚本 - 专门更新公司静态信息等很少变化的数据
 * 更新频率：每周日
 * 数据源：Finnhub API /stock/profile2 端点
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
  SCRIPT_NAME: 'update-sp500-profiles',
  DEBUG: process.env.DEBUG === 'true',
  DELAY_SECONDS: 0.3, // API调用间隔
  BATCH_SIZE: 40, // 每批处理的股票数量
};

// 低频字段映射 - 公司静态信息
const LOW_FREQ_FIELDS = {
  name_en: 'name',                    // 英文名
  name_zh: 'name',                    // 中文名（暂时使用英文名）
  sector_en: 'finnhubIndustry',       // 行业英文
  sector_zh: 'finnhubIndustry',       // 行业中文（暂时使用英文）
  market_cap: 'marketCapitalization', // 市值
  logo: 'logo',                       // 公司Logo
  is_otc: 'exchange',                 // 是否场外交易（根据交易所判断）
  market_cap_currency: 'currency',    // 市值货币
  market_cap_original: 'marketCapitalization', // 原始市值
  exchange_name: 'exchange'           // 交易所名称
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

// 从Finnhub获取公司信息
async function fetchProfileFromFinnhub(ticker) {
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${CONFIG.FINNHUB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    debug(`Finnhub profile response for ${ticker}: ${JSON.stringify(data)}`);
    
    // 验证数据结构
    if (!data || !data.name) {
      throw new Error(`Invalid profile data: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    log(`Error fetching profile for ${ticker} from Finnhub: ${error.message}`, 'ERROR');
    return null;
  }
}

// 从Polygon获取公司信息（备用）
async function fetchProfileFromPolygon(ticker) {
  if (!CONFIG.POLYGON_API_KEY) {
    return null;
  }
  
  const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apikey=${CONFIG.POLYGON_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    debug(`Polygon profile response for ${ticker}: ${JSON.stringify(data)}`);
    
    if (!data.results) {
      throw new Error('No results from Polygon');
    }
    
    const result = data.results;
    
    // 转换为类似Finnhub的格式
    return {
      name: result.name,
      ticker: result.ticker,
      exchange: result.primary_exchange,
      currency: result.currency_name || 'USD',
      marketCapitalization: result.market_cap,
      logo: result.branding?.logo_url,
      finnhubIndustry: result.sic_description,
      weburl: result.homepage_url
    };
    
  } catch (error) {
    log(`Error fetching profile for ${ticker} from Polygon: ${error.message}`, 'ERROR');
    return null;
  }
}

// 获取公司信息（优先Finnhub，备用Polygon）
async function fetchProfile(ticker) {
  let data = await fetchProfileFromFinnhub(ticker);
  
  if (!data && CONFIG.POLYGON_API_KEY) {
    debug(`Fallback to Polygon for ${ticker}`);
    data = await fetchProfileFromPolygon(ticker);
  }
  
  return data;
}

// 行业映射（英文到中文）
const SECTOR_MAPPING = {
  'Technology': '科技',
  'Healthcare': '医疗保健',
  'Financial Services': '金融服务',
  'Consumer Cyclical': '消费周期',
  'Consumer Defensive': '消费防御',
  'Industrials': '工业',
  'Energy': '能源',
  'Utilities': '公用事业',
  'Real Estate': '房地产',
  'Materials': '材料',
  'Communication Services': '通信服务',
  'Software': '软件',
  'Biotechnology': '生物技术',
  'Banks': '银行',
  'Insurance': '保险',
  'Retail': '零售',
  'Pharmaceuticals': '制药',
  'Semiconductors': '半导体',
  'Aerospace & Defense': '航空航天与国防',
  'Automotive': '汽车'
};

// 判断是否为场外交易
function isOTCExchange(exchange) {
  const otcExchanges = ['OTC', 'OTCBB', 'PINK', 'OTCQX', 'OTCQB'];
  return otcExchanges.some(otc => exchange && exchange.toUpperCase().includes(otc));
}

// 映射API数据到数据库字段
function mapProfileToDbFields(ticker, profileData) {
  if (!profileData) return null;
  
  const mappedData = {};
  
  // 公司名称（英文）
  if (profileData.name && typeof profileData.name === 'string') {
    mappedData.name_en = profileData.name.trim();
    // 暂时使用英文名作为中文名，后续可以添加翻译逻辑
    mappedData.name_zh = profileData.name.trim();
  }
  
  // 行业信息
  if (profileData.finnhubIndustry && typeof profileData.finnhubIndustry === 'string') {
    mappedData.sector_en = profileData.finnhubIndustry.trim();
    // 尝试映射到中文
    mappedData.sector_zh = SECTOR_MAPPING[profileData.finnhubIndustry.trim()] || profileData.finnhubIndustry.trim();
  } else if (profileData.gind && typeof profileData.gind === 'string') {
    mappedData.sector_en = profileData.gind.trim();
    mappedData.sector_zh = SECTOR_MAPPING[profileData.gind.trim()] || profileData.gind.trim();
  }
  
  // 市值
  if (typeof profileData.marketCapitalization === 'number' && profileData.marketCapitalization > 0) {
    mappedData.market_cap = profileData.marketCapitalization;
    mappedData.market_cap_original = profileData.marketCapitalization;
  }
  
  // 货币
  if (profileData.currency && typeof profileData.currency === 'string') {
    mappedData.market_cap_currency = profileData.currency.toUpperCase();
  } else {
    mappedData.market_cap_currency = 'USD'; // 默认美元
  }
  
  // Logo
  if (profileData.logo && typeof profileData.logo === 'string') {
    mappedData.logo = profileData.logo;
  }
  
  // 交易所信息
  if (profileData.exchange && typeof profileData.exchange === 'string') {
    mappedData.exchange_name = profileData.exchange.trim();
    mappedData.is_otc = isOTCExchange(profileData.exchange);
  } else {
    mappedData.is_otc = false; // 默认不是场外交易
  }
  
  debug(`Mapped profile data for ${ticker}: ${JSON.stringify(mappedData)}`);
  return Object.keys(mappedData).length > 0 ? mappedData : null;
}

// 更新数据库中的股票数据
async function updateStockInDatabase(client, ticker, mappedData) {
  if (!mappedData || Object.keys(mappedData).length === 0) {
    debug(`No valid profile data to update for ${ticker}`);
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
    
    debug(`Successfully updated profile data for ${ticker} (${result.rowCount} rows)`);
    return { success: true, rowCount: result.rowCount };
    
  } catch (error) {
    log(`Database error for ${ticker}: ${error.message}`, 'ERROR');
    return { success: false, reason: 'db_error', error: error.message };
  }
}

// 主函数
async function main() {
  log('📁 Starting S&P 500 Low-Frequency Profile Update');
  
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
      
      // 串行处理批次内的股票
      for (const stock of batch) {
        const ticker = stock.ticker || stock.symbol;
        
        try {
          processed++;
          
          // 获取公司信息数据
          const profileData = await fetchProfile(ticker);
          if (!profileData) {
            errors++;
            continue;
          }
          
          // 映射数据
          const mappedData = mapProfileToDbFields(ticker, profileData);
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
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // 输出统计结果
    log(`✅ Low-frequency profile update completed:`);
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