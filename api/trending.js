const { Pool } = require('pg');
const cors = require('cors');

// 初始化数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// CORS中间件
const corsMiddleware = cors({
  origin: ['http://localhost:3000', 'http://localhost:8000', 'https://stock-tag-explorer.vercel.app', 'https://stock-tag-explorer-01.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
});

module.exports = async function handler(req, res) {
  // 应用CORS中间件
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Missing type parameter' });
  }

  let client;
  try {
    client = await pool.connect();
    
    let query = '';
    let queryParams = [];
    
    switch (type) {
      case 'top_gainers':
        // 每日涨幅榜 - 当日涨幅最高的股票
        query = `
          SELECT ticker, name_zh, current_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND change_percent > 0
          ORDER BY change_percent DESC 
          LIMIT 10
        `;
        break;
        
      case 'high_volume':
        // 成交量榜 - 当日成交量最高的股票
        query = `
          SELECT ticker, name_zh, current_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE volume IS NOT NULL AND volume > 0
          ORDER BY volume DESC 
          LIMIT 10
        `;
        break;
        
      case 'market_leaders':
        // 市值领导者 - 市值最大的股票
        query = `
          SELECT ticker, name_zh, current_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE market_cap IS NOT NULL AND market_cap > 0
          ORDER BY CAST(market_cap AS BIGINT) DESC 
          LIMIT 10
        `;
        break;
        
      case 'risk_warning':
        // 风险警示榜 - 当日跌幅最大的股票
        query = `
          SELECT ticker, name_zh, current_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND change_percent < 0
          ORDER BY change_percent ASC 
          LIMIT 10
        `;
        break;
        
      case 'high_volatility':
        // 高波动榜 - 绝对涨跌幅最大的股票
        query = `
          SELECT ticker, name_zh, current_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL
          ORDER BY ABS(change_percent) DESC 
          LIMIT 10
        `;
        break;
        
      case 'value_picks':
        // 特色价值榜 - 基于PE比率的价值股
        query = `
          SELECT ticker, name_zh, current_price, change_percent, volume, market_cap, pe_ratio
          FROM stocks 
          WHERE pe_ratio IS NOT NULL AND pe_ratio > 0 AND pe_ratio < 20
          ORDER BY pe_ratio ASC 
          LIMIT 10
        `;
        break;
        
      case 'growth_stocks':
        // 成长股榜 - 基于ROE的成长股
        query = `
          SELECT ticker, name_zh, current_price, change_percent, volume, market_cap, roe
          FROM stocks 
          WHERE roe IS NOT NULL AND roe > 15
          ORDER BY roe DESC 
          LIMIT 10
        `;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid type parameter' });
    }
    
    console.log(`Executing trending query for type: ${type}`);
    console.log('Query:', query);
    
    const result = await client.query(query, queryParams);
    
    // 格式化返回数据
    const formattedData = result.rows.map(stock => ({
      ticker: stock.ticker,
      name: stock.name_zh || stock.ticker,
      price: parseFloat(stock.current_price) || 0,
      change: parseFloat(stock.change_percent) || 0,
      volume: parseInt(stock.volume) || 0,
      marketCap: formatMarketCap(stock.market_cap),
      pe_ratio: stock.pe_ratio ? parseFloat(stock.pe_ratio) : null,
      roe: stock.roe ? parseFloat(stock.roe) : null
    }));
    
    res.status(200).json({
      success: true,
      type: type,
      data: formattedData,
      count: formattedData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Trending API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// 格式化市值显示
function formatMarketCap(marketCap) {
  if (!marketCap || marketCap === 0) return 'N/A';
  
  const cap = parseInt(marketCap);
  if (cap >= 1000000) {
    return `${(cap / 1000000).toFixed(1)}T`;
  } else if (cap >= 1000) {
    return `${(cap / 1000).toFixed(1)}B`;
  } else {
    return `${cap}M`;
  }
}