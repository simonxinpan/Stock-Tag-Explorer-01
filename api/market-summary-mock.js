// api/market-summary-mock.js
// 模拟市场汇总数据API

module.exports = (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 模拟市场汇总数据
    const mockSummaryData = {
      totalStocks: 4856,
      risingStocks: 2134,
      fallingStocks: 1892,
      totalMarketCap: 45678.9 // 单位：百万美元
    };

    res.status(200).json(mockSummaryData);
  } catch (error) {
    console.error('Market summary mock API error:', error);
    res.status(500).json({ 
      error: '服务器内部错误', 
      message: error.message 
    });
  }
};