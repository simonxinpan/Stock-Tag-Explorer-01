// /_scripts/update-market-data.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL, 
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
    
    const { NEON_DATABASE_URL, POLYGON_API_KEY } = process.env;
    if (!NEON_DATABASE_URL || !POLYGON_API_KEY) {
        console.error("FATAL: Missing NEON_DATABASE_URL or POLYGON_API_KEY environment variables.");
        process.exit(1);
    }
    
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 获取所有股票代码
        const { rows: companies } = await client.query('SELECT symbol FROM stocks');
        console.log(`📋 Found ${companies.length} stocks to update`);
        
        // 获取 Polygon 快照数据
        const polygonSnapshot = await getPolygonSnapshot(POLYGON_API_KEY);
        
        if (polygonSnapshot.size === 0) {
            console.log("⚠️ No market data available, skipping update");
            return;
        }
        
        // 开始事务
        await client.query('BEGIN');
        
        let updatedCount = 0;
        for (const company of companies) {
            const marketData = polygonSnapshot.get(company.symbol);
            if (marketData && marketData.c > 0) {
                // 计算涨跌幅
                const changePercent = marketData.o > 0 ? 
                    ((marketData.c - marketData.o) / marketData.o) * 100 : 0;
                
                await client.query(
                    `UPDATE stocks SET 
                     price = $1, 
                     change_percent = $2, 
                     volume = $3, 
                     last_updated = NOW() 
                     WHERE symbol = $4`,
                    [marketData.c, changePercent, marketData.v, company.symbol]
                );
                updatedCount++;
            }
        }
        
        await client.query('COMMIT');
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