// 中概股模拟API响应
// 临时解决方案，用于演示功能直到数据库配置完成

export default function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 模拟中概股数据
  const mockChineseStocks = [
    {
      id: 1,
      ticker: 'BABA',
      name: 'Alibaba Group Holding Limited',
      name_zh: '阿里巴巴集团',
      sector: 'Technology',
      sector_zh: '科技',
      industry: 'E-commerce',
      industry_zh: '电子商务',
      market_cap: 205800000000,
      last_price: 85.42,
      change_amount: 2.15,
      change_percent: 2.58,
      volume: 12500000,
      avg_volume: 15200000,
      pe_ratio: 12.5,
      dividend_yield: 0.0,
      week_52_high: 118.50,
      week_52_low: 66.63,
      beta: 0.87,
      eps: 6.83,
      revenue: 134800000000,
      profit_margin: 15.2,
      debt_to_equity: 0.23,
      return_on_equity: 8.9,
      price_to_book: 1.8,
      free_cash_flow: 18900000000,
      operating_margin: 16.8,
      current_ratio: 1.95,
      quick_ratio: 1.72,
      gross_margin: 42.1,
      tags: ['电商', '云计算', '大型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      ticker: 'JD',
      name: 'JD.com Inc',
      name_zh: '京东集团',
      sector: 'Technology',
      sector_zh: '科技',
      industry: 'E-commerce',
      industry_zh: '电子商务',
      market_cap: 48200000000,
      last_price: 32.18,
      change_amount: -0.87,
      change_percent: -2.63,
      volume: 8900000,
      avg_volume: 11200000,
      pe_ratio: 15.2,
      dividend_yield: 0.0,
      week_52_high: 45.88,
      week_52_low: 20.82,
      beta: 1.12,
      eps: 2.12,
      revenue: 149300000000,
      profit_margin: 2.8,
      debt_to_equity: 0.45,
      return_on_equity: 5.2,
      price_to_book: 1.2,
      free_cash_flow: 3200000000,
      operating_margin: 3.1,
      current_ratio: 1.18,
      quick_ratio: 0.95,
      gross_margin: 14.6,
      tags: ['电商', '物流', '中型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      ticker: 'TCEHY',
      name: 'Tencent Holdings Limited',
      name_zh: '腾讯控股',
      sector: 'Technology',
      sector_zh: '科技',
      industry: 'Internet Services',
      industry_zh: '互联网服务',
      market_cap: 405600000000,
      last_price: 42.35,
      change_amount: 1.23,
      change_percent: 2.99,
      volume: 6700000,
      avg_volume: 8900000,
      pe_ratio: 18.7,
      dividend_yield: 0.4,
      week_52_high: 56.78,
      week_52_low: 32.45,
      beta: 0.95,
      eps: 2.26,
      revenue: 86200000000,
      profit_margin: 22.1,
      debt_to_equity: 0.31,
      return_on_equity: 12.8,
      price_to_book: 2.1,
      free_cash_flow: 15600000000,
      operating_margin: 25.3,
      current_ratio: 1.45,
      quick_ratio: 1.32,
      gross_margin: 48.9,
      tags: ['游戏', '社交', '大型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      ticker: 'BIDU',
      name: 'Baidu Inc',
      name_zh: '百度',
      sector: 'Technology',
      sector_zh: '科技',
      industry: 'Internet Search',
      industry_zh: '互联网搜索',
      market_cap: 34500000000,
      last_price: 98.76,
      change_amount: 3.45,
      change_percent: 3.62,
      volume: 4200000,
      avg_volume: 5800000,
      pe_ratio: 22.1,
      dividend_yield: 0.0,
      week_52_high: 142.50,
      week_52_low: 86.12,
      beta: 1.05,
      eps: 4.47,
      revenue: 18700000000,
      profit_margin: 18.5,
      debt_to_equity: 0.18,
      return_on_equity: 9.8,
      price_to_book: 1.9,
      free_cash_flow: 2800000000,
      operating_margin: 19.2,
      current_ratio: 2.85,
      quick_ratio: 2.71,
      gross_margin: 58.2,
      tags: ['搜索', 'AI', '中型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 5,
      ticker: 'NIO',
      name: 'NIO Inc',
      name_zh: '蔚来汽车',
      sector: 'Consumer Cyclical',
      sector_zh: '消费周期',
      industry: 'Auto Manufacturers',
      industry_zh: '汽车制造',
      market_cap: 15800000000,
      last_price: 8.92,
      change_amount: 0.34,
      change_percent: 3.96,
      volume: 15600000,
      avg_volume: 22400000,
      pe_ratio: -8.5,
      dividend_yield: 0.0,
      week_52_high: 16.74,
      week_52_low: 3.61,
      beta: 2.15,
      eps: -1.05,
      revenue: 7200000000,
      profit_margin: -18.2,
      debt_to_equity: 0.89,
      return_on_equity: -25.6,
      price_to_book: 2.8,
      free_cash_flow: -1200000000,
      operating_margin: -15.8,
      current_ratio: 1.12,
      quick_ratio: 0.89,
      gross_margin: 9.5,
      tags: ['电动车', '新能源', '小型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 6,
      ticker: 'PDD',
      name: 'PDD Holdings Inc',
      name_zh: '拼多多',
      sector: 'Technology',
      sector_zh: '科技',
      industry: 'E-commerce',
      industry_zh: '电子商务',
      market_cap: 89400000000,
      last_price: 142.33,
      change_amount: 5.67,
      change_percent: 4.15,
      volume: 5400000,
      avg_volume: 7200000,
      pe_ratio: 16.8,
      dividend_yield: 0.0,
      week_52_high: 164.69,
      week_52_low: 88.01,
      beta: 1.28,
      eps: 8.47,
      revenue: 35100000000,
      profit_margin: 28.9,
      debt_to_equity: 0.12,
      return_on_equity: 18.5,
      price_to_book: 3.2,
      free_cash_flow: 8900000000,
      operating_margin: 32.1,
      current_ratio: 2.95,
      quick_ratio: 2.87,
      gross_margin: 62.8,
      tags: ['电商', '社交电商', '大型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 7,
      ticker: 'NTES',
      name: 'NetEase Inc',
      name_zh: '网易',
      sector: 'Technology',
      sector_zh: '科技',
      industry: 'Gaming',
      industry_zh: '游戏',
      market_cap: 32100000000,
      last_price: 98.21,
      change_amount: -1.45,
      change_percent: -1.45,
      volume: 3200000,
      avg_volume: 4100000,
      pe_ratio: 14.2,
      dividend_yield: 2.8,
      week_52_high: 115.40,
      week_52_low: 68.62,
      beta: 0.78,
      eps: 6.92,
      revenue: 14200000000,
      profit_margin: 19.8,
      debt_to_equity: 0.08,
      return_on_equity: 15.2,
      price_to_book: 2.5,
      free_cash_flow: 2100000000,
      operating_margin: 22.5,
      current_ratio: 3.45,
      quick_ratio: 3.21,
      gross_margin: 65.1,
      tags: ['游戏', '音乐', '中型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 8,
      ticker: 'BILI',
      name: 'Bilibili Inc',
      name_zh: '哔哩哔哩',
      sector: 'Technology',
      sector_zh: '科技',
      industry: 'Entertainment',
      industry_zh: '娱乐',
      market_cap: 8900000000,
      last_price: 23.45,
      change_amount: 1.12,
      change_percent: 5.01,
      volume: 8700000,
      avg_volume: 12300000,
      pe_ratio: -15.6,
      dividend_yield: 0.0,
      week_52_high: 31.78,
      week_52_low: 8.80,
      beta: 1.85,
      eps: -1.50,
      revenue: 3200000000,
      profit_margin: -28.5,
      debt_to_equity: 0.35,
      return_on_equity: -18.9,
      price_to_book: 1.8,
      free_cash_flow: -450000000,
      operating_margin: -25.8,
      current_ratio: 1.95,
      quick_ratio: 1.82,
      gross_margin: 18.2,
      tags: ['视频', '娱乐', '小型股'],
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ];

  // 根据查询参数过滤和排序
  const { 
    page = 1, 
    limit = 20, 
    sort_by = 'market_cap', 
    order = 'desc',
    sector,
    min_market_cap,
    max_market_cap
  } = req.query;

  let filteredStocks = [...mockChineseStocks];

  // 按行业过滤
  if (sector) {
    filteredStocks = filteredStocks.filter(stock => 
      stock.sector.toLowerCase().includes(sector.toLowerCase()) ||
      stock.sector_zh.includes(sector)
    );
  }

  // 按市值过滤
  if (min_market_cap) {
    filteredStocks = filteredStocks.filter(stock => 
      stock.market_cap >= parseInt(min_market_cap)
    );
  }
  if (max_market_cap) {
    filteredStocks = filteredStocks.filter(stock => 
      stock.market_cap <= parseInt(max_market_cap)
    );
  }

  // 排序
  filteredStocks.sort((a, b) => {
    const aVal = a[sort_by] || 0;
    const bVal = b[sort_by] || 0;
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // 分页
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedStocks = filteredStocks.slice(startIndex, endIndex);

  // 返回响应
  res.status(200).json({
    success: true,
    data: paginatedStocks,
    pagination: {
      current_page: parseInt(page),
      per_page: parseInt(limit),
      total_items: filteredStocks.length,
      total_pages: Math.ceil(filteredStocks.length / parseInt(limit))
    },
    meta: {
      market: 'chinese_stocks',
      data_source: 'mock',
      last_updated: new Date().toISOString(),
      note: '这是模拟数据，用于演示功能。请配置真实数据库连接以获取实时数据。'
    }
  });
}