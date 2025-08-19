// /_scripts/verify-api-keys.mjs
import 'dotenv/config';

async function verifyPolygonAPI(apiKey) {
    try {
        console.log('🔍 Testing Polygon API...');
        const response = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?limit=5&apikey=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`API Error: ${data.error}`);
        }
        
        console.log('✅ Polygon API: Working');
        console.log(`📊 Sample data: ${data.results?.length || 0} stocks returned`);
        
        if (data.results && data.results.length > 0) {
            const sample = data.results[0];
            console.log(`📊 Sample stock: ${sample.ticker}`);
            console.log(`📊 Sample price: ${sample.last_trade?.price || sample.prevDay?.c || 'N/A'}`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Polygon API: Failed');
        console.error(`❌ Error: ${error.message}`);
        return false;
    }
}

async function verifyFinnhubAPI(apiKey) {
    try {
        console.log('🔍 Testing Finnhub API...');
        const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=AAPL&metric=all&token=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`API Error: ${data.error}`);
        }
        
        console.log('✅ Finnhub API: Working');
        console.log(`📊 Sample data for AAPL:`);
        console.log(`📊 Market Cap: ${data.metric?.marketCapitalization || 'N/A'}`);
        console.log(`📊 PE Ratio: ${data.metric?.peTTM || 'N/A'}`);
        console.log(`📊 ROE: ${data.metric?.roeTTM || 'N/A'}`);
        
        return true;
    } catch (error) {
        console.error('❌ Finnhub API: Failed');
        console.error(`❌ Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log("===== API Keys Verification =====");
    
    const { POLYGON_API_KEY, FINNHUB_API_KEY } = process.env;
    
    // 检查环境变量
    console.log('\n🔍 Checking environment variables...');
    console.log(`POLYGON_API_KEY: ${POLYGON_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`FINNHUB_API_KEY: ${FINNHUB_API_KEY ? '✅ Set' : '❌ Missing'}`);
    
    if (!POLYGON_API_KEY && !FINNHUB_API_KEY) {
        console.error('\n❌ No API keys found. Please set environment variables:');
        console.error('   POLYGON_API_KEY=your_polygon_key');
        console.error('   FINNHUB_API_KEY=your_finnhub_key');
        process.exit(1);
    }
    
    let allPassed = true;
    
    // 测试 Polygon API
    if (POLYGON_API_KEY && POLYGON_API_KEY !== 'your_polygon_api_key_here') {
        console.log('\n' + '='.repeat(40));
        const polygonResult = await verifyPolygonAPI(POLYGON_API_KEY);
        allPassed = allPassed && polygonResult;
    } else {
        console.log('\n⚠️ Skipping Polygon API test (key not set or placeholder)');
    }
    
    // 测试 Finnhub API
    if (FINNHUB_API_KEY && FINNHUB_API_KEY !== 'your_finnhub_api_key_here') {
        console.log('\n' + '='.repeat(40));
        const finnhubResult = await verifyFinnhubAPI(FINNHUB_API_KEY);
        allPassed = allPassed && finnhubResult;
    } else {
        console.log('\n⚠️ Skipping Finnhub API test (key not set or placeholder)');
    }
    
    // 总结
    console.log('\n' + '='.repeat(40));
    if (allPassed) {
        console.log('✅ All API keys verified successfully!');
        console.log('🚀 Your data update scripts should work properly.');
    } else {
        console.log('❌ Some API keys failed verification.');
        console.log('🔧 Please check your API keys and try again.');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
});