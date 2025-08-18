# 静态字段缺失问题分析与解决方案

## 问题描述

您的 GitHub Actions 工作流运行正常（显示绿色✅），但数据库中的 `sector_zh`、`sector_en`、`logo`、`name_zh` 等静态字段显示为 `NULL`。

## 根本原因分析

### 1. 工作流分工不完整

当前的 4 个 GitHub Actions 工作流分工如下：

- **`update-hot-financials.yml`** (每小时): 更新热门股票的财务数据
- **`update-market-data.yml`** (高频): 更新股价、涨跌幅等实时数据  
- **`update-all-daily.yml`** (每日): 更新 `market_cap`、`roe_ttm`、`pe_ttm` 等财务指标
- **`update-data.yml`** (每日): 主要负责数据库结构维护

**问题**: 没有任何工作流负责更新 `sector_zh`、`sector_en`、`logo` 等静态公司信息字段！

### 2. 数据库表结构完整，但数据获取逻辑缺失

数据库表 `stocks` 的结构是完整的，包含了所有必要的字段：
```sql
CREATE TABLE stocks (
  ticker VARCHAR(10) PRIMARY KEY,
  name_en TEXT,
  name_zh TEXT,
  sector_en TEXT,     -- ❌ 没有脚本更新此字段
  sector_zh TEXT,     -- ❌ 没有脚本更新此字段  
  market_cap NUMERIC, -- ✅ update-all-financials-and-tags.mjs 更新
  logo TEXT,          -- ❌ 没有脚本更新此字段
  last_price NUMERIC, -- ✅ update-market-data.mjs 更新
  -- ... 其他字段
);
```

### 3. "静默失败" (Silent Failure)

这是典型的"静默失败"案例：
- GitHub Actions 显示成功 ✅ (因为脚本没有抛出错误)
- 但实际上缺少了关键的数据更新逻辑
- 数据库连接正常，部分字段正常更新，掩盖了问题

## 解决方案

### 1. 新增专门的公司资料更新脚本

已创建 `_scripts/update-company-profiles.mjs`，功能包括：

- 📊 从 Finnhub API 获取公司基本信息
- 🏢 从 Polygon API 获取详细的公司资料
- 🌐 内置中英文行业分类映射
- 🏷️ 内置公司名称中文翻译映射
- 🔄 批量更新 `sector_zh`、`sector_en`、`logo`、`name_zh` 字段

### 2. 新增 GitHub Actions 工作流

已创建 `.github/workflows/update-company-profiles.yml`：

- ⏰ 每周日凌晨 2 点自动运行
- 🔧 可手动触发 (workflow_dispatch)
- ⚡ 2 小时超时保护
- 📧 失败时自动通知

### 3. 环境变量配置

脚本需要以下环境变量（在 GitHub Secrets 中配置）：

```bash
NEON_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
FINNHUB_API_KEY=your_finnhub_api_key
POLYGON_API_KEY=your_polygon_api_key  
```

## 立即执行步骤

### 1. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. `NEON_DATABASE_URL` - 您的 Neon 数据库连接字符串
2. `FINNHUB_API_KEY` - Finnhub API 密钥 (免费版即可)
3. `POLYGON_API_KEY` - Polygon API 密钥 (免费版即可)

### 2. 手动触发新工作流

1. 进入 GitHub Actions 页面
2. 选择 "Update Company Profiles (Weekly)" 工作流
3. 点击 "Run workflow" 手动触发
4. 等待执行完成（约 10-30 分钟）

### 3. 验证结果

执行完成后，检查数据库中的 `stocks` 表：

```sql
SELECT ticker, name_zh, sector_zh, sector_en, logo 
FROM stocks 
WHERE ticker IN ('AAPL', 'MSFT', 'GOOGL') 
LIMIT 5;
```

应该看到这些字段不再是 `NULL`。

## 预期效果

修复后，您的数据库将包含完整的股票信息：

| ticker | name_zh | sector_zh | sector_en | logo |
|--------|---------|-----------|-----------|------|
| AAPL   | 苹果公司 | 科技      | Technology | https://... |
| MSFT   | 微软公司 | 科技      | Technology | https://... |
| GOOGL  | 谷歌公司 | 科技      | Technology | https://... |

## 监控与维护

- 🔍 **监控**: 每周检查工作流执行状态
- 📊 **数据质量**: 定期验证字段完整性
- 🔄 **API 限制**: 注意 API 调用频率限制
- 📈 **扩展**: 可根据需要添加更多公司信息字段

---

**总结**: 问题的根本原因是缺少专门更新静态公司信息的自动化脚本。通过新增 `update-company-profiles.mjs` 脚本和对应的 GitHub Actions 工作流，可以完全解决 `sector_zh`、`sector_en`、`logo` 等字段为 `NULL` 的问题。