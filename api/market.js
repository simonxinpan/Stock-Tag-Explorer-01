const { Pool } = require('pg');
const cors = require('cors');

// 初始化数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// CORS中间件
function enableCors(req, res) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8000',
    'https://stock-tag-explorer.vercel.app',
    'https://stock-tag-explorer-01.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// 获取市场指数数据
async function fetchMarketIndices() {
  const indices = ['SPY', 'QQQ', 'IWM', 'DIA']; // 主要市场指数ETF
  const marketData = [];
  
  for (const symbol of indices) {
    try {
      let indexData = null;
      
      // 尝试从Polygon获取数据
      if (process.env.POLYGON_API_KEY) {
        try {
          const response = await fetch(
            `https://api.polygon.io/v2/last/trade/${symbol}?apikey=${process.env.POLYGON_API_KEY}`
          );
          const data = await response.json();
          if (data.results) {
            indexData = {
              symbol,
              price: data.results.p,
              change: 0, // 需要历史数据计算
              changePercent: 0
            };
          }
        } catch (error) {
          console.warn(`Polygon error for ${symbol}:`, error.message);
        }
      }
      
      // 如果Polygon失败，尝试Finnhub
      if (!indexData && process.env.FINNHUB_API_KEY) {
        try {
          const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
          );
          const data = await response.json();
          if (data.c) {
            indexData = {
              symbol,
              price: data.c,
              change: data.d || 0,
              changePercent: data.dp || 0
            };
          }
        } catch (error) {
          console.warn(`Finnhub error for ${symbol}:`, error.message);
        }
      }
      
      if (indexData) {
        marketData.push(indexData);
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol}:`, error.message);
    }
  }
  
  return marketData;
}

// 获取市场统计数据
async function getMarketStats() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_stocks,
        COUNT(CASE WHEN change_percent > 0 THEN 1 END) as gainers,
        COUNT(CASE WHEN change_percent < 0 THEN 1 END) as losers,
        AVG(change_percent) as avg_change,
        SUM(volume) as total_volume
      FROM stocks
      WHERE updated_at > NOW() - INTERVAL '1 day'
    `);
    
    return result.rows[0];
  } catch (error) {
    console.error('Database error:', error);
    // 返回模拟数据
    return {
      total_stocks: 150,
      gainers: 75,
      losers: 65,
      avg_change: 0.5,
      total_volume: 1250000000
    };
  }
}

// 主处理函数
module.exports = async (req, res) => {
  // 处理CORS
  if (enableCors(req, res)) {
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const [marketIndices, marketStats] = await Promise.all([
      fetchMarketIndices(),
      getMarketStats()
    ]);
    
    res.json({
      success: true,
      data: {
        indices: marketIndices,
        stats: {
          totalStocks: parseInt(marketStats.total_stocks),
          gainers: parseInt(marketStats.gainers),
          losers: parseInt(marketStats.losers),
          avgChange: parseFloat(marketStats.avg_change || 0).toFixed(2),
          totalVolume: parseInt(marketStats.total_volume || 0)
        },
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Market API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error.message
    });
  }
};