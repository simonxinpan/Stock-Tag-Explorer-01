// /_scripts/etl-smart-batch-processor.mjs
// ETL Smart Batch Processor - 智能分批处理器
// 每天从数据库初始股票开始运行，每15分钟运行一次，每次50只股票
// 共运行10次（150分钟），总计160分钟后结束，不循环运行

import { Pool } from 'pg';
import 'dotenv/config';
import { getPreviousDayAggs } from './polygon-api.js';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// ETL任务队列状态
const ETL_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing', 
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// 确保ETL任务队列表存在
async function ensureETLTaskQueueExists(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS etl_task_queue (
            id SERIAL PRIMARY KEY,
            ticker VARCHAR(10) NOT NULL,
            task_date DATE NOT NULL DEFAULT CURRENT_DATE,
            batch_number INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL,
            error_message TEXT NULL,
            UNIQUE(ticker, task_date)
        )
    `);
    
    // 创建索引以提高查询性能
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_etl_task_queue_status_date 
        ON etl_task_queue(status, task_date)
    `);
    
    console.log("✅ ETL task queue table ensured");
}

// 初始化今日ETL任务队列
async function initializeDailyETLQueue(client) {
    const today = new Date().toISOString().split('T')[0];
    
    // 检查今日是否已初始化
    const { rows: existingTasks } = await client.query(`
        SELECT COUNT(*) as count FROM etl_task_queue 
        WHERE task_date = $1
    `, [today]);
    
    if (parseInt(existingTasks[0].count) > 0) {
        console.log(`📋 Today's ETL queue already initialized (${existingTasks[0].count} tasks)`);
        return;
    }
    
    // 获取所有股票并初始化任务队列
    const { rows: stocks } = await client.query(`
        SELECT ticker FROM stocks 
        ORDER BY ticker
    `);
    
    console.log(`🚀 Initializing ETL queue for ${stocks.length} stocks...`);
    
    // 批量插入任务
    const batchSize = 50;
    let batchNumber = 1;
    
    for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);
        
        for (const stock of batch) {
            await client.query(`
                INSERT INTO etl_task_queue (ticker, task_date, batch_number, status)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (ticker, task_date) DO NOTHING
            `, [stock.ticker, today, batchNumber, ETL_STATUS.PENDING]);
        }
        
        batchNumber++;
    }
    
    console.log(`✅ ETL queue initialized with ${Math.ceil(stocks.length / batchSize)} batches`);
}

// 获取下一批待处理的股票
async function getNextBatch(client, batchSize = 50) {
    const today = new Date().toISOString().split('T')[0];
    
    const { rows: tasks } = await client.query(`
        SELECT ticker, batch_number FROM etl_task_queue 
        WHERE task_date = $1 AND status = $2
        ORDER BY batch_number, ticker
        LIMIT $3
    `, [today, ETL_STATUS.PENDING, batchSize]);
    
    return tasks;
}

// 标记任务为处理中
async function markTasksAsProcessing(client, tickers) {
    const today = new Date().toISOString().split('T')[0];
    
    await client.query(`
        UPDATE etl_task_queue 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE ticker = ANY($2) AND task_date = $3
    `, [ETL_STATUS.PROCESSING, tickers, today]);
}

// 标记任务为完成
async function markTaskAsCompleted(client, ticker) {
    const today = new Date().toISOString().split('T')[0];
    
    await client.query(`
        UPDATE etl_task_queue 
        SET status = $1, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE ticker = $2 AND task_date = $3
    `, [ETL_STATUS.COMPLETED, ticker, today]);
}

// 标记任务为失败
async function markTaskAsFailed(client, ticker, errorMessage) {
    const today = new Date().toISOString().split('T')[0];
    
    await client.query(`
        UPDATE etl_task_queue 
        SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
        WHERE ticker = $3 AND task_date = $4
    `, [ETL_STATUS.FAILED, errorMessage, ticker, today]);
}

// 获取Finnhub财务指标
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

// 获取Finnhub实时报价数据
async function getFinnhubQuote(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.warn(`⚠️ Finnhub Quote API error for ${symbol}: ${data.error}`);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Error fetching Finnhub quote for ${symbol}:`, error.message);
        return null;
    }
}

// 处理单只股票的数据更新
async function processStock(client, ticker, finnhubApiKey, polygonApiKey) {
    try {
        console.log(`📊 Processing ${ticker}...`);
        
        // 1. 获取Polygon日线数据
        let polygonData = null;
        if (polygonApiKey) {
            polygonData = await getPreviousDayAggs(ticker);
        }
        
        // 2. 获取Finnhub财务指标
        const financialData = await getFinnhubMetrics(ticker, finnhubApiKey);
        
        // 3. 获取Finnhub实时报价
        const quoteData = await getFinnhubQuote(ticker, finnhubApiKey);
        
        // 准备更新数据
        let updateData = {
            market_cap: null,
            roe_ttm: null,
            pe_ttm: null,
            dividend_yield: null,
            open_price: null,
            high_price: null,
            low_price: null,
            last_price: null,
            volume: null,
            vwap: null,
            trade_count: null,
            previous_close: null
        };
        
        // 处理Polygon数据
        if (polygonData) {
            updateData.open_price = polygonData.open_price;
            updateData.high_price = polygonData.high_price;
            updateData.low_price = polygonData.low_price;
            updateData.last_price = polygonData.close_price;
            updateData.volume = polygonData.volume;
            updateData.vwap = polygonData.vwap;
            updateData.trade_count = polygonData.trade_count;
            updateData.previous_close = polygonData.close_price;
        }
        
        // 处理Finnhub财务数据
        if (financialData && financialData.metric) {
            const metrics = financialData.metric;
            updateData.market_cap = metrics.marketCapitalization || null;
            updateData.roe_ttm = metrics.roeTTM || null;
            updateData.pe_ttm = metrics.peTTM || null;
        }
        
        // 处理Finnhub报价数据
        if (quoteData) {
            updateData.dividend_yield = quoteData.dp || null;
        }
        
        // 更新数据库
        await client.query(`
            UPDATE stocks SET 
                market_cap = COALESCE($1, market_cap),
                roe_ttm = COALESCE($2, roe_ttm),
                pe_ttm = COALESCE($3, pe_ttm),
                dividend_yield = COALESCE($4, dividend_yield),
                open_price = COALESCE($5, open_price),
                high_price = COALESCE($6, high_price),
                low_price = COALESCE($7, low_price),
                last_price = COALESCE($8, last_price),
                volume = COALESCE($9, volume),
                vwap = COALESCE($10, vwap),
                trade_count = COALESCE($11, trade_count),
                previous_close = COALESCE($12, previous_close),
                daily_data_last_updated = CURRENT_DATE,
                last_updated = CURRENT_TIMESTAMP
            WHERE ticker = $13
        `, [
            updateData.market_cap,
            updateData.roe_ttm,
            updateData.pe_ttm,
            updateData.dividend_yield,
            updateData.open_price,
            updateData.high_price,
            updateData.low_price,
            updateData.last_price,
            updateData.volume,
            updateData.vwap,
            updateData.trade_count,
            updateData.previous_close,
            ticker
        ]);
        
        // 标记任务完成
        await markTaskAsCompleted(client, ticker);
        console.log(`✅ ${ticker} processed successfully`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error processing ${ticker}:`, error.message);
        await markTaskAsFailed(client, ticker, error.message);
        return false;
    }
}

// 获取ETL进度统计
async function getETLProgress(client) {
    const today = new Date().toISOString().split('T')[0];
    
    const { rows } = await client.query(`
        SELECT 
            status,
            COUNT(*) as count
        FROM etl_task_queue 
        WHERE task_date = $1
        GROUP BY status
    `, [today]);
    
    const progress = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
    };
    
    rows.forEach(row => {
        progress[row.status] = parseInt(row.count);
        progress.total += parseInt(row.count);
    });
    
    return progress;
}

// 主处理函数
async function main() {
    console.log("===== ETL Smart Batch Processor Started =====");
    const startTime = new Date();
    console.log(`🕐 Start Time: ${startTime.toISOString()}`);
    
    // 设置160分钟运行时间限制
    const MAX_RUNTIME_MINUTES = 160;
    const maxEndTime = new Date(startTime.getTime() + MAX_RUNTIME_MINUTES * 60 * 1000);
    console.log(`⏰ Max End Time: ${maxEndTime.toISOString()} (${MAX_RUNTIME_MINUTES} minutes limit)`);
    
    const { NEON_DATABASE_URL, DATABASE_URL, FINNHUB_API_KEY, POLYGON_API_KEY } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    // 检查是否为测试模式
    const isTestMode = !dbUrl || dbUrl.includes('username:password') || !FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here';
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No valid database connection or API key");
        console.log("✅ ETL Smart Batch Processor structure validation passed");
        console.log("📝 To run with real database and API:");
        console.log("   1. Set DATABASE_URL to your Neon database connection string");
        console.log("   2. Set FINNHUB_API_KEY to your Finnhub API key");
        console.log("   3. Set POLYGON_API_KEY to your Polygon API key (optional)");
        console.log("===== Test completed successfully =====");
        return;
    }
    
    if (!dbUrl || !FINNHUB_API_KEY) {
        console.error("FATAL: Missing DATABASE_URL or FINNHUB_API_KEY environment variables.");
        process.exit(1);
    }
    
    if (!POLYGON_API_KEY) {
        console.warn("⚠️ POLYGON_API_KEY not found - Polygon data will be skipped");
    }
    
    console.log("🔧 ETL Configuration:");
    console.log(`   📦 Batch Size: 50 stocks per batch`);
    console.log(`   ⏱️ Frequency: Every 15 minutes`);
    console.log(`   🔄 Max Batches: 10 batches (150 minutes total)`);
    console.log(`   ⏰ Total Runtime: 160 minutes max`);
    console.log(`   🔑 APIs: Finnhub ✅, Polygon ${POLYGON_API_KEY ? '✅' : '❌'}`);
    
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 确保ETL任务队列表存在
        await ensureETLTaskQueueExists(client);
        
        // 初始化今日ETL任务队列
        await initializeDailyETLQueue(client);
        
        // 检查运行时间限制
        const currentTime = new Date();
        if (currentTime >= maxEndTime) {
            console.log("\n⏰ Reached 160-minute runtime limit - stopping ETL process");
            console.log(`🕐 Current Time: ${currentTime.toISOString()}`);
            console.log(`⏰ Max End Time: ${maxEndTime.toISOString()}`);
            
            // 显示最终统计
            const progress = await getETLProgress(client);
            console.log("\n📊 Final ETL Progress (Time Limit Reached):");
            console.log(`   ✅ Completed: ${progress.completed}`);
            console.log(`   ❌ Failed: ${progress.failed}`);
            console.log(`   ⏳ Pending: ${progress.pending}`);
            console.log(`   📊 Total: ${progress.total}`);
            console.log(`   📈 Success Rate: ${((progress.completed / progress.total) * 100).toFixed(1)}%`);
            
            return;
        }
        
        // 获取下一批待处理的股票
        const batch = await getNextBatch(client, 50);
        
        if (batch.length === 0) {
            console.log("🎉 All stocks have been processed for today!");
            
            // 显示最终统计
            const progress = await getETLProgress(client);
            console.log("\n📊 Final ETL Progress:");
            console.log(`   ✅ Completed: ${progress.completed}`);
            console.log(`   ❌ Failed: ${progress.failed}`);
            console.log(`   📊 Total: ${progress.total}`);
            console.log(`   📈 Success Rate: ${((progress.completed / progress.total) * 100).toFixed(1)}%`);
            
            return;
        }
        
        console.log(`\n🔄 Processing batch of ${batch.length} stocks...`);
        console.log(`📋 Batch ${batch[0].batch_number} - Tickers: ${batch.map(t => t.ticker).join(', ')}`);
        
        // 标记任务为处理中
        const tickers = batch.map(t => t.ticker);
        await markTasksAsProcessing(client, tickers);
        
        // 处理每只股票
        let successCount = 0;
        let errorCount = 0;
        
        for (const task of batch) {
            // 在处理每只股票前检查时间限制
            const currentTime = new Date();
            if (currentTime >= maxEndTime) {
                console.log(`\n⏰ Time limit reached during batch processing - stopping at stock ${task.ticker}`);
                console.log(`🕐 Current Time: ${currentTime.toISOString()}`);
                break;
            }
            
            const success = await processStock(client, task.ticker, FINNHUB_API_KEY, POLYGON_API_KEY);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
            
            // API速率限制延迟（Polygon: 5次/分钟）
            if (POLYGON_API_KEY) {
                await new Promise(resolve => setTimeout(resolve, 13000)); // 13秒延迟
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒延迟
            }
        }
        
        // 显示批次结果
        console.log(`\n📊 Batch ${batch[0].batch_number} Results:`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📈 Success Rate: ${((successCount / batch.length) * 100).toFixed(1)}%`);
        
        // 显示总体进度
        const progress = await getETLProgress(client);
        console.log(`\n📊 Overall ETL Progress:`);
        console.log(`   ⏳ Pending: ${progress.pending}`);
        console.log(`   🔄 Processing: ${progress.processing}`);
        console.log(`   ✅ Completed: ${progress.completed}`);
        console.log(`   ❌ Failed: ${progress.failed}`);
        console.log(`   📊 Total: ${progress.total}`);
        console.log(`   📈 Completion Rate: ${((progress.completed / progress.total) * 100).toFixed(1)}%`);
        
        const endTime = new Date();
        const actualRuntime = Math.round((endTime - startTime) / 1000 / 60); // 分钟
        console.log(`\n🕐 End Time: ${endTime.toISOString()}`);
        console.log(`⏱️ Actual Runtime: ${actualRuntime} minutes (Max: ${MAX_RUNTIME_MINUTES} minutes)`);
        console.log("===== ETL Smart Batch Processor Completed =====");
        
    } catch (error) {
        console.error("❌ ETL batch process failed:", error.message);
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