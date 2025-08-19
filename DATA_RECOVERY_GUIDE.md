# 📊 数据恢复指南 - 解决502只股票变成5只的问题

## 🚨 问题诊断

**问题描述**: Neon数据库原本有502只股票，但经过GitHub Actions注入数据后只剩下5只股票。

**根本原因**: 
1. `_scripts/update-database.mjs` 脚本中的 `cleanAndRebuildDatabase` 函数会无条件删除所有表数据
2. `updateStockData` 函数只插入了5只示例股票（AAPL、MSFT、GOOGL、AMZN、TSLA）
3. GitHub Actions 工作流 `update-data.yml` 调用了这个脚本，导致数据丢失

## ✅ 已修复的问题

我们已经修复了以下问题，防止未来数据丢失：

1. **移除了危险的数据清理操作**:
   - 注释掉了 `cleanAndRebuildDatabase` 调用
   - 修改了表结构验证函数，不再自动删除包含数据的表

2. **保护现有数据**:
   - 脚本现在只创建缺失的表，不会删除现有数据
   - 添加了数据保护警告信息

## 🔧 数据恢复方案

### 方案1: 重新导入标普500股票数据（推荐）

如果您的502只股票是标普500成分股，可以通过以下步骤恢复：

1. **获取标普500股票列表**:
```bash
# 创建股票数据恢复脚本
node -e "
console.log('创建标普500股票恢复脚本...');
const fs = require('fs');
const script = \`
// 标普500股票恢复脚本
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 标普500股票代码列表（部分示例）
const sp500Tickers = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'GOOG', 'TSLA', 'META', 'BRK.B', 'UNH',
  'XOM', 'JNJ', 'JPM', 'V', 'PG', 'HD', 'CVX', 'MA', 'BAC', 'ABBV',
  'PFE', 'AVGO', 'COST', 'DIS', 'KO', 'MRK', 'PEP', 'TMO', 'WMT', 'ABT',
  // ... 添加更多股票代码
];

async function restoreStocks() {
  const client = await pool.connect();
  try {
    console.log('开始恢复股票数据...');
    
    for (const ticker of sp500Tickers) {
      await client.query(\\\`
        INSERT INTO stocks (ticker, name_zh, sector_zh) 
        VALUES ($1, $2, $3)
        ON CONFLICT (ticker) DO NOTHING
      \\\`, [ticker, \\\`\\\${ticker}公司\\\`, '待更新']);
    }
    
    console.log(\\\`✅ 恢复了 \\\${sp500Tickers.length} 只股票的基础信息\\\`);
    console.log('📝 请运行数据更新脚本获取最新价格和财务数据');
    
  } catch (error) {
    console.error('❌ 恢复失败:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

restoreStocks();
\`;
fs.writeFileSync('_scripts/restore-sp500-stocks.js', script);
console.log('✅ 恢复脚本已创建: _scripts/restore-sp500-stocks.js');
"
```

2. **运行恢复脚本**:
```bash
node _scripts/restore-sp500-stocks.js
```

### 方案2: 从备份恢复（如果有备份）

如果您有数据库备份：

1. **检查Neon控制台的备份**:
   - 登录 Neon 控制台
   - 查看是否有自动备份可以恢复
   - 选择数据丢失前的时间点进行恢复

2. **从SQL转储恢复**:
```bash
# 如果有SQL备份文件
psql "$NEON_DATABASE_URL" < backup.sql
```

### 方案3: 重新获取完整股票数据

创建一个完整的股票数据获取脚本：

```javascript
// _scripts/fetch-all-stocks.js
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fetchAllStocks() {
  const client = await pool.connect();
  try {
    // 使用Polygon API获取所有美股
    const response = await axios.get(`https://api.polygon.io/v3/reference/tickers?market=stocks&active=true&limit=1000&apikey=${process.env.POLYGON_API_KEY}`);
    
    const stocks = response.data.results;
    console.log(`获取到 ${stocks.length} 只股票`);
    
    for (const stock of stocks) {
      await client.query(`
        INSERT INTO stocks (ticker, name_en, name_zh, market_cap, sector_en) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (ticker) DO UPDATE SET
          name_en = EXCLUDED.name_en,
          market_cap = EXCLUDED.market_cap,
          sector_en = EXCLUDED.sector_en
      `, [
        stock.ticker,
        stock.name,
        stock.name, // 临时使用英文名
        stock.market_cap,
        stock.primary_exchange
      ]);
    }
    
    console.log('✅ 股票数据恢复完成');
    
  } catch (error) {
    console.error('❌ 获取失败:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fetchAllStocks();
```

## 🛡️ 预防措施

为防止未来数据丢失，我们已经实施了以下保护措施：

1. **修改了 `update-database.mjs`**:
   - 移除了 `cleanAndRebuildDatabase` 调用
   - 添加了数据保护逻辑
   - 只创建缺失的表，不删除现有数据

2. **安全的表结构更新**:
   - 检测到表结构需要更新时，不会自动删除表
   - 提示需要手动迁移以保护数据

3. **建议的最佳实践**:
   - 在生产环境运行脚本前先在测试环境验证
   - 定期备份重要数据
   - 使用事务确保数据一致性

## 📝 验证恢复结果

恢复数据后，请运行以下查询验证：

```sql
-- 检查股票总数
SELECT COUNT(*) as total_stocks FROM stocks;

-- 检查标签总数
SELECT COUNT(*) as total_tags FROM tags;

-- 检查股票标签关联
SELECT COUNT(*) as total_associations FROM stock_tags;

-- 查看最近更新的股票
SELECT ticker, name_zh, last_updated 
FROM stocks 
ORDER BY last_updated DESC 
LIMIT 10;
```

## 🆘 需要帮助？

如果您在数据恢复过程中遇到问题：

1. 检查环境变量是否正确设置
2. 确认数据库连接正常
3. 查看脚本运行日志中的错误信息
4. 如果问题持续，请联系技术支持

---

**重要提醒**: 修复后的脚本现在是安全的，不会再删除现有数据。您可以放心运行 GitHub Actions 工作流。