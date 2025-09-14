const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保data目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chinese_stocks.db');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// 创建表结构
const createTableSQL = `
CREATE TABLE IF NOT EXISTS chinese_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL UNIQUE,
    company_name TEXT,
    market_cap INTEGER,
    price REAL,
    change_percent REAL,
    volume INTEGER,
    sector TEXT,
    industry TEXT,
    description TEXT,
    website TEXT,
    employees INTEGER,
    founded_year INTEGER,
    headquarters TEXT,
    exchange TEXT,
    currency TEXT DEFAULT 'USD',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// 创建索引
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_chinese_stocks_ticker ON chinese_stocks(ticker);',
  'CREATE INDEX IF NOT EXISTS idx_chinese_stocks_sector ON chinese_stocks(sector);',
  'CREATE INDEX IF NOT EXISTS idx_chinese_stocks_market_cap ON chinese_stocks(market_cap);'
];

// 插入测试数据
const insertTestData = `
INSERT OR IGNORE INTO chinese_stocks (ticker, company_name, sector, exchange) VALUES 
('BABA', 'Alibaba Group Holding Limited', 'Technology', 'NYSE'),
('JD', 'JD.com Inc', 'Technology', 'NASDAQ'),
('BIDU', 'Baidu Inc', 'Technology', 'NASDAQ'),
('NIO', 'NIO Inc', 'Automotive', 'NYSE'),
('PDD', 'PDD Holdings Inc', 'Technology', 'NASDAQ');
`;

// 执行数据库初始化
db.serialize(() => {
  console.log('📝 Creating table...');
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('❌ Error creating table:', err.message);
    } else {
      console.log('✅ Table created successfully');
    }
  });
  
  console.log('📝 Creating indexes...');
  createIndexes.forEach((indexSQL, i) => {
    db.run(indexSQL, (err) => {
      if (err) {
        console.error(`❌ Error creating index ${i + 1}:`, err.message);
      } else {
        console.log(`✅ Index ${i + 1} created successfully`);
      }
    });
  });
  
  console.log('📝 Inserting test data...');
  db.run(insertTestData, (err) => {
    if (err) {
      console.error('❌ Error inserting test data:', err.message);
    } else {
      console.log('✅ Test data inserted successfully');
    }
  });
  
  // 验证数据
  db.all('SELECT ticker, company_name, sector FROM chinese_stocks', (err, rows) => {
    if (err) {
      console.error('❌ Error querying data:', err.message);
    } else {
      console.log('\n📊 Current data in database:');
      console.table(rows);
    }
  });
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err.message);
  } else {
    console.log('\n✅ Database setup completed successfully!');
    console.log(`Database file: ${dbPath}`);
  }
});