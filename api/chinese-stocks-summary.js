// 中概股汇总数据API - 专属端点
const { Pool } = require('pg');

// 创建中概股数据库连接池
function createChineseStocksPool() {
  return new Pool({
    connectionString: process.env.CHINESE_STOCKS_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = createChineseStocksPool();
  let client;
  
  try {
    client = await pool.connect();

    // 查询中概股汇总数据
    const summaryQuery = `
      SELECT 
        -- 总股票数
        COUNT(*) AS total_stocks,
        
        -- 上涨股票数
        COUNT(*) FILTER (WHERE change_percent > 0) AS rising_stocks,
        
        -- 下跌股票数
        COUNT(*) FILTER (WHERE change_percent < 0) AS falling_stocks,
        
        -- 总市值（以百万美元为单位）
        COALESCE(SUM(market_cap), 0) AS total_market_cap
        
      FROM stocks 
      WHERE market_cap IS NOT NULL 
        AND market_cap > 0
        AND last_price IS NOT NULL 
        AND last_price > 0;
    `;

    const result = await client.query(summaryQuery);
    const summary = result.rows[0];

    // 返回格式化的汇总数据
    res.json({
      totalStocks: parseInt(summary.total_stocks) || 0,
      risingStocks: parseInt(summary.rising_stocks) || 0,
      fallingStocks: parseInt(summary.falling_stocks) || 0,
      totalMarketCap: parseFloat(summary.total_market_cap) || 0
    });

  } catch (error) {
    console.error('中概股汇总数据查询失败:', error);
    res.status(500).json({ 
      error: 'Database query failed',
      message: error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
};