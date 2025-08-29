const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
    try {
        console.log('正在测试数据库连接...');
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
        
        const client = await pool.connect();
        console.log('数据库连接成功！');
        
        // 测试简单查询
        const result = await client.query('SELECT NOW() as current_time');
        console.log('当前时间:', result.rows[0].current_time);
        
        // 测试stocks表
        const stocksResult = await client.query('SELECT COUNT(*) as count FROM stocks LIMIT 1');
        console.log('stocks表记录数:', stocksResult.rows[0].count);
        
        // 测试sector_信息技术的股票
        const sectorResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM stocks 
            WHERE sector_zh = '信息技术' OR sector_en = 'Information Technology'
        `);
        console.log('信息技术行业股票数:', sectorResult.rows[0].count);
        
        client.release();
        console.log('测试完成！');
        
    } catch (error) {
        console.error('数据库连接失败:', error.message);
        console.error('错误详情:', error);
    } finally {
        await pool.end();
    }
}

testConnection();