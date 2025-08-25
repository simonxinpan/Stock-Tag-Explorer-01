// 模拟趋势榜单API - 用于演示新榜单功能
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'type parameter is required' });
  }

  // 模拟数据
  const mockData = {
    // 现有榜单
    'gainers': [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, market_cap: 2800000000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, market_cap: 2850000000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 4.32, market_cap: 1800000000000 }
    ],
    'losers': [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, market_cap: 590000000000 },
      { symbol: 'NFLX', name: 'Netflix Inc.', price: 425.80, change: -18.90, change_percent: -4.25, market_cap: 190000000000 },
      { symbol: 'META', name: 'Meta Platforms Inc.', price: 315.60, change: -11.40, change_percent: -3.49, market_cap: 800000000000 }
    ],
    'volume': [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 445.20, change: 2.10, change_percent: 0.47, volume: 85000000, turnover: 37834000000 },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 385.90, change: 3.80, change_percent: 0.99, volume: 42000000, turnover: 16207800000 },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, volume: 65000000, turnover: 11407500000 }
    ],
    
    // 🆕 新榜单 - 基于Polygon API数据
    'institutional_focus': [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 8.25, change_percent: 4.93, turnover: 11407500000, vwap: 172.80, vwap_deviation: 1.56 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 380.20, change: 15.80, change_percent: 4.34, turnover: 8950000000, vwap: 375.60, vwap_deviation: 1.22 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: 5.90, change_percent: 4.32, turnover: 6780000000, vwap: 140.90, vwap_deviation: 0.99 }
    ],
    'retail_popular': [
      { symbol: 'GME', name: 'GameStop Corp.', price: 18.50, change: 1.20, change_percent: 6.94, trade_count: 125000, trades_per_million_shares: 8500 },
      { symbol: 'AMC', name: 'AMC Entertainment Holdings', price: 4.85, change: 0.35, change_percent: 7.78, trade_count: 98000, trades_per_million_shares: 7200 },
      { symbol: 'BBBY', name: 'Bed Bath & Beyond Inc.', price: 0.85, change: 0.08, change_percent: 10.39, trade_count: 85000, trades_per_million_shares: 6800 }
    ],
    'smart_money': [
      { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc.', price: 545000, change: 2500, change_percent: 0.46, vwap: 543200, vwap_deviation: 0.33 },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 155.80, change: 2.40, change_percent: 1.56, vwap: 154.20, vwap_deviation: 1.04 },
      { symbol: 'BAC', name: 'Bank of America Corp.', price: 32.50, change: 0.85, change_percent: 2.69, vwap: 31.90, vwap_deviation: 1.88 }
    ],
    'high_liquidity': [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 445.20, change: 2.10, change_percent: 0.47, volume: 85000000, turnover_rate: 0.85 },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 385.90, change: 3.80, change_percent: 0.99, volume: 42000000, turnover_rate: 0.72 },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF', price: 195.40, change: 1.60, change_percent: 0.83, volume: 28000000, turnover_rate: 0.68 }
    ],
    'unusual_activity': [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.20, change: 25.80, change_percent: 5.62, volume: 45000000, avg_volume: 28000000 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', price: 125.60, change: 8.90, change_percent: 7.63, volume: 38000000, avg_volume: 22000000 },
      { symbol: 'INTC', name: 'Intel Corporation', price: 42.80, change: 2.10, change_percent: 5.16, volume: 55000000, avg_volume: 35000000 }
    ],
    'momentum': [
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.20, change: -12.50, change_percent: -6.32, momentum_score: 85.6 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 485.20, change: 25.80, change_percent: 5.62, momentum_score: 92.3 },
      { symbol: 'META', name: 'Meta Platforms Inc.', price: 315.60, change: -11.40, change_percent: -3.49, momentum_score: 78.9 }
    ]
  };

  const data = mockData[type] || [];
  
  res.json({
    success: true,
    type,
    data,
    count: data.length,
    timestamp: new Date().toISOString(),
    note: '🔧 使用模拟数据演示新榜单功能'
  });
};