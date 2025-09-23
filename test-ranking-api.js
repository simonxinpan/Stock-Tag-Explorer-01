// 测试真实的ranking.js API
const rankingHandler = require('./api/ranking.js');

// 模拟请求和响应对象
const mockReq = {
  query: {
    market: 'chinese_stocks',
    type: 'top_turnover'
  }
};

const mockRes = {
  setHeader: (key, value) => console.log(`Header: ${key} = ${value}`),
  status: (code) => {
    console.log(`Status: ${code}`);
    return {
      json: (data) => {
        console.log('Response:', JSON.stringify(data, null, 2));
      }
    };
  }
};

console.log('Testing ranking.js API directly...');
console.log('Request:', mockReq.query);

// 调用API处理函数
rankingHandler(mockReq, mockRes).catch(error => {
  console.error('Test failed:', error);
});