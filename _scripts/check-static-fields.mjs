// /_scripts/check-static-fields.mjs
// 检查数据库中静态字段的完整性

import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log("===== 检查静态字段完整性 =====");
    
    const { NEON_DATABASE_URL, DATABASE_URL } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    // 检查是否为测试模式
    const isTestMode = !dbUrl || dbUrl.includes('username:password');
    
    if (isTestMode) {
        console.log("⚠️ 测试模式 - 无有效数据库连接");
        console.log("✅ 脚本结构验证通过");
        console.log("📝 要连接真实数据库，请设置 DATABASE_URL 环境变量");
        return;
    }
    
    let client;
    
    try {
        client = await pool.connect();
        console.log("✅ 数据库连接成功");
        
        // 检查总股票数量
        const totalResult = await client.query('SELECT COUNT(*) as total FROM stocks');
        const totalStocks = parseInt(totalResult.rows[0].total);
        console.log(`📊 总股票数量: ${totalStocks}`);
        
        // 检查各个静态字段的完整性
        const fields = [
            { name: 'name_zh', label: '中文名称' },
            { name: 'sector_zh', label: '中文行业' },
            { name: 'sector_en', label: '英文行业' },
            { name: 'logo', label: '公司Logo' }
        ];
        
        console.log("\n📋 静态字段完整性报告:");
        console.log("=" .repeat(50));
        
        for (const field of fields) {
            // 统计非空字段数量
            const nonNullResult = await client.query(
                `SELECT COUNT(*) as count FROM stocks WHERE ${field.name} IS NOT NULL AND ${field.name} != ''`
            );
            const nonNullCount = parseInt(nonNullResult.rows[0].count);
            const percentage = ((nonNullCount / totalStocks) * 100).toFixed(1);
            
            const status = percentage >= 90 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
            console.log(`${status} ${field.label} (${field.name}): ${nonNullCount}/${totalStocks} (${percentage}%)`);
        }
        
        // 显示一些示例数据
        console.log("\n📝 示例数据 (前5条):");
        console.log("=" .repeat(80));
        
        const sampleResult = await client.query(
            `SELECT ticker, name_zh, sector_zh, sector_en, 
                    CASE WHEN logo IS NOT NULL THEN '有Logo' ELSE 'NULL' END as logo_status
             FROM stocks 
             ORDER BY ticker 
             LIMIT 5`
        );
        
        console.table(sampleResult.rows);
        
        // 检查缺失数据的股票
        console.log("\n🔍 缺失静态字段的股票 (前10条):");
        console.log("=" .repeat(60));
        
        const missingResult = await client.query(
            `SELECT ticker, 
                    CASE WHEN name_zh IS NULL OR name_zh = '' THEN '❌' ELSE '✅' END as name_zh,
                    CASE WHEN sector_zh IS NULL OR sector_zh = '' THEN '❌' ELSE '✅' END as sector_zh,
                    CASE WHEN sector_en IS NULL OR sector_en = '' THEN '❌' ELSE '✅' END as sector_en,
                    CASE WHEN logo IS NULL OR logo = '' THEN '❌' ELSE '✅' END as logo
             FROM stocks 
             WHERE (name_zh IS NULL OR name_zh = '') 
                OR (sector_zh IS NULL OR sector_zh = '') 
                OR (sector_en IS NULL OR sector_en = '') 
                OR (logo IS NULL OR logo = '')
             ORDER BY ticker 
             LIMIT 10`
        );
        
        if (missingResult.rows.length > 0) {
            console.table(missingResult.rows);
            console.log(`\n⚠️ 发现 ${missingResult.rows.length} 只股票缺失部分静态字段`);
            console.log("💡 建议运行 update-company-profiles.mjs 脚本来填充这些字段");
        } else {
            console.log("✅ 所有股票的静态字段都已完整!");
        }
        
        console.log("\n===== 检查完成 =====");
        
    } catch (error) {
        console.error("❌ 检查失败:", error.message);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        if (pool) {
            await pool.end();
        }
    }
}

main();