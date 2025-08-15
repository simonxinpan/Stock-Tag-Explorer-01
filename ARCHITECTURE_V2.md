# Stock Tag Explorer - 架构 V2.0

## 🏗️ 新架构概述

基于性能优化和职责分离原则，我们将数据更新系统重构为**双轨制架构**：

### 📈 高频市场数据轨道
- **频率**: 每15分钟（仅交易时间）
- **数据源**: Polygon.io 批量接口
- **职责**: 更新价格、涨跌幅、成交量等市场数据
- **API**: `/api/update-market.js`
- **工作流**: `.github/workflows/update-market-data.yml`

### 💰 低频财务数据轨道
- **频率**: 每天一次
- **数据源**: Finnhub 财务指标接口
- **职责**: 更新市值、ROE、PE等财务数据
- **API**: `/api/update-financials.js`
- **工作流**: `.github/workflows/update-financials-data.yml`

## 🔧 技术实现

### 市场数据更新 (`/api/update-market.js`)
```javascript
// 使用 Polygon 高效批量接口
const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}`;
// 一次性获取所有股票的市场数据
// 更新字段: last_price, change_amount, change_percent, open_price, high_price, low_price, volume
```

### 财务数据更新 (`/api/update-financials.js`)
```javascript
// 使用 Finnhub 财务指标接口
const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all`;
// 逐个获取股票的财务数据（尊重API限制，间隔1.1秒）
// 更新字段: market_cap, roe_ttm, pe_ttm, dividend_yield, eps_ttm, revenue_ttm
```

## 📊 数据库架构更新

### 新增字段
```sql
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS:
- market_cap_numeric BIGINT     -- 数值型市值
- roe_ttm DECIMAL(8,4)          -- 过去12个月ROE
- pe_ttm DECIMAL(8,2)           -- 过去12个月PE比率
- dividend_yield DECIMAL(6,4)   -- 股息收益率
- eps_ttm DECIMAL(10,4)         -- 过去12个月每股收益
- revenue_ttm BIGINT            -- 过去12个月营收
- open_price DECIMAL(10,2)      -- 开盘价
- high_price DECIMAL(10,2)      -- 最高价
- low_price DECIMAL(10,2)       -- 最低价
- last_price DECIMAL(10,2)      -- 最新价格
- updated_at TIMESTAMP          -- 更新时间
```

### 迁移脚本
运行 `node scripts/add-financial-fields.js` 来添加新字段。

## 🚀 GitHub Actions 工作流

### 高频市场数据更新
```yaml
# .github/workflows/update-market-data.yml
schedule:
  - cron: '*/15 9-16 * * 1-5'  # 每15分钟，交易时间
```

### 低频财务数据更新
```yaml
# .github/workflows/update-financials-data.yml
schedule:
  - cron: '0 8 * * *'  # 每天早上8点
timeout-minutes: 60  # 给予充足时间处理500+股票
```

## 🔍 API 修复

### 列名修复
所有读取API中的错误列名已修复：
- ❌ `s.symbol` → ✅ `s.ticker`
- 影响文件: `/api/stocks.js`, `/api/tags.js`

## 🎯 性能优势

### 之前的问题
- ❌ 单一API处理所有数据更新
- ❌ 逐个循环调用Finnhub（500+次请求）
- ❌ 必然触发Vercel 10秒超时
- ❌ GitHub Actions任务失败

### 现在的解决方案
- ✅ 职责分离，各司其职
- ✅ 高频数据使用高效批量接口（1次请求）
- ✅ 低频数据在GitHub Actions长时限内运行
- ✅ 互不干扰，稳定可靠

## 📋 部署清单

### 1. 环境变量确认
```bash
# Vercel 环境变量
DATABASE_URL=postgresql://...
POLYGON_API_KEY=your_polygon_key
FINNHUB_API_KEY=your_finnhub_key
CRON_SECRET=your_secret_token

# GitHub Secrets
DATABASE_URL
POLYGON_API_KEY
FINNHUB_API_KEY
CRON_SECRET
```

### 2. 数据库迁移
```bash
# 在生产环境运行
node scripts/add-financial-fields.js
```

### 3. API 端点验证
```bash
# 测试市场数据更新
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/update-market

# 测试财务数据更新
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/update-financials
```

### 4. GitHub Actions 验证
- 手动触发两个工作流
- 检查执行日志
- 验证数据更新

## 🔮 预期结果

1. **市场数据**: 每15分钟自动更新，响应时间 < 5秒
2. **财务数据**: 每天自动更新，完整覆盖500+股票
3. **系统稳定性**: 99.9%+ 成功率
4. **用户体验**: 实时准确的股票数据和热力图

## 🛠️ 故障排除

### 常见问题
1. **Polygon API 限制**: 免费版每分钟5次请求
2. **Finnhub API 限制**: 免费版每秒1次请求
3. **Vercel 超时**: 确保市场数据更新 < 10秒
4. **GitHub Actions 超时**: 财务数据更新设置60分钟超时

### 监控指标
- API 响应时间
- 数据更新成功率
- 错误日志分析
- 数据库连接状态