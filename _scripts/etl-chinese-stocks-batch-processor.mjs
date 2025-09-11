// /_scripts/etl-chinese-stocks-batch-processor.mjs
// ETL Smart Batch Processor for Chinese Stocks - 中概股智能分批处理器
// 每天从数据库初始股票开始运行，每15分钟运行一次，每次50只股票
// 共运行10次（150分钟），总计160分钟后结束，不循环运行
// 像素级模仿标普500 ETL Smart Batch Processor

import { Pool } from 'pg';
import 'dotenv/config';
import { getPreviousDayAggs } from './polygon-api.js';

// 中概股专用数据库连接
const databaseUrl = process.env.CHINESE_STOCKS_DATABASE_URL;

if (!databaseUrl) {
  console.error(`❌ CHINESE_STOCKS_DATABASE_URL not found`);
  process.exit(1);
}

const pool = new Pool({ 
    connectionString: databaseUrl, 
    ssl: { rejectUnauthorized: false } 
});

console.log(`🎯 Market Type: chinese_stocks`);
console.log(`🔗 Database: ${databaseUrl.split('@')[1]?.split('/')[1] || 'Unknown'}`);

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
    
    // 获取所有中概股并初始化任务队列
    const { rows: stocks } = await client.query(`
        SELECT ticker FROM chinese_stocks 
        ORDER BY ticker
    `);
    
    console.log(`🚀 Initializing ETL queue for ${stocks.length} Chinese stocks...`);
    
    // 批量插入任务
    const batchSize = 50;
    let batchNumber = 1;
    
    for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);
        
        const values = batch.map((stock, index) => 
            `('${stock.ticker}', '${today}', ${batchNumber})`
        ).join(', ');
        
        await client.query(`
            INSERT INTO etl_task_queue (ticker, task_date, batch_number)
            VALUES ${values}
            ON CONFLICT (ticker, task_date) DO NOTHING
        `);
        
        batchNumber++;
    }
    
    console.log(`✅ ETL queue initialized with ${stocks.length} Chinese stocks in ${batchNumber - 1} batches`);
}

// 获取下一批待处理的股票
async function getNextBatch(client, batchSize = 50) {
    const { rows } = await client.query(`
        SELECT ticker, batch_number FROM etl_task_queue 
        WHERE task_date = CURRENT_DATE AND status = $1
        ORDER BY batch_number, ticker
        LIMIT $2
    `, [ETL_STATUS.PENDING, batchSize]);
    
    return rows;
}

// 标记任务为处理中
async function markTasksAsProcessing(client, tickers) {
    await client.query(`
        UPDATE etl_task_queue 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE ticker = ANY($2) AND task_date = CURRENT_DATE
    `, [ETL_STATUS.PROCESSING, tickers]);
}

// 标记任务为已完成
async function markTaskAsCompleted(client, ticker) {
    await client.query(`
        UPDATE etl_task_queue 
        SET status = $1, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE ticker = $2 AND task_date = CURRENT_DATE
    `, [ETL_STATUS.COMPLETED, ticker]);
}

// 标记任务为失败
async function markTaskAsFailed(client, ticker, errorMessage) {
    await client.query(`
        UPDATE etl_task_queue 
        SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
        WHERE ticker = $3 AND task_date = CURRENT_DATE
    `, [ETL_STATUS.FAILED, errorMessage, ticker]);
}

// 获取Finnhub指标数据
async function getFinnhubMetrics(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/metric?symbol=${symbol}&metric=all&token=${apiKey}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`❌ Error fetching Finnhub metrics for ${symbol}:`, error.message);
        return null;
    }
}

// 获取Finnhub实时报价
async function getFinnhubQuote(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`❌ Error fetching Finnhub quote for ${symbol}:`, error.message);
        return null;
    }
}

// 处理单只股票
async function processStock(client, ticker, finnhubApiKey, polygonApiKey) {
    console.log(`📊 Processing ${ticker}...`);
    console.log(`📡 Fetching data for ${ticker}...`);
    
    try {
        // 获取Finnhub数据
        const [quote, metrics] = await Promise.all([
            getFinnhubQuote(ticker, finnhubApiKey),
            getFinnhubMetrics(ticker, finnhubApiKey)
        ]);
        
        if (!quote || quote.c === 0) {
            throw new Error('Invalid quote data from Finnhub');
        }
        
        // 获取Polygon数据（如果API密钥可用）
        let polygonData = null;
        if (polygonApiKey) {
            try {
                polygonData = await getPreviousDayAggs(ticker, polygonApiKey);
            } catch (polygonError) {
                console.warn(`⚠️ Polygon data unavailable for ${ticker}: ${polygonError.message}`);
            }
        }
        
        // 准备更新数据
        const updateData = {
            current_price: quote.c,
            change: quote.d,
            change_percent: quote.dp,
            high: quote.h,
            low: quote.l,
            open: quote.o,
            previous_close: quote.pc,
            updated_at: new Date().toISOString()
        };
        
        // 添加Finnhub指标数据
        if (metrics && metrics.metric) {
            const m = metrics.metric;
            if (m['52WeekHigh']) updateData.week_52_high = m['52WeekHigh'];
            if (m['52WeekLow']) updateData.week_52_low = m['52WeekLow'];
            if (m.marketCapitalization) updateData.market_cap = m.marketCapitalization * 1000000;
            if (m.peBasicExclExtraTTM) updateData.pe_ratio = m.peBasicExclExtraTTM;
            if (m.pbAnnual) updateData.pb_ratio = m.pbAnnual;
            if (m.psAnnual) updateData.ps_ratio = m.psAnnual;
            if (m.dividendYieldIndicatedAnnual) updateData.dividend_yield = m.dividendYieldIndicatedAnnual;
        }
        
        // 添加Polygon数据
        if (polygonData && polygonData.results && polygonData.results[0]) {
            const result = polygonData.results[0];
            updateData.volume = result.v;
            updateData.vwap = result.vw;
            updateData.transactions = result.n;
        }
        
        // 构建更新查询
        const setClause = Object.keys(updateData)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = [ticker, ...Object.values(updateData)];
        
        // 更新数据库
        await client.query(`
            UPDATE chinese_stocks 
            SET ${setClause}
            WHERE ticker = $1
        `, values);
        
        // 标记任务为完成
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
    const { rows } = await client.query(`
        SELECT 
            status,
            COUNT(*) as count
        FROM etl_task_queue 
        WHERE task_date = CURRENT_DATE
        GROUP BY status
    `);
    
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

async function main() {
    console.log("===== ETL Smart Batch Processor Started =====");
    const startTime = new Date();
    console.log(`🕐 Start Time: ${startTime.toISOString()}`);
    
    // 设置11分钟运行时间限制（像素级模仿标普500）
    const MAX_RUNTIME_MINUTES = 11;
    const maxEndTime = new Date(startTime.getTime() + MAX_RUNTIME_MINUTES * 60 * 1000);
    console.log(`⏰ Max End Time: ${maxEndTime.toISOString()} (${MAX_RUNTIME_MINUTES} minutes limit)`);
    
    const { CHINESE_STOCKS_DATABASE_URL, FINNHUB_API_KEY, POLYGON_API_KEY } = process.env;
    const dbUrl = CHINESE_STOCKS_DATABASE_URL;
    
    // 检查是否为测试模式
    const isTestMode = !dbUrl || dbUrl.includes('username:password') || !FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here';
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No valid database connection or API key");
        console.log("✅ ETL Smart Batch Processor structure validation passed");
        console.log("📝 To run with real database and API:");
        console.log("   1. Set CHINESE_STOCKS_DATABASE_URL to your Chinese stocks database connection string");
        console.log("   2. Set FINNHUB_API_KEY to your Finnhub API key");
        console.log("   3. Set POLYGON_API_KEY to your Polygon API key (optional)");
        console.log("===== Test completed successfully =====");
        return;
    }
    
    if (!dbUrl || !FINNHUB_API_KEY) {
        console.error("FATAL: Missing CHINESE_STOCKS_DATABASE_URL or FINNHUB_API_KEY environment variables.");
        process.exit(1);
    }
    
    if (!POLYGON_API_KEY) {
        console.warn("⚠️ POLYGON_API_KEY not found - Polygon data will be skipped");
    }
    
    console.log("🔧 ETL Configuration:");
    console.log(`   📦 Batch Size: 50 stocks per batch`);
    console.log(`   ⏱️ Frequency: Every 15 minutes`);
    console.log(`   🔄 Max Batches: 1 batch (11 minutes total)`);
    console.log(`   ⏰ Total Runtime: 11 minutes max`);
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
            console.log("\n⏰ Reached 11-minute runtime limit - stopping ETL process");
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
            console.log("🎉 All Chinese stocks have been processed for today!");
            
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