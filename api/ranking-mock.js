// 模拟ranking API - 用于测试前端功能
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'top_market_cap', market = 'sp500' } = req.query;

  console.log(`[Mock API - ranking]: type=${type}, market=${market}`);

  // 模拟数据 - 包含所有14个榜单类型
  const mockData = {
    top_market_cap: [
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', name_zh: '谷歌', last_price: 142.30, change_percent: 4.32, market_cap: 1800000000000, volume: 28000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, market_cap: 1600000000000, volume: 42000000 },
      { ticker: 'TSLA', name: 'Tesla Inc.', name_zh: '特斯拉', last_price: 185.20, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 }
    ],
    top_gainers: [
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, market_cap: 1200000000000, volume: 55000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, market_cap: 2800000000000, volume: 65000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, market_cap: 2850000000000, volume: 35000000 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', name_zh: '谷歌', last_price: 142.30, change_percent: 4.32, market_cap: 1800000000000, volume: 28000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, market_cap: 1600000000000, volume: 42000000 }
    ],
    top_losers: [
      { ticker: 'TSLA', name: 'Tesla Inc.', name_zh: '特斯拉', last_price: 185.20, change_percent: -6.32, market_cap: 590000000000, volume: 85000000 },
      { ticker: 'META', name: 'Meta Platforms Inc.', name_zh: 'Meta平台', last_price: 315.60, change_percent: -3.49, market_cap: 800000000000, volume: 25000000 },
      { ticker: 'NFLX', name: 'Netflix Inc.', name_zh: '奈飞', last_price: 425.80, change_percent: -4.25, market_cap: 190000000000, volume: 15000000 },
      { ticker: 'PYPL', name: 'PayPal Holdings Inc.', name_zh: 'PayPal', last_price: 58.90, change_percent: -3.44, market_cap: 65000000000, volume: 18000000 },
      { ticker: 'SNAP', name: 'Snap Inc.', name_zh: 'Snap', last_price: 9.85, change_percent: -4.37, market_cap: 16000000000, volume: 22000000 }
    ],
    new_highs: [
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, week_52_high: 485.90, volume: 55000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, week_52_high: 175.50, volume: 65000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, week_52_high: 380.20, volume: 35000000 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', name_zh: '谷歌', last_price: 142.30, change_percent: 4.32, week_52_high: 142.30, volume: 28000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, week_52_high: 155.80, volume: 42000000 }
    ],
    top_turnover: [
      { ticker: 'TSLA', name: 'Tesla Inc.', name_zh: '特斯拉', last_price: 185.20, change_percent: -6.32, turnover: 15750000000, volume: 85000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, turnover: 11407500000, volume: 65000000 },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, turnover: 26724500000, volume: 55000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, turnover: 6543600000, volume: 42000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, turnover: 13307000000, volume: 35000000 }
    ],
    top_volatility: [
      { ticker: 'TSLA', name: 'Tesla Inc.', name_zh: '特斯拉', last_price: 185.20, change_percent: -6.32, amplitude_percent: 12.5, volume: 85000000 },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, amplitude_percent: 11.2, volume: 55000000 },
      { ticker: 'META', name: 'Meta Platforms Inc.', name_zh: 'Meta平台', last_price: 315.60, change_percent: -3.49, amplitude_percent: 8.7, volume: 25000000 },
      { ticker: 'NFLX', name: 'Netflix Inc.', name_zh: '奈飞', last_price: 425.80, change_percent: -4.25, amplitude_percent: 7.9, volume: 15000000 },
      { ticker: 'SNAP', name: 'Snap Inc.', name_zh: 'Snap', last_price: 9.85, change_percent: -4.37, amplitude_percent: 6.8, volume: 22000000 }
    ],
    top_gap_up: [
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, gap_percent: 5.2, volume: 55000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, gap_percent: 3.1, volume: 65000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, gap_percent: 2.8, volume: 35000000 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', name_zh: '谷歌', last_price: 142.30, change_percent: 4.32, gap_percent: 2.5, volume: 28000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, gap_percent: 1.8, volume: 42000000 }
    ],
    new_lows: [
      { ticker: 'SNAP', name: 'Snap Inc.', name_zh: 'Snap', last_price: 9.85, change_percent: -4.37, week_52_low: 9.85, volume: 22000000 },
      { ticker: 'PYPL', name: 'PayPal Holdings Inc.', name_zh: 'PayPal', last_price: 58.90, change_percent: -3.44, week_52_low: 58.90, volume: 18000000 },
      { ticker: 'NFLX', name: 'Netflix Inc.', name_zh: '奈飞', last_price: 425.80, change_percent: -4.25, week_52_low: 425.80, volume: 15000000 },
      { ticker: 'META', name: 'Meta Platforms Inc.', name_zh: 'Meta平台', last_price: 315.60, change_percent: -3.49, week_52_low: 315.60, volume: 25000000 },
      { ticker: 'TSLA', name: 'Tesla Inc.', name_zh: '特斯拉', last_price: 185.20, change_percent: -6.32, week_52_low: 185.20, volume: 85000000 }
    ],
    institutional_focus: [
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, turnover: 11407500000, price_vs_vwap_percent: 2.1, volume: 65000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, turnover: 13307000000, price_vs_vwap_percent: 1.8, volume: 35000000 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', name_zh: '谷歌', last_price: 142.30, change_percent: 4.32, turnover: 3984400000, price_vs_vwap_percent: 1.5, volume: 28000000 },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, turnover: 26724500000, price_vs_vwap_percent: 3.2, volume: 55000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, turnover: 6543600000, price_vs_vwap_percent: 1.2, volume: 42000000 }
    ],
    retail_hot: [
      { ticker: 'TSLA', name: 'Tesla Inc.', name_zh: '特斯拉', last_price: 185.20, change_percent: -6.32, trade_count: 125000, trades_per_million_shares: 1470.6, volume: 85000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, trade_count: 98000, trades_per_million_shares: 1507.7, volume: 65000000 },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, trade_count: 87000, trades_per_million_shares: 1581.8, volume: 55000000 },
      { ticker: 'SNAP', name: 'Snap Inc.', name_zh: 'Snap', last_price: 9.85, change_percent: -4.37, trade_count: 45000, trades_per_million_shares: 2045.5, volume: 22000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, trade_count: 65000, trades_per_million_shares: 1547.6, volume: 42000000 }
    ],
    smart_money: [
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, price_vs_vwap_percent: 3.2, turnover: 26724500000, volume: 55000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, price_vs_vwap_percent: 2.1, turnover: 11407500000, volume: 65000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, price_vs_vwap_percent: 1.8, turnover: 13307000000, volume: 35000000 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', name_zh: '谷歌', last_price: 142.30, change_percent: 4.32, price_vs_vwap_percent: 1.5, turnover: 3984400000, volume: 28000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, price_vs_vwap_percent: 1.2, turnover: 6543600000, volume: 42000000 }
    ],
    high_liquidity: [
      { ticker: 'TSLA', name: 'Tesla Inc.', name_zh: '特斯拉', last_price: 185.20, change_percent: -6.32, volume: 85000000, turnover_rate_percent: 14.4, turnover: 15750000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, volume: 65000000, turnover_rate_percent: 2.3, turnover: 11407500000 },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, volume: 55000000, turnover_rate_percent: 2.2, turnover: 26724500000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, volume: 42000000, turnover_rate_percent: 2.6, turnover: 6543600000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, volume: 35000000, turnover_rate_percent: 1.2, turnover: 13307000000 }
    ],
    unusual_activity: [
      { ticker: 'SNAP', name: 'Snap Inc.', name_zh: 'Snap', last_price: 9.85, change_percent: -4.37, trade_count: 45000, trades_per_million_shares: 2045.5, volume: 22000000 },
      { ticker: 'PYPL', name: 'PayPal Holdings Inc.', name_zh: 'PayPal', last_price: 58.90, change_percent: -3.44, trade_count: 32000, trades_per_million_shares: 1777.8, volume: 18000000 },
      { ticker: 'NFLX', name: 'Netflix Inc.', name_zh: '奈飞', last_price: 425.80, change_percent: -4.25, trade_count: 28000, trades_per_million_shares: 1866.7, volume: 15000000 },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, trade_count: 87000, trades_per_million_shares: 1581.8, volume: 55000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, trade_count: 98000, trades_per_million_shares: 1507.7, volume: 65000000 }
    ],
    momentum_stocks: [
      { ticker: 'NVDA', name: 'NVIDIA Corporation', name_zh: '英伟达', last_price: 485.90, change_percent: 8.81, momentum_score: 9.2, volume: 55000000 },
      { ticker: 'AAPL', name: 'Apple Inc.', name_zh: '苹果公司', last_price: 175.50, change_percent: 4.93, momentum_score: 8.1, volume: 65000000 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', name_zh: '微软公司', last_price: 380.20, change_percent: 4.34, momentum_score: 7.8, volume: 35000000 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', name_zh: '谷歌', last_price: 142.30, change_percent: 4.32, momentum_score: 7.5, volume: 28000000 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', name_zh: '亚马逊', last_price: 155.80, change_percent: 2.10, momentum_score: 6.8, volume: 42000000 }
    ]
  };

  // 返回对应类型的数据，如果没有则返回市值榜
  const data = mockData[type] || mockData.top_market_cap;
  
  res.status(200).json(data);
}