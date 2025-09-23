// 模拟ranking API - 用于测试前端功能
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'top_market_cap', market = 'sp500' } = req.query;

  console.log(`[Mock API - ranking]: type=${type}, market=${market}`);

  // 模拟数据
  const mockData = {
    top_market_cap: [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 4.32, market_cap: 1800000000000, volume: 28000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.80, change: 3.20, change_percent: 2.10, market_cap: 1600000000000, volume: 42000000 },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 },
      { symbol: 'META', name: 'Meta Platforms Inc.', price: 315.60, change: -11.40, change_percent: -3.49, market_cap: 800000000000, volume: 25000000 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.90, change: 22.30, change_percent: 4.81, market_cap: 1200000000000, volume: 55000000 },
      { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc.', price: 545000, change: 2500, change_percent: 0.46, market_cap: 780000000000, volume: 1200 },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 155.80, change: 2.40, change_percent: 1.56, market_cap: 450000000000, volume: 12000000 },
      { symbol: 'JNJ', name: 'Johnson & Johnson', price: 165.20, change: 1.80, change_percent: 1.10, market_cap: 430000000000, volume: 8500000 }
    ],
    top_gainers: [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.90, change: 22.30, change_percent: 4.81, market_cap: 1200000000000, volume: 55000000 },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 4.32, market_cap: 1800000000000, volume: 28000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.80, change: 3.20, change_percent: 2.10, market_cap: 1600000000000, volume: 42000000 }
    ],
    top_losers: [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 },
      { symbol: 'META', name: 'Meta Platforms Inc.', price: 315.60, change: -11.40, change_percent: -3.49, market_cap: 800000000000, volume: 25000000 },
      { symbol: 'NFLX', name: 'Netflix Inc.', price: 425.80, change: -18.90, change_percent: -4.25, market_cap: 190000000000, volume: 15000000 },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.', price: 58.90, change: -2.10, change_percent: -3.44, market_cap: 65000000000, volume: 18000000 },
      { symbol: 'SNAP', name: 'Snap Inc.', price: 9.85, change: -0.45, change_percent: -4.37, market_cap: 16000000000, volume: 22000000 }
    ],
    new_highs: [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.90, change: 22.30, change_percent: 4.81, market_cap: 1200000000000, volume: 55000000 },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 4.32, market_cap: 1800000000000, volume: 28000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.80, change: 3.20, change_percent: 2.10, market_cap: 1600000000000, volume: 42000000 },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 155.80, change: 2.40, change_percent: 1.56, market_cap: 450000000000, volume: 12000000 },
      { symbol: 'JNJ', name: 'Johnson & Johnson', price: 165.20, change: 1.80, change_percent: 1.10, market_cap: 430000000000, volume: 8500000 },
      { symbol: 'V', name: 'Visa Inc.', price: 245.60, change: 3.80, change_percent: 1.57, market_cap: 520000000000, volume: 5500000 },
      { symbol: 'WMT', name: 'Walmart Inc.', price: 158.90, change: 2.10, change_percent: 1.34, market_cap: 430000000000, volume: 7200000 },
      { symbol: 'PG', name: 'Procter & Gamble Co.', price: 152.40, change: 1.90, change_percent: 1.26, market_cap: 360000000000, volume: 4800000 }
    ],
    new_lows: [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 },
      { symbol: 'META', name: 'Meta Platforms Inc.', price: 315.60, change: -11.40, change_percent: -3.49, market_cap: 800000000000, volume: 25000000 },
      { symbol: 'NFLX', name: 'Netflix Inc.', price: 425.80, change: -18.90, change_percent: -4.25, market_cap: 190000000000, volume: 15000000 },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.', price: 58.90, change: -2.10, change_percent: -3.44, market_cap: 65000000000, volume: 18000000 },
      { symbol: 'SNAP', name: 'Snap Inc.', price: 9.85, change: -0.45, change_percent: -4.37, market_cap: 16000000000, volume: 22000000 }
    ],
    top_turnover: [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.90, change: 22.30, change_percent: 4.81, market_cap: 1200000000000, volume: 55000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.80, change: 3.20, change_percent: 2.10, market_cap: 1600000000000, volume: 42000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 }
    ],
    top_volatility: [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.90, change: 22.30, change_percent: 4.81, market_cap: 1200000000000, volume: 55000000 },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 4.32, market_cap: 1800000000000, volume: 28000000 }
    ]
  };

  // 返回对应类型的数据，如果没有则返回市值榜
  const data = mockData[type] || mockData.top_market_cap;
  
  res.status(200).json(data);
}