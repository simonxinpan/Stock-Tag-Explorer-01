import 'dotenv/config';

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 获取单只股票数据的函数
async function getSingleTickerData(ticker, apiKey) {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${apiKey}`;
    
    console.log(`🔄 Fetching data for ${ticker}...`);
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                ticker,
                c: result.c,  // 收盘价
                o: result.o,  // 开盘价
                h: result.h,  // 最高价
                l: result.l,  // 最低价
                v: result.v   // 成交量
            };
        } else {
            console.warn(`⚠️ No data available for ${ticker}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error fetching ${ticker}:`, error.message);
        return null;
    }
}

// 测试函数
async function testPolygonAPI() {
    console.log('===== Testing Polygon API with Free Tier =====');
    
    const { POLYGON_API_KEY } = process.env;
    
    if (!POLYGON_API_KEY || POLYGON_API_KEY === 'your_polygon_api_key_here') {
        console.log('⚠️ No valid POLYGON_API_KEY found in environment variables');
        console.log('📝 Please set POLYGON_API_KEY to test the API');
        return;
    }
    
    // 测试几只知名股票
    const testTickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
    const results = [];
    
    for (const ticker of testTickers) {
        const data = await getSingleTickerData(ticker, POLYGON_API_KEY);
        
        if (data) {
            results.push(data);
            console.log(`✅ ${ticker}: $${data.c} (Open: $${data.o}, High: $${data.h}, Low: $${data.l})`);
        }
        
        // 添加延迟以避免速率限制
        console.log('⏳ Waiting 12 seconds to avoid rate limit...');
        await delay(12000);
    }
    
    console.log('\n===== Test Results =====');
    console.log(`✅ Successfully fetched data for ${results.length}/${testTickers.length} stocks`);
    
    if (results.length > 0) {
        console.log('📊 Sample data structure:');
        console.log(JSON.stringify(results[0], null, 2));
    }
    
    console.log('===== Test completed =====');
}

testPolygonAPI();