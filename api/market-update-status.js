import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await pool.connect();
        
        try {
            // 获取更新状态统计
            const { rows: stats } = await client.query(`
                SELECT 
                    COUNT(*) as total_stocks,
                    COUNT(last_price) as stocks_with_price,
                    COUNT(CASE WHEN last_updated IS NOT NULL THEN 1 END) as stocks_updated,
                    COUNT(CASE WHEN last_updated IS NULL THEN 1 END) as stocks_never_updated,
                    COUNT(CASE WHEN last_updated > NOW() - INTERVAL '1 day' THEN 1 END) as updated_today,
                    COUNT(CASE WHEN last_updated > NOW() - INTERVAL '1 hour' THEN 1 END) as updated_last_hour,
                    MAX(last_updated) as most_recent_update,
                    MIN(last_updated) as oldest_update
                FROM stocks
            `);

            // 获取最近更新的股票样本
            const { rows: recentUpdates } = await client.query(`
                SELECT ticker, last_price, change_percent, last_updated
                FROM stocks 
                WHERE last_updated IS NOT NULL 
                ORDER BY last_updated DESC 
                LIMIT 10
            `);

            // 获取最需要更新的股票
            const { rows: needsUpdate } = await client.query(`
                SELECT ticker, last_updated,
                    CASE 
                        WHEN last_updated IS NULL THEN 'Never updated'
                        ELSE EXTRACT(EPOCH FROM (NOW() - last_updated))/3600 || ' hours ago'
                    END as last_update_ago
                FROM stocks 
                ORDER BY 
                    CASE WHEN last_updated IS NULL THEN 0 ELSE 1 END,
                    last_updated ASC 
                LIMIT 10
            `);

            const stat = stats[0];
            
            // 计算完成度
            const completionRate = stat.total_stocks > 0 ? 
                (stat.stocks_with_price / stat.total_stocks * 100).toFixed(1) : 0;

            res.status(200).json({
                success: true,
                timestamp: new Date().toISOString(),
                summary: {
                    totalStocks: parseInt(stat.total_stocks),
                    stocksWithPrice: parseInt(stat.stocks_with_price),
                    stocksUpdated: parseInt(stat.stocks_updated),
                    stocksNeverUpdated: parseInt(stat.stocks_never_updated),
                    updatedToday: parseInt(stat.updated_today),
                    updatedLastHour: parseInt(stat.updated_last_hour),
                    completionRate: `${completionRate}%`,
                    mostRecentUpdate: stat.most_recent_update,
                    oldestUpdate: stat.oldest_update
                },
                recentUpdates: recentUpdates.map(stock => ({
                    ticker: stock.ticker,
                    price: stock.last_price,
                    changePercent: stock.change_percent ? `${stock.change_percent.toFixed(2)}%` : null,
                    lastUpdated: stock.last_updated
                })),
                needsUpdate: needsUpdate.map(stock => ({
                    ticker: stock.ticker,
                    lastUpdateAgo: stock.last_update_ago,
                    lastUpdated: stock.last_updated
                }))
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Status check failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}