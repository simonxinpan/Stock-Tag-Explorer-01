// 文件: /api/ranking.js
// 版本: API-v4.0-CJS (CommonJS Final Version)

// 使用 CommonJS 规范的 require 语句
const { Pool } = require('pg');
require('dotenv').config();

// SSL 配置，确保能连接到 Neon
const sslConfig = { ssl: { rejectUnauthorized: false } };

// 数据库连接池 - 添加环境变量检查
const pools = {};

// 初始化数据库连接池，添加错误处理
try {
  if (process.env.NEON_DATABASE_URL) {
    pools.sp500 = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig });
  }
  if (process.env.CHINESE_STOCKS_DB_URL) {
    pools.chinese_stocks = new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig });
  }
} catch (error) {
  console.error('Database pool initialization error:', error);
}

// 包含了所有14个榜单的、最终的、真实的SQL排序逻辑映射
const ORDER_BY_MAP = {
  // === 核心榜单 ===
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // === 交易活跃度榜单 ===
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY turnover DESC NULLS LAST',
  
  // === 价格趋势榜单 ===
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST',
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',
  
  // === 技术指标榜单 ===
  top_volatility: 'ORDER BY ((high_price - low_price) / previous_close) DESC NULLS LAST',
  top_gap_up: 'ORDER BY ((open_price - previous_close) / previous_close) DESC NULLS LAST',
  unusual_activity: 'ORDER BY ABS(change_percent) DESC NULLS LAST',
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST',

  // === 情绪/关注度榜单 (使用合理替代逻辑) ===
  institutional_focus: 'ORDER BY market_cap DESC NULLS LAST',
  retail_hot: 'ORDER BY turnover DESC NULLS LAST',
  smart_money: 'ORDER BY turnover DESC NULLS LAST',
  high_liquidity: 'ORDER BY volume DESC NULLS LAST',

  // 默认排序
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

// 使用 module.exports 导出 Vercel Serverless Function
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  const { type = 'default', market = 'sp500' } = req.query;
  const pool = pools[market];
  const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;

  // 详细的错误检查和日志
  console.log(`[API Request - ranking]: type=${type}, market=${market}`);
  console.log(`[Environment Check]: NEON_DATABASE_URL exists: ${!!process.env.NEON_DATABASE_URL}`);
  console.log(`[Environment Check]: CHINESE_STOCKS_DB_URL exists: ${!!process.env.CHINESE_STOCKS_DB_URL}`);
  console.log(`[Pool Check]: Available pools: ${Object.keys(pools)}`);
  console.log(`[Pool Check]: Requested pool exists: ${!!pool}`);

  if (!pool) {
    const errorMsg = `Invalid market specified: ${market}. Available markets: ${Object.keys(pools).join(', ')}`;
    console.error(`[API Error - ranking]: ${errorMsg}`);
    return res.status(400).json({ 
      error: errorMsg,
      availableMarkets: Object.keys(pools),
      environmentVariables: {
        NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
        CHINESE_STOCKS_DB_URL: !!process.env.CHINESE_STOCKS_DB_URL
      }
    });
  }

  try {
    const query = `
      SELECT 
        ticker, name_zh, name_en, last_price, change_amount, 
        change_percent, market_cap
      FROM stocks 
      WHERE last_price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL
      ${orderByClause}
      LIMIT 100;`;
    
    console.log(`[API Query - ranking]: Executing query for ${market}`);
    const { rows } = await pool.query(query);
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