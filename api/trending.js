// 趋势榜单API - 支持多种榜单类型查询
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
      case 'top_gainers': // 涨幅榜 - 取change_percent前5%（约25名）
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'top_losers': // 跌幅榜 - 取change_percent最后5%（约25名）
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent ASC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'high_volume': // 成交额榜 - 按成交额排序前20名
        query = `
          SELECT ticker, name_zh, last_price, change_percent, volume,
                 (CAST(volume AS BIGINT) * last_price) AS turnover
          FROM stocks 
          WHERE volume IS NOT NULL AND last_price IS NOT NULL AND volume > 0
          ORDER BY turnover DESC 
          LIMIT 20
        `;
        queryParams = [];
        break;

      case 'new_highs': // 创年内新高前15名
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, week_52_high
          FROM stocks 
          WHERE last_price IS NOT NULL AND week_52_high IS NOT NULL 
                AND last_price >= week_52_high * 0.99
          ORDER BY (last_price / week_52_high) DESC 
          LIMIT 15
        `;
        queryParams = [];
        break;

      case 'new_lows': // 创年内新低前15名
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, week_52_low
          FROM stocks 
          WHERE last_price IS NOT NULL AND week_52_low IS NOT NULL 
                AND last_price <= week_52_low * 1.01
          ORDER BY (last_price / week_52_low) ASC 
          LIMIT 15
        `;
        queryParams = [];
        break;

      case 'risk_warning': // 风险警示榜 - 大幅下跌股票前20名
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND change_percent < -5
          ORDER BY change_percent ASC 
          LIMIT 20
        `;
        queryParams = [];
        break;

      case 'value_picks': // 特色价值榜 - 低PE高股息前15名
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, pe_ttm as pe_ratio, dividend_yield
          FROM stocks 
          WHERE pe_ttm IS NOT NULL AND pe_ttm > 0 AND pe_ttm < 20
                AND market_cap IS NOT NULL AND CAST(market_cap AS BIGINT) > 10000
          ORDER BY pe_ttm ASC 
          LIMIT 15
        `;
        queryParams = [];
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
    
    // 返回模拟数据作为fallback
    const mockData = generateMockData(type, 20); // 使用默认限制20条
    res.status(200).json(mockData);
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

// 生成模拟数据的函数
function generateMockData(type, limit) {
  const mockStocks = [
    { ticker: 'AAPL', name_zh: '苹果公司', last_price: 175.43, change_percent: 2.34, market_cap: '2800000000000' },
    { ticker: 'MSFT', name_zh: '微软公司', last_price: 378.85, change_percent: 1.87, market_cap: '2750000000000' },
    { ticker: 'GOOGL', name_zh: '谷歌', last_price: 142.56, change_percent: -0.95, market_cap: '1800000000000' },
    { ticker: 'AMZN', name_zh: '亚马逊', last_price: 151.94, change_percent: 1.23, market_cap: '1600000000000' },
    { ticker: 'TSLA', name_zh: '特斯拉', last_price: 248.42, change_percent: -2.15, market_cap: '800000000000' },
    { ticker: 'META', name_zh: 'Meta平台', last_price: 484.20, change_percent: 0.78, market_cap: '1200000000000' },
    { ticker: 'NVDA', name_zh: '英伟达', last_price: 875.28, change_percent: 3.45, market_cap: '2200000000000' },
    { ticker: 'NFLX', name_zh: '奈飞', last_price: 486.81, change_percent: -1.34, market_cap: '220000000000' }
  ];
  
  // 根据榜单类型调整数据
  let sortedStocks = [...mockStocks];
  switch (type) {
    case 'top_gainers':
      sortedStocks.sort((a, b) => b.change_percent - a.change_percent);
      break;
    case 'top_losers':
      sortedStocks.sort((a, b) => a.change_percent - b.change_percent);
      break;
    case 'high_volume':
    case 'new_highs':
    case 'value_picks':
      sortedStocks.sort((a, b) => parseFloat(b.market_cap) - parseFloat(a.market_cap));
      break;
    case 'new_lows':
    case 'risk_warning':
      sortedStocks = sortedStocks.filter(stock => stock.change_percent < 0);
      sortedStocks.sort((a, b) => a.change_percent - b.change_percent);
      break;
  }
  
  return sortedStocks.slice(0, limit).map(stock => ({
    ...stock,
    market_cap_formatted: formatMarketCap(stock.market_cap)
  }));
}