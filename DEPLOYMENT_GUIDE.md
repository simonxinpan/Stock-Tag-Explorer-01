# 🚀 Stock-Tag-Explorer Vercel 部署指南

本指南将帮助您将 Stock-Tag-Explorer 项目部署到 Vercel 平台，并集成 Neon 数据库实现动态数据功能。

## 📋 部署前准备

### 1. 环境要求
- ✅ Node.js 18+ 已安装
- ✅ Vercel CLI 已安装 (`npm install -g vercel`)
- ✅ Git 仓库已初始化

### 2. 必要文件检查
确保以下文件存在：
- ✅ `package.json` - 项目配置
- ✅ `vercel.json` - Vercel 部署配置
- ✅ `public/index.html` - 前端页面
- ✅ `public/scripts/app.js` - 前端逻辑
- ✅ `public/styles/main.css` - 样式文件
- ✅ `api/tags.js` - 标签 API
- ✅ `api/stocks.js` - 股票 API
- ✅ `.env.example` - 环境变量示例

## 🗄️ 数据库和API配置

### 1. 创建 Neon 数据库
1. 访问 [Neon Console](https://console.neon.tech/)
2. 创建新项目或使用现有项目
3. 获取数据库连接字符串

### 2. 获取API密钥

#### Polygon.io API (推荐)
1. 访问 [Polygon.io](https://polygon.io/)
2. 注册账户并获取API密钥
3. 免费计划提供每月5次API调用

#### Finnhub API (备用)
1. 访问 [Finnhub](https://finnhub.io/)
2. 注册账户并获取API密钥
3. 免费计划提供每分钟60次API调用

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入以下信息：
# DATABASE_URL=your_neon_database_url
# POLYGON_API_KEY=your_polygon_api_key
# FINNHUB_API_KEY=your_finnhub_api_key
```

### 4. 初始化数据库
```bash
# 运行数据库初始化脚本
node scripts/init-db.js
```

## 🚀 部署步骤

### 方法一：使用 Vercel CLI (推荐)

1. **登录 Vercel**
   ```bash
   vercel login
   ```

2. **初始化项目**
   ```bash
   vercel
   ```
   
   配置选项：
   - Set up and deploy? → `Y`
   - Which scope? → 选择您的账户
   - Link to existing project? → `N`
   - Project name → `stock-tag-explorer`
   - In which directory? → `./` (当前目录)

3. **配置环境变量**
   ```bash
   vercel env add DATABASE_URL
   # 输入您的 Neon 数据库连接字符串
   
   # 可选：添加其他 API 密钥
   vercel env add POLYGON_API_KEY
   vercel env add FINNHUB_API_KEY
   vercel env add CRON_SECRET
   ```

4. **部署到生产环境**
   ```bash
   vercel --prod
   ```

### 方法二：使用 GitHub 集成

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "feat: 添加动态数据支持和 API 接口"
   git push origin main
   ```

2. **在 Vercel 中导入项目**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 从 GitHub 导入仓库
   - 配置环境变量
   - 部署

## ⚙️ 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 描述 | 必需 | 示例值 |
|--------|------|------|--------|
| `DATABASE_URL` | Neon 数据库连接字符串 | ✅ | `postgresql://user:pass@host/db?sslmode=require` |
| `POLYGON_API_KEY` | Polygon.io API 密钥 | ❌ | `your_polygon_key` |
| `FINNHUB_API_KEY` | Finnhub API 密钥 | ❌ | `your_finnhub_key` |
| `CRON_SECRET` | 定时任务密钥 | ❌ | `random_secret_string` |
| `NODE_ENV` | 运行环境 | ❌ | `production` |

## 🔧 项目结构说明

```
Stock-Tag-Explorer/
├── api/                    # Vercel Serverless Functions
│   ├── tags.js            # 标签数据 API
│   └── stocks.js          # 股票数据 API
├── public/                 # 静态文件
│   ├── index.html         # 主页面
│   ├── scripts/app.js     # 前端逻辑
│   └── styles/main.css    # 样式文件
├── scripts/               # 工具脚本
│   └── init-db.js        # 数据库初始化
├── vercel.json           # Vercel 配置
├── package.json          # 项目配置
└── .env.example         # 环境变量示例
```

## 🧪 部署后测试

### 1. 功能测试
- ✅ 页面正常加载
- ✅ 标签广场显示
- ✅ 标签点击筛选
- ✅ 股票列表显示
- ✅ 排序和分页功能

### 2. API 测试
```bash
# 测试标签 API
curl https://your-project.vercel.app/api/tags

# 测试股票 API
curl "https://your-project.vercel.app/api/stocks?tags=technology,sp500"
```

### 3. 数据库连接测试
检查 Vercel 函数日志，确认数据库连接正常。

## 🔍 故障排除

### 常见问题

1. **API 返回 500 错误**
   - 检查环境变量是否正确设置
   - 验证数据库连接字符串
   - 查看 Vercel 函数日志

2. **数据库连接失败**
   - 确认 Neon 数据库状态
   - 检查 SSL 配置
   - 验证连接字符串格式

3. **前端无法获取数据**
   - 检查 CORS 配置
   - 验证 API 路径
   - 查看浏览器控制台错误

### 调试命令

```bash
# 查看部署日志
vercel logs

# 查看环境变量
vercel env ls

# 本地开发模式
vercel dev
```

## 📈 性能优化

### 1. 缓存策略
- 静态资源缓存：1年
- HTML 文件：无缓存
- API 响应：可配置缓存

### 2. 数据库优化
- 使用连接池
- 添加适当索引
- 实现查询缓存

### 3. 前端优化
- 代码分割
- 懒加载
- 图片优化

## 🔗 有用链接

- [Vercel 文档](https://vercel.com/docs)
- [Neon 文档](https://neon.tech/docs)
- [项目仪表板](https://vercel.com/dashboard)
- [域名配置](https://vercel.com/docs/concepts/projects/custom-domains)

## 🎉 部署成功！

恭喜！您的 Stock-Tag-Explorer 项目现在已经成功部署到 Vercel，并集成了 Neon 数据库支持动态数据。

**下一步：**
- 🌐 访问您的部署网站
- 📊 配置监控和分析
- 🔧 根据需要调整配置
- 📱 测试移动端体验

---

**技术支持：** 如遇问题，请查看 Vercel 控制台日志或联系技术支持。