# GitHub Actions 配置指南

本文档说明如何配置GitHub Actions以实现自动化部署和数据更新。

## 🔑 GitHub Secrets 配置

### 1. 访问GitHub Secrets设置

1. 进入你的GitHub仓库
2. 点击 **Settings** 标签
3. 在左侧菜单中选择 **Secrets and variables** > **Actions**
4. 点击 **New repository secret**

### 2. 必需的Secrets

请添加以下Secrets（注意：名称必须完全匹配）：

#### API密钥
```
POLYGON_API_KEY
值：你的Polygon.io API密钥
```

```
FINNHUB_API_KEY
值：你的Finnhub API密钥
```

#### 数据库配置
```
DATABASE_URL
值：你的Neon PostgreSQL连接字符串
格式：postgresql://username:password@host/database?sslmode=require
```

#### Vercel部署配置（可选）
```
VERCEL_TOKEN
值：你的Vercel访问令牌
```

```
ORG_ID
值：你的Vercel组织ID
```

```
PROJECT_ID
值：你的Vercel项目ID
```

## 🚀 工作流说明

### 1. 部署工作流 (deploy.yml)

**触发条件：**
- 推送到 `main` 或 `master` 分支
- 创建Pull Request

**功能：**
- 安装依赖
- 运行API测试
- 构建项目
- 部署到Vercel

### 2. 数据更新工作流 (update-data.yml)

**触发条件：**
- 定时任务：每个工作日UTC 13:00（美东时间8:00 AM）
- 手动触发

**功能：**
- 测试API连接
- 更新股票数据
- 验证数据更新

## 🔧 本地测试

在推送到GitHub之前，你可以在本地测试配置：

### 1. 创建本地环境文件
```bash
cp .env.example .env
```

### 2. 编辑 .env 文件
```env
POLYGON_API_KEY=your_polygon_api_key
FINNHUB_API_KEY=your_finnhub_api_key
DATABASE_URL=your_neon_database_url
```

### 3. 运行测试
```bash
# 测试API连接
npm run test:api

# 更新股票数据
npm run update-stocks

# 验证数据
npm run verify-data
```

## 🐛 故障排除

### 常见问题

1. **API密钥未设置**
   - 检查GitHub Secrets中的密钥名称是否正确
   - 确保密钥值没有多余的空格或换行符

2. **数据库连接失败**
   - 验证DATABASE_URL格式是否正确
   - 确保Neon数据库处于活跃状态

3. **GitHub Actions失败**
   - 查看Actions日志中的详细错误信息
   - 检查依赖安装是否成功

### 调试步骤

1. **查看Actions日志**
   - 进入GitHub仓库的Actions标签
   - 点击失败的工作流
   - 展开失败的步骤查看详细日志

2. **手动触发测试**
   - 在Actions页面找到"Update Stock Data"工作流
   - 点击"Run workflow"按钮手动触发

3. **本地复现问题**
   - 使用相同的环境变量在本地运行脚本
   - 检查API响应和数据库连接

## 📊 监控和维护

### 1. 定期检查
- 每周检查GitHub Actions的运行状态
- 监控API配额使用情况
- 验证数据更新的准确性

### 2. 日志分析
- 查看更新成功率
- 识别经常失败的股票符号
- 监控API响应时间

### 3. 性能优化
- 根据API限制调整更新频率
- 优化批量更新逻辑
- 实施错误重试机制

## 🔄 更新流程

1. **代码更新**
   ```bash
   git add .
   git commit -m "feat: 更新股票数据获取逻辑"
   git push origin main
   ```

2. **自动部署**
   - GitHub Actions自动触发部署工作流
   - Vercel自动更新生产环境

3. **数据更新**
   - 定时任务自动运行
   - 或手动触发数据更新工作流

---

如果遇到问题，请检查GitHub Actions的日志输出，或参考项目的其他文档。