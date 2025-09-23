const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 中概股数据库路径
const dbPath = path.join(__dirname, 'chinese_stocks.db');

console.log('=== 初始化中概股SQLite数据库 ===');
console.log(`数据库路径: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    return;
  }
  console.log('✓ 成功连接到中概股数据库');
});

// 创建stocks表的SQL
const createStocksTableSQL = `
CREATE TABLE IF NOT EXISTS stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  name_zh TEXT,
  sector TEXT,
  sector_zh TEXT,
  industry TEXT,
  industry_zh TEXT,
  market_cap INTEGER,
  current_price REAL,
  high_price REAL,
  low_price REAL,
  previous_close REAL,
  change_amount REAL,
  change_percent REAL,
  volume INTEGER,
  turnover REAL,
  market_status TEXT,
  vwap REAL,
  trade_count INTEGER,
  pe_ratio REAL,
  dividend_yield REAL,
  week_52_high REAL,
  week_52_low REAL,
  beta REAL,
  eps REAL,
  revenue INTEGER,
  profit_margin REAL,
  debt_to_equity REAL,
  return_on_equity REAL,
  price_to_book REAL,
  free_cash_flow INTEGER,
  operating_margin REAL,
  current_ratio REAL,
  quick_ratio REAL,
  gross_margin REAL,
  tags TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// 创建索引
const createIndexesSQL = [
  'CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_change_percent ON stocks(change_percent);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_volume ON stocks(volume);',
  'CREATE INDEX IF NOT EXISTS idx_stocks_last_updated ON stocks(last_updated);'
];

// 插入示例数据
const insertSampleDataSQL = `
INSERT OR REPLACE INTO stocks (
  ticker, company_name, name_zh, sector, sector_zh, industry, industry_zh,
  market_cap, current_price, change_amount, change_percent, volume,
  pe_ratio, tags
) VALUES 
  ('BABA', 'Alibaba Group Holding Limited', '阿里巴巴集团', 'Technology', '科技', 'E-commerce', '电子商务', 205800000000, 85.42, 2.15, 2.58, 12500000, 12.5, '电商,云计算,大型股'),
  ('JD', 'JD.com Inc', '京东集团', 'Technology', '科技', 'E-commerce', '电子商务', 48200000000, 32.18, -0.87, -2.63, 8900000, 15.2, '电商,物流,中型股'),
  ('TCEHY', 'Tencent Holdings Limited', '腾讯控股', 'Technology', '科技', 'Internet Services', '互联网服务', 405600000000, 42.35, 1.23, 2.99, 6700000, 18.7, '游戏,社交,大型股'),
  ('BIDU', 'Baidu Inc', '百度', 'Technology', '科技', 'Internet Search', '互联网搜索', 34500000000, 98.76, 3.45, 3.62, 4200000, 22.1, '搜索,AI,中型股'),
  ('NIO', 'NIO Inc', '蔚来汽车', 'Consumer Cyclical', '消费周期', 'Auto Manufacturers', '汽车制造', 15800000000, 8.92, 0.34, 3.96, 15600000, -8.5, '电动车,新能源,小型股'),
  ('XPEV', 'XPeng Inc', '小鹏汽车', 'Consumer Cyclical', '消费周期', 'Auto Manufacturers', '汽车制造', 12300000000, 11.45, -0.23, -1.97, 9800000, -12.3, '电动车,新能源,小型股'),
  ('LI', 'Li Auto Inc', '理想汽车', 'Consumer Cyclical', '消费周期', 'Auto Manufacturers', '汽车制造', 18900000000, 19.87, 0.78, 4.08, 7600000, 25.6, '电动车,新能源,小型股'),
  ('PDD', 'PDD Holdings Inc', '拼多多', 'Technology', '科技', 'E-commerce', '电子商务', 89400000000, 142.33, 5.67, 4.15, 5400000, 16.8, '电商,社交电商,大型股'),
  ('NTES', 'NetEase Inc', '网易', 'Technology', '科技', 'Gaming', '游戏', 32100000000, 98.21, -1.45, -1.45, 3200000, 14.2, '游戏,音乐,中型股'),
  ('BILI', 'Bilibili Inc', '哔哩哔哩', 'Technology', '科技', 'Entertainment', '娱乐', 8900000000, 23.45, 1.12, 5.01, 8700000, -15.6, '视频,娱乐,小型股')
`;

async function initializeDatabase() {
  try {
    console.log('\n🏗️ 创建stocks表...');
    
    // 创建表
    await new Promise((resolve, reject) => {
      db.run(createStocksTableSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✓ stocks表创建成功');
          resolve();
        }
      });
    });

    console.log('\n📊 创建索引...');
    
    // 创建索引
    for (const indexSQL of createIndexesSQL) {
      await new Promise((resolve, reject) => {
        db.run(indexSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    console.log('✓ 索引创建成功');

    console.log('\n📋 插入示例数据...');
    
    // 插入示例数据
    await new Promise((resolve, reject) => {
      db.run(insertSampleDataSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✓ 示例数据插入成功');
          resolve();
        }
      });
    });

    // 验证数据
    console.log('\n🔍 验证数据...');
    await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM stocks', (err, row) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✓ 数据库中共有 ${row.count} 条记录`);
          resolve();
        }
      });
    });

    console.log('\n🎉 中概股数据库初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      } else {
        console.log('✓ 数据库连接已关闭');
      }
    });
  }
}

initializeDatabase();