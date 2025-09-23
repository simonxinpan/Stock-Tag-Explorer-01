const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 专门检查中概股数据库
const dbPath = path.join(__dirname, 'chinese_stocks.db');

console.log('=== 检查中概股数据库 ===');
console.log(`数据库路径: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    return;
  }
  console.log('✓ 成功连接到中概股数据库');
});

// 获取所有表名
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('获取表列表失败:', err.message);
    return;
  }

  console.log(`\n表列表 (${tables.length} 个表):`);
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });

  // 检查每个表的详细信息
  tables.forEach(table => {
    console.log(`\n--- 检查表: ${table.name} ---`);
    
    // 获取行数
    db.get(`SELECT COUNT(*) as count FROM ${table.name}`, [], (err, row) => {
      if (err) {
        console.error(`获取 ${table.name} 行数失败:`, err.message);
        return;
      }
      
      console.log(`行数: ${row.count}`);
      
      // 获取表结构
      db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
        if (err) {
          console.error(`获取 ${table.name} 表结构失败:`, err.message);
          return;
        }
        
        console.log('字段:');
        columns.forEach(col => {
          console.log(`  - ${col.name} (${col.type})`);
        });
        
        if (row.count > 0) {
          // 获取前5行数据
          db.all(`SELECT * FROM ${table.name} LIMIT 5`, [], (err, rows) => {
            if (err) {
              console.error(`获取 ${table.name} 数据失败:`, err.message);
            } else {
              console.log('前5行数据:');
              rows.forEach((row, index) => {
                console.log(`  第${index + 1}行:`, JSON.stringify(row, null, 2));
              });
            }
          });
        }
      });
    });
  });
});

// 5秒后关闭数据库
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库失败:', err.message);
    } else {
      console.log('\n✓ 数据库已关闭');
    }
  });
}, 5000);