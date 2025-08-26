const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Finnhub API 函数
async function getFinnhubMetrics(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`);
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limit exceeded');
            }
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Finnhub metrics error for ${symbol}:`, error.message);
        return null;
    }
}

async function getFinnhubQuote(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limit exceeded');
            }
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Finnhub quote error for ${symbol}:`, error.message);
        return null;
    }
}

function getMarketStatus(quoteTimestamp) {
    if (!quoteTimestamp) return 'Unknown';
    
    const now = Date.now() / 1000;
    const timeDiff = now - quoteTimestamp;
    
    // 如果数据超过24小时，认为是过时的
    if (timeDiff > 24 * 60 * 60) {
        return 'Closed';
    }
    
    // 检查是否在交易时间内（美东时间9:30-16:00，周一到周五）
    const date = new Date(quoteTimestamp * 1000);
    const utcHour = date.getUTCHours();
    const utcDay = date.getUTCDay();
    
    // 美东时间 = UTC - 4/5小时（夏令时/标准时间）
    // 简化处理：假设夏令时，美东9:30 = UTC 13:30, 美东16:00 = UTC 20:00
    const isWeekday = utcDay >= 1 && utcDay <= 5;
    const isMarketHours = utcHour >= 13 && utcHour < 21; // 大致的交易时间
    
    if (isWeekday && isMarketHours && timeDiff < 30 * 60) { // 30分钟内的数据
        return 'Open';
    } else {
        return 'Closed';
    }
}

module.exports = async function handler(req, res) {
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
    const BATCH_SIZE = 70;
    const API_DELAY = 200; // 200ms延迟
    const finnhubApiKey = process.env.FINNHUB_API_KEY;
    
    try {
        // 动态导入 Polygon API 模块
        const { getPreviousDayAggs } = await import('../../_scripts/polygon-api.js');
        
        // 获取待处理的股票
        const pendingStocks = await client.query(`
            SELECT ticker, company_name 
            FROM stocks 
            WHERE daily_data_last_updated IS NULL 
            ORDER BY ticker 
            LIMIT $1
        `, [BATCH_SIZE]);
        
        if (pendingStocks.rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No pending stocks to process',
                processed: 0,
                remaining: 0
            });
        }
        
        console.log(`🔄 Processing batch of ${pendingStocks.rows.length} stocks...`);
        
        let successCount = 0;
        let errorCount = 0;
        const results = [];
        
        for (const stock of pendingStocks.rows) {
            try {
                // 1. 获取Polygon日线数据
                const polygonData = await getPreviousDayAggs(stock.ticker);
                
                // 2. 获取Finnhub财务指标
                const financialData = await getFinnhubMetrics(stock.ticker, finnhubApiKey);
                
                // 3. 获取Finnhub实时报价
                const quoteData = await getFinnhubQuote(stock.ticker, finnhubApiKey);
                
                // 准备更新数据
                let updateData = {
                    market_cap: null,
                    roe_ttm: null,
                    pe_ttm: null,
                    dividend_yield: null,
                    market_status: 'Unknown',
                    open_price: null,
                    high_price: null,
                    low_price: null,
                    last_price: null,
                    volume: null,
                    vwap: null,
                    trade_count: null,
                    turnover: null,
                    previous_close: null
                };
                
                // 处理Polygon数据
                if (polygonData) {
                    updateData.open_price = polygonData.open_price;
                    updateData.high_price = polygonData.high_price;
                    updateData.low_price = polygonData.low_price;
                    updateData.last_price = polygonData.close_price;
                    updateData.volume = polygonData.volume;
                    updateData.vwap = polygonData.vwap;
                    updateData.trade_count = polygonData.trade_count;
                    updateData.turnover = polygonData.turnover;
                    updateData.previous_close = polygonData.close_price;
                }
                
                // 处理Finnhub财务数据
                if (financialData && financialData.metric) {
                    const metrics = financialData.metric;
                    updateData.market_cap = metrics.marketCapitalization || null;
                    updateData.roe_ttm = metrics.roeTTM || null;
                    updateData.pe_ttm = metrics.peTTM || null;
                    
                    if (metrics.dividendYieldIndicatedAnnual) {
                        updateData.dividend_yield = metrics.dividendYieldIndicatedAnnual / 100;
                    }
                }
                
                // 处理Finnhub实时报价数据
                if (quoteData && quoteData.t) {
                    updateData.market_status = getMarketStatus(quoteData.t);
                    if (!updateData.last_price && quoteData.c) {
                        updateData.last_price = quoteData.c;
                    }
                }
                
                // 更新数据库
                await client.query(`
                    UPDATE stocks SET 
                        market_cap = $1, 
                        roe_ttm = $2, 
                        pe_ttm = $3,
                        dividend_yield = $4,
                        market_status = $5,
                        open_price = $6,
                        high_price = $7,
                        low_price = $8,
                        last_price = $9,
                        volume = $10,
                        vwap = $11,
                        trade_count = $12,
                        turnover = $13,
                        previous_close = $14,
                        daily_data_last_updated = CURRENT_DATE,
                        last_updated = NOW() 
                    WHERE ticker = $15
                `, [
                    updateData.market_cap,
                    updateData.roe_ttm,
                    updateData.pe_ttm,
                    updateData.dividend_yield,
                    updateData.market_status,
                    updateData.open_price,
                    updateData.high_price,
                    updateData.low_price,
                    updateData.last_price,
                    updateData.volume,
                    updateData.vwap,
                    updateData.trade_count,
                    updateData.turnover,
                    updateData.previous_close,
                    stock.ticker
                ]);
                
                successCount++;
                
                const logData = {
                    ticker: stock.ticker,
                    vwap: polygonData?.vwap?.toFixed(2) || 'N/A',
                    volume: polygonData?.volume ? (polygonData.volume/1e6).toFixed(1) + 'M' : 'N/A',
                    trades: polygonData?.trade_count || 'N/A',
                    mc: financialData?.metric?.marketCapitalization ? '$' + (financialData.metric.marketCapitalization/1e9).toFixed(1) + 'B' : 'N/A',
                    pe: financialData?.metric?.peTTM || 'N/A'
                };
                
                results.push(logData);
                console.log(`✅ ${stock.ticker}: VWAP $${logData.vwap}, Vol ${logData.volume}, Trades ${logData.trades}`);
                
                // API限制延迟
                await new Promise(resolve => setTimeout(resolve, API_DELAY));
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing ${stock.ticker}:`, error.message);
                results.push({
                    ticker: stock.ticker,
                    error: error.message
                });
            }
        }
        
        // 获取剩余待处理数量
        const remainingResult = await client.query(`
            SELECT COUNT(*) as remaining 
            FROM stocks 
            WHERE daily_data_last_updated IS NULL
        `);
        
        const remaining = parseInt(remainingResult.rows[0].remaining);
        
        console.log(`📊 Batch completed: ${successCount} success, ${errorCount} errors, ${remaining} remaining`);
        
        res.status(200).json({
            success: true,
            message: 'Batch processing completed',
            processed: successCount,
            errors: errorCount,
            remaining: remaining,
            estimatedMinutesLeft: Math.ceil(remaining / BATCH_SIZE),
            results: results
        });
        
    } catch (error) {
        console.error('❌ ETL Batch Error:', error);
        res.status(500).json({
            success: false,
            error: 'Batch processing failed',
            details: error.message
        });
    } finally {
        client.release();
    }
}