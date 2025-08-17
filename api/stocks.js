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

// 简化的数据获取函数 - 避免外部API调用超时
async function getStockData(symbols) {
  // 直接返回空数组，依赖数据库中的数据
  console.log(`Requested data for ${symbols.length} symbols, using database data only`);
  return [];
}

// Polygon.io API调用
async function fetchFromPolygon(symbol) {
  if (!process.env.POLYGON_API_KEY) {
    console.log('POLYGON_API_KEY not found in environment variables');
    return null;
  }
  
  console.log(`Calling Polygon API for ${symbol}...`);
  
  try {
    // 使用更稳定的API端点
    const [quoteResponse, detailsResponse] = await Promise.all([
      fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`),
      fetch(`https://api.polygon.io/v3/reference/tickers/${symbol}?apikey=${process.env.POLYGON_API_KEY}`)
    ]);
    
    const quoteData = await quoteResponse.json();
    const detailsData = await detailsResponse.json();
    const quote = quoteData.results?.[0];
    const details = detailsData.results;
    
    if (quote && details) {
      const currentPrice = quote.c || 0;
      const previousClose = quote.o || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      
      return {
        symbol: symbol,
        name: details.name || symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: quote.v || 0,
        marketCap: details.market_cap ? formatMarketCap(details.market_cap) : 'N/A',
        sector: details.sic_description || 'Unknown',
        industry: details.description || 'Unknown',
        lastUpdated: new Date().toISOString()
      };
    }
  } catch (error) {
    console.warn(`Polygon API error for ${symbol}:`, error.message);
  }
  
  return null;
}

// Finnhub API调用
async function fetchFromFinnhub(symbol) {
  if (!process.env.FINNHUB_API_KEY) {
    console.log('FINNHUB_API_KEY not found in environment variables');
    return null;
  }
  
  console.log(`Calling Finnhub API for ${symbol}...`);
  
  try {
    const [quoteResponse, profileResponse] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`)
    ]);
    
    const quote = await quoteResponse.json();
    const profile = await profileResponse.json();
    
    if (quote && quote.c) {
      return {
        symbol: symbol,
        name: profile.name || symbol,
        price: quote.c,
        change: quote.d || 0,
        changePercent: quote.dp || 0,
        volume: 0, // Finnhub免费版不提供
        marketCap: profile.marketCapitalization ? formatMarketCap(profile.marketCapitalization * 1000000) : 'N/A',
        sector: profile.finnhubIndustry || 'Unknown',
        industry: profile.finnhubIndustry || 'Unknown',
        lastUpdated: new Date().toISOString()
      };
    }
  } catch (error) {
    console.warn(`Finnhub API error for ${symbol}:`, error.message);
  }
  
  return null;
}

// 格式化市值
function formatMarketCap(marketCap) {
  if (marketCap >= 1e12) {
    return (marketCap / 1e12).toFixed(1) + 'T';
  } else if (marketCap >= 1e9) {
    return (marketCap / 1e9).toFixed(1) + 'B';
  } else if (marketCap >= 1e6) {
    return (marketCap / 1e6).toFixed(1) + 'M';
  }
  return marketCap.toString();
}

// 备用模拟股票数据
const mockStocks = {
  'high_volume': [
    { symbol: 'AAPL', name: '苹果公司', price: 195.89, change: 2.34, changePercent: 1.21, volume: 45234567, marketCap: '3.1T' },
    { symbol: 'MSFT', name: '微软公司', price: 378.85, change: -1.23, changePercent: -0.32, volume: 23456789, marketCap: '2.8T' },
    { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change: 3.45, changePercent: 2.48, volume: 34567890, marketCap: '1.8T' },
    { symbol: 'AMZN', name: '亚马逊', price: 155.23, change: -0.87, changePercent: -0.56, volume: 28901234, marketCap: '1.6T' },
    { symbol: 'TSLA', name: '特斯拉', price: 248.42, change: 12.34, changePercent: 5.23, volume: 67890123, marketCap: '789B' }
  ],
  'high_roe': [
    { symbol: 'NVDA', name: '英伟达', price: 495.22, change: 8.76, changePercent: 1.80, volume: 45123456, marketCap: '1.2T' },
    { symbol: 'META', name: 'Meta平台', price: 352.96, change: -2.14, changePercent: -0.60, volume: 19876543, marketCap: '896B' },
    { symbol: 'NFLX', name: '奈飞', price: 487.83, change: 5.67, changePercent: 1.18, volume: 8765432, marketCap: '217B' },
    { symbol: 'CRM', name: 'Salesforce', price: 267.45, change: 3.21, changePercent: 1.22, volume: 5432109, marketCap: '261B' }
  ],
  'technology': [
    { symbol: 'AAPL', name: '苹果公司', price: 195.89, change: 2.34, changePercent: 1.21, volume: 45234567, marketCap: '3.1T' },
    { symbol: 'MSFT', name: '微软公司', price: 378.85, change: -1.23, changePercent: -0.32, volume: 23456789, marketCap: '2.8T' },
    { symbol: 'NVDA', name: '英伟达', price: 495.22, change: 8.76, changePercent: 1.80, volume: 45123456, marketCap: '1.2T' },
    { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change: 3.45, changePercent: 2.48, volume: 34567890, marketCap: '1.8T' },
    { symbol: 'META', name: 'Meta平台', price: 352.96, change: -2.14, changePercent: -0.60, volume: 19876543, marketCap: '896B' },
    { symbol: 'ADBE', name: 'Adobe', price: 567.89, change: 4.32, changePercent: 0.77, volume: 3456789, marketCap: '258B' }
  ],
  'sp500': [
    { symbol: 'AAPL', name: '苹果公司', price: 195.89, change: 2.34, changePercent: 1.21, volume: 45234567, marketCap: '3.1T' },
    { symbol: 'MSFT', name: '微软公司', price: 378.85, change: -1.23, changePercent: -0.32, volume: 23456789, marketCap: '2.8T' },
    { symbol: 'AMZN', name: '亚马逊', price: 155.23, change: -0.87, changePercent: -0.56, volume: 28901234, marketCap: '1.6T' },
    { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change: 3.45, changePercent: 2.48, volume: 34567890, marketCap: '1.8T' },
    { symbol: 'TSLA', name: '特斯拉', price: 248.42, change: 12.34, changePercent: 5.23, volume: 67890123, marketCap: '789B' },
    { symbol: 'BRK.B', name: '伯克希尔B', price: 356.78, change: 1.23, changePercent: 0.35, volume: 4567890, marketCap: '785B' },
    { symbol: 'UNH', name: '联合健康', price: 524.67, change: -3.45, changePercent: -0.65, volume: 2345678, marketCap: '493B' },
    { symbol: 'JNJ', name: '强生公司', price: 156.89, change: 0.78, changePercent: 0.50, volume: 6789012, marketCap: '412B' }
  ]
};

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

  try {
    const { tags, sort = 'name-asc', page = 1, limit = 20 } = req.query;
    
    let stocks = [];
    let totalCount = 0;

    if (!tags) {
      return res.status(400).json({
        success: false,
        error: 'Tags parameter is required'
      });
    }

    const tagArray = tags.split(',').filter(tag => tag.trim());
    
    try {
      const client = await pool.connect();
      
      // 检查表是否存在
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'stocks'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        // 从数据库获取股票数据
        const placeholders = tagArray.map((_, index) => `$${index + 1}`).join(',');
        
        const query = `
          SELECT DISTINCT s.*
          FROM stocks s
          JOIN stock_tags st ON s.ticker = st.stock_ticker
          WHERE st.tag_id IN (${placeholders})
          ORDER BY s.ticker
          LIMIT 100
        `;
        
        const result = await client.query(query, tagArray);
        const dbStocks = result.rows;
        
        // 直接使用数据库数据，避免外部API调用
        stocks = dbStocks.map(dbStock => ({
          symbol: dbStock.ticker,
          name: dbStock.name_zh || dbStock.name_en || dbStock.ticker,
          price: dbStock.last_price || 0,
          change: dbStock.change_amount || 0,
          changePercent: dbStock.change_percent || 0,
          volume: 0, // volume字段已移除
          marketCap: dbStock.market_cap || 'N/A',
          sector: dbStock.sector_zh || dbStock.sector_en || 'Unknown',
          industry: 'Unknown',
          lastUpdated: dbStock.last_updated || new Date().toISOString()
        }));
        
        totalCount = stocks.length;
      } else {
        // 表不存在，使用模拟数据
        const allStocks = new Set();
        
        tagArray.forEach(tag => {
          if (mockStocks[tag]) {
            mockStocks[tag].forEach(stock => {
              allStocks.add(JSON.stringify(stock));
            });
          }
        });
        
        stocks = Array.from(allStocks).map(stockStr => JSON.parse(stockStr));
        totalCount = stocks.length;
      }
      
      client.release();
    } catch (dbError) {
      console.warn('Database connection failed, using mock data:', dbError.message);
      
      // 使用模拟数据
      const allStocks = new Set();
      
      tagArray.forEach(tag => {
        if (mockStocks[tag]) {
          mockStocks[tag].forEach(stock => {
            allStocks.add(JSON.stringify(stock));
          });
        }
      });
      
      stocks = Array.from(allStocks).map(stockStr => JSON.parse(stockStr));
      totalCount = stocks.length;
    }

    // 排序
    switch (sort) {
      case 'name-desc':
        stocks.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        stocks.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        stocks.sort((a, b) => b.price - a.price);
        break;
      case 'change-asc':
        stocks.sort((a, b) => a.changePercent - b.changePercent);
        break;
      case 'change-desc':
        stocks.sort((a, b) => b.changePercent - a.changePercent);
        break;
      case 'volume-asc':
        stocks.sort((a, b) => a.volume - b.volume);
        break;
      case 'volume-desc':
        stocks.sort((a, b) => b.volume - a.volume);
        break;
      default: // name-asc
        stocks.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 分页
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedStocks = stocks.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        stocks: paginatedStocks,
        pagination: {
          current: pageNum,
          total: Math.ceil(totalCount / limitNum),
          count: totalCount,
          limit: limitNum
        },
        filters: {
          tags: tagArray,
          sort
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};