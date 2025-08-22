// 市场汇总数据API - 计算风向标指标
const { Pool } = require('pg');

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async function handler(req, res) {
  // CORS已在server.js中处理

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    client = await pool.connect();

    // --- 核心：使用条件聚合在一个查询中计算多个指标 ---
    const summaryQuery = `
      SELECT 
        -- 任务2: 总股票数
        COUNT(*) AS total_stocks,
        
        -- 任务3: 上涨股票数
        COUNT(*) FILTER (WHERE change_percent > 0) AS rising_stocks,
        
        -- 任务4: 下跌股票数
        COUNT(*) FILTER (WHERE change_percent < 0) AS falling_stocks,
        
        -- 任务5: 总市值 (需要处理数值类型)
        SUM(CAST(market_cap AS NUMERIC)) AS total_market_cap
      FROM stocks
      WHERE market_cap IS NOT NULL AND market_cap > 0;
    `;

    const { rows: summaryRows } = await client.query(summaryQuery);
    const summaryData = summaryRows[0];

    // --- 任务7: 单独查询计算活跃股票 ---
    // 行业标准：日换手率 > 5% 通常被认为是高度活跃
    const turnoverThreshold = 0.05;
    const activeStocksQuery = `
        SELECT COUNT(*) AS active_stocks_count
        FROM stocks 
        WHERE 
            volume IS NOT NULL AND 
            last_price IS NOT NULL AND 
            market_cap IS NOT NULL AND 
            market_cap > 0 AND 
            volume > 0 AND
            -- 核心逻辑: (日成交额 / 总市值) > 阈值
            -- 注意单位换算：market_cap 的单位是百万美元
            (CAST(volume AS BIGINT) * last_price) / (market_cap * 1000000) > ${turnoverThreshold};
    `;
    const { rows: activeStocksRows } = await client.query(activeStocksQuery);
    


    client.release();

    // --- 组合所有数据并返回 ---
    const responseData = {
      totalStocks: parseInt(summaryData.total_stocks, 10),
      risingStocks: parseInt(summaryData.rising_stocks, 10),
      fallingStocks: parseInt(summaryData.falling_stocks, 10),
      totalMarketCap: parseFloat(summaryData.total_market_cap),
      activeStocks: parseInt(activeStocksRows[0].active_stocks_count, 10),
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Market Summary API Error:', error);
    return res.status(500).json({ error: 'Database query failed.' });
  }
};