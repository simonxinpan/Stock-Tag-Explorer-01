# 中概股功能配置指南

## 🎯 当前状态

✅ **已完成**：
- 中概股前端界面集成
- API路由和数据处理逻辑
- GitHub Actions工作流文件
- 模拟数据回退机制（当前正在使用）

⏳ **待完成**：
- Neon数据库配置
- Vercel环境变量配置
- GitHub Secrets配置
- 真实数据注入


---

## 🚀 完整配置步骤

### 第一步：配置Neon数据库

1. **登录Neon控制台**
   - 访问：https://console.neon.tech/
   - 使用您的账户登录

2. **创建中概股数据库**
   - 点击 "Create Project" 或进入现有项目
   - 创建新数据库：`chinese_stocks_db`
   - 复制完整的连接字符串（Connection String）
   - 格式类似：`postgresql://username:password@host/chinese_stocks_db?sslmode=require`

### 第二步：配置Vercel环境变量

1. **打开Vercel项目设置**
   - 访问：https://vercel.com/dashboard
   - 进入 `Stock-Tag-Explorer-01` 项目
   - 点击 "Settings" → "Environment Variables"

2. **添加新环境变量**
   ```
   Name: CHINESE_STOCKS_DATABASE_URL
   Value: [粘贴从Neon复制的连接字符串]
   Environment: Production, Preview, Development (全选)
   ```

3. **重新部署**
   - 保存后，Vercel会自动触发重新部署
   - 等待部署完成

### 第三步：配置GitHub Secrets

1. **打开GitHub项目设置**
   - 访问：https://github.com/simonxinpan/Stock-Tag-Explorer-01
   - 点击 "Settings" → "Secrets and variables" → "Actions"

2. **添加新Secret**
   ```
   Name: CHINESE_STOCKS_DATABASE_URL
   Value: [粘贴从Neon复制的连接字符串]
   ```

### 第四步：初始化数据库

1. **运行数据库初始化脚本**
   ```bash
   # 在本地项目目录运行
   node _scripts/init-chinese-stocks-db.mjs
   ```

2. **手动触发GitHub Actions工作流**
   - 访问：https://github.com/simonxinpan/Stock-Tag-Explorer-01/actions
   - 选择中概股相关工作流（如 `Chinese Stocks ETL Daily Starter`）
   - 点击 "Run workflow" → "Run workflow"

### 第五步：验证配置

1. **检查API响应**
   - 访问：https://stock-tag-explorer.vercel.app/trending.html?market=chinese_stocks
   - 确认页面显示真实数据而非模拟数据

2. **检查数据库**
   ```sql
   -- 在Neon控制台SQL编辑器中运行
   SELECT COUNT(*) FROM stocks;
   ```

---

## 🔧 故障排除

### 问题1：数据库连接失败
**症状**：API返回500错误，日志显示 "password authentication failed"

**解决方案**：
1. 检查Neon数据库连接字符串是否正确
2. 确认数据库名称为 `chinese_stocks_db`
3. 验证用户名和密码是否有效
4. 检查Vercel和GitHub的环境变量配置

### 问题2：GitHub Actions失败
**症状**：工作流运行失败，显示数据库连接错误

**解决方案**：
1. 检查GitHub Secrets中的 `CHINESE_STOCKS_DATABASE_URL` 配置
2. 确认Secret名称拼写正确
3. 重新运行失败的工作流

### 问题3：页面显示模拟数据
**症状**：页面底部显示 "这是模拟数据" 提示

**解决方案**：
1. 完成上述所有配置步骤
2. 确认数据库中有真实数据
3. 重新部署Vercel项目

---

## 📊 数据结构说明

中概股数据库使用与标普500相同的表结构：

```sql
CREATE TABLE stocks (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255),           -- 中文名称
  sector VARCHAR(100),
  sector_zh VARCHAR(100),         -- 中文行业
  industry VARCHAR(100),
  industry_zh VARCHAR(100),       -- 中文子行业
  market_cap BIGINT,
  last_price DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  volume BIGINT,
  -- ... 其他财务指标
  tags TEXT[],                    -- 标签数组
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎉 完成后的功能

配置完成后，您将拥有：

1. **完整的中概股数据展示**
   - 实时股价和涨跌幅
   - 中英文双语显示
   - 多种排行榜（涨幅榜、跌幅榜、成交量榜等）

2. **自动化数据更新**
   - 每日自动运行ETL工作流
   - 实时数据同步
   - 错误监控和日志记录

3. **高性能用户体验**
   - 快速页面加载
   - 响应式设计
   - 无缝市场切换

---

## 📞 技术支持

如果在配置过程中遇到问题，请检查：

1. **Vercel部署日志**：查看环境变量是否正确加载
2. **GitHub Actions日志**：查看工作流执行详情
3. **浏览器控制台**：查看前端错误信息
4. **Neon数据库日志**：查看数据库连接状态

配置完成后，中概股功能将与标普500功能完全对等，提供专业级的股票数据分析体验！