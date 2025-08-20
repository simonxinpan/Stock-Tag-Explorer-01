# Stock-Tag-Explorer - 智能标签浏览器

> **项目代号**: StockLink - Phase 1 Module C: The Neural Network  
> **版本**: v1.0.1  
> **负责人**: Simon Pan  
> **最后更新**: 2024-12-20

## 部署状态
- GitHub Actions自动部署已配置 ✅
- Vercel部署环境已就绪 ✅  

## 🎯 项目愿景

Stock-Tag-Explorer 是 StockLink 平台"三驾马车"战略中的核心数据发现引擎。它的使命是将孤立的股票数据，通过一个智能、多维度的标签体系，转化为一个可供探索的、富有洞察力的"神经网络"，帮助投资者快速发现符合特定市场特征和财务表现的股票集群。

### 核心目标 (v1.0)

- **独立上线**: 打造一个功能完整、可独立访问的"标签广场"Web 应用
- **数据驱动**: 应用的全部内容需由后端的 Neon 数据库动态驱动
- **建立连接**: 为 StockLink 平台的其他模块（热力图、个股详情页）提供数据接口和导航链接

## 🏗️ 系统架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   前端展示层     │    │    API服务层      │    │   数据存储层     │
│                │    │                  │    │                │
│ • 标签广场      │◄──►│ • /api/tags      │◄──►│ • Neon Database │
│ • 股票列表      │    │ • /api/update    │    │ • stocks表      │
│ • 交互界面      │    │ • 错误处理       │    │ • tags表        │
│                │    │                  │    │ • stock_tags表  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
           │                      │                      │
           │                      │                      │
           ▼                      ▼                      ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   外部集成      │    │   自动化任务      │    │   数据源        │
│                │    │                  │    │                │
│ • 详情页跳转    │    │ • GitHub Actions │    │ • Polygon.io    │
│ • 热力图连接    │    │ • 定时更新       │    │ • Finnhub       │
│                │    │ • CRON任务       │    │                │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 功能需求

### 2.1 核心页面：标签广场 (Tag Plaza)

**功能描述**:
- 页面加载时，从后端 API (`/api/tags`) 获取所有已定义的、且有关联股票的标签
- 标签按类型进行视觉分组展示：
  - **静态标签**: 行业分类、特殊名单 (如标普500)
  - **动态标签**: 股市表现、财务表现、趋势排位
- 每个标签展示标签名称和拥有该标签的股票数量
- 完善的加载状态和错误状态处理

### 2.2 核心交互：标签筛选与展示

**功能描述**:
- 所有标签都可点击
- 点击标签后：
  - 页面下方展示股票列表
  - 调用后端 API (`/api/tags?tag_name=标签名`) 获取相关股票
  - 列表展示：中文名称、股票代码 (Ticker)、实时涨跌幅
  - 每只股票可点击跳转到详情页：`https://stock-details-final.vercel.app/?symbol=[TICKER]`

## 🔧 技术规范

### 后端 API 设计

#### `/api/tags` - 数据读取器

**无参数调用**:
```json
GET /api/tags

Response:
{
  "success": true,
  "data": [
    {
      "tag_name": "高ROE",
      "tag_type": "财务表现",
      "stock_count": 45,
      "description": "ROE > 15%的股票"
    }
  ]
}
```

**带tag_name参数**:
```json
GET /api/tags?tag_name=高ROE

Response:
{
  "success": true,
  "tag_name": "高ROE",
  "data": [
    {
      "ticker": "AAPL",
      "name_zh": "苹果公司",
      "change_percent": 2.34,
      "current_price": 150.25
    }
  ]
}
```

#### `/api/update-data` - 后台数据工人

**功能**:
- 从 Polygon.io 和 Finnhub 获取最新数据
- 更新 stocks 表的市场数据和财务指标
- 根据预设规则计算并应用动态标签
- 更新 stock_tags 表

### 数据库设计

#### stocks 表
```sql
CREATE TABLE stocks (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name_en VARCHAR(255),
  name_zh VARCHAR(255),
  current_price DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  volume BIGINT,
  market_cap BIGINT,
  pe_ratio DECIMAL(8,2),
  roe DECIMAL(5,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### tags 表
```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  tag_name VARCHAR(100) UNIQUE NOT NULL,
  tag_type VARCHAR(50),
  description TEXT,
  is_dynamic BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### stock_tags 表
```sql
CREATE TABLE stock_tags (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id),
  tag_id INTEGER REFERENCES tags(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(stock_id, tag_id)
);
```

## 🚀 开发里程碑

### M1 - 后端就绪
- [ ] 完成数据库设计和初始化
- [ ] 实现 `/api/tags` 接口
- [ ] 实现 `/api/update-data` 接口
- [ ] 配置 Neon 数据库连接
- [ ] 集成 Polygon.io 和 Finnhub API
- [ ] 测试数据注入和标签生成

### M2 - 前端上线
- [ ] 创建标签广场页面
- [ ] 实现标签展示和分组
- [ ] 实现标签点击和股票列表展示
- [ ] 添加加载状态和错误处理
- [ ] 实现跳转到详情页功能
- [ ] 响应式设计优化

### M3 - v1.0 发布
- [ ] 配置 GitHub Actions 自动化任务
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 部署到 Vercel
- [ ] 正式上线 tag-explorer.vercel.app

## 📊 性能指标

- **页面加载时间**: < 3秒
- **API 响应时间**: < 500毫秒
- **数据更新频率**: 每日自动更新
- **错误率**: < 1%

## 🔒 安全要求

- 所有 API 密钥通过 Vercel 环境变量管理
- 后台更新任务通过 CRON_SECRET 保护
- 数据库连接使用安全连接字符串
- 前端输入验证和 XSS 防护

## 🔗 相关链接

- [Stock Details Final](https://stock-details-final.vercel.app/)
- [Polygon.io API 文档](https://polygon.io/docs)
- [Finnhub API 文档](https://finnhub.io/docs/api)
- [Neon 数据库文档](https://neon.tech/docs)

## 🚀 快速开始

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/Stock-Tag-Explorer.git
   cd Stock-Tag-Explorer
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入你的API密钥和数据库连接
   ```

4. **检查环境配置**
   ```bash
   npm run check-env
   ```

5. **测试API连接**
   ```bash
   npm run test:api
   ```

6. **启动开发服务器**
   ```bash
   npm run dev
   ```

7. **访问应用**
   打开浏览器访问 `http://localhost:3000`

### 部署到生产环境

1. **配置Vercel环境变量**
   - 在Vercel项目设置中添加以下环境变量：
     - `DATABASE_URL`: Neon数据库连接字符串
     - `POLYGON_API_KEY`: Polygon.io API密钥
     - `FINNHUB_API_KEY`: Finnhub API密钥
     - `CRON_SECRET`: CRON任务保护密钥

2. **部署应用**
   ```bash
   vercel --prod
   ```

3. **验证部署**
    - 访问部署的URL
    - 检查API端点是否正常工作
    - 验证数据更新任务是否正常执行

### GitHub Actions 自动化

本项目配置了完整的CI/CD流程：

1. **配置GitHub Secrets**
   ```
   POLYGON_API_KEY     # Polygon.io API密钥
   FINNHUB_API_KEY     # Finnhub API密钥
   DATABASE_URL        # Neon数据库连接字符串
   VERCEL_TOKEN        # Vercel部署令牌（可选）
   ORG_ID             # Vercel组织ID（可选）
   PROJECT_ID         # Vercel项目ID（可选）
   ```

2. **自动部署工作流**
   - 推送到main分支时自动触发
   - 运行环境检查和API测试
   - 自动部署到Vercel生产环境

3. **数据更新工作流**
   - 每个工作日美东时间8:00 AM自动运行
   - 支持手动触发
   - 自动更新股票数据并验证结果

4. **监控和调试**
   ```bash
   # 本地测试环境配置
   npm run check-env
   
   # 测试API连接
   npm run test:api
   
   # 手动更新股票数据
   npm run update-stocks
   
   # 验证数据更新
   npm run verify-data
   ```

详细配置说明请参考 [GitHub Actions配置指南](./GITHUB_ACTIONS_SETUP.md)

---

**注**: 本文档将随着项目进展持续更新，请关注版本变更。