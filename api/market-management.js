// /api/market-management.js - 市场数据管理 API（状态查询和手动触发）
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    const { method, query } = req;
    const { action = 'status' } = query;

    try {
        switch (action) {
            case 'status':
                return await getUpdateStatus(req, res);
            case 'trigger':
                return await triggerUpdate(req, res);
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('❌ Market management API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 获取更新状态
async function getUpdateStatus(req, res) {
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

            // 计算更新覆盖率
            const totalStocks = parseInt(stats[0].total_stocks);
            const updatedStocks = parseInt(stats[0].stocks_updated);
            const coverageRate = totalStocks > 0 ? ((updatedStocks / totalStocks) * 100).toFixed(1) : '0.0';

            return res.json({
                success: true,
                summary: {
                    totalStocks,
                    stocksWithPrice: parseInt(stats[0].stocks_with_price),
                    stocksUpdated: updatedStocks,
                    stocksNeverUpdated: parseInt(stats[0].stocks_never_updated),
                    updatedToday: parseInt(stats[0].updated_today),
                    updatedLastHour: parseInt(stats[0].updated_last_hour),
                    coverageRate: `${coverageRate}%`,
                    mostRecentUpdate: stats[0].most_recent_update,
                    oldestUpdate: stats[0].oldest_update
                },
                recentUpdates,
                needsUpdate,
                timestamp: new Date().toISOString()
            });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Error getting update status:', error);
        return res.status(500).json({ 
            error: 'Failed to get update status',
            details: error.message 
        });
    }
}

// 手动触发更新
async function triggerUpdate(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { batchSize = 10, batches = 1, updateType = 'market' } = req.body;
        
        console.log(`🚀 Manual trigger: Processing ${batches} batches of ${batchSize} stocks each (type: ${updateType})`);
        
        const results = [];
        
        // 执行指定数量的批次
        for (let i = 0; i < batches; i++) {
            console.log(`📦 Processing batch ${i + 1}/${batches}`);
            
            try {
                // 调用统一更新 API
                const updateResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/update-apis?type=${updateType}&batchSize=${batchSize}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const batchResult = await updateResponse.json();
                results.push({
                    batch: i + 1,
                    ...batchResult
                });
                
                console.log(`✅ Batch ${i + 1} completed: ${batchResult.successCount || 0} success, ${batchResult.errorCount || 0} errors`);
                
                // 如果不是最后一个批次，等待一段时间
                if (i < batches - 1) {
                    console.log('⏳ Waiting before next batch...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (batchError) {
                console.error(`❌ Batch ${i + 1} failed:`, batchError.message);
                results.push({
                    batch: i + 1,
                    success: false,
                    error: batchError.message
                });
            }
        }
        
        // 计算总体统计
        const totalSuccess = results.reduce((sum, r) => sum + (r.successCount || 0), 0);
        const totalErrors = results.reduce((sum, r) => sum + (r.errorCount || 0), 0);
        const totalProcessed = results.reduce((sum, r) => sum + (r.totalProcessed || 0), 0);
        
        return res.json({
            success: true,
            message: `Manual update trigger completed`,
            summary: {
                totalBatches: batches,
                totalSuccess,
                totalErrors,
                totalProcessed,
                successRate: totalProcessed > 0 ? `${((totalSuccess / totalProcessed) * 100).toFixed(1)}%` : '0%'
            },
            results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error triggering update:', error);
        return res.status(500).json({ 
            error: 'Failed to trigger update',
            details: error.message 
        });
    }
}