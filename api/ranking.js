// 文件: /api/ranking.js
// 版本: API-v5.0-CJS (支持SQLite和PostgreSQL)

require('dotenv').config();

// 数据库连接池和客户端
const pools = {};
const dbClients = {};

// 检测数据库类型并初始化连接
function initializeDatabaseConnections() {
  try {
    // SP500 数据库连接
    if (process.env.NEON_DATABASE_URL) {
      if (process.env.NEON_DATABASE_URL.startsWith('sqlite:')) {
        // SQLite 连接
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = process.env.NEON_DATABASE_URL.replace('sqlite:', '');
        dbClients.sp500 = new sqlite3.Database(path.resolve(dbPath));
        console.log('✅ SP500 SQLite database connected');
      } else {
        // PostgreSQL 连接
        const { Pool } = require('pg');
        const sslConfig = { ssl: { rejectUnauthorized: false } };
        pools.sp500 = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig });
        console.log('✅ SP500 PostgreSQL database connected');
      }
    }

    // 中概股数据库连接
    if (process.env.CHINESE_STOCKS_DB_URL) {
      if (process.env.CHINESE_STOCKS_DB_URL.startsWith('sqlite:')) {
        // SQLite 连接
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = process.env.CHINESE_STOCKS_DB_URL.replace('sqlite:', '');
        dbClients.chinese_stocks = new sqlite3.Database(path.resolve(dbPath));
        console.log('✅ Chinese Stocks SQLite database connected');
      } else {
        // PostgreSQL 连接
        const { Pool } = require('pg');
        const sslConfig = { ssl: { rejectUnauthorized: false } };
        pools.chinese_stocks = new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig });
        console.log('✅ Chinese Stocks PostgreSQL database connected');
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// 初始化数据库连接
initializeDatabaseConnections();

// 包含了所有14个榜单的、最终的、真实的SQL排序逻辑映射
const ORDER_BY_MAP = {
  // === 核心榜单 ===
  top_market_cap: 'ORDER BY market_cap DESC',
  top_gainers: 'ORDER BY change_percent DESC',
  top_losers: 'ORDER BY change_percent ASC',
  
  // === 交易活跃度榜单 ===
  top_volume: 'ORDER BY volume DESC',
  top_turnover: 'ORDER BY volume DESC',
  
  // === 价格趋势榜单 ===
  new_highs: 'ORDER BY price DESC',
  new_lows: 'ORDER BY price ASC',
  
  // === 技术指标榜单 ===
  top_volatility: 'ORDER BY ABS(change_percent) DESC',
  top_gap_up: 'ORDER BY change_percent DESC',
  unusual_activity: 'ORDER BY ABS(change_percent) DESC',
  momentum_stocks: 'ORDER BY change_percent DESC',

  // === 情绪/关注度榜单 (使用合理替代逻辑) ===
  institutional_focus: 'ORDER BY market_cap DESC',
  retail_hot: 'ORDER BY volume DESC',
  smart_money: 'ORDER BY volume DESC',
  high_liquidity: 'ORDER BY volume DESC',

  // 默认排序
  default: 'ORDER BY market_cap DESC'
};

// 执行数据库查询的辅助函数
async function executeQuery(market, query) {
  if (pools[market]) {
    // PostgreSQL 查询
    const { rows } = await pools[market].query(query);
    return rows;
  } else if (dbClients[market]) {
    // SQLite 查询
    return new Promise((resolve, reject) => {
      dbClients[market].all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  } else {
    throw new Error(`No database connection available for market: ${market}`);
  }
}

// 使用 module.exports 导出 Vercel Serverless Function
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  const { type = 'default', market = 'sp500' } = req.query;
  const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;

  // 详细的错误检查和日志
  console.log(`[API Request - ranking]: type=${type}, market=${market}`);
  console.log(`[Environment Check]: NEON_DATABASE_URL exists: ${!!process.env.NEON_DATABASE_URL}`);
  console.log(`[Environment Check]: CHINESE_STOCKS_DB_URL exists: ${!!process.env.CHINESE_STOCKS_DB_URL}`);
  console.log(`[Pool Check]: Available pools: ${Object.keys(pools)}`);
  console.log(`[DB Client Check]: Available SQLite clients: ${Object.keys(dbClients)}`);
  
  const hasConnection = pools[market] || dbClients[market];
  console.log(`[Connection Check]: ${market} connection exists: ${!!hasConnection}`);

  if (!hasConnection) {
    const availableMarkets = [...Object.keys(pools), ...Object.keys(dbClients)];
    const errorMsg = `Invalid market specified: ${market}. Available markets: ${availableMarkets.join(', ')}`;
    console.error(`[API Error - ranking]: ${errorMsg}`);
    return res.status(400).json({ 
      error: errorMsg,
      availableMarkets: availableMarkets,
      environmentVariables: {
        NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
        CHINESE_STOCKS_DB_URL: !!process.env.CHINESE_STOCKS_DB_URL
      }
    });
  }

  try {
    // 根据市场选择合适的表名和字段映射
    let tableName, tickerField, nameField, priceField, changeField, marketCapField;
    
    if (market === 'chinese_stocks') {
      tableName = 'stocks';
      tickerField = 'ticker';
      nameField = 'name_zh';
      priceField = 'current_price';
      changeField = 'change_percent';
      marketCapField = 'market_cap';
    } else if (market === 'sp500') {
      tableName = 'sp500_stocks';
      tickerField = 'ticker';
      nameField = 'name_zh';
      priceField = 'last_price';
      changeField = 'change_percent';
      marketCapField = 'market_cap';
    } else {
      // 默认使用stocks表结构
      tableName = 'stocks';
      tickerField = 'ticker';
      nameField = 'name_zh';
      priceField = 'last_price';
      changeField = 'change_percent';
      marketCapField = 'market_cap';
    }

    const query = `
      SELECT 
        ${tickerField} as ticker, 
        ${nameField} as name_zh, 
        ${nameField} as name_en, 
        ${priceField} as last_price, 
        ${changeField} as change_percent, 
        ${marketCapField} as market_cap
      FROM ${tableName} 
      WHERE ${priceField} IS NOT NULL AND ${marketCapField} IS NOT NULL AND ${changeField} IS NOT NULL
      ${orderByClause.replace(/price/g, priceField).replace(/change_percent/g, changeField).replace(/market_cap/g, marketCapField).replace(/volume/g, 'volume')}
      LIMIT 100`;
    
    console.log(`[API Query - ranking]: Executing query for ${market} on table ${tableName}`);
    console.log(`[API Query - ranking]: SQL: ${query}`);
    const rows = await executeQuery(market, query);
    console.log(`[API Success - ranking]: Retrieved ${rows.length} rows for ${market}/${type}`);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    console.error(`[API Error Details]: ${error.message}`);
    console.error(`[API Error Stack]: ${error.stack}`);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message,
      market: market,
      type: type,
      timestamp: new Date().toISOString()
    });
  }
};