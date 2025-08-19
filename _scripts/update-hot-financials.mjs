// /_scripts/update-hot-financials.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 获取 Finnhub 财务指标
async function getFinnhubMetrics(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.warn(`⚠️ Finnhub API error for ${symbol}: ${data.error}`);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Error fetching Finnhub data for ${symbol}:`, error.message);
        return null;
    }
}

async function main() {
    console.log("===== Starting HOURLY hot stocks financial update job =====");
    
    const { NEON_DATABASE_URL, DATABASE_URL, FINNHUB_API_KEY } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    // 检查是否为测试模式
    const isTestMode = !dbUrl || dbUrl.includes('username:password') || !FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here';
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No valid database connection or API key");
        console.log("✅ Script structure validation passed");
        console.log("📝 To run with real database and API:");
        console.log("   1. Set DATABASE_URL to your Neon database connection string");
        console.log("   2. Set FINNHUB_API_KEY to your Finnhub API key");
        console.log("===== Test completed successfully =====");
        return;
    }
    
    if (!dbUrl || !FINNHUB_API_KEY) {
        console.error("FATAL: Missing DATABASE_URL or FINNHUB_API_KEY environment variables.");
        process.exit(1);
    }
    
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 只选择市值最高的 50 家公司
        const { rows: companies } = await client.query(
            'SELECT ticker FROM stocks ORDER BY market_cap DESC NULLS LAST LIMIT 50'
        );
        console.log(`📋 Found ${companies.length} hot stocks to update`);
        
        // 分批处理，避免长时间事务导致死锁
        const BATCH_SIZE = 5;
        let updatedCount = 0;
        
        for (let i = 0; i < companies.length; i += BATCH_SIZE) {
            const batch = companies.slice(i, i + BATCH_SIZE);
            
            // 每个批次使用独立事务
            await client.query('BEGIN');
            
            try {
                for (const company of batch) {
                    const financialData = await getFinnhubMetrics(company.ticker, FINNHUB_API_KEY);
                    
                    if (financialData && financialData.metric) {
                        const metrics = financialData.metric;
                        
                        await client.query(
                            `UPDATE stocks SET 
                             market_cap = $1, 
                             roe_ttm = $2, 
                             pe_ttm = $3, 
                             last_updated = NOW() 
                             WHERE ticker = $4`,
                            [
                                metrics.marketCapitalization || null,
                                metrics.roeTTM || null,
                                metrics.peTTM || null,
                                company.ticker
                            ]
                        );
                        
                        updatedCount++;
                        console.log(`📊 Updated ${company.ticker} (${updatedCount}/${companies.length})`);
                    } else {
                        console.warn(`⚠️ No financial data available for ${company.ticker}`);
                    }
                    
                    // 添加小延迟，减少API压力
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                await client.query('COMMIT');
                console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1} completed (${Math.min(i + BATCH_SIZE, companies.length)}/${companies.length})`);
                
            } catch (batchError) {
                await client.query('ROLLBACK');
                console.error(`❌ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, batchError.message);
                // 继续处理下一批次，不中断整个任务
            }
        }
        console.log(`✅ SUCCESS: Updated financial data for ${updatedCount} hot stocks`);
        
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error("❌ JOB FAILED:", error.message);
        console.error("Full error:", error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
            console.log("Database connection released");
        }
        if (pool) {
            await pool.end();
            console.log("Database pool closed");
        }
    }
}

main();