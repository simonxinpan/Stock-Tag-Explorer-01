# 故障排除指南

本文档提供常见问题的解决方案和调试步骤。

## 🔧 环境配置问题

### 1. 环境变量未设置

**症状：**
```
❌ POLYGON_API_KEY: 未设置或为空
❌ FINNHUB_API_KEY: 未设置或为空
❌ DATABASE_URL: 未设置或为空
```

**解决方案：**

1. **本地开发环境**
   ```bash
   # 检查 .env 文件是否存在
   ls -la .env
   
   # 如果不存在，从示例文件复制
   cp .env.example .env
   
   # 编辑环境变量
   nano .env  # 或使用你喜欢的编辑器
   ```

2. **GitHub Actions**
   - 进入GitHub仓库设置
   - 导航到 Settings > Secrets and variables > Actions
   - 添加必需的Repository secrets
   - 确保变量名称完全匹配（区分大小写）

3. **Vercel部署**
   - 登录Vercel控制台
   - 选择你的项目
   - 进入Settings > Environment Variables
   - 添加所有必需的环境变量

### 2. API密钥无效

**症状：**
```
Polygon API error: 401 Unauthorized
Finnhub API error: 403 Forbidden
```

**解决方案：**

1. **验证API密钥**
   ```bash
   # 测试Polygon API
   curl "https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apikey=YOUR_API_KEY"
   
   # 测试Finnhub API
   curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_API_KEY"
   ```

2. **检查API配额**
   - 登录Polygon.io和Finnhub控制台
   - 检查API使用量和限制
   - 确认账户状态正常

3. **更新API密钥**
   - 如果密钥过期，生成新的密钥
   - 更新所有环境变量配置

## 🗄️ 数据库连接问题

### 1. 数据库连接失败

**症状：**
```
Error: connect ECONNREFUSED
Error: password authentication failed
```

**解决方案：**

1. **检查连接字符串格式**
   ```
   正确格式：postgresql://username:password@host:port/database?sslmode=require
   ```

2. **验证Neon数据库状态**
   - 登录Neon控制台
   - 检查数据库是否处于活跃状态
   - 确认连接字符串是否正确

3. **测试数据库连接**
   ```bash
   # 使用psql测试连接
   psql "postgresql://username:password@host:port/database?sslmode=require"
   
   # 或使用项目脚本
   npm run test:api
   ```

### 2. SSL连接问题

**症状：**
```
Error: self signed certificate in certificate chain
```

**解决方案：**

1. **确保SSL配置正确**
   ```javascript
   // 在生产环境中启用SSL
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
   });
   ```

2. **检查连接字符串**
   ```
   确保包含：?sslmode=require
   ```

## 🚀 GitHub Actions 问题

### 1. 工作流失败

**症状：**
- Actions标签显示红色X
- 构建或部署步骤失败

**调试步骤：**

1. **查看详细日志**
   - 进入GitHub仓库的Actions标签
   - 点击失败的工作流运行
   - 展开失败的步骤查看错误信息

2. **检查环境变量**
   ```bash
   # 在Actions中添加调试步骤
   - name: Debug environment
     run: |
       echo "Node version: $(node --version)"
       echo "NPM version: $(npm --version)"
       echo "Environment variables set: $(env | grep -E '(POLYGON|FINNHUB|DATABASE)' | wc -l)"
   ```

3. **本地复现问题**
   ```bash
   # 使用相同的Node.js版本
   nvm use 18
   
   # 清理并重新安装依赖
   rm -rf node_modules package-lock.json
   npm install
   
   # 运行相同的命令
   npm run check-env
   npm run test:api
   ```

### 2. 定时任务不执行

**症状：**
- 数据更新工作流没有按计划运行
- 手动触发正常，定时触发失败

**解决方案：**

1. **检查cron表达式**
   ```yaml
   # 每个工作日UTC 13:00（美东8:00 AM）
   - cron: '0 13 * * 1-5'
   ```

2. **验证仓库活跃度**
   - GitHub可能暂停不活跃仓库的定时任务
   - 确保仓库有定期的提交活动

3. **手动触发测试**
   - 使用workflow_dispatch手动触发
   - 检查是否有权限问题

## 📊 数据更新问题

### 1. 股票数据获取失败

**症状：**
```
❌ AAPL: 无法获取数据
❌ MSFT: API限制
```

**解决方案：**

1. **检查API限制**
   - 验证API配额是否用完
   - 调整请求频率和批量大小
   - 实施重试机制

2. **优化数据获取逻辑**
   ```javascript
   // 添加延迟避免限制
   await new Promise(resolve => setTimeout(resolve, 100));
   
   // 实施指数退避重试
   for (let i = 0; i < 3; i++) {
     try {
       const data = await fetchStockData(symbol);
       if (data) return data;
     } catch (error) {
       await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
     }
   }
   ```

3. **监控API响应**
   ```bash
   # 查看详细的API调用日志
   npm run update-stocks 2>&1 | tee update.log
   
   # 分析成功率
   grep -c "✅" update.log
   grep -c "❌" update.log
   ```

### 2. 数据库更新失败

**症状：**
```
⚠️ AAPL: 数据库更新失败
Error: duplicate key value violates unique constraint
```

**解决方案：**

1. **检查数据库架构**
   ```sql
   -- 验证表结构
   \d stocks
   
   -- 检查约束
   SELECT conname, contype FROM pg_constraint WHERE conrelid = 'stocks'::regclass;
   ```

2. **使用UPSERT操作**
   ```sql
   INSERT INTO stocks (symbol, price, change_amount, change_percent, volume, updated_at)
   VALUES ($1, $2, $3, $4, $5, NOW())
   ON CONFLICT (symbol) 
   DO UPDATE SET 
     price = EXCLUDED.price,
     change_amount = EXCLUDED.change_amount,
     change_percent = EXCLUDED.change_percent,
     volume = EXCLUDED.volume,
     updated_at = EXCLUDED.updated_at;
   ```

## 🌐 前端显示问题

### 1. 数据不显示

**症状：**
- 页面加载但没有股票数据
- API调用返回空结果

**调试步骤：**

1. **检查API端点**
   ```bash
   # 直接测试API
   curl https://your-domain.vercel.app/api/stocks
   curl https://your-domain.vercel.app/api/tags
   ```

2. **查看浏览器控制台**
   - 打开开发者工具
   - 检查Network标签中的API请求
   - 查看Console中的错误信息

3. **验证数据源**
   ```javascript
   // 在浏览器控制台中测试
   fetch('/api/stocks')
     .then(response => response.json())
     .then(data => console.log(data));
   ```

### 2. 样式问题

**症状：**
- 布局错乱
- 样式不生效

**解决方案：**

1. **检查CSS文件路径**
   ```html
   <!-- 确保路径正确 -->
   <link rel="stylesheet" href="/styles/main.css">
   ```

2. **清除浏览器缓存**
   - 硬刷新页面（Ctrl+F5）
   - 清除浏览器缓存
   - 使用隐私模式测试

## 📞 获取帮助

如果以上解决方案都无法解决你的问题：

1. **收集信息**
   - 错误信息的完整日志
   - 环境配置（隐藏敏感信息）
   - 重现步骤

2. **检查文档**
   - [部署指南](./DEPLOYMENT_GUIDE.md)
   - [GitHub Actions配置](./GITHUB_ACTIONS_SETUP.md)
   - [开发指南](./DEVELOPMENT_GUIDE.md)

3. **社区支持**
   - 创建GitHub Issue
   - 提供详细的错误信息和环境配置
   - 包含重现步骤

---

记住：大多数问题都与环境配置相关。仔细检查API密钥、数据库连接和环境变量设置通常能解决90%的问题。