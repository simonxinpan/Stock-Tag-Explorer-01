const sqlite3 = require('sqlite3').verbose();

function checkDatabase(dbPath, dbName) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`📊 ${dbName}:`);
      
      // 检查股票总数
      db.get('SELECT COUNT(*) as count FROM stocks', (err, row) => {
        if (err) {
          console.log(`   ❌ 无法查询股票数据: ${err.message}`);
          db.close();
          resolve();
          return;
        }
        
        console.log(`   总股票数: ${row.count}`);
        
        if (row.count > 0) {
          // 获取样本数据
          db.all('SELECT ticker, name_zh, last_price, change_percent, market_cap FROM stocks LIMIT 5', (err, rows) => {
            if (err) {
              console.log(`   ❌ 无法获取样本数据: ${err.message}`);
            } else {
              console.log('   样本数据:');
              rows.forEach(stock => {
                console.log(`   - ${stock.ticker}: ${stock.name_zh || 'N/A'}, 价格: ${stock.last_price}, 涨跌: ${stock.change_percent}%`);
              });
            }
            
            db.close();
            resolve();
          });
        } else {
          db.close();
          resolve();
        }
      });
    });
  });
}

async function checkSQLiteData() {
  console.log('🔍 检查SQLite数据库中的数据...\n');
  
  try {
    await checkDatabase('./data/stock_explorer.db', '标普500数据库 (stock_explorer.db)');
    console.log('');
    await checkDatabase('./data/chinese_stocks.db', '中概股数据库 (chinese_stocks.db)');
  } catch (error) {
    console.error('❌ 检查数据库时出错:', error.message);
  }
}

checkSQLiteData();