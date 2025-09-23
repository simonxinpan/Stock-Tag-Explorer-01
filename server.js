const { createServer } = require('http');
const { readFileSync } = require('fs');
const { join } = require('path');

const PORT = process.env.PORT || 3000;

// 导入 API 处理函数
const importAPI = (apiPath) => {
  try {
    // 清除 require 缓存以支持热重载
    delete require.cache[require.resolve(apiPath)];
    const module = require(apiPath);
    return module.default || module;
  } catch (error) {
    console.error(`Failed to import ${apiPath}:`, error);
    return null;
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API 路由
  if (url.pathname.startsWith('/api/')) {
    const apiName = url.pathname.replace('/api/', '');
    const apiPath = join(__dirname, 'api', `${apiName}.js`);
    
    try {
      // 🔧 临时使用模拟数据API
      let apiHandler;
      if (apiName === 'trending') {
        apiHandler = importAPI('./api/trending-mock.js');
      } else if (apiName === 'market-summary') {
        apiHandler = importAPI('./api/market-summary-mock.js');
      } else {
        // 使用真实的API
        apiHandler = importAPI(apiPath);
      }
      
      if (apiHandler) {
        // 创建模拟的 Vercel 请求/响应对象
        const mockReq = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: Object.fromEntries(url.searchParams)
        };
        
        const mockRes = {
          status: (code) => {
            res.statusCode = code;
            return mockRes;
          },
          setHeader: (name, value) => {
            res.setHeader(name, value);
            return mockRes;
          },
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          },
          send: (data) => {
            res.end(data);
          }
        };
        
        await apiHandler(mockReq, mockRes);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API not found' }));
      }
    } catch (error) {
      console.error('API Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }
  
  // 静态文件服务
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = readFileSync(join(__dirname, 'public', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(404);
      res.end('File not found');
    }
    return;
  }
  
  // 其他静态文件
  try {
    const filePath = join(__dirname, 'public', url.pathname);
    const content = readFileSync(filePath);
    
    // 简单的 MIME 类型检测
    const ext = url.pathname.split('.').pop();
    const mimeTypes = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json'
    };
    
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('File not found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 API endpoints available:`);
  console.log(`   - http://localhost:${PORT}/api/tags`);
  console.log(`   - http://localhost:${PORT}/api/stocks`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});