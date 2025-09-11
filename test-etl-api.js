const https = require('https');
const http = require('http');

// 测试ETL API端点
async function testETLAPI() {
  const baseUrl = process.env.VERCEL_DOMAIN 
    ? `https://${process.env.VERCEL_DOMAIN}` 
    : 'http://localhost:3000';
  
  const authToken = process.env.CRON_SECRET || 'test-token';
  
  console.log('🧪 Testing ETL API endpoints...');
  console.log(`📍 Base URL: ${baseUrl}`);
  
  // 测试start端点
  try {
    console.log('\n🔄 Testing /api/etl/start...');
    const startResponse = await makeRequest(`${baseUrl}/api/etl/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Start endpoint response:', startResponse);
  } catch (error) {
    console.error('❌ Start endpoint failed:', error.message);
  }
  
  // 等待一秒
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试stop端点
  try {
    console.log('\n🛑 Testing /api/etl/stop...');
    const stopResponse = await makeRequest(`${baseUrl}/api/etl/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Stop endpoint response:', stopResponse);
  } catch (error) {
    console.error('❌ Stop endpoint failed:', error.message);
  }
}

// HTTP请求辅助函数
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// 运行测试
if (require.main === module) {
  testETLAPI().catch(console.error);
}

module.exports = { testETLAPI };