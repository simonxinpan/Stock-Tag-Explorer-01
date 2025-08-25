// 模拟市场汇总API
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 模拟市场汇总数据
  const mockSummary = {
    total_stocks: 4856,
    gainers: 2234,
    losers: 1892,
    unchanged: 730,
    total_volume: 12500000000,
    total_market_cap: 45800000000000,
    avg_change: 0.85,
    timestamp: new Date().toISOString(),
    note: '🔧 使用模拟数据演示功能'
  };

  res.json({
    success: true,
    data: mockSummary
  });
};