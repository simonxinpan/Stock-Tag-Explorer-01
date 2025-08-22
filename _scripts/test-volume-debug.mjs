import 'dotenv/config';

// 简单测试脚本：检查Finnhub API返回的volume数据
async function testVolumeData() {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        console.error('❌ FINNHUB_API_KEY not found in environment variables');
        return;
    }

    // 测试几个常见股票的volume数据
    const testTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    
    console.log('🔍 Testing Finnhub API volume data...');
    console.log('=' .repeat(60));
    
    for (const ticker of testTickers) {
        try {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
            
            if (!response.ok) {
                console.error(`❌ HTTP ${response.status} for ${ticker}`);
                continue;
            }
            
            const data = await response.json();
            
            console.log(`\n📊 ${ticker}:`);
            console.log(`  Raw API response:`, JSON.stringify(data, null, 2));
            console.log(`  Volume (v): ${data.v} (type: ${typeof data.v})`);
            console.log(`  Current price (c): ${data.c}`);
            console.log(`  Previous close (pc): ${data.pc}`);
            
            // 测试我们的处理逻辑
            const processedVolume = data.v !== undefined && data.v !== null ? data.v : null;
            console.log(`  Processed volume: ${processedVolume} (type: ${typeof processedVolume})`);
            
        } catch (error) {
            console.error(`❌ Error fetching ${ticker}:`, error.message);
        }
        
        // 添加延迟以遵守API限制
        await new Promise(resolve => setTimeout(resolve, 1100));
    }
    
    console.log('\n✅ Volume data test completed');
}

testVolumeData().catch(console.error);