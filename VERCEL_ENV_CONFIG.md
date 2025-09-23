# Vercel 环境变量配置指南

## 🚨 问题描述

中概股页面在 Vercel 部署版本中出现 500 错误：
```
Failed to load resource: the server responded with a status of 500 ()
API请求失败，状态码: 500
```

## 🔍 问题根因

1. **本地环境**：使用 SQLite 数据库，功能正常
2. **Vercel 环境**：缺少 `CHINESE_STOCKS_DB_URL` 环境变量，导致中概股数据库连接失败

## ✅ 解决方案

### 步骤 1: 在 Vercel 控制台配置环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 `stock-tag-explorer-01`
3. 进入 **Settings** > **Environment Variables**
4. 添加以下环境变量：

```bash
# 中概股数据库连接（必需）
CHINESE_STOCKS_DB_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/chinese_stocks_db?sslmode=require

# 标普500数据库连接（如果还没有）
NEON_DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# API密钥（如果还没有）
FINNHUB_API_KEY=your_finnhub_api_key_here
POLYGON_API_KEY=your_polygon_api_key_here
```

### 步骤 2: 重新部署

配置环境变量后，Vercel 会自动触发重新部署，或者你可以手动触发：

1. 在 Vercel Dashboard 中点击 **Deployments**
2. 点击 **Redeploy** 按钮

### 步骤 3: 验证修复

部署完成后，访问以下 URL 验证功能：

```bash
# 中概股涨幅榜
https://your-vercel-domain.vercel.app/list-detail.html?market=chinese_stocks&list=top_gainers

# 中概股市值榜
https://your-vercel-domain.vercel.app/list-detail.html?market=chinese_stocks&list=top_market_cap

# 中概股机构关注榜
https://your-vercel-domain.vercel.app/list-detail.html?market=chinese_stocks&list=institutional_focus
```

## 🔧 技术细节

### API 修复内容

1. **环境变量检查**：添加了详细的环境变量存在性检查
2. **错误日志增强**：提供更详细的错误信息和调试日志
3. **数据库连接池**：改进了连接池初始化逻辑

### 修复的文件

- `api/ranking.js`：添加了环境变量检查和详细错误日志
- `.env.example`：添加了 `CHINESE_STOCKS_DB_URL` 配置示例

## 📊 环境变量对照表

| 环境 | 标普500数据库 | 中概股数据库 | 状态 |
|------|---------------|--------------|------|
| 本地开发 | SQLite | SQLite | ✅ 正常 |
| Vercel部署 | PostgreSQL (Neon) | PostgreSQL (Neon) | ❌ 需要配置 |

## 🚀 后续优化建议

1. **数据库统一**：考虑将两个市场的数据合并到同一个数据库中
2. **环境检测**：添加自动环境检测和配置验证
3. **监控告警**：设置 API 错误监控和告警机制

## 📞 联系支持

如果配置后仍有问题，请检查：
1. 数据库连接字符串是否正确
2. 数据库中是否有中概股数据
3. Vercel 部署日志中的详细错误信息