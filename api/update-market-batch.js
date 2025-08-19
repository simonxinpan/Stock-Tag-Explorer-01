import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 获取单只股票数据
async function getSingleTickerData(ticker, apiKey) {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                ticker,
                c: result.c,  // 收盘价
                o: result.o,  // 开盘价
                h: result.h,  // 最高价
                l: result.l,  // 最低价
                v: result.v   // 成交量
            };
        } else {
            console.warn(`⚠️ No data available for ${ticker}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error fetching ${ticker}:`, error.message);
        return null;
    }
}

export default async function handler(req, res) {
    // 只允许 POST 请求和 Cron Job
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 验证 Cron Job 密钥（可选的安全措施）
    const cronSecret = req.headers['x-cron-secret'] || req.body.cronSecret;
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const startTime = Date.now();
    console.log('🚀 Starting market data batch update...');

    try {
        const { POLYGON_API_KEY } = process.env;
        
        if (!POLYGON_API_KEY) {
            throw new Error('POLYGON_API_KEY not configured');
        }

        // 获取批次大小（默认10只股票）
        const batchSize = parseInt(req.body.batchSize) || 10;
        
        // 连接数据库
        const client = await pool.connect();
        
        try {
            // 获取最需要更新的股票（按 last_updated 排序，NULL 值优先）
            const { rows: stocks } = await client.query(`
                SELECT ticker 
                FROM stocks 
                ORDER BY 
                    CASE WHEN last_updated IS NULL THEN 0 ELSE 1 END,
                    last_updated ASC 
                LIMIT $1
            `, [batchSize]);

            if (stocks.length === 0) {
                await client.release();
                return res.status(200).json({
                    success: true,
                    message: 'No stocks to update',
                    processed: 0,
                    duration: Date.now() - startTime
                });
            }

            console.log(`📋 Processing ${stocks.length} stocks: ${stocks.map(s => s.ticker).join(', ')}`);

            let successCount = 0;
            let errorCount = 0;
            const results = [];

            // 开始事务
            await client.query('BEGIN');

            try {
                // 逐一处理每只股票
                for (const stock of stocks) {
                    try {
                        // 获取市场数据
                        const marketData = await getSingleTickerData(stock.ticker, POLYGON_API_KEY);
                        
                        if (marketData && marketData.c > 0) {
                            // 计算涨跌幅和涨跌额
                            const changePercent = marketData.o > 0 ? 
                                ((marketData.c - marketData.o) / marketData.o) * 100 : 0;
                            const changeAmount = marketData.o > 0 ? 
                                (marketData.c - marketData.o) : 0;

                            // 更新数据库
                            const updateResult = await client.query(`
                                UPDATE stocks SET 
                                    last_price = $1, 
                                    change_amount = $2,
                                    change_percent = $3, 
                                    week_52_high = GREATEST(COALESCE(week_52_high, 0), $4),
                                    week_52_low = CASE 
                                        WHEN week_52_low IS NULL OR week_52_low = 0 THEN $5
                                        ELSE LEAST(week_52_low, $5)
                                    END,
                                    last_updated = NOW() 
                                WHERE ticker = $6
                            `, [marketData.c, changeAmount, changePercent, marketData.h, marketData.l, stock.ticker]);

                            if (updateResult.rowCount > 0) {
                                successCount++;
                                results.push({
                                    ticker: stock.ticker,
                                    status: 'success',
                                    price: marketData.c,
                                    change: changeAmount,
                                    changePercent: changePercent
                                });
                                console.log(`✅ ${stock.ticker}: $${marketData.c} (${changePercent.toFixed(2)}%)`);
                            } else {
                                errorCount++;
                                results.push({
                                    ticker: stock.ticker,
                                    status: 'error',
                                    error: 'No rows updated'
                                });
                                console.warn(`⚠️ ${stock.ticker}: No rows updated`);
                            }
                        } else {
                            errorCount++;
                            results.push({
                                ticker: stock.ticker,
                                status: 'error',
                                error: 'No market data available'
                            });
                            console.warn(`⚠️ ${stock.ticker}: No market data available`);
                        }

                        // 添加延迟以遵守 API 速率限制（除了最后一个）
                        if (stock !== stocks[stocks.length - 1]) {
                            console.log('⏳ Waiting 12s to respect rate limits...');
                            await delay(12000);
                        }

                    } catch (stockError) {
                        errorCount++;
                        results.push({
                            ticker: stock.ticker,
                            status: 'error',
                            error: stockError.message
                        });
                        console.error(`❌ Error processing ${stock.ticker}:`, stockError.message);
                    }
                }

                // 提交事务
                await client.query('COMMIT');
                console.log(`✅ Batch completed: ${successCount} success, ${errorCount} errors`);

            } catch (batchError) {
                // 回滚事务
                await client.query('ROLLBACK');
                throw batchError;
            }

            // 返回成功响应
            res.status(200).json({
                success: true,
                message: `Processed ${stocks.length} stocks`,
                processed: stocks.length,
                successCount,
                errorCount,
                duration: Date.now() - startTime,
                results: results
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Batch update failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            duration: Date.now() - startTime
        });
    } finally {
        // 确保连接池正确关闭
        if (pool) {
            // 注意：在 Serverless 环境中，不要关闭连接池
            // await pool.end();
        }
    }
}