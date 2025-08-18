# 数据库数据注入部署指南

## 🎯 目标

确保 Neon 数据库中的股票数据完全注入，包括：
- 公司基础信息（中文名称、行业分类、Logo）
- 实时股价数据（价格、涨跌幅、52周高低点）
- 财务指标和智能标签

## 📋 前置条件

### 1. API 密钥准备

确保你拥有以下 API 密钥：

- **Neon Database URL**: 你的 Neon PostgreSQL 数据库连接字符串
- **Finnhub API Key**: 从 [Finnhub.io](https://finnhub.io) 获取
- **Polygon API Key**: 从 [Polygon.io](https://polygon.io) 获取

### 2. GitHub Secrets 配置

在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库 Settings > Secrets and variables > Actions
2. 点击 "New repository secret"
3. 添加以下密钥：

```
名称: DATABASE_URL
值: postgresql://username:password@host:port/database?sslmode=require

名称: FINNHUB_API_KEY  
值: your_finnhub_api_key_here

名称: POLYGON_API_KEY
值: your_polygon_api_key_here
```

## 🚀 部署步骤

### 步骤 1: 验证修复

所有脚本已经修复并支持：
- ✅ 环境变量兼容性 (`DATABASE_URL` 或 `NEON_DATABASE_URL`)
- ✅ 测试模式自动检测
- ✅ 完整的字段更新逻辑
- ✅ 改进的错误处理

### 步骤 2: 手动触发工作流

按以下顺序手动触发 GitHub Actions 工作流：

#### 2.1 公司资料更新 (一次性)
```
工作流: Update Company Profiles
文件: .github/workflows/update-company-profiles.yml
作用: 更新公司中文名称、行业分类、Logo
频率: 每周自动 + 手动触发
```

#### 2.2 市场数据更新 (高频)
```
工作流: Update Market Data (High Frequency)
文件: .github/workflows/update-market-data.yml
作用: 更新股价、涨跌幅、52周高低点
频率: 每15分钟自动 + 手动触发
```

#### 2.3 热门股票财务更新 (每小时)
```
工作流: Update Hot Financials
文件: .github/workflows/update-hot-financials.yml
作用: 更新市值最高50家公司的财务指标
频率: 每小时自动 + 手动触发
```

#### 2.4 全量每日更新
```
工作流: Update All Daily
文件: .github/workflows/update-all-daily.yml
作用: 全面更新所有股票的财务数据和标签
频率: 每日自动 + 手动触发
```

### 步骤 3: 监控执行结果

#### 3.1 检查 GitHub Actions 日志
1. 进入 Actions 标签页
2. 查看每个工作流的执行状态
3. 点击具体运行查看详细日志
4. 确认没有错误信息

#### 3.2 验证数据库数据
运行本地检查脚本：
```bash
# 设置环境变量（可选，用于本地测试）
export DATABASE_URL="your_neon_database_url"

# 运行检查脚本
node _scripts/check-static-fields.mjs
```

## 📊 预期结果

### 数据库字段完整性

执行成功后，`stocks` 表应包含以下完整数据：

#### 静态字段 (Company Profiles):
- `name_zh`: 中文公司名称 (如: "苹果公司")
- `sector_zh`: 中文行业分类 (如: "信息技术")
- `sector_en`: 英文行业分类 (如: "Technology")
- `logo`: 公司Logo URL

#### 动态字段 (Market Data):
- `last_price`: 最新股价
- `change_amount`: 涨跌额 (新增)
- `change_percent`: 涨跌幅百分比
- `week_52_high`: 52周最高价 (新增)
- `week_52_low`: 52周最低价 (新增)
- `last_updated`: 最后更新时间

#### 财务字段 (Financials):
- `market_cap`: 市值
- `pe_ratio`: 市盈率
- `dividend_yield`: 股息收益率
- 各种智能标签

### 前端应用效果

数据注入成功后，前端应用将显示：
- ✅ 完整的中文公司名称
- ✅ 准确的行业分类
- ✅ 公司Logo图标
- ✅ 实时股价和涨跌信息
- ✅ 52周价格区间
- ✅ 财务指标和投资标签

## 🔧 故障排除

### 问题 1: 工作流运行失败

**可能原因**:
- GitHub Secrets 配置错误
- API 密钥无效或过期
- API 调用限制

**解决方案**:
1. 检查 Secrets 配置是否正确
2. 验证 API 密钥有效性
3. 查看 Actions 日志中的具体错误信息

### 问题 2: 数据库连接失败

**可能原因**:
- Neon 数据库 URL 格式错误
- 数据库权限不足
- 网络连接问题

**解决方案**:
1. 确认数据库 URL 格式：`postgresql://user:pass@host:port/db?sslmode=require`
2. 检查数据库用户权限
3. 测试数据库连接

### 问题 3: 部分数据仍为 NULL

**可能原因**:
- API 返回数据不完整
- 股票代码在 API 中不存在
- 网络请求超时

**解决方案**:
1. 手动重新运行相关工作流
2. 检查 API 文档确认数据可用性
3. 增加请求重试机制

### 问题 4: 本地测试

如果需要本地测试脚本：

```bash
# 设置环境变量
export DATABASE_URL="your_neon_database_url"
export FINNHUB_API_KEY="your_finnhub_key"
export POLYGON_API_KEY="your_polygon_key"

# 运行单个脚本
node _scripts/update-company-profiles.mjs
node _scripts/update-market-data.mjs
node _scripts/update-hot-financials.mjs
node _scripts/update-all-financials-and-tags.mjs

# 检查数据完整性
node _scripts/check-static-fields.mjs
```

## ✅ 验收标准

部署成功的标志：

1. **所有 GitHub Actions 工作流运行成功** ✅
2. **数据库中 NULL 字段显著减少** ✅
3. **前端应用显示完整的股票信息** ✅
4. **中文公司名称和行业分类正确显示** ✅
5. **实时股价数据正常更新** ✅