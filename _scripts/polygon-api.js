const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

/**
 * 获取股票前一日的聚合数据
 * @param {string} ticker - 股票代码
 * @returns {Promise<Object|null>} 返回股票数据或null
 */
async function getPreviousDayAggs(ticker) {
  if (!POLYGON_API_KEY) {
    console.error('❌ POLYGON_API_KEY not found in environment variables');
    return null;
  }

  try {
    const url = `${BASE_URL}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apikey=${POLYGON_API_KEY}`;
    console.log(`📡 Fetching data for ${ticker}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`⚠️ No data available for ${ticker}`);
      return null;
    }
    
    const result = data.results[0];
    
    // 格式化返回数据
    return {
      ticker: ticker,
      open_price: result.o,           // 开盘价
      high_price: result.h,           // 最高价
      low_price: result.l,            // 最低价
      close_price: result.c,          // 收盘价
      volume: result.v,               // 成交量
      vwap: result.vw,                // 成交量加权平均价
      timestamp: result.t,            // 时间戳
      trade_count: result.n,          // 交易笔数
      date: new Date(result.t).toISOString().split('T')[0], // 日期
      turnover: result.v * result.vw  // 成交额 = 成交量 * VWAP
    };
    
  } catch (error) {
    console.error(`❌ Error fetching data for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * 批量获取多个股票的前一日数据
 * @param {string[]} tickers - 股票代码数组
 * @param {number} delay - 请求间隔(毫秒)，默认200ms
 * @returns {Promise<Object[]>} 返回股票数据数组
 */
async function getBatchPreviousDayAggs(tickers, delay = 200) {
  const results = [];
  
  console.log(`🚀 Starting batch fetch for ${tickers.length} tickers...`);
  
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    const data = await getPreviousDayAggs(ticker);
    
    if (data) {
      results.push(data);
      console.log(`✅ ${i + 1}/${tickers.length} - ${ticker}: Success`);
    } else {
      console.log(`❌ ${i + 1}/${tickers.length} - ${ticker}: Failed`);
    }
    
    // 添加延迟以避免API限制
    if (i < tickers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log(`🎉 Batch fetch completed: ${results.length}/${tickers.length} successful`);
  return results;
}

/**
 * 测试Polygon API连接
 */
async function testPolygonConnection() {
  console.log('🔍 Testing Polygon API connection...');
  
  if (!POLYGON_API_KEY) {
    console.error('❌ POLYGON_API_KEY not found');
    return false;
  }
  
  // 测试获取AAPL的数据
  const testData = await getPreviousDayAggs('AAPL');
  
  if (testData) {
    console.log('✅ Polygon API connection successful!');
    console.log('📊 Sample data:', {
      ticker: testData.ticker,
      close_price: testData.close_price,
      volume: testData.volume,
      vwap: testData.vwap,
      trade_count: testData.trade_count
    });
    return true;
  } else {
    console.error('❌ Polygon API connection failed');
    return false;
  }
}

// 导出函数
module.exports = {
  getPreviousDayAggs,
  getBatchPreviousDayAggs,
  testPolygonConnection
};

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  console.log('🚀 Starting Polygon API test...');
  testPolygonConnection().then(() => {
    console.log('✅ Test completed');
  }).catch(error => {
    console.error('❌ Test failed:', error);
  });
} else {
  console.log('📝 Script loaded as module');
}