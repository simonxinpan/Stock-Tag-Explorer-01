const { Pool } = require('pg');
const cors = require('cors');

// 初始化数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// CORS中间件
const corsMiddleware = cors({
  origin: ['http://localhost:3000', 'http://localhost:8000', 'https://stock-tag-explorer.vercel.app', 'https://stock-tag-explorer-01.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
});

// 模拟标签数据（如果数据库连接失败时使用）
const mockTags = {
  market_performance: [
    { id: 'high_volume', name: '52周高点', count: 23, color: 'emerald' },
    { id: 'low_point', name: '52周低点', count: 12, color: 'emerald' },
    { id: 'high_growth', name: '高成长', count: 45, color: 'emerald' },
    { id: 'low_volatility', name: '低波动', count: 67, color: 'emerald' },
    { id: 'high_dividend', name: '高分红', count: 30, color: 'emerald' }
  ],
  financial_performance: [
    { id: 'high_roe', name: '高ROE', count: 50, color: 'amber' },
    { id: 'low_debt', name: '低负债率', count: 78, color: 'amber' },
    { id: 'high_growth_rate', name: '高增长率', count: 34, color: 'amber' },
    { id: 'high_margin', name: '高利润率', count: 56, color: 'amber' },
    { id: 'vix_fear', name: 'VIX恐慌指数相关', count: 8, color: 'amber' }
  ],
  trend_ranking: [
    { id: 'recent_hot', name: '近期热度', count: 89, color: 'purple' },
    { id: 'recent_trend', name: '近期趋势', count: 45, color: 'purple' },
    { id: 'growth_potential', name: '成长潜力', count: 18, color: 'purple' },
    { id: 'breakthrough', name: '突破新高', count: 28, color: 'purple' },
    { id: 'data_support', name: '数据支撑', count: 15, color: 'purple' }
  ],
  industry_category: [
    { id: 'technology', name: '科技股', count: 76, color: 'gray' },
    { id: 'finance', name: '金融股', count: 65, color: 'gray' },
    { id: 'healthcare', name: '医疗保健', count: 64, color: 'gray' },
    { id: 'energy', name: '能源股', count: 23, color: 'gray' },
    { id: 'consumer', name: '消费品', count: 60, color: 'gray' }
  ],
  special_lists: [
    { id: 'sp500', name: '标普500', count: 500, color: 'blue' },
    { id: 'nasdaq100', name: '纳斯达克100', count: 100, color: 'blue' },
    { id: 'dow30', name: '道琼斯30', count: 30, color: 'blue' },
    { id: 'esg_leaders', name: 'ESG领导者', count: 89, color: 'blue' },
    { id: 'analyst_recommend', name: '分析师推荐', count: 120, color: 'blue' }
  ]
};

module.exports = async function handler(req, res) {
  // 应用CORS中间件
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 尝试从数据库获取标签数据
    let tags;
    
    try {
      const client = await pool.connect();
      
      // 检查表是否存在
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tags'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        // 从数据库获取标签数据
        const result = await client.query(`
          SELECT 
            category,
            tag_id,
            tag_name,
            stock_count,
            color_theme
          FROM tags 
          ORDER BY category, stock_count DESC
        `);
        
        // 按类别组织数据
        tags = result.rows.reduce((acc, row) => {
          if (!acc[row.category]) {
            acc[row.category] = [];
          }
          acc[row.category].push({
            id: row.tag_id,
            name: row.tag_name,
            count: row.stock_count,
            color: row.color_theme
          });
          return acc;
        }, {});
      } else {
        // 表不存在，使用模拟数据
        tags = mockTags;
      }
      
      client.release();
    } catch (dbError) {
      console.warn('Database connection failed, using mock data:', dbError.message);
      tags = mockTags;
    }

    res.status(200).json({
      success: true,
      data: tags,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}