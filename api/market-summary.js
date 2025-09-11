// 市场汇总数据API - 计算风向标指标（最终安全版）
const { Pool } = require('pg');

// 根据市场类型获取数据库连接字符串
function getDatabaseUrl(market) {
  switch (market) {
    case 'chinese_stocks':
      return process.env.CHINESE_STOCKS_DATABASE_URL;
    case 'sp500':
    default:
      return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  }
}

// 创建数据库连接池
function createPool(market) {
  return new Pool({
    connectionString: getDatabaseUrl(market),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

module.exports = async function handler(req, res) {
  // CORS已在server.js中处理

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { market = 'sp500' } = req.query;
  
  // 根据市场类型创建对应的数据库连接池
  const pool = createPool(market);

  let client;
  try {
    client = await pool.connect();

    // 核心：只查询数据库中确定存在的字段
    const summaryQuery = `
      SELECT 
        -- 总股票数
        COUNT(*) AS total_stocks,
        
        -- 上涨股票数
        COUNT(*) FILTER (WHERE change_percent > 0) AS rising_stocks,
        
        -- 下跌股票数
        COUNT(*) FILTER (WHERE change_percent < 0) AS falling_stocks,
        
        -- 总市值 (单位：百万美元)
        SUM(CAST(market_cap AS NUMERIC)) AS total_market_cap
      FROM stocks;
    `;

    const { rows: summaryRows } = await client.query(summaryQuery);
    const summaryData = summaryRows[0];

    // 组合所有数据并返回
    const responseData = {
      totalStocks: parseInt(summaryData.total_stocks, 10),
      risingStocks: parseInt(summaryData.rising_stocks, 10),
      fallingStocks: parseInt(summaryData.falling_stocks, 10),
      totalMarketCap: parseFloat(summaryData.total_market_cap) // 单位是百万美元
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Market Summary API Error:', error);
    return res.status(500).json({ error: 'Database query failed.' });
  } finally {
    if (client) {
      client.release();
    }
  }
};