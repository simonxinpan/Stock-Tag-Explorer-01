# GitHub Secrets 配置指南

## 概述

为了让GitHub Actions工作流正常运行，您需要在GitHub仓库中配置以下Secrets。这些Secrets用于API认证和服务连接。

## 必需的GitHub Secrets

### 1. VERCEL_URL
- **描述**: 您的Vercel部署应用的完整URL
- **格式**: `https://your-app-name.vercel.app`
- **示例**: `https://stock-tag-explorer.vercel.app`
- **获取方式**: 
  1. 登录Vercel控制台
  2. 找到您的项目
  3. 复制项目的Production URL

### 2. CRON_SECRET
- **描述**: 用于API端点认证的密钥
- **格式**: 任意安全字符串
- **示例**: `your-secure-random-string-123`
- **生成方式**: 使用随机字符串生成器或命令 `openssl rand -hex 32`

### 3. DATABASE_URL
- **描述**: PostgreSQL数据库连接字符串
- **格式**: `postgresql://username:password@host:port/database?sslmode=require`
- **示例**: `postgresql://user:pass@ep-xxx.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require`
- **获取方式**: 从Neon或Vercel Postgres控制台复制

### 4. POLYGON_API_KEY
- **描述**: Polygon.io API密钥
- **格式**: 字母数字字符串
- **获取方式**: 
  1. 注册 https://polygon.io
  2. 在Dashboard中获取API Key

### 5. FINNHUB_API_KEY
- **描述**: Finnhub API密钥
- **格式**: 字母数字字符串
- **获取方式**: 
  1. 注册 https://finnhub.io
  2. 在Dashboard中获取API Key

## 配置步骤

### 在GitHub中添加Secrets

1. **打开仓库设置**
   - 进入您的GitHub仓库
   - 点击 "Settings" 标签

2. **访问Secrets页面**
   - 在左侧菜单中点击 "Secrets and variables"
   - 选择 "Actions"

3. **添加每个Secret**
   - 点击 "New repository secret"
   - 输入Secret名称（如 `VERCEL_URL`）
   - 输入对应的值
   - 点击 "Add secret"

4. **重复步骤3**，为所有5个Secrets添加配置

## 验证配置

### 手动触发工作流

1. 进入GitHub仓库的 "Actions" 标签
2. 选择 "Update Stock Data" 工作流
3. 点击 "Run workflow" 按钮
4. 选择分支并点击 "Run workflow"

### 检查执行结果

- ✅ **成功**: 工作流显示绿色勾号，API调用成功
- ❌ **失败**: 检查错误日志，确认Secrets配置是否正确

## 常见问题

### Q: 工作流仍然显示 "VERCEL_URL secret is not set"
**A**: 确认您已经在GitHub Secrets中添加了 `VERCEL_URL`，名称必须完全匹配（区分大小写）

### Q: API调用返回401错误
**A**: 检查 `CRON_SECRET` 是否正确配置，并确保与Vercel环境变量中的值一致

### Q: 数据库连接失败
**A**: 验证 `DATABASE_URL` 格式是否正确，确保包含正确的用户名、密码和主机信息

## 安全注意事项

- ⚠️ **永远不要**在代码中硬编码API密钥或数据库连接字符串
- ⚠️ **永远不要**在公开的文档或注释中暴露真实的Secret值
- ✅ 定期轮换API密钥和数据库密码
- ✅ 使用强随机字符串作为CRON_SECRET

## 下一步

配置完成后，GitHub Actions将能够：
- 自动调用Vercel API更新股票数据
- 每个工作日美股开盘前自动执行
- 支持手动触发进行测试

如果遇到问题，请检查GitHub Actions的执行日志获取详细错误信息。