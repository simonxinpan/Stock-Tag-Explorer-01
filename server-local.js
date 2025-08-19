const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // 备用加载.env文件

// 导入API处理器
const tagsHandler = require('./api/tags');
const stocksHandler = require('./api/stocks');

const PORT = 3000;

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API路由
    if (pathname === '/api/tags') {
        try {
            // 添加Express兼容性方法
            res.status = function(code) {
                this.statusCode = code;
                return this;
            };
            res.json = function(data) {
                this.setHeader('Content-Type', 'application/json');
                this.end(JSON.stringify(data));
            };
            req.query = parsedUrl.query;
            
            await tagsHandler(req, res);
        } catch (error) {
            console.error('Tags API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        return;
    }

    if (pathname === '/api/stocks') {
        try {
            // 添加Express兼容性方法
            res.status = function(code) {
                this.statusCode = code;
                return this;
            };
            res.json = function(data) {
                this.setHeader('Content-Type', 'application/json');
                this.end(JSON.stringify(data));
            };
            req.query = parsedUrl.query;
            
            await stocksHandler(req, res);
        } catch (error) {
            console.error('Stocks API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        return;
    }

    // 静态文件服务
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
        return;
    }

    // 获取文件扩展名
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // 读取并发送文件
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Server Error');
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Stock-Tag-Explorer 本地服务器启动成功!`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`🔗 API端点:`);
    console.log(`   - GET /api/tags`);
    console.log(`   - GET /api/stocks?tags=<tag1,tag2>`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
});