import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    // 只允许POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 验证授权令牌
    const authHeader = req.headers.authorization;
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!authHeader || authHeader !== expectedToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const client = await pool.connect();
    
    try {
        console.log('🚀 ETL Start: Resetting daily task queue...');
        
        // 重置所有股票的处理状态 - 无条件重置所有股票
        const resetResult = await client.query(`
            UPDATE stocks 
            SET daily_data_last_updated = NULL
        `);
        
        // 获取总股票数量
        const countResult = await client.query('SELECT COUNT(*) as total FROM stocks');
        const totalStocks = parseInt(countResult.rows[0].total);
        
        console.log(`✅ ETL Start: Reset ${resetResult.rowCount} stocks, total ${totalStocks} stocks ready for processing`);
        
        res.status(200).json({
            success: true,
            message: 'ETL process started successfully',
            data: {
                resetCount: resetResult.rowCount,
                totalStocks: totalStocks,
                estimatedMinutes: Math.ceil(totalStocks / 5), // 每分钟处理5只股票
                startTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ ETL Start Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start ETL process',
            details: error.message
        });
    } finally {
        client.release();
    }
}