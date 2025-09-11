#!/usr/bin/env node

/**
 * 中概股数据库初始化脚本
 * Initialize Chinese Stocks Database
 * 
 * 创建中概股数据库的表结构，与标普500数据库保持一致
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取数据库连接字符串
const getDatabaseUrl = () => {
  const url = process.env.CHINESE_STOCKS_DATABASE_URL;
  if (!url) {
    throw new Error('CHINESE_STOCKS_DATABASE_URL environment variable is required');
  }
  return url;
};

// 创建数据库连接池
const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: { rejectUnauthorized: false }
});

// 创建stocks表的SQL
const createStocksTableSQL = `
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255),
  sector VARCHAR(100),
  sector_zh VARCHAR(100),
  industry VARCHAR(100),
  industry_zh VARCHAR(100),
  market_cap BIGINT,
  last_price DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  volume BIGINT,
  avg_volume BIGINT,
  pe_ratio DECIMAL(8,2),
  dividend_yield DECIMAL(5,2),
  week_52_high DECIMAL(10,2),
  week_52_low DECIMAL(10,2),
  beta DECIMAL(5,2),
  eps DECIMAL(8,2),
  revenue BIGINT,
  profit_margin DECIMAL(5,2),
  debt_to_equity DECIMAL(8,2),
  return_on_equity DECIMAL(5,2),
  price_to_book DECIMAL(8,2),
  free_cash_flow BIGINT,
  operating_margin DECIMAL(5,2),
  current_ratio DECIMAL(8,2),
  quick_ratio DECIMAL(8,2),
  gross_margin DECIMAL(5,2),
  tags TEXT[],
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// 创建索引的SQL
const createIndexesSQL = [
  'CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_change_percent ON stocks(change_percent);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_volume ON stocks(volume);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_tags ON stocks USING GIN(tags);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_last_updated ON stocks(last_updated);'
];

// 插入示例中概股数据
const insertSampleDataSQL = `
INSERT INTO stocks (
  ticker, name, name_zh, sector, sector_zh, industry, industry_zh,
  market_cap, last_price, change_amount, change_percent, volume,
  pe_ratio, tags
) VALUES 
  ('BABA', 'Alibaba Group Holding Limited', '阿里巴巴集团', 'Technology', '科技', 'E-commerce', '电子商务', 205800000000, 85.42, 2.15, 2.58, 12500000, 12.5, ARRAY['电商', '云计算', '大型股']),
  ('JD', 'JD.com Inc', '京东集团', 'Technology', '科技', 'E-commerce', '电子商务', 48200000000, 32.18, -0.87, -2.63, 8900000, 15.2, ARRAY['电商', '物流', '中型股']),
  ('TCEHY', 'Tencent Holdings Limited', '腾讯控股', 'Technology', '科技', 'Internet Services', '互联网服务', 405600000000, 42.35, 1.23, 2.99, 6700000, 18.7, ARRAY['游戏', '社交', '大型股']),
  ('BIDU', 'Baidu Inc', '百度', 'Technology', '科技', 'Internet Search', '互联网搜索', 34500000000, 98.76, 3.45, 3.62, 4200000, 22.1, ARRAY['搜索', 'AI', '中型股']),
  ('NIO', 'NIO Inc', '蔚来汽车', 'Consumer Cyclical', '消费周期', 'Auto Manufacturers', '汽车制造', 15800000000, 8.92, 0.34, 3.96, 15600000, -8.5, ARRAY['电动车', '新能源', '小型股']),
  ('XPEV', 'XPeng Inc', '小鹏汽车', 'Consumer Cyclical', '消费周期', 'Auto Manufacturers', '汽车制造', 12300000000, 11.45, -0.23, -1.97, 9800000, -12.3, ARRAY['电动车', '新能源', '小型股']),
  ('LI', 'Li Auto Inc', '理想汽车', 'Consumer Cyclical', '消费周期', 'Auto Manufacturers', '汽车制造', 18900000000, 19.87, 0.78, 4.08, 7600000, 25.6, ARRAY['电动车', '新能源', '小型股']),
  ('PDD', 'PDD Holdings Inc', '拼多多', 'Technology', '科技', 'E-commerce', '电子商务', 89400000000, 142.33, 5.67, 4.15, 5400000, 16.8, ARRAY['电商', '社交电商', '大型股']),
  ('NTES', 'NetEase Inc', '网易', 'Technology', '科技', 'Gaming', '游戏', 32100000000, 98.21, -1.45, -1.45, 3200000, 14.2, ARRAY['游戏', '音乐', '中型股']),
  ('BILI', 'Bilibili Inc', '哔哩哔哩', 'Technology', '科技', 'Entertainment', '娱乐', 8900000000, 23.45, 1.12, 5.01, 8700000, -15.6, ARRAY['视频', '娱乐', '小型股'])
ON CONFLICT (ticker) DO UPDATE SET
  name = EXCLUDED.name,
  name_zh = EXCLUDED.name_zh,
  sector = EXCLUDED.sector,
  sector_zh = EXCLUDED.sector_zh,
  industry = EXCLUDED.industry,
  industry_zh = EXCLUDED.industry_zh,
  market_cap = EXCLUDED.market_cap,
  last_price = EXCLUDED.last_price,
  change_amount = EXCLUDED.change_amount,
  change_percent = EXCLUDED.change_percent,
  volume = EXCLUDED.volume,
  pe_ratio = EXCLUDED.pe_ratio,
  tags = EXCLUDED.tags,
  last_updated = CURRENT_TIMESTAMP;
`;

async function initializeDatabase() {
  let client;
  
  try {
    console.log('🇨🇳 === 中概股数据库初始化开始 ===');
    console.log(`🔗 连接数据库: ${getDatabaseUrl().split('@')[1]}`);
    
    client = await pool.connect();
    
    // 创建stocks表
    console.log('📊 创建stocks表...');
    await client.query(createStocksTableSQL);
    console.log('✅ stocks表创建成功');
    
    // 创建索引
    console.log('🔍 创建数据库索引...');
    for (const indexSQL of createIndexesSQL) {
      await client.query(indexSQL);
    }
    console.log('✅ 索引创建成功');
    
    // 插入示例数据
    console.log('📈 插入示例中概股数据...');
    await client.query(insertSampleDataSQL);
    console.log('✅ 示例数据插入成功');
    
    // 验证数据
    const result = await client.query('SELECT COUNT(*) as count FROM stocks');
    const count = result.rows[0].count;
    console.log(`📊 数据库中共有 ${count} 只中概股`);
    
    console.log('\n🎉 === 中概股数据库初始化完成 ===');
    console.log('🚀 数据库已准备就绪，可以开始使用API!');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// 运行初始化
initializeDatabase();