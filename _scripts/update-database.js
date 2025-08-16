// /_scripts/update-database.js (最终版)
import { Pool } from 'pg';
import 'dotenv/config'; // 确保本地测试时能加载 .env

// ... (所有辅助函数: getPolygonSnapshot, getFinnhubMetrics, applyTag) ...

async function main() {
    console.log("===== Starting Database Update Job =====");
    
    const { NEON_DATABASE_URL, POLYGON_API_KEY, FINNHUB_API_KEY } = process.env;
    if (!NEON_DATABASE_URL || !POLYGON_API_KEY || !FINNHUB_API_KEY) {
        console.error("FATAL: Missing required environment variables.");
        process.exit(1);
    }
    
    const pool = new Pool({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    
    try {
        // ... (完整的、健壮的数据库更新和标签计算逻辑) ...
        console.log("===== Job finished successfully. =====");
    } catch (error) {
        // ... (错误处理)
    } finally {
        if(client) client.release();
        if(pool) pool.end();
    }
}

main();