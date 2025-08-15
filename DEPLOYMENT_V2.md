# Stock Tag Explorer V2.0 部署指南

## 🚀 部署概述

本指南将帮助您部署新的双轨制数据更新架构，解决之前的超时和性能问题。

## 📋 部署前检查清单

### 1. 环境变量配置

#### Vercel 环境变量
```bash
# 必需的环境变量
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
POLYGON_API_KEY=your_polygon_api_key
FINNHUB_API_KEY=your_finnhub_api_key
CRON_SECRET=your_secure_random_token
```

#### GitHub Secrets
确保在 GitHub 仓库设置中配置以下 Secrets：
- `DATABASE_URL`
- `POLYGON_API_KEY`
- `FINNHUB_API_KEY`
- `CRON_SECRET`

### 2. API 密钥获取

#### Polygon.io
1. 访问 [Polygon.io](https://polygon.io/)
2. 注册免费账户
3. 获取 API Key
4. 免费版限制：每分钟5次请求

#### Finnhub
1. 访问 [Finnhub.io](https://finnhub.io/)
2. 注册免费账户
3. 获取 API Key
4. 免费版限制：每秒1次请求

## 🔧 部署步骤

### 步骤 1: 代码部署

```bash
# 1. 推送代码到 GitHub
git add .
git commit -m "feat: 实现双轨制数据更新架构 V2.0"
git push origin main

# 2. Vercel 自动部署
# 等待 Vercel 完成部署
```

### 步骤 2: 数据库迁移

```bash
# 在本地或服务器上运行数据库迁移
node scripts/add-financial-fields.js
```

**注意**: 如果本地环境没有数据库连接，可以在 Vercel 函数中运行迁移：

1. 临时创建一个迁移 API 端点
2. 通过 HTTP 请求触发迁移
3. 迁移完成后删除该端点

### 步骤 3: API 端点测试

#### 测试市场数据更新
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  "https://your-app.vercel.app/api/update-market"
```

预期响应：
```json
{
  "success": true,
  "updated": 500,
  "total": 500,
  "type": "market_data"
}
```

#### 测试财务数据更新
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  "https://your-app.vercel.app/api/update-financials"
```

预期响应：
```json
{
  "success": true,
  "updated": 500,
  "total": 500,
  "type": "financial_data"
}
```

### 步骤 4: GitHub Actions 验证

#### 手动触发工作流
1. 访问 GitHub 仓库的 Actions 页面
2. 选择 "Update Market Data (High Frequency)"
3. 点击 "Run workflow"
4. 检查执行日志

重复上述步骤测试 "Update Financial Data (Low Frequency)" 工作流。

#### 检查工作流状态
```bash
# 查看最近的工作流运行
gh run list

# 查看特定工作流的日志
gh run view [run-id] --log
```

## 📊 监控和验证

### 1. 数据更新验证

```sql
-- 检查最近更新的股票数据
SELECT 
  ticker, 
  last_price, 
  change_percent, 
  market_cap_numeric,
  roe_ttm,
  updated_at
FROM stocks 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 10;
```

### 2. API 性能监控

在 Vercel Dashboard 中监控：
- 函数执行时间
- 错误率
- 调用频率

### 3. GitHub Actions 监控

检查工作流执行状态：
- 成功率
- 执行时间
- 错误日志

## 🔍 故障排除

### 常见问题

#### 1. API 超时
**症状**: Vercel 函数超时
**解决方案**: 
- 检查 Polygon API 响应时间
- 确保批量请求正常工作
- 验证网络连接

#### 2. 数据库连接失败
**症状**: "password authentication failed"
**解决方案**:
- 验证 `DATABASE_URL` 格式
- 检查 Neon 数据库状态
- 确认 SSL 配置

#### 3. API 密钥无效
**症状**: "Unauthorized" 或 "Invalid API key"
**解决方案**:
- 验证 API 密钥有效性
- 检查 API 配额使用情况
- 确认环境变量设置

#### 4. GitHub Actions 失败
**症状**: 工作流执行失败
**解决方案**:
- 检查 GitHub Secrets 配置
- 验证 CRON_SECRET 匹配
- 查看详细错误日志

### 调试命令

```bash
# 检查环境变量
echo $DATABASE_URL
echo $POLYGON_API_KEY
echo $FINNHUB_API_KEY

# 测试数据库连接
node -e "console.log(process.env.DATABASE_URL)"

# 验证 API 密钥
curl "https://api.polygon.io/v1/meta/symbols?apikey=YOUR_KEY"
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY"
```

## 📈 性能优化建议

### 1. 缓存策略
- 为读取 API 添加适当的缓存头
- 使用 CDN 缓存静态资源

### 2. 数据库优化
- 定期分析查询性能
- 添加必要的索引
- 清理过期数据

### 3. API 限制管理
- 监控 API 使用配额
- 实现智能重试机制
- 考虑升级到付费计划

## 🎯 成功指标

部署成功后，您应该看到：

1. **市场数据更新**:
   - ✅ 每15分钟自动执行
   - ✅ 执行时间 < 10秒
   - ✅ 成功率 > 95%

2. **财务数据更新**:
   - ✅ 每天自动执行
   - ✅ 完整处理500+股票
   - ✅ 成功率 > 90%

3. **用户体验**:
   - ✅ 热力图数据实时更新
   - ✅ 股票信息准确完整
   - ✅ 页面加载速度快

## 📞 支持

如果遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查 GitHub Issues
3. 查看 Vercel 和 GitHub Actions 日志
4. 联系技术支持团队

---

🎉 **恭喜！您已成功部署 Stock Tag Explorer V2.0 架构！**