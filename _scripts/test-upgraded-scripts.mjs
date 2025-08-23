// 测试升级后的数据注入脚本
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function testHighFrequencyScript() {
    console.log("🚀 测试高频脚本 (volume & turnover 注入)...");
    
    const { FINNHUB_API_KEY } = process.env;
    if (!FINNHUB_API_KEY) {
        console.log("⚠️ 缺少 FINNHUB_API_KEY，跳过测试");
        return;
    }
    
    // 测试单个股票的数据获取
    const testTicker = 'AAPL';
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${testTicker}&token=${FINNHUB_API_KEY}`);
        const data = await response.json();
        
        console.log(`📊 ${testTicker} API 响应:`);
        console.log(`   当前价格 (c): ${data.c}`);
        console.log(`   成交量 (v): ${data.v}`);
        console.log(`   成交量类型: ${typeof data.v}`);
        
        // 计算 turnover
        const volume = data.v !== null && data.v !== undefined ? data.v : null;
        const turnover = volume && data.c ? volume * data.c : null;
        
        console.log(`💰 计算结果:`);
        console.log(`   处理后的成交量: ${volume}`);
        console.log(`   计算的成交额: ${turnover}`);
        
    } catch (error) {
        console.error(`❌ 高频脚本测试失败:`, error.message);
    }
}

async function testLowFrequencyScript() {
    console.log("\n🔄 测试低频脚本 (dividend_yield & market_status 注入)...");
    
    const { FINNHUB_API_KEY } = process.env;
    if (!FINNHUB_API_KEY) {
        console.log("⚠️ 缺少 FINNHUB_API_KEY，跳过测试");
        return;
    }
    
    const testTicker = 'AAPL';
    try {
        // 测试财务指标获取
        const metricsResponse = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${testTicker}&metric=all&token=${FINNHUB_API_KEY}`);
        const metricsData = await metricsResponse.json();
        
        // 测试实时报价获取
        const quoteResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${testTicker}&token=${FINNHUB_API_KEY}`);
        const quoteData = await quoteResponse.json();
        
        console.log(`📈 ${testTicker} 财务指标:`);
        const dividendYield = metricsData.metric?.dividendYieldIndicatedAnnual || metricsData.metric?.dividendYield || null;
        console.log(`   股息收益率: ${dividendYield}`);
        
        console.log(`🕐 ${testTicker} 市场状态:`);
        console.log(`   报价时间戳 (t): ${quoteData.t}`);
        
        // 计算市场状态
        function getMarketStatus(quoteTimestamp) {
            if (!quoteTimestamp) return 'Unknown';
            
            const quoteDate = new Date(quoteTimestamp * 1000);
            const nowDate = new Date();
            
            if ((nowDate - quoteDate) > 12 * 60 * 60 * 1000) {
                return 'Closed';
            }
        
            const quoteUTCHour = quoteDate.getUTCHours();
            
            if (quoteUTCHour >= 13 && quoteUTCHour < 20) {
                return 'Regular';
            } else if (quoteUTCHour >= 8 && quoteUTCHour < 13) {
                return 'Pre-market';
            } else {
                return 'Post-market';
            }
        }
        
        const marketStatus = getMarketStatus(quoteData.t);
        console.log(`   计算的市场状态: ${marketStatus}`);
        
    } catch (error) {
        console.error(`❌ 低频脚本测试失败:`, error.message);
    }
}

async function checkDatabaseFields() {
    console.log("\n🔍 检查数据库字段状态...");
    
    const client = await pool.connect();
    try {
        // 检查几个样本股票的新字段状态
        const { rows } = await client.query(`
            SELECT ticker, volume, turnover, dividend_yield, market_status 
            FROM stocks 
            WHERE ticker IN ('AAPL', 'MSFT', 'GOOGL') 
            ORDER BY ticker
        `);
        
        console.log(`📊 当前数据库状态:`);
        rows.forEach(row => {
            console.log(`   ${row.ticker}: volume=${row.volume}, turnover=${row.turnover}, dividend_yield=${row.dividend_yield}, market_status=${row.market_status}`);
        });
        
    } catch (error) {
        console.error(`❌ 数据库检查失败:`, error.message);
    } finally {
        client.release();
    }
}

async function main() {
    console.log("===== 升级后脚本功能测试 =====");
    
    await testHighFrequencyScript();
    await testLowFrequencyScript();
    await checkDatabaseFields();
    
    console.log("\n✅ 测试完成！");
    console.log("📝 下一步：手动触发 GitHub Actions 工作流来验证实际效果");
    
    await pool.end();
}

main().catch(console.error);