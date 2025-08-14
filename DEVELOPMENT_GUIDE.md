# Stock-Tag-Explorer 开发指南

## 🚀 快速开始

### 环境准备

#### 1. 开发环境要求
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: 最新版本
- **代码编辑器**: VS Code (推荐)

#### 2. 必需的账户和服务
- [Vercel](https://vercel.com) - 部署平台
- [Neon](https://neon.tech) - PostgreSQL 数据库
- [Polygon.io](https://polygon.io) - 股票市场数据
- [Finnhub](https://finnhub.io) - 财务数据
- [GitHub](https://github.com) - 代码仓库

### 项目初始化

```bash
# 1. 克隆项目
git clone https://github.com/your-username/Stock-Tag-Explorer.git
cd Stock-Tag-Explorer

# 2. 安装依赖
npm install

# 3. 创建环境变量文件
cp .env.example .env.local

# 4. 配置环境变量
# 编辑 .env.local 文件，填入必要的 API 密钥
```

#### 环境变量配置

创建 `.env.local` 文件：

```bash
# 数据库配置
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# API 密钥
POLYGON_API_KEY="your_polygon_api_key"
FINNHUB_API_KEY="your_finnhub_api_key"

# 安全配置
CRON_SECRET="your_secure_random_string"

# 开发环境配置
NODE_ENV="development"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

## 📁 项目结构

```
Stock-Tag-Explorer/
├── public/                 # 静态资源
│   ├── index.html         # 主页面
│   ├── styles/            # CSS 样式文件
│   └── assets/            # 图片、图标等
├── api/                   # API 路由
│   ├── tags.js           # 标签相关 API
│   └── update-data.js    # 数据更新 API
├── lib/                   # 工具库
│   ├── database.js       # 数据库连接
│   ├── external-apis.js  # 外部 API 调用
│   └── utils.js          # 通用工具函数
├── scripts/              # 脚本文件
│   ├── init-db.js        # 数据库初始化
│   └── seed-data.js      # 测试数据填充
├── .github/              # GitHub Actions
│   └── workflows/
│       └── update-data.yml
├── docs/                 # 文档
├── tests/                # 测试文件
└── package.json          # 项目配置
```

## 🛠️ 开发流程

### 阶段一：后端开发 (M1)

#### 1. 数据库设置

**创建数据库初始化脚本** (`scripts/init-db.js`):

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️ 开始初始化数据库...');
    
    // 创建 stocks 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10) UNIQUE NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_zh VARCHAR(255),
        sector VARCHAR(100),
        industry VARCHAR(100),
        current_price DECIMAL(12,4),
        change_percent DECIMAL(8,4),
        volume BIGINT,
        market_cap BIGINT,
        pe_ratio DECIMAL(8,2),
        roe DECIMAL(8,4),
        debt_to_equity DECIMAL(8,4),
        revenue_growth DECIMAL(8,4),
        is_sp500 BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector)');
    
    // 创建 tags 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        tag_name VARCHAR(100) UNIQUE NOT NULL,
        tag_type VARCHAR(50) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#2196F3',
        icon VARCHAR(50),
        is_dynamic BOOLEAN DEFAULT false,
        update_rule JSONB,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建 stock_tags 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_tags (
        id SERIAL PRIMARY KEY,
        stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        confidence_score DECIMAL(3,2) DEFAULT 1.0,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stock_id, tag_id)
      )
    `);
    
    // 创建视图
    await client.query(`
      CREATE OR REPLACE VIEW v_tag_stats AS
      SELECT 
        t.id,
        t.tag_name,
        t.tag_type,
        t.description,
        t.color,
        t.icon,
        COUNT(st.stock_id) as stock_count,
        t.display_order
      FROM tags t
      LEFT JOIN stock_tags st ON t.id = st.tag_id
      WHERE t.is_active = true
      GROUP BY t.id, t.tag_name, t.tag_type, t.description, t.color, t.icon, t.display_order
      ORDER BY t.display_order, t.tag_name
    `);
    
    console.log('✅ 数据库初始化完成');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };
```

#### 2. API 开发

**数据库连接模块** (`lib/database.js`):

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 数据访问层
class DatabaseService {
  // 获取所有标签统计
  async getAllTagsWithStats() {
    const query = 'SELECT * FROM v_tag_stats';
    const result = await pool.query(query);
    return result.rows;
  }
  
  // 根据标签名获取股票列表
  async getStocksByTag(tagName) {
    const query = `
      SELECT 
        s.ticker,
        s.name_zh,
        s.name_en,
        s.current_price,
        s.change_percent,
        s.volume,
        s.market_cap,
        s.roe
      FROM stocks s
      JOIN stock_tags st ON s.id = st.stock_id
      JOIN tags t ON st.tag_id = t.id
      WHERE t.tag_name = $1 AND s.is_active = true
      ORDER BY s.market_cap DESC
    `;
    const result = await pool.query(query, [tagName]);
    return result.rows;
  }
  
  // 更新股票数据
  async updateStock(ticker, data) {
    const query = `
      UPDATE stocks 
      SET 
        current_price = $2,
        change_percent = $3,
        volume = $4,
        market_cap = $5,
        pe_ratio = $6,
        roe = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE ticker = $1
    `;
    await pool.query(query, [
      ticker,
      data.current_price,
      data.change_percent,
      data.volume,
      data.market_cap,
      data.pe_ratio,
      data.roe
    ]);
  }
  
  // 应用动态标签
  async applyDynamicTags() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 清除旧的动态标签
      await client.query(`
        DELETE FROM stock_tags 
        WHERE tag_id IN (SELECT id FROM tags WHERE is_dynamic = true)
      `);
      
      // 应用高ROE标签
      await client.query(`
        INSERT INTO stock_tags (stock_id, tag_id)
        SELECT s.id, t.id
        FROM stocks s, tags t
        WHERE s.roe > 15.0 
        AND t.tag_name = '高ROE'
        AND s.is_active = true
      `);
      
      // 应用高增长标签
      await client.query(`
        INSERT INTO stock_tags (stock_id, tag_id)
        SELECT s.id, t.id
        FROM stocks s, tags t
        WHERE s.revenue_growth > 20.0 
        AND t.tag_name = '高增长'
        AND s.is_active = true
      `);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DatabaseService();
```

**外部API服务** (`lib/external-apis.js`):

```javascript
const axios = require('axios');

class ExternalAPIService {
  constructor() {
    this.polygonApiKey = process.env.POLYGON_API_KEY;
    this.finnhubApiKey = process.env.FINNHUB_API_KEY;
  }
  
  // 从 Polygon.io 获取市场数据
  async getMarketData(ticker) {
    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
        {
          params: {
            apikey: this.polygonApiKey
          }
        }
      );
      
      if (response.data.results && response.data.results.length > 0) {
        const data = response.data.results[0];
        return {
          current_price: data.c,
          volume: data.v,
          change_percent: ((data.c - data.o) / data.o) * 100
        };
      }
      return null;
    } catch (error) {
      console.error(`获取 ${ticker} 市场数据失败:`, error.message);
      return null;
    }
  }
  
  // 从 Finnhub 获取财务数据
  async getFinancialData(ticker) {
    try {
      const response = await axios.get(
        'https://finnhub.io/api/v1/stock/metric',
        {
          params: {
            symbol: ticker,
            metric: 'all',
            token: this.finnhubApiKey
          }
        }
      );
      
      const metrics = response.data.metric;
      return {
        pe_ratio: metrics.peBasicExclExtraTTM,
        roe: metrics.roeRfy,
        debt_to_equity: metrics.totalDebt2TotalEquityQuarterly,
        revenue_growth: metrics.revenueGrowthTTMYoy
      };
    } catch (error) {
      console.error(`获取 ${ticker} 财务数据失败:`, error.message);
      return null;
    }
  }
  
  // 批量获取数据
  async batchUpdateData(tickers) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const ticker of tickers) {
      try {
        const [marketData, financialData] = await Promise.all([
          this.getMarketData(ticker),
          this.getFinancialData(ticker)
        ]);
        
        if (marketData && financialData) {
          await require('./database').updateStock(ticker, {
            ...marketData,
            ...financialData
          });
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${ticker}: 数据获取失败`);
        }
        
        // 避免API限制，添加延迟
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.failed++;
        results.errors.push(`${ticker}: ${error.message}`);
      }
    }
    
    return results;
  }
}

module.exports = new ExternalAPIService();
```

**标签API** (`api/tags.js`):

```javascript
const db = require('../lib/database');

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { tag_name, symbol } = req.query;
    
    if (tag_name) {
      // 获取特定标签的股票列表
      const stocks = await db.getStocksByTag(tag_name);
      const tagInfo = await db.getTagInfo(tag_name);
      
      return res.status(200).json({
        success: true,
        tag_info: tagInfo,
        data: stocks,
        meta: {
          total_stocks: stocks.length,
          query_time: new Date().toISOString()
        }
      });
    } else {
      // 获取所有标签统计
      const tags = await db.getAllTagsWithStats();
      
      return res.status(200).json({
        success: true,
        data: tags,
        meta: {
          total_tags: tags.length,
          last_updated: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
```

### 阶段二：前端开发 (M2)

#### 1. 主页面结构 (`public/index.html`):

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Tag Explorer - 智能标签浏览器</title>
    <link rel="stylesheet" href="./styles/main.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="app">
        <!-- 头部 -->
        <header class="header">
            <div class="container">
                <h1 class="logo">📊 Stock Tag Explorer</h1>
                <p class="subtitle">智能标签浏览器 - 发现投资机会</p>
            </div>
        </header>
        
        <!-- 主内容区 -->
        <main class="main">
            <div class="container">
                <!-- 标签广场 -->
                <section id="tag-plaza" class="tag-plaza">
                    <h2>标签广场</h2>
                    <div id="loading" class="loading">加载中...</div>
                    <div id="error" class="error hidden">加载失败，请刷新重试</div>
                    <div id="tag-container" class="tag-container hidden"></div>
                </section>
                
                <!-- 股票列表 -->
                <section id="stock-list-section" class="stock-list-section hidden">
                    <h3 id="selected-tag-title">选中标签的股票</h3>
                    <div id="stock-list" class="stock-list"></div>
                </section>
            </div>
        </main>
        
        <!-- 页脚 -->
        <footer class="footer">
            <div class="container">
                <p>&copy; 2024 Stock Tag Explorer. 数据来源: Polygon.io & Finnhub</p>
            </div>
        </footer>
    </div>
    
    <script src="./js/app.js"></script>
</body>
</html>
```

#### 2. 主要样式 (`public/styles/main.css`):

```css
/* 基础样式 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* 头部样式 */
.header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 2rem 0;
    text-align: center;
    color: white;
}

.logo {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
}

/* 主内容区 */
.main {
    padding: 3rem 0;
}

/* 标签广场 */
.tag-plaza {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
}

.tag-plaza h2 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    color: #2c3e50;
}

.tag-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
}

/* 标签卡片 */
.tag-card {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
}

.tag-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: #667eea;
}

.tag-card.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.tag-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.tag-type {
    font-size: 0.85rem;
    opacity: 0.7;
    margin-bottom: 0.5rem;
}

.tag-count {
    font-size: 1.2rem;
    font-weight: 700;
    color: #667eea;
}

.tag-card.active .tag-count {
    color: white;
}

/* 股票列表 */
.stock-list-section {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.stock-list {
    display: grid;
    gap: 1rem;
}

.stock-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    transition: all 0.3s ease;
    text-decoration: none;
    color: inherit;
}

.stock-item:hover {
    background: #e9ecef;
    transform: translateX(4px);
}

.stock-info {
    flex: 1;
}

.stock-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.stock-ticker {
    font-size: 0.9rem;
    color: #6c757d;
}

.stock-price {
    text-align: right;
}

.current-price {
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.change-percent {
    font-size: 0.9rem;
    font-weight: 500;
}

.positive {
    color: #28a745;
}

.negative {
    color: #dc3545;
}

/* 工具类 */
.hidden {
    display: none;
}

.loading {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
    color: #6c757d;
}

.error {
    text-align: center;
    padding: 2rem;
    color: #dc3545;
    background: #f8d7da;
    border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .tag-container {
        grid-template-columns: 1fr;
    }
    
    .stock-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
    
    .stock-price {
        text-align: left;
    }
}

/* 页脚 */
.footer {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    color: white;
    text-align: center;
    padding: 1rem 0;
    margin-top: auto;
}
```

#### 3. JavaScript 应用逻辑 (`public/js/app.js`):

```javascript
class StockTagExplorer {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentTag = null;
        this.tags = [];
        this.init();
    }
    
    async init() {
        try {
            await this.loadTags();
            this.bindEvents();
        } catch (error) {
            this.showError('应用初始化失败');
            console.error('Init error:', error);
        }
    }
    
    async loadTags() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        const containerEl = document.getElementById('tag-container');
        
        try {
            loadingEl.classList.remove('hidden');
            errorEl.classList.add('hidden');
            
            const response = await fetch(`${this.apiBaseUrl}/tags`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '数据加载失败');
            }
            
            this.tags = data.data;
            this.renderTags();
            
            loadingEl.classList.add('hidden');
            containerEl.classList.remove('hidden');
            
        } catch (error) {
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
            throw error;
        }
    }
    
    renderTags() {
        const container = document.getElementById('tag-container');
        
        // 按类型分组
        const groupedTags = this.tags.reduce((groups, tag) => {
            const type = tag.tag_type || '其他';
            if (!groups[type]) groups[type] = [];
            groups[type].push(tag);
            return groups;
        }, {});
        
        let html = '';
        
        Object.entries(groupedTags).forEach(([type, tags]) => {
            html += `<div class="tag-group">`;
            html += `<h3 class="tag-group-title">${type}</h3>`;
            
            tags.forEach(tag => {
                html += `
                    <div class="tag-card" data-tag-name="${tag.tag_name}">
                        <div class="tag-name">${tag.tag_name}</div>
                        <div class="tag-type">${tag.tag_type}</div>
                        <div class="tag-count">${tag.stock_count} 只股票</div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        container.innerHTML = html;
    }
    
    bindEvents() {
        // 标签点击事件
        document.addEventListener('click', async (e) => {
            const tagCard = e.target.closest('.tag-card');
            if (tagCard) {
                const tagName = tagCard.dataset.tagName;
                await this.selectTag(tagName, tagCard);
            }
        });
        
        // 错误重试
        document.getElementById('error').addEventListener('click', () => {
            this.loadTags();
        });
    }
    
    async selectTag(tagName, cardElement) {
        try {
            // 更新UI状态
            document.querySelectorAll('.tag-card').forEach(card => {
                card.classList.remove('active');
            });
            cardElement.classList.add('active');
            
            // 显示加载状态
            const stockListSection = document.getElementById('stock-list-section');
            const stockList = document.getElementById('stock-list');
            const titleEl = document.getElementById('selected-tag-title');
            
            titleEl.textContent = `${tagName} - 加载中...`;
            stockList.innerHTML = '<div class="loading">加载股票数据中...</div>';
            stockListSection.classList.remove('hidden');
            
            // 滚动到股票列表
            stockListSection.scrollIntoView({ behavior: 'smooth' });
            
            // 获取股票数据
            const response = await fetch(`${this.apiBaseUrl}/tags?tag_name=${encodeURIComponent(tagName)}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '股票数据加载失败');
            }
            
            this.currentTag = tagName;
            this.renderStocks(data.data, data.tag_info);
            
        } catch (error) {
            this.showError('股票数据加载失败');
            console.error('Select tag error:', error);
        }
    }
    
    renderStocks(stocks, tagInfo) {
        const titleEl = document.getElementById('selected-tag-title');
        const stockList = document.getElementById('stock-list');
        
        titleEl.textContent = `${tagInfo.tag_name} (${stocks.length} 只股票)`;
        
        if (stocks.length === 0) {
            stockList.innerHTML = '<div class="no-data">暂无相关股票</div>';
            return;
        }
        
        const html = stocks.map(stock => {
            const changeClass = stock.change_percent >= 0 ? 'positive' : 'negative';
            const changeSign = stock.change_percent >= 0 ? '+' : '';
            
            return `
                <a href="https://stock-details-final.vercel.app/?symbol=${stock.ticker}" 
                   class="stock-item" target="_blank" rel="noopener">
                    <div class="stock-info">
                        <div class="stock-name">${stock.name_zh || stock.name_en}</div>
                        <div class="stock-ticker">${stock.ticker}</div>
                    </div>
                    <div class="stock-price">
                        <div class="current-price">$${stock.current_price?.toFixed(2) || 'N/A'}</div>
                        <div class="change-percent ${changeClass}">
                            ${changeSign}${stock.change_percent?.toFixed(2) || 'N/A'}%
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        
        stockList.innerHTML = html;
    }
    
    showError(message) {
        const errorEl = document.getElementById('error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    new StockTagExplorer();
});
```

### 阶段三：自动化部署 (M3)

#### GitHub Actions 配置 (`.github/workflows/update-data.yml`):

```yaml
name: Update Stock Data

on:
  schedule:
    # 每天 UTC 时间 14:30 (北京时间 22:30) 运行
    - cron: '30 14 * * *'
  workflow_dispatch: # 允许手动触发

jobs:
  update-data:
    runs-on: ubuntu-latest
    
    steps:
    - name: Update Stock Data
      run: |
        curl -X POST "${{ secrets.VERCEL_URL }}/api/update-data" \
          -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
          -H "Content-Type: application/json"
    
    - name: Notify on failure
      if: failure()
      run: |
        echo "数据更新失败，请检查日志"
```

## 🧪 测试策略

### 单元测试示例 (`tests/api.test.js`):

```javascript
const request = require('supertest');
const app = require('../api/tags');

describe('Tags API', () => {
  test('GET /api/tags should return all tags', async () => {
    const response = await request(app)
      .get('/api/tags')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  test('GET /api/tags?tag_name=高ROE should return stocks', async () => {
    const response = await request(app)
      .get('/api/tags?tag_name=高ROE')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

## 📊 性能优化清单

### 前端优化
- [ ] 实现标签数据缓存 (30分钟)
- [ ] 添加股票列表虚拟滚动
- [ ] 图片懒加载和 WebP 格式
- [ ] CSS 和 JS 文件压缩
- [ ] 启用 Service Worker 缓存

### 后端优化
- [ ] 数据库查询优化和索引
- [ ] API 响应缓存 (Redis)
- [ ] 数据库连接池配置
- [ ] API 限流和防抖
- [ ] 错误监控和日志

### 部署优化
- [ ] CDN 配置
- [ ] Gzip 压缩
- [ ] HTTP/2 启用
- [ ] 缓存策略优化
- [ ] 监控和告警设置

---

遵循本开发指南，可以确保项目按照既定的技术标准和最佳实践进行开发，实现高质量的产品交付。