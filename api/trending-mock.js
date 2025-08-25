// 模拟趋势榜单API - 用于演示前端功能
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
    top_gainers: [
      {
        ticker: 'AAPL',
        company_name: 'Apple Inc.',
        last_price: 175.50,
        change_percent: 5.25,
        change_amount: 8.75,
        market_cap: 2800000000000,
        volume: 45000000,
        turnover: 7875000000
      },
      {
        ticker: 'MSFT',
        company_name: 'Microsoft Corporation',
        last_price: 380.25,
        change_percent: 4.80,
        change_amount: 17.45,
        market_cap: 2850000000000,
        volume: 32000000,
        turnover: 12168000000
      },
      {
        ticker: 'GOOGL',
        company_name: 'Alphabet Inc.',
        last_price: 142.30,
        change_percent: 3.95,
        change_amount: 5.40,
        market_cap: 1800000000000,
        volume: 28000000,
        turnover: 3984400000
      },
      {
        ticker: 'TSLA',
        company_name: 'Tesla Inc.',
        last_price: 245.80,
        change_percent: 6.75,
        change_amount: 15.55,
        market_cap: 780000000000,
        volume: 55000000,
        turnover: 13519000000
      },
      {
        ticker: 'NVDA',
        company_name: 'NVIDIA Corporation',
        last_price: 485.20,
        change_percent: 8.20,
        change_amount: 36.75,
        market_cap: 1200000000000,
        volume: 42000000,
        turnover: 20378400000
      }
    ],
    high_volume: [
      {
        ticker: 'TSLA',
        company_name: 'Tesla Inc.',
        last_price: 245.80,
        change_percent: 6.75,
        volume: 55000000,
        turnover: 13519000000
      },
      {
        ticker: 'AAPL',
        company_name: 'Apple Inc.',
        last_price: 175.50,
        change_percent: 5.25,
        volume: 45000000,
        turnover: 7875000000
      },
      {
        ticker: 'NVDA',
        company_name: 'NVIDIA Corporation',
        last_price: 485.20,
        change_percent: 8.20,
        volume: 42000000,
        turnover: 20378400000
      },
      {
        ticker: 'MSFT',
        company_name: 'Microsoft Corporation',
        last_price: 380.25,
        change_percent: 4.80,
        volume: 32000000,
        turnover: 12168000000
      },
      {
        ticker: 'GOOGL',
        company_name: 'Alphabet Inc.',
        last_price: 142.30,
        change_percent: 3.95,
        volume: 28000000,
        turnover: 3984400000
      }
    ],
    top_turnover: [
      {
        ticker: 'NVDA',
        company_name: 'NVIDIA Corporation',
        last_price: 485.20,
        change_percent: 8.20,
        turnover: 20378400000
      },
      {
        ticker: 'TSLA',
        company_name: 'Tesla Inc.',
        last_price: 245.80,
        change_percent: 6.75,
        turnover: 13519000000
      },
      {
        ticker: 'MSFT',
        company_name: 'Microsoft Corporation',
        last_price: 380.25,
        change_percent: 4.80,
        turnover: 12168000000
      },
      {
        ticker: 'AAPL',
        company_name: 'Apple Inc.',
        last_price: 175.50,
        change_percent: 5.25,
        turnover: 7875000000
      },
      {
        ticker: 'GOOGL',
        company_name: 'Alphabet Inc.',
        last_price: 142.30,
        change_percent: 3.95,
        turnover: 3984400000
      }
    ],
    top_volatility: [
      {
        ticker: 'TSLA',
        company_name: 'Tesla Inc.',
        last_price: 245.80,
        change_percent: 6.75,
        amplitude_percent: 12.5
      },
      {
        ticker: 'NVDA',
        company_name: 'NVIDIA Corporation',
        last_price: 485.20,
        change_percent: 8.20,
        amplitude_percent: 11.8
      },
      {
        ticker: 'AMD',
        company_name: 'Advanced Micro Devices',
        last_price: 125.40,
        change_percent: 4.20,
        amplitude_percent: 10.2
      },
      {
        ticker: 'AAPL',
        company_name: 'Apple Inc.',
        last_price: 175.50,
        change_percent: 5.25,
        amplitude_percent: 8.9
      },
      {
        ticker: 'MSFT',
        company_name: 'Microsoft Corporation',
        last_price: 380.25,
        change_percent: 4.80,
        amplitude_percent: 7.6
      }
    ],
    top_gap_up: [
      {
        ticker: 'NVDA',
        company_name: 'NVIDIA Corporation',
        last_price: 485.20,
        change_percent: 8.20,
        gap_percent: 6.5
      },
      {
        ticker: 'TSLA',
        company_name: 'Tesla Inc.',
        last_price: 245.80,
        change_percent: 6.75,
        gap_percent: 5.8
      },
      {
        ticker: 'AAPL',
        company_name: 'Apple Inc.',
        last_price: 175.50,
        change_percent: 5.25,
        gap_percent: 4.2
      },
      {
        ticker: 'MSFT',
        company_name: 'Microsoft Corporation',
        last_price: 380.25,
        change_percent: 4.80,
        gap_percent: 3.9
      },
      {
        ticker: 'GOOGL',
        company_name: 'Alphabet Inc.',
        last_price: 142.30,
        change_percent: 3.95,
        gap_percent: 3.2
      }
    ],
    new_highs: [
      {
        ticker: 'NVDA',
        company_name: 'NVIDIA Corporation',
        last_price: 485.20,
        change_percent: 8.20,
        market_cap: 1200000000000
      },
      {
        ticker: 'MSFT',
        company_name: 'Microsoft Corporation',
        last_price: 380.25,
        change_percent: 4.80,
        market_cap: 2850000000000
      },
      {
        ticker: 'AAPL',
        company_name: 'Apple Inc.',
        last_price: 175.50,
        change_percent: 5.25,
        market_cap: 2800000000000
      }
    ],
    top_losers: [
      {
        ticker: 'META',
        company_name: 'Meta Platforms Inc.',
        last_price: 285.40,
        change_percent: -3.25,
        change_amount: -9.60,
        market_cap: 720000000000
      },
      {
        ticker: 'NFLX',
        company_name: 'Netflix Inc.',
        last_price: 425.80,
        change_percent: -2.85,
        change_amount: -12.50,
        market_cap: 190000000000
      }
    ],
    new_lows: [
      {
        ticker: 'PYPL',
        company_name: 'PayPal Holdings Inc.',
        last_price: 58.20,
        change_percent: -4.20,
        market_cap: 65000000000
      }
    ]
  };

  const data = mockData[type] || [];
  
  // 添加延迟模拟真实API
  await new Promise(resolve => setTimeout(resolve, 200));
  
  res.json(data);
};