// 手动触发市场数据更新的 API 路由
// 可以用于测试或紧急更新

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { batchSize = 10, batches = 1 } = req.body;
        
        console.log(`🚀 Manual trigger: Processing ${batches} batches of ${batchSize} stocks each`);
        
        const results = [];
        
        // 执行指定数量的批次
        for (let i = 0; i < batches; i++) {
            console.log(`📦 Processing batch ${i + 1}/${batches}`);
            
            try {
                // 调用批处理 API
                const batchResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/update-market-batch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': process.env.CRON_SECRET || ''
                    },
                    body: JSON.stringify({ 
                        batchSize,
                        cronSecret: process.env.CRON_SECRET 
                    })
                });
                
                const batchResult = await batchResponse.json();
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
        const totalProcessed = results.reduce((sum, r) => sum + (r.processed || 0), 0);
        
        res.status(200).json({
            success: true,
            message: `Manual update completed: ${batches} batches processed`,
            summary: {
                totalBatches: batches,
                totalProcessed,
                totalSuccess,
                totalErrors
            },
            results
        });
        
    } catch (error) {
        console.error('❌ Manual trigger failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}