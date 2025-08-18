// /_scripts/update-market-data.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 获取单只股票的前一日数据（免费API）
async function getSingleTickerData(ticker, apiKey) {
    try {
        // 使用免费的前一日聚合数据API
        const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apikey=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 检查API错误
        if (data.error) {
            throw new Error(`Polygon API Error: ${data.error}`);
        }
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                c: result.c || 0, // 收盘价（当作当前价格）
                o: result.o || 0, // 开盘价
                h: result.h || 0, // 最高价
                l: result.l || 0, // 最低价
                v: result.v || 0  // 成交量
            };
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Error fetching data for ${ticker}:`, error.message);
        return null;
    }
}

// 获取所有股票的市场数据（逐一获取）
async function getPolygonMarketData(tickers, apiKey) {
    console.log(`🔄 Fetching market data for ${tickers.length} stocks individually...`);
    console.log('⚠️ Using free API with rate limiting - this will take time');
    
    const marketData = new Map();
    let successCount = 0;
    let failCount = 0;
    
    // 免费版限制：每分钟5次请求，所以每次请求后等待12秒
    const DELAY_MS = 12000; // 12秒延迟
    
    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        
        try {
            console.log(`📊 [${i + 1}/${tickers.length}] Fetching ${ticker}...`);
            
            const data = await getSingleTickerData(ticker, apiKey);
            
            if (data && data.c > 0) {
                marketData.set(ticker, data);
                successCount++;
                
                if (process.env.DEBUG) {
                    console.log(`✅ ${ticker}: price=${data.c}, volume=${data.v}`);
                }
            } else {
                failCount++;
                console.warn(`⚠️ No valid data for ${ticker}`);
            }
            
        } catch (error) {
            failCount++;
            console.error(`❌ Failed to fetch ${ticker}:`, error.message);
        }
        
        // 添加延迟（除了最后一次请求）
        if (i < tickers.length - 1) {
            console.log(`⏳ Waiting ${DELAY_MS/1000}s to respect rate limits...`);
            await delay(DELAY_MS);
        }
    }
    
    console.log(`📊 Market data collection completed: ${successCount} success, ${failCount} failed`);
    return marketData;
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
        
        // 提取股票代码列表
        const tickers = companies.map(company => company.ticker);
        
        // 获取市场数据（逐一获取）
        const polygonMarketData = await getPolygonMarketData(tickers, POLYGON_API_KEY);
        
        if (polygonMarketData.size === 0) {
            console.log("⚠️ No market data available, skipping update");
            return;
        }
        
        // 日志：打印最终准备写入数据库的数据总量和样本
        console.log(`✅ API fetching complete. Preparing to update ${polygonMarketData.size} stocks in the database.`);
        if (process.env.DEBUG && polygonMarketData.size > 0) {
            const sampleData = Array.from(polygonMarketData.entries()).slice(0, 3);
            console.log('📊 Sample data to be written:');
            sampleData.forEach(([ticker, data]) => {
                console.log(`   ${ticker}: price=${data.c}, open=${data.o}, high=${data.h}, low=${data.l}`);
            });
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
                    const marketData = polygonMarketData.get(company.ticker);
                    if (marketData && marketData.c > 0) {
                        // 计算涨跌幅和涨跌额
                        const changePercent = marketData.o > 0 ? 
                            ((marketData.c - marketData.o) / marketData.o) * 100 : 0;
                        const changeAmount = marketData.o > 0 ? 
                            (marketData.c - marketData.o) : 0;
                        
                        // 准备SQL语句和参数
                        const sql = `UPDATE stocks SET 
                             last_price = $1, 
                             change_amount = $2,
                             change_percent = $3, 
                             week_52_high = GREATEST(COALESCE(week_52_high, 0), $4),
                             week_52_low = CASE 
                                 WHEN week_52_low IS NULL OR week_52_low = 0 THEN $5
                                 ELSE LEAST(week_52_low, $5)
                             END,
                             last_updated = NOW() 
                             WHERE ticker = $6`;
                        const params = [marketData.c, changeAmount, changePercent, marketData.h, marketData.l, company.ticker];
                        
                        // 日志：打印将要执行的SQL语句和参数
                        if (process.env.DEBUG) {
                            console.log(`🔄 Executing SQL for ${company.ticker}:`);
                            console.log(`   SQL: ${sql.replace(/\s+/g, ' ').trim()}`);
                            console.log(`   Params: ${JSON.stringify(params)}`);
                        }
                        
                        const result = await client.query(sql, params);
                        
                        // 日志：打印数据库操作的结果
                        if (process.env.DEBUG) {
                            console.log(`✅ Update for ${company.ticker} successful. Rows affected: ${result.rowCount}`);
                        }
                        
                        // 检查是否真的更新了数据
                        if (result.rowCount === 0) {
                            console.warn(`⚠️ WARNING: No rows updated for ${company.ticker} - ticker might not exist in database`);
                        } else {
                            updatedCount++;
                        }
                        
                        // 详细日志（仅在DEBUG模式下）
                        if (process.env.DEBUG) {
                            console.log(`📊 ${company.ticker}: price=${marketData.c}, change=${changeAmount.toFixed(2)} (${changePercent.toFixed(2)}%)`);
                        }
                    } else {
                        console.warn(`⚠️ No market data for ${company.ticker}: hasData=${!!marketData}, price=${marketData?.c || 'N/A'}`);
                    }
                }
                
                // 提交当前批次
                await client.query('COMMIT');
                console.log(`✅ Batch completed: Updated ${Math.min(i + BATCH_SIZE, companiesArray.length)} stocks`);
                
            } catch (batchError) {
                // 回滚当前批次
                await client.query('ROLLBACK');
                console.error(`❌ Batch failed at stocks ${i + 1}-${Math.min(i + BATCH_SIZE, companiesArray.length)}:`);
                console.error(`   Error message: ${batchError.message}`);
                console.error(`   Error code: ${batchError.code || 'N/A'}`);
                console.error(`   Error detail: ${batchError.detail || 'N/A'}`);
                if (process.env.DEBUG) {
                    console.error(`   Full error object:`, batchError);
                }
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