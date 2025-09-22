// 模拟ranking API - 用于测试前端功能
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'top_market_cap', market = 'sp500' } = req.query;

  console.log(`[Mock API - ranking]: type=${type}, market=${market}`);

  // 生成25条模拟数据的函数
  function generateMockData(baseData, type) {
    const result = [...baseData];
    const symbols = ['BABA', 'JD', 'PDD', 'NTES', 'TME', 'BILI', 'IQ', 'VIPS', 'WB', 'DIDI', 'XPEV', 'NIO', 'LI', 'EDU', 'TAL', 'GOTU', 'YMM', 'DOYU', 'HUYA', 'MOMO', 'YY', 'WUBA', 'TOUR', 'SOHU', 'SINA'];
    
    for (let i = result.length; i < 25; i++) {
      const symbol = symbols[i - result.length] || `STOCK${i}`;
      const basePrice = 50 + Math.random() * 200;
      const changePercent = (Math.random() - 0.5) * 20; // -10% to +10%
      const change = basePrice * changePercent / 100;
      
      result.push({
        symbol: symbol,
        name: `${symbol} Company Ltd.`,
        price: parseFloat(basePrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        change_percent: parseFloat(changePercent.toFixed(2)),
        market_cap: Math.floor(Math.random() * 500000000000) + 10000000000,
        volume: Math.floor(Math.random() * 50000000) + 1000000
      });
    }
    
    return result.slice(0, 25);
  }

  // 基础模拟数据
  const baseData = {
    top_market_cap: [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 4.32, market_cap: 1800000000000, volume: 28000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.80, change: 3.20, change_percent: 2.10, market_cap: 1600000000000, volume: 42000000 },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 }
    ],
    top_gainers: [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.90, change: 22.30, change_percent: 8.81, market_cap: 1200000000000, volume: 55000000 },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 7.93, market_cap: 2800000000000, volume: 65000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 6.34, market_cap: 2850000000000, volume: 35000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 5.32, market_cap: 1800000000000, volume: 28000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.80, change: 3.20, change_percent: 4.10, market_cap: 1600000000000, volume: 42000000 }
    ],
    top_losers: [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 },
      { symbol: 'META', name: 'Meta Platforms Inc.', price: 315.60, change: -11.40, change_percent: -3.49, market_cap: 800000000000, volume: 25000000 },
      { symbol: 'NFLX', name: 'Netflix Inc.', price: 425.80, change: -18.90, change_percent: -4.25, market_cap: 190000000000, volume: 15000000 },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.', price: 58.90, change: -2.10, change_percent: -3.44, market_cap: 65000000000, volume: 18000000 },
      { symbol: 'SNAP', name: 'Snap Inc.', price: 9.85, change: -0.45, change_percent: -4.37, market_cap: 16000000000, volume: 22000000 }
    ]
  };

  // 为所有榜单类型生成25条数据
  const mockData = {};
  const allTypes = ['top_market_cap', 'top_gainers', 'top_losers', 'top_volume', 'top_turnover', 'new_highs', 'new_lows', 'top_amplitude', 'momentum_stocks', 'retail_hot', 'high_liquidity', 'unusual_activity', 'top_gap_up', 'top_gap_down'];
  
  allTypes.forEach(listType => {
    if (baseData[listType]) {
      mockData[listType] = generateMockData(baseData[listType], listType);
    } else {
      // 为没有基础数据的榜单生成数据
      mockData[listType] = generateMockData(baseData.top_market_cap, listType);
    }
  });

  // 返回对应类型的数据，如果没有则返回市值榜
  const data = mockData[type] || mockData.top_market_cap;
  
  res.status(200).json(data);
}