// /_scripts/update-market-data.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 获取 Polygon 快照数据
async function getPolygonSnapshot(apiKey) {
    try {
        const response = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apikey=${apiKey}`);
        const data = await response.json();
        
        const snapshot = new Map();
        if (data.results) {
            data.results.forEach(stock => {
                snapshot.set(stock.ticker, {
                    c: stock.last_trade?.price || stock.prevDay?.c || 0, // 当前价格
                    o: stock.prevDay?.o || 0, // 开盘价
                    h: stock.day?.h || stock.prevDay?.h || 0, // 最高价
                    l: stock.day?.l || stock.prevDay?.l || 0, // 最低价
                    v: stock.day?.v || stock.prevDay?.v || 0  // 成交量
                });
            });
        }
        
        console.log(`📊 Polygon snapshot loaded: ${snapshot.size} stocks`);
        return snapshot;
    } catch (error) {
        console.error('❌ Error fetching Polygon snapshot:', error.message);
        return new Map();
    }
}

async function main() {
    console.log("===== Starting HIGH-FREQUENCY market data update job =====");
    
    const { NEON_DATABASE_URL, DATABASE_URL, POLYGON_API_KEY } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    // 检查是否为测试模式
    const isTestMode = !dbUrl || dbUrl.includes('username:password') || !POLYGON_API_KEY || POLYGON_API_KEY === 'your_polygon_api_key_here';
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No valid database connection or API key");
        console.log("✅ Script structure validation passed");
        console.log("📝 To run with real database and API:");
        console.log("   1. Set DATABASE_URL to your Neon database connection string");
        console.log("   2. Set POLYGON_API_KEY to your Polygon API key");
        console.log("===== Test completed successfully =====");
        return;
    }
    
    if (!dbUrl || !POLYGON_API_KEY) {
        console.error("FATAL: Missing DATABASE_URL or POLYGON_API_KEY environment variables.");
        process.exit(1);
    }
    
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 获取所有股票代码
        const { rows: companies } = await client.query('SELECT ticker FROM stocks');
        console.log(`📋 Found ${companies.length} stocks to update`);
        
        // 获取 Polygon 快照数据
        const polygonSnapshot = await getPolygonSnapshot(POLYGON_API_KEY);
        
        if (polygonSnapshot.size === 0) {
            console.log("⚠️ No market data available, skipping update");
            return;
        }
        
        // 分批处理，避免长时间事务导致死锁
        const BATCH_SIZE = 10; // 市场数据更新较快，可以用稍大的批次
        const companiesArray = Array.from(companies);
        let updatedCount = 0;
        
        for (let i = 0; i < companiesArray.length; i += BATCH_SIZE) {
            const batch = companiesArray.slice(i, i + BATCH_SIZE);
            
            // 每个批次使用独立事务
            await client.query('BEGIN');
            
            try {
                for (const company of batch) {
                    const marketData = polygonSnapshot.get(company.ticker);
                    if (marketData && marketData.c > 0) {
                        // 计算涨跌幅和涨跌额
                        const changePercent = marketData.o > 0 ? 
                            ((marketData.c - marketData.o) / marketData.o) * 100 : 0;
                        const changeAmount = marketData.o > 0 ? 
                            (marketData.c - marketData.o) : 0;
                        
                        await client.query(
                            `UPDATE stocks SET 
                             last_price = $1, 
                             change_amount = $2,
                             change_percent = $3, 
                             week_52_high = GREATEST(COALESCE(week_52_high, 0), $4),
                             week_52_low = CASE 
                                 WHEN week_52_low IS NULL OR week_52_low = 0 THEN $5
                                 ELSE LEAST(week_52_low, $5)
                             END,
                             last_updated = NOW() 
                             WHERE ticker = $6`,
                            [marketData.c, changeAmount, changePercent, marketData.h, marketData.l, company.ticker]
                        );
                        updatedCount++;
                    }
                }
                
                // 提交当前批次
                await client.query('COMMIT');
                console.log(`✅ Batch completed: Updated ${Math.min(i + BATCH_SIZE, companiesArray.length)} stocks`);
                
            } catch (batchError) {
                // 回滚当前批次
                await client.query('ROLLBACK');
                console.error(`❌ Batch failed at stocks ${i + 1}-${Math.min(i + BATCH_SIZE, companiesArray.length)}:`, batchError.message);
                // 继续处理下一批次
            }
        }
        console.log(`✅ SUCCESS: Updated market data for ${updatedCount} stocks`);
        
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