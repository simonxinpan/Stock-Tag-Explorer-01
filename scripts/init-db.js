const { Pool } = require('pg');
require('dotenv').config();

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 创建表的SQL语句
const createTablesSQL = `
-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  tag_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  color_theme VARCHAR(20) DEFAULT 'blue',
  stock_count INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建股票表
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name_zh VARCHAR(200) NOT NULL,
  price DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  volume BIGINT,
  market_cap VARCHAR(20),
  sector VARCHAR(100),
  industry VARCHAR(100),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建股票标签关联表
CREATE TABLE IF NOT EXISTS stock_tags (
  id SERIAL PRIMARY KEY,
  stock_ticker VARCHAR(10) NOT NULL,
  tag_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE,
  UNIQUE(stock_ticker, tag_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_stock_tags_ticker ON stock_tags(stock_ticker);
CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为标签表创建更新时间触发器
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

// 插入初始标签数据
const insertTagsSQL = `
INSERT INTO tags (tag_id, name, type, color_theme, stock_count) VALUES
-- 股市表现类
('high_volume', '52周高点', 'market_performance', 'emerald', 23),
('low_point', '52周低点', 'market_performance', 'emerald', 12),
('high_growth', '高成长', 'market_performance', 'emerald', 45),
('low_volatility', '低波动', 'market_performance', 'emerald', 67),
('high_dividend', '高分红', 'market_performance', 'emerald', 30),

-- 财务表现类
('high_roe', '高ROE', 'financial_performance', 'amber', 50),
('low_debt', '低负债率', 'financial_performance', 'amber', 78),
('high_growth_rate', '高增长率', 'financial_performance', 'amber', 34),
('high_margin', '高利润率', 'financial_performance', 'amber', 56),
('vix_fear', 'VIX恐慌指数相关', 'financial_performance', 'amber', 8),

-- 趋势排位类
('recent_hot', '近期热度', 'trend_ranking', 'purple', 89),
('recent_trend', '近期趋势', 'trend_ranking', 'purple', 45),
('growth_potential', '成长潜力', 'trend_ranking', 'purple', 18),
('breakthrough', '突破新高', 'trend_ranking', 'purple', 28),
('data_support', '数据支撑', 'trend_ranking', 'purple', 15),

-- 行业分类
('technology', '科技股', 'industry_category', 'gray', 76),
('finance', '金融股', 'industry_category', 'gray', 65),
('healthcare', '医疗保健', 'industry_category', 'gray', 64),
('energy', '能源股', 'industry_category', 'gray', 23),
('consumer', '消费品', 'industry_category', 'gray', 60),

-- 特殊名单
('sp500', '标普500', 'special_lists', 'blue', 500),
('nasdaq100', '纳斯达克100', 'special_lists', 'blue', 100),
('dow30', '道琼斯30', 'special_lists', 'blue', 30),
('esg_leaders', 'ESG领导者', 'special_lists', 'blue', 89),
('analyst_recommend', '分析师推荐', 'special_lists', 'blue', 120)

ON CONFLICT (tag_id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  color_theme = EXCLUDED.color_theme,
  stock_count = EXCLUDED.stock_count,
  updated_at = CURRENT_TIMESTAMP;
`;

// 插入示例股票数据
const insertStocksSQL = `
INSERT INTO stocks (ticker, name_zh, price, change_amount, change_percent, volume, market_cap, sector, industry) VALUES
('AAPL', '苹果公司', 195.89, 2.34, 1.21, 45234567, '3.1T', 'Technology', 'Consumer Electronics'),
('MSFT', '微软公司', 378.85, -1.23, -0.32, 23456789, '2.8T', 'Technology', 'Software'),
('GOOGL', '谷歌A类', 142.56, 3.45, 2.48, 34567890, '1.8T', 'Technology', 'Internet Services'),
('AMZN', '亚马逊', 155.23, -0.87, -0.56, 28901234, '1.6T', 'Consumer Discretionary', 'E-commerce'),
('TSLA', '特斯拉', 248.42, 12.34, 5.23, 67890123, '789B', 'Consumer Discretionary', 'Electric Vehicles'),
('NVDA', '英伟达', 495.22, 8.76, 1.80, 45123456, '1.2T', 'Technology', 'Semiconductors'),
('META', 'Meta平台', 352.96, -2.14, -0.60, 19876543, '896B', 'Technology', 'Social Media'),
('NFLX', '奈飞', 487.83, 5.67, 1.18, 8765432, '217B', 'Communication Services', 'Streaming'),
('CRM', 'Salesforce', 267.45, 3.21, 1.22, 5432109, '261B', 'Technology', 'Cloud Software'),
('ADBE', 'Adobe', 567.89, 4.32, 0.77, 3456789, '258B', 'Technology', 'Software'),
('BRK.B', '伯克希尔B', 356.78, 1.23, 0.35, 4567890, '785B', 'Financial Services', 'Diversified'),
('UNH', '联合健康', 524.67, -3.45, -0.65, 2345678, '493B', 'Healthcare', 'Health Insurance'),
('JNJ', '强生公司', 156.89, 0.78, 0.50, 6789012, '412B', 'Healthcare', 'Pharmaceuticals')

ON CONFLICT (ticker) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  price = EXCLUDED.price,
  change_amount = EXCLUDED.change_amount,
  change_percent = EXCLUDED.change_percent,
  volume = EXCLUDED.volume,
  market_cap = EXCLUDED.market_cap,
  sector = EXCLUDED.sector,
  industry = EXCLUDED.industry,
  last_updated = CURRENT_TIMESTAMP;
`;

// 插入股票标签关联数据
const insertStockTagsSQL = `
INSERT INTO stock_tags (stock_ticker, tag_id) VALUES
-- 高成交量股票
('AAPL', 'high_volume'),
('MSFT', 'high_volume'),
('GOOGL', 'high_volume'),
('AMZN', 'high_volume'),
('TSLA', 'high_volume'),

-- 高ROE股票
('NVDA', 'high_roe'),
('META', 'high_roe'),
('NFLX', 'high_roe'),
('CRM', 'high_roe'),

-- 科技股
('AAPL', 'technology'),
('MSFT', 'technology'),
('NVDA', 'technology'),
('GOOGL', 'technology'),
('META', 'technology'),
('ADBE', 'technology'),
('CRM', 'technology'),

-- 标普500成分股
('AAPL', 'sp500'),
('MSFT', 'sp500'),
('AMZN', 'sp500'),
('GOOGL', 'sp500'),
('TSLA', 'sp500'),
('BRK.B', 'sp500'),
('UNH', 'sp500'),
('JNJ', 'sp500'),

-- 近期热度
('TSLA', 'recent_hot'),
('NVDA', 'recent_hot'),
('META', 'recent_hot'),

-- 高增长
('TSLA', 'high_growth'),
('NVDA', 'high_growth'),
('GOOGL', 'high_growth')

ON CONFLICT (stock_ticker, tag_id) DO NOTHING;
`;

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始初始化数据库...');
    
    // 创建表结构
    console.log('📋 创建表结构...');
    await client.query(createTablesSQL);
    console.log('✅ 表结构创建完成');
    
    // 插入标签数据
    console.log('🏷️  插入标签数据...');
    await client.query(insertTagsSQL);
    console.log('✅ 标签数据插入完成');
    
    // 插入股票数据
    console.log('📈 插入股票数据...');
    await client.query(insertStocksSQL);
    console.log('✅ 股票数据插入完成');
    
    // 插入关联数据
    console.log('🔗 插入股票标签关联数据...');
    await client.query(insertStockTagsSQL);
    console.log('✅ 关联数据插入完成');
    
    // 验证数据
    const tagCount = await client.query('SELECT COUNT(*) FROM tags');
    const stockCount = await client.query('SELECT COUNT(*) FROM stocks');
    const relationCount = await client.query('SELECT COUNT(*) FROM stock_tags');
    
    console.log('\n📊 数据库初始化完成！');
    console.log(`   - 标签数量: ${tagCount.rows[0].count}`);
    console.log(`   - 股票数量: ${stockCount.rows[0].count}`);
    console.log(`   - 关联数量: ${relationCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('\n🎉 数据库初始化成功完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 数据库初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase, pool };