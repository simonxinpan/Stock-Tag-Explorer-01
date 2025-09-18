const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保data目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'stock_explorer.db');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// 创建sp500_stocks表结构
const createTableSQL = `
CREATE TABLE IF NOT EXISTS sp500_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL UNIQUE,
    name_zh TEXT,
    last_price REAL,
    change_percent REAL,
    volume INTEGER,
    market_cap INTEGER,
    sector TEXT,
    industry TEXT,
    description TEXT,
    website TEXT,
    employees INTEGER,
    founded_year INTEGER,
    headquarters TEXT,
    exchange TEXT,
    currency TEXT DEFAULT 'USD',
    week_52_high REAL,
    week_52_low REAL,
    turnover REAL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// 创建索引
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_sp500_stocks_ticker ON sp500_stocks(ticker);',
  'CREATE INDEX IF NOT EXISTS idx_sp500_stocks_sector ON sp500_stocks(sector);',
  'CREATE INDEX IF NOT EXISTS idx_sp500_stocks_market_cap ON sp500_stocks(market_cap);',
  'CREATE INDEX IF NOT EXISTS idx_sp500_stocks_change_percent ON sp500_stocks(change_percent);',
  'CREATE INDEX IF NOT EXISTS idx_sp500_stocks_volume ON sp500_stocks(volume);'
];

// 读取sp500股票列表
let sp500Tickers = [];
try {
  const sp500Data = fs.readFileSync('./sp500_stocks.json', 'utf8');
  sp500Tickers = JSON.parse(sp500Data);
  console.log(`📊 读取到 ${sp500Tickers.length} 只标普500股票`);
} catch (error) {
  console.error('❌ 读取sp500_stocks.json失败:', error.message);
  // 使用备用股票列表
  sp500Tickers = [
    'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'GOOG', 'META', 'TSLA', 'BRK.B', 'UNH',
    'XOM', 'JNJ', 'JPM', 'V', 'PG', 'HD', 'CVX', 'MA', 'BAC', 'ABBV',
    'PFE', 'AVGO', 'COST', 'DIS', 'KO', 'MRK', 'PEP', 'TMO', 'WMT', 'ABT'
  ];
  console.log(`📊 使用备用股票列表: ${sp500Tickers.length} 只股票`);
}

// 股票基础信息映射
const stockInfo = {
  'AAPL': { name_zh: '苹果公司', sector: '信息技术' },
  'MSFT': { name_zh: '微软公司', sector: '信息技术' },
  'AMZN': { name_zh: '亚马逊', sector: '非必需消费品' },
  'NVDA': { name_zh: '英伟达', sector: '信息技术' },
  'GOOGL': { name_zh: '谷歌A类', sector: '信息技术' },
  'GOOG': { name_zh: '谷歌C类', sector: '信息技术' },
  'META': { name_zh: 'Meta平台', sector: '信息技术' },
  'TSLA': { name_zh: '特斯拉', sector: '非必需消费品' },
  'BRK.B': { name_zh: '伯克希尔哈撒韦B', sector: '金融服务' },
  'UNH': { name_zh: '联合健康', sector: '医疗保健' },
  'XOM': { name_zh: '埃克森美孚', sector: '能源' },
  'JNJ': { name_zh: '强生公司', sector: '医疗保健' },
  'JPM': { name_zh: '摩根大通', sector: '金融服务' },
  'V': { name_zh: '维萨', sector: '金融服务' },
  'PG': { name_zh: '宝洁公司', sector: '日常消费品' },
  'HD': { name_zh: '家得宝', sector: '非必需消费品' },
  'CVX': { name_zh: '雪佛龙', sector: '能源' },
  'MA': { name_zh: '万事达', sector: '金融服务' },
  'BAC': { name_zh: '美国银行', sector: '金融服务' },
  'ABBV': { name_zh: '艾伯维', sector: '医疗保健' }
};

// 生成测试数据
function generateTestData(ticker) {
  const info = stockInfo[ticker] || {
    name_zh: `${ticker}公司`,
    sector: '待更新'
  };
  
  return {
    ticker: ticker,
    name_zh: info.name_zh,
    last_price: Math.random() * 500 + 10, // 10-510之间的随机价格
    change_percent: (Math.random() - 0.5) * 10, // -5%到+5%之间的涨跌幅
    volume: Math.floor(Math.random() * 10000000) + 100000, // 10万到1000万的成交量
    market_cap: Math.floor(Math.random() * 1000000000000) + 1000000000, // 10亿到1万亿的市值
    sector: info.sector,
    industry: info.sector,
    exchange: 'NASDAQ',
    week_52_high: Math.random() * 600 + 50,
    week_52_low: Math.random() * 50 + 5,
    turnover: Math.random() * 1000000000
  };
}

// 执行数据库初始化
db.serialize(() => {
  console.log('📝 Creating sp500_stocks table...');
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
  const insertSQL = `
    INSERT OR REPLACE INTO sp500_stocks (
      ticker, name_zh, last_price, change_percent, volume, market_cap, 
      sector, industry, exchange, week_52_high, week_52_low, turnover
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const stmt = db.prepare(insertSQL);
  let insertedCount = 0;
  
  sp500Tickers.forEach((ticker, index) => {
    const data = generateTestData(ticker);
    stmt.run([
      data.ticker, data.name_zh, data.last_price, data.change_percent,
      data.volume, data.market_cap, data.sector, data.industry,
      data.exchange, data.week_52_high, data.week_52_low, data.turnover
    ], (err) => {
      if (err) {
        console.error(`❌ Error inserting ${ticker}:`, err.message);
      } else {
        insertedCount++;
        if (insertedCount % 50 === 0) {
          console.log(`📊 已插入 ${insertedCount} 只股票...`);
        }
      }
    });
  });
  
  stmt.finalize((err) => {
    if (err) {
      console.error('❌ Error finalizing statement:', err.message);
    } else {
      console.log(`✅ 成功插入 ${insertedCount} 只股票的测试数据`);
    }
  });
  
  // 验证数据
  setTimeout(() => {
    db.all('SELECT ticker, name_zh, sector, last_price, change_percent FROM sp500_stocks LIMIT 10', (err, rows) => {
      if (err) {
        console.error('❌ Error querying data:', err.message);
      } else {
        console.log('\n📊 Sample data in database:');
        console.table(rows);
      }
    });
    
    db.get('SELECT COUNT(*) as total FROM sp500_stocks', (err, row) => {
      if (err) {
        console.error('❌ Error counting data:', err.message);
      } else {
        console.log(`\n📈 总计股票数量: ${row.total}`);
      }
    });
  }, 2000);
});

// 关闭数据库连接
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('\n✅ SP500 database setup completed successfully!');
      console.log(`Database file: ${dbPath}`);
      console.log('\n📝 下一步: 重启服务器测试ranking API');
    }
  });
}, 3000);