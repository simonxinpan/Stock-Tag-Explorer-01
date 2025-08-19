// 测试Finnhub脚本的数据库连接稳定性
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

// 模拟长时间运行的API调用
async function simulateLongRunningProcess(client, pool) {
    console.log("🔄 Starting long-running process simulation...");
    
    const TOTAL_ITERATIONS = 100; // 模拟100次API调用
    const DELAY_MS = 1000; // 1秒延迟
    const CONNECTION_CHECK_INTERVAL = 20; // 每20次检查连接
    
    for (let i = 0; i < TOTAL_ITERATIONS; i++) {
        // 定期检查数据库连接
        if (i > 0 && i % CONNECTION_CHECK_INTERVAL === 0) {
            console.log(`🔄 [${i}/${TOTAL_ITERATIONS}] Checking database connection health...`);
            try {
                client = await ensureConnection(client, pool);
                console.log(`✅ Database connection healthy at iteration ${i}`);
            } catch (connectionError) {
                console.error(`❌ Failed to ensure connection: ${connectionError.message}`);
                throw connectionError;
            }
        }
        
        // 模拟API调用
        console.log(`📊 [${i + 1}/${TOTAL_ITERATIONS}] Simulating API call...`);
        
        // 模拟一些数据库操作
        try {
            const result = await client.query('SELECT COUNT(*) FROM stocks');
            if (i % 10 === 9) {
                console.log(`✅ Database query successful, stock count: ${result.rows[0].count}`);
            }
        } catch (dbError) {
            console.error(`❌ Database query failed at iteration ${i}: ${dbError.message}`);
            // 尝试重连
            client = await ensureConnection(client, pool);
        }
        
        // 添加延迟
        if (i < TOTAL_ITERATIONS - 1) {
            await delay(DELAY_MS);
        }
    }
    
    console.log(`✅ Long-running process completed successfully`);
    return client;
}

async function main() {
    console.log("===== Testing Finnhub Connection Stability =====");
    
    const { NEON_DATABASE_URL, DATABASE_URL, FINNHUB_API_KEY } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    if (!dbUrl) {
        console.error("❌ No database URL provided");
        process.exit(1);
    }
    
    let client;
    try {
        client = await connectWithRetry(pool);
        
        // 测试基本连接
        const { rows } = await client.query('SELECT COUNT(*) as count FROM stocks');
        console.log(`📋 Found ${rows[0].count} stocks in database`);
        
        // 模拟长时间运行过程
        client = await simulateLongRunningProcess(client, pool);
        
        console.log("✅ Connection stability test passed!");
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
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