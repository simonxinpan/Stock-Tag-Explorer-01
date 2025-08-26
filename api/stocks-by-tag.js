// 辅助函数：市值分类过滤
function filterByMarketCap(stocks, tag) {
  switch (tag) {
    case '大盘股':
      return stocks.filter(stock => stock.market_cap > 200000);
    case '中盘股':
      return stocks.filter(stock => stock.market_cap >= 10000 && stock.market_cap < 200000);
    case '小盘股':
      return stocks.filter(stock => stock.market_cap < 10000);
    default:
      return stocks;
  }
}

// 辅助函数：动态排名过滤
function filterByDynamicRanking(stocks, tag) {
  switch (tag) {
    case '高ROE':
      return stocks.filter(stock => stock.roe_ttm > 0)
                  .sort((a, b) => b.roe_ttm - a.roe_ttm)
                  .slice(0, 50);
    case '低PE':
      return stocks.filter(stock => stock.pe_ttm > 0)
                  .sort((a, b) => a.pe_ttm - b.pe_ttm)
                  .slice(0, 50);
    default:
      return stocks;
  }
}

// 模拟股票数据
const mockStocks = [
  { symbol: '000001', name: '平安银行', price: 12.50, change_percent: 2.1, market_cap: 241000, pe_ttm: 5.2, roe_ttm: 12.8, sector_zh: '银行' },
  { symbol: '000002', name: '万科A', price: 18.30, change_percent: -1.5, market_cap: 201000, pe_ttm: 8.5, roe_ttm: 15.2, sector_zh: '房地产' },
  { symbol: '000858', name: '五粮液', price: 168.50, change_percent: 3.2, market_cap: 652000, pe_ttm: 25.8, roe_ttm: 22.5, sector_zh: '食品饮料' },
  { symbol: '000876', name: '新希望', price: 15.80, change_percent: -0.8, market_cap: 68000, pe_ttm: 18.2, roe_ttm: 8.5, sector_zh: '农林牧渔' },
  { symbol: '002415', name: '海康威视', price: 32.40, change_percent: 1.8, market_cap: 302000, pe_ttm: 15.6, roe_ttm: 18.9, sector_zh: '电子' },
  { symbol: '002594', name: '比亚迪', price: 245.60, change_percent: 4.5, market_cap: 715000, pe_ttm: 28.5, roe_ttm: 20.1, sector_zh: '汽车' },
  { symbol: '300059', name: '东方财富', price: 16.20, change_percent: 2.8, market_cap: 258000, pe_ttm: 22.1, roe_ttm: 16.8, sector_zh: '非银金融' },
  { symbol: '300750', name: '宁德时代', price: 195.80, change_percent: -2.1, market_cap: 860000, pe_ttm: 35.2, roe_ttm: 25.6, sector_zh: '电气设备' },
  { symbol: '600036', name: '招商银行', price: 38.50, change_percent: 1.2, market_cap: 985000, pe_ttm: 6.8, roe_ttm: 14.5, sector_zh: '银行' },
  { symbol: '600519', name: '贵州茅台', price: 1680.00, change_percent: 0.5, market_cap: 2110000, pe_ttm: 28.9, roe_ttm: 31.2, sector_zh: '食品饮料' },
  { symbol: '600887', name: '伊利股份', price: 28.90, change_percent: -1.2, market_cap: 185000, pe_ttm: 19.5, roe_ttm: 19.8, sector_zh: '食品饮料' },
  { symbol: '000063', name: '中兴通讯', price: 25.40, change_percent: 3.8, market_cap: 120000, pe_ttm: 16.2, roe_ttm: 11.5, sector_zh: '通信' },
  { symbol: '002230', name: '科大讯飞', price: 42.80, change_percent: 5.2, market_cap: 98000, pe_ttm: 45.6, roe_ttm: 8.9, sector_zh: '计算机' },
  { symbol: '300142', name: '沃森生物', price: 35.60, change_percent: -3.1, market_cap: 58000, pe_ttm: 28.7, roe_ttm: 6.2, sector_zh: '医药生物' },
  { symbol: '600276', name: '恒瑞医药', price: 48.20, change_percent: 1.8, market_cap: 312000, pe_ttm: 22.4, roe_ttm: 16.8, sector_zh: '医药生物' },
  { symbol: '000725', name: '京东方A', price: 3.85, change_percent: 2.1, market_cap: 134000, pe_ttm: 12.8, roe_ttm: 4.2, sector_zh: '电子' },
  { symbol: '002304', name: '洋河股份', price: 98.50, change_percent: -0.8, market_cap: 148000, pe_ttm: 18.5, roe_ttm: 22.1, sector_zh: '食品饮料' },
  { symbol: '600031', name: '三一重工', price: 16.80, change_percent: 4.2, market_cap: 141000, pe_ttm: 14.2, roe_ttm: 12.5, sector_zh: '机械设备' },
  { symbol: '000338', name: '潍柴动力', price: 12.90, change_percent: 1.5, market_cap: 103000, pe_ttm: 8.9, roe_ttm: 15.2, sector_zh: '机械设备' },
  { symbol: '002142', name: '宁波银行', price: 28.40, change_percent: 0.8, market_cap: 138000, pe_ttm: 7.2, roe_ttm: 16.8, sector_zh: '银行' }
];

export default async function handler(req, res) {
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

  const { tag, page = 1, limit = 20, sort = 'market_cap' } = req.query;

  if (!tag) {
    return res.status(400).json({ error: 'Tag parameter is required' });
  }

  try {
    let stocks = [...mockStocks]; // 使用模拟数据
    let relatedTags = [];
    let totalCount = 0;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    console.log(`智能标签查询「${tag}」，页码: ${pageNum}, 限制: ${limitNum}`);

    // 智能路由逻辑 - 根据标签类型过滤模拟数据
    switch (tag) {
      // 市值标签
      case '大盘股':
        stocks = mockStocks.filter(stock => stock.market_cap > 200000);
        stocks.sort((a, b) => b.market_cap - a.market_cap);
        totalCount = stocks.length;
        break;

      case '中盘股':
        stocks = mockStocks.filter(stock => stock.market_cap >= 10000 && stock.market_cap < 200000);
        stocks.sort((a, b) => b.market_cap - a.market_cap);
        totalCount = stocks.length;
        break;

      case '小盘股':
        stocks = mockStocks.filter(stock => stock.market_cap < 10000);
        stocks.sort((a, b) => b.market_cap - a.market_cap);
        totalCount = stocks.length;
        break;

      // 动态排名标签
      case '高ROE':
        stocks = mockStocks.filter(stock => stock.roe_ttm > 0);
        stocks.sort((a, b) => b.roe_ttm - a.roe_ttm);
        stocks = stocks.slice(0, 50); // 限制前50只
        totalCount = 50;
        break;

      case '低PE':
        stocks = mockStocks.filter(stock => stock.pe_ttm > 0);
        stocks.sort((a, b) => a.pe_ttm - b.pe_ttm);
        stocks = stocks.slice(0, 50); // 限制前50只
        totalCount = 50;
        break;

      // 默认：行业分类或普通标签
      default:
        // 按行业查询
        stocks = mockStocks.filter(stock => stock.sector_zh === tag);
        stocks.sort((a, b) => b.market_cap - a.market_cap);
        totalCount = stocks.length;
        break;
    }

    // 分页处理
    const paginatedStocks = stocks.slice(offset, offset + limitNum);

    // 提供默认相关标签
    relatedTags = [
      { name: '大盘股', count: 3 },
      { name: '中盘股', count: 12 },
      { name: '小盘股', count: 5 },
      { name: '高ROE', count: 20 },
      { name: '低PE', count: 20 },
      { name: '银行', count: 3 },
      { name: '食品饮料', count: 4 },
      { name: '电子', count: 2 },
      { name: '汽车', count: 1 },
      { name: '医药生物', count: 2 }
    ];

    // 格式化股票数据
    const formattedStocks = paginatedStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: parseFloat(stock.price || 0),
      change: parseFloat(stock.change_percent || 0),
      changePercent: parseFloat(stock.change_percent || 0),
      volume: parseInt(stock.volume || 0),
      marketCap: parseInt(stock.market_cap || 0),
      marketCapFormatted: formatMarketCap(stock.market_cap),
      sector: stock.sector_zh || '',
      pe: parseFloat(stock.pe_ttm || 0),
      roe: parseFloat(stock.roe_ttm || 0)
    }));

    // 计算统计信息
    const stats = {
      total: totalCount,
      upCount: formattedStocks.filter(s => s.change > 0).length,
      downCount: formattedStocks.filter(s => s.change < 0).length,
      flatCount: formattedStocks.filter(s => s.change === 0).length,
      avgChange: formattedStocks.length > 0 
        ? formattedStocks.reduce((sum, s) => sum + s.changePercent, 0) / formattedStocks.length 
        : 0,
      avgPE: formattedStocks.length > 0
        ? formattedStocks.filter(s => s.pe > 0).reduce((sum, s) => sum + s.pe, 0) / formattedStocks.filter(s => s.pe > 0).length
        : 0,
      avgROE: formattedStocks.length > 0
        ? formattedStocks.filter(s => s.roe > 0).reduce((sum, s) => sum + s.roe, 0) / formattedStocks.filter(s => s.roe > 0).length
        : 0
    };

    // 分页信息
    const pagination = {
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      pageSize: limitNum,
      hasNext: pageNum < Math.ceil(totalCount / limitNum),
      hasPrev: pageNum > 1
    };

    console.log(`智能查询「${tag}」完成，返回 ${formattedStocks.length} 只股票，总计 ${totalCount} 只`);

    return res.status(200).json({
      success: true,
      data: {
        tag: tag,
        stocks: formattedStocks,
        stats,
        pagination,
        relatedTags,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API处理失败:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// 格式化市值显示
function formatMarketCap(marketCap) {
  if (!marketCap) return '未知';
  
  const cap = parseFloat(marketCap);
  if (cap >= 1000000) {
    return `${(cap / 1000000).toFixed(1)}万亿`;
  } else if (cap >= 10000) {
    return `${(cap / 10000).toFixed(0)}亿`;
  } else if (cap >= 1000) {
    return `${(cap / 1000).toFixed(1)}十亿`;
  } else {
    return `${cap.toFixed(0)}百万`;
  }
}

// 格式化涨跌幅显示
function formatChangePercent(changePercent) {
  if (!changePercent) return '0.00%';
  const change = parseFloat(changePercent);
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}