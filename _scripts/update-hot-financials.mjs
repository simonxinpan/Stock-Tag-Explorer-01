// /_scripts/update-hot-financials.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL, 
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
    
    const { NEON_DATABASE_URL, FINNHUB_API_KEY } = process.env;
    if (!NEON_DATABASE_URL || !FINNHUB_API_KEY) {
        console.error("FATAL: Missing NEON_DATABASE_URL or FINNHUB_API_KEY environment variables.");
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
        
        // 开始事务
        await client.query('BEGIN');
        
        let updatedCount = 0;
        for (const company of companies) {
            // 尊重 Finnhub API 限制 (60 calls/minute)
            await new Promise(resolve => setTimeout(resolve, 1200));
            
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
        }
        
        await client.query('COMMIT');
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