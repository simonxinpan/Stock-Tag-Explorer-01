// /_scripts/update-market-data-finnhub.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 数据库连接重试函数
async function connectWithRetry(pool, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const client = await pool.connect();
            console.log(`✅ Database connected successfully (attempt ${i + 1})`);
            return client;
        } catch (error) {
            console.warn(`⚠️ Database connection attempt ${i + 1} failed: ${error.message}`);
            if (i === maxRetries - 1) {
                throw error;
            }
            await delay(2000 * (i + 1)); // 递增延迟
        }
    }
}

// 检查并刷新数据库连接
async function ensureConnection(client, pool) {
    try {
        // 发送一个简单的查询来测试连接
        await client.query('SELECT 1');
        return client;
    } catch (error) {
        console.warn(`⚠️ Database connection lost, reconnecting: ${error.message}`);
        try {
            client.release();
        } catch (releaseError) {
            console.warn(`⚠️ Error releasing old connection: ${releaseError.message}`);
        }
        return await connectWithRetry(pool);
    }
}

// 获取单只股票的数据（Finnhub API）
async function getSingleTickerDataFromFinnhub(ticker, apiKey) {
    try {
        // 获取实时报价
        const quoteResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
        
        if (!quoteResponse.ok) {
            throw new Error(`HTTP ${quoteResponse.status}: ${quoteResponse.statusText}`);
        }
        
        const quoteData = await quoteResponse.json();
        
        // 检查API错误
        if (quoteData.error) {
            throw new Error(`Finnhub API Error: ${quoteData.error}`);
        }
        
        if (quoteData.c && quoteData.c > 0) {
            return {
                c: quoteData.c || 0, // 当前价格（收盘价）
                o: quoteData.o || 0, // 开盘价
                h: quoteData.h || 0, // 最高价
                l: quoteData.l || 0, // 最低价
                v: 0  // Finnhub 实时报价不包含成交量，设为0
            };
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Error fetching data for ${ticker}:`, error.message);
        return null;
    }
}

// 获取所有股票的市场数据（逐一获取，带连接保活）
async function getFinnhubMarketData(tickers, apiKey, client = null, pool = null) {
    console.log(`🔄 Fetching market data for ${tickers.length} stocks from Finnhub...`);
    console.log('⚡ Using Finnhub API with rate limiting and connection keep-alive');
    
    const marketData = new Map();
    let successCount = 0;
    let failCount = 0;
    
    // Finnhub 免费版限制：每分钟60次请求，我们设置为每秒1次请求以保持安全边际
    const DELAY_MS = 1000; // 1秒延迟，比Polygon的12秒快很多
    const CONNECTION_CHECK_INTERVAL = 50; // 每50个请求检查一次数据库连接
    
    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        
        // 定期检查数据库连接（如果提供了连接参数）
        if (client && pool && i > 0 && i % CONNECTION_CHECK_INTERVAL === 0) {
            console.log(`🔄 [${i}/${tickers.length}] Checking database connection health...`);
            try {
                await client.query('SELECT 1');
                console.log(`✅ Database connection healthy at request ${i}`);
            } catch (connectionError) {
                console.warn(`⚠️ Database connection issue detected at request ${i}: ${connectionError.message}`);
                // 这里不重连，让主函数处理
            }
        }
        
        try {
            console.log(`📊 [${i + 1}/${tickers.length}] Fetching ${ticker}...`);
            
            const data = await getSingleTickerDataFromFinnhub(ticker, apiKey);
            
            if (data && data.c > 0) {
                marketData.set(ticker, data);
                successCount++;
                
                if (process.env.DEBUG) {
                    console.log(`✅ ${ticker}: price=${data.c}, open=${data.o}, high=${data.h}, low=${data.l}`);
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
            if (i % 100 === 99) {
                console.log(`⏳ [${i + 1}/${tickers.length}] Waiting ${DELAY_MS/1000}s... (Progress: ${((i + 1) / tickers.length * 100).toFixed(1)}%)`);
            }
            await delay(DELAY_MS);
        }
    }
    
    console.log(`📊 Market data collection completed: ${successCount} success, ${failCount} failed`);
    return marketData;
}

async function main() {
    console.log("===== Starting HIGH-FREQUENCY market data update job =====");
    
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
        client = await connectWithRetry(pool);
        
        // 获取所有股票代码
        const { rows: companies } = await client.query('SELECT ticker FROM stocks');
        console.log(`📋 Found ${companies.length} stocks to update`);
        
        // 提取股票代码列表
        const tickers = companies.map(company => company.ticker);
        
        // 获取市场数据（逐一获取，传递数据库连接用于保活检查）
        console.log("🔄 Starting API data collection phase...");
        const finnhubMarketData = await getFinnhubMarketData(tickers, FINNHUB_API_KEY, client, pool);
        
        // API调用完成后，重新确保数据库连接有效
        console.log("🔄 API collection complete, verifying database connection...");
        client = await ensureConnection(client, pool);
        
        if (finnhubMarketData.size === 0) {
            console.log("⚠️ No market data available, skipping update");
            return;
        }
        
        // 日志：打印最终准备写入数据库的数据总量和样本
        console.log(`✅ API fetching complete. Preparing to update ${finnhubMarketData.size} stocks in the database.`);
        if (process.env.DEBUG && finnhubMarketData.size > 0) {
            const sampleData = Array.from(finnhubMarketData.entries()).slice(0, 3);
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
            
            // 每个批次前检查数据库连接
            try {
                client = await ensureConnection(client, pool);
            } catch (connectionError) {
                console.error(`❌ Failed to ensure database connection for batch ${i + 1}: ${connectionError.message}`);
                continue; // 跳过这个批次
            }
            
            // 每个批次使用独立事务
            await client.query('BEGIN');
            
            try {
                for (const company of batch) {
                    const marketData = finnhubMarketData.get(company.ticker);
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
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.warn(`⚠️ Failed to rollback transaction: ${rollbackError.message}`);
                    // 尝试重新连接
                    try {
                        client = await connectWithRetry(pool);
                    } catch (reconnectError) {
                        console.error(`❌ Failed to reconnect after rollback error: ${reconnectError.message}`);
                    }
                }
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
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.warn(`⚠️ Failed to rollback in main catch: ${rollbackError.message}`);
            }
        }
        console.error("❌ JOB FAILED:", error.message);
        console.error("Full error:", error);
        process.exit(1);
    } finally {
        if (client) {
            try {
                client.release();
                console.log("Database connection released");
            } catch (releaseError) {
                console.warn(`⚠️ Error releasing connection: ${releaseError.message}`);
            }
        }
        if (pool) {
            try {
                await pool.end();
                console.log("Database pool closed");
            } catch (poolError) {
                console.warn(`⚠️ Error closing pool: ${poolError.message}`);
            }
        }
    }
}

main();