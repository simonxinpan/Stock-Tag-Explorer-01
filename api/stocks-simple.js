// 简化的CORS处理

const mockStocks = {
  'high_volume': [
    { symbol: 'AAPL', name: '苹果公司', price: 195.89, change: 2.34, changePercent: 1.21, volume: 45234567, marketCap: '3.1T' },
    { symbol: 'MSFT', name: '微软公司', price: 378.85, change: -1.23, changePercent: -0.32, volume: 23456789, marketCap: '2.8T' },
    { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change: 3.45, changePercent: 2.48, volume: 34567890, marketCap: '1.8T' },
    { symbol: 'AMZN', name: '亚马逊', price: 155.23, change: -0.87, changePercent: -0.56, volume: 28901234, marketCap: '1.6T' },
    { symbol: 'TSLA', name: '特斯拉', price: 248.42, change: 12.34, changePercent: 5.23, volume: 67890123, marketCap: '789B' }
  ],
  'special_sp500': [
    { symbol: 'AAPL', name: '苹果公司', price: 195.89, change: 2.34, changePercent: 1.21, volume: 45234567, marketCap: '3.1T' },
    { symbol: 'MSFT', name: '微软公司', price: 378.85, change: -1.23, changePercent: -0.32, volume: 23456789, marketCap: '2.8T' },
    { symbol: 'AMZN', name: '亚马逊', price: 155.23, change: -0.87, changePercent: -0.56, volume: 28901234, marketCap: '1.6T' },
    { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change: 3.45, changePercent: 2.48, volume: 34567890, marketCap: '1.8T' },
    { symbol: 'TSLA', name: '特斯拉', price: 248.42, change: 12.34, changePercent: 5.23, volume: 67890123, marketCap: '789B' },
    { symbol: 'BRK.B', name: '伯克希尔B', price: 356.78, change: 1.23, changePercent: 0.35, volume: 4567890, marketCap: '785B' },
    { symbol: 'UNH', name: '联合健康', price: 524.67, change: -3.45, changePercent: -0.65, volume: 2345678, marketCap: '493B' },
    { symbol: 'JNJ', name: '强生公司', price: 156.89, change: 0.78, changePercent: 0.50, volume: 6789012, marketCap: '412B' },
    { symbol: 'JPM', name: '摩根大通', price: 178.45, change: 1.67, changePercent: 0.94, volume: 8901234, marketCap: '523B' },
    { symbol: 'V', name: 'Visa', price: 267.89, change: -0.45, changePercent: -0.17, volume: 5678901, marketCap: '578B' }
  ],
  'rank_market_cap_top10': [
    { symbol: 'AAPL', name: '苹果公司', price: 195.89, change: 2.34, changePercent: 1.21, volume: 45234567, marketCap: '3.1T' },
    { symbol: 'MSFT', name: '微软公司', price: 378.85, change: -1.23, changePercent: -0.32, volume: 23456789, marketCap: '2.8T' },
    { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change: 3.45, changePercent: 2.48, volume: 34567890, marketCap: '1.8T' },
    { symbol: 'AMZN', name: '亚马逊', price: 155.23, change: -0.87, changePercent: -0.56, volume: 28901234, marketCap: '1.6T' },
    { symbol: 'NVDA', name: '英伟达', price: 495.22, change: 8.76, changePercent: 1.80, volume: 45123456, marketCap: '1.2T' },
    { symbol: 'META', name: 'Meta平台', price: 352.96, change: -2.14, changePercent: -0.60, volume: 19876543, marketCap: '896B' },
    { symbol: 'TSLA', name: '特斯拉', price: 248.42, change: 12.34, changePercent: 5.23, volume: 67890123, marketCap: '789B' },
    { symbol: 'BRK.B', name: '伯克希尔B', price: 356.78, change: 1.23, changePercent: 0.35, volume: 4567890, marketCap: '785B' },
    { symbol: 'V', name: 'Visa', price: 267.89, change: -0.45, changePercent: -0.17, volume: 5678901, marketCap: '578B' },
    { symbol: 'JPM', name: '摩根大通', price: 178.45, change: 1.67, changePercent: 0.94, volume: 8901234, marketCap: '523B' }
  ]
};

module.exports = async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tags, sort = 'name-asc', page = 1, limit = 20 } = req.query;
    
    console.log('Mock API called with tags:', tags);
    
    if (!tags || tags.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Tags parameter is required'
      });
    }

    const tagArray = tags.split(',').filter(tag => tag.trim());
    
    if (tagArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one valid tag is required'
      });
    }
    
    // 使用模拟数据
    const allStocks = new Set();
    
    tagArray.forEach(tag => {
      console.log('Processing tag:', tag);
      
      if (mockStocks[tag]) {
        console.log('Found mock data for tag:', tag, 'stocks count:', mockStocks[tag].length);
        mockStocks[tag].forEach(stock => {
          allStocks.add(JSON.stringify(stock));
        });
      } else {
        console.log('No mock data found for tag:', tag);
      }
    });
    
    let stocks = Array.from(allStocks).map(stockStr => JSON.parse(stockStr));
    const totalCount = stocks.length;
    
    console.log('Total stocks found:', totalCount);

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
      default: // name-asc
        stocks.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 分页
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedStocks = stocks.slice(startIndex, endIndex);

    console.log('Returning paginated stocks:', paginatedStocks.length);

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
    console.error('Mock API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};