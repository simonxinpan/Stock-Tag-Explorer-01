// 趋势榜单API - 支持多种榜单类型查询
const { Pool } = require('pg');
const cors = require('cors');

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// CORS配置
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
    return res.status(400).json({ error: 'type parameter is required' });
  }

  let client;
  try {
    client = await pool.connect();
    let query = '';
    let queryParams = [];
    const limit = 25; // 前5%约25名

    switch (type) {
      case 'top_gainers': // 涨幅榜 - 取change_percent前5%
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent DESC 
          LIMIT $1
        `;
        queryParams = [limit];
        break;

      case 'top_losers': // 跌幅榜 - 取change_percent最后5%
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent ASC 
          LIMIT $1
        `;
        queryParams = [limit];
        break;

      case 'high_volume': // 成交额榜 - 按成交额排序
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume, market_cap,
                 (CAST(volume AS BIGINT) * last_price) as turnover
          FROM stocks 
          WHERE volume IS NOT NULL AND volume > 0 AND last_price IS NOT NULL
          ORDER BY (CAST(volume AS BIGINT) * last_price) DESC 
          LIMIT $1
        `;
        queryParams = [limit];
        break;

      case 'new_highs': // 创年内新高
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume, market_cap, week_52_high
          FROM stocks 
          WHERE last_price IS NOT NULL AND week_52_high IS NOT NULL 
                AND last_price >= week_52_high * 0.99
          ORDER BY (last_price / week_52_high) DESC 
          LIMIT $1
        `;
        queryParams = [limit];
        break;

      case 'new_lows': // 创年内新低
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume, market_cap, week_52_low
          FROM stocks 
          WHERE last_price IS NOT NULL AND week_52_low IS NOT NULL 
                AND last_price <= week_52_low * 1.01
          ORDER BY (last_price / week_52_low) ASC 
          LIMIT $1
        `;
        queryParams = [limit];
        break;

      case 'risk_warning': // 风险警示榜 - 大幅下跌股票
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND change_percent < -5
          ORDER BY change_percent ASC 
          LIMIT $1
        `;
        queryParams = [limit];
        break;

      case 'value_picks': // 特色价值榜 - 低PE高股息
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume, market_cap, pe_ratio, dividend_yield
          FROM stocks 
          WHERE pe_ratio IS NOT NULL AND pe_ratio > 0 AND pe_ratio < 20
                AND market_cap IS NOT NULL AND CAST(market_cap AS BIGINT) > 10000
          ORDER BY pe_ratio ASC 
          LIMIT $1
        `;
        queryParams = [limit];
        break;

      default:
        return res.status(400).json({ error: `Unsupported ranking type: ${type}` });
    }

    const result = await client.query(query, queryParams);
    
    // 格式化市值数据
    const formattedStocks = result.rows.map(stock => ({
      ...stock,
      market_cap_formatted: formatMarketCap(stock.market_cap)
    }));

    res.status(200).json(formattedStocks);

  } catch (error) {
    console.error('趋势榜单API错误:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// 格式化市值显示
function formatMarketCap(marketCap) {
  if (!marketCap || marketCap === 0) return 'N/A';
  
  const cap = parseFloat(marketCap);
  if (cap >= 1000000) {
    return (cap / 1000000).toFixed(1) + 'T';
  } else if (cap >= 1000) {
    return (cap / 1000).toFixed(1) + 'B';
  } else {
    return cap.toFixed(1) + 'M';
  }
}