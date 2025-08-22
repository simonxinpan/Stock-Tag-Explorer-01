// /api/update-apis.js - 统一的数据更新 API 端点
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 获取单只股票数据 (Polygon)
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

// 获取 Finnhub 财务指标
async function getFinnhubMetrics(ticker, apiKey) {
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`;
    try {
        console.log(`[Finnhub] Fetching metrics for ${ticker}`);
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            console.warn(`[Finnhub] API for ${ticker} returned status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error(`[Finnhub] Fetch failed for ${ticker}:`, error.message);
        return null;
    }
}

// 获取前一日市场快照 (Polygon)
async function getPreviousDaySnapshot(apiKey) {
    let date = new Date();
    // 尝试回溯最多7天，以确保能找到最近的一个有数据的交易日
    for (let i = 0; i < 7; i++) {
        const tradeDate = date.toISOString().split('T')[0];
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${tradeDate}?adjusted=true&apiKey=${apiKey}`;
        try {
            console.log(`[Polygon] Attempting to fetch snapshot for date: ${tradeDate}`);
            const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (response.ok) {
                const data = await response.json();
                if (data && data.resultsCount > 0) {
                    console.log(`[Polygon] Successfully found snapshot for date: ${tradeDate}`);
                    const quotesMap = new Map();
                    data.results.forEach(q => quotesMap.set(q.T, q));
                    return quotesMap;
                }
            } else {
                 console.warn(`[Polygon] API for ${tradeDate} returned status: ${response.status}`);
            }
        } catch (error) { 
            console.error(`[Polygon] Fetch failed for ${tradeDate}:`, error.message); 
        }
        date.setDate(date.getDate() - 1);
    }
    throw new Error("Could not fetch any snapshot data from Polygon after 7 attempts.");
}

export default async function handler(req, res) {
    // 安全校验
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method, query } = req;
    const { type = 'market', batchSize = 10 } = query;

    try {
        switch (type) {
            case 'market':
                return await updateMarketData(req, res, batchSize);
            case 'financials':
                return await updateFinancials(req, res);
            case 'batch':
                return await updateMarketBatch(req, res, batchSize);
            default:
                return res.status(400).json({ error: 'Invalid update type' });
        }
    } catch (error) {
        console.error('❌ Update API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 市场数据更新 (高频)
async function updateMarketData(req, res, batchSize) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    if (!POLYGON_API_KEY) {
        return res.status(500).json({ error: 'Polygon API key is not configured.' });
    }

    console.log('📈 Starting market data update using Polygon.io...');
    const client = await pool.connect();

    try {
        const snapshot = await getPreviousDaySnapshot(POLYGON_API_KEY);
        const { rows: companies } = await client.query('SELECT ticker FROM stocks LIMIT $1', [batchSize]);
        
        let successCount = 0;
        let errorCount = 0;
        
        await client.query('BEGIN');
        
        for (const company of companies) {
            const ticker = company.ticker;
            const marketData = snapshot.get(ticker);
            
            if (marketData) {
                try {
                    await client.query(`
                        UPDATE stocks SET 
                            last_price = $1,
                            change_percent = CASE 
                                WHEN previous_close > 0 THEN ROUND(((($1 - previous_close) / previous_close) * 100)::numeric, 2)
                                ELSE 0
                            END,
                            volume = $2,
                            high_52w = GREATEST(COALESCE(high_52w, $3), $3),
                            low_52w = LEAST(COALESCE(low_52w, $4), $4),
                            previous_close = $1,
                            last_updated = CURRENT_TIMESTAMP
                        WHERE ticker = $5
                    `, [marketData.c, marketData.v, marketData.h, marketData.l, ticker]);
                    
                    successCount++;
                } catch (updateError) {
                    console.error(`❌ Failed to update ${ticker}:`, updateError.message);
                    errorCount++;
                }
            } else {
                errorCount++;
            }
        }
        
        await client.query('COMMIT');
        
        return res.json({
            success: true,
            message: `Market data update completed`,
            successCount,
            errorCount,
            totalProcessed: companies.length
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// 财务数据更新 (低频)
async function updateFinancials(req, res) {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    if (!FINNHUB_API_KEY) {
        return res.status(500).json({ error: 'Finnhub API key is not configured.' });
    }

    console.log('💰 Starting financial data update using Finnhub...');
    const client = await pool.connect();

    try {
        const { rows: companies } = await client.query('SELECT ticker FROM stocks');
        console.log(`📊 Found ${companies.length} stocks in database.`);

        let successCount = 0;
        await client.query('BEGIN');

        for (const company of companies) {
            const ticker = company.ticker;
            
            try {
                const financialData = await getFinnhubMetrics(ticker, FINNHUB_API_KEY);
                
                if (financialData && financialData.metric) {
                    const metrics = financialData.metric;
                    
                    await client.query(`
                        UPDATE stocks SET 
                            pe_ratio = $1,
                            market_cap = $2,
                            dividend_yield = $3,
                            roe = $4,
                            debt_to_equity = $5,
                            current_ratio = $6,
                            gross_margin = $7,
                            last_updated = CURRENT_TIMESTAMP
                        WHERE ticker = $8
                    `, [
                        metrics.peNormalizedAnnual || null,
                        metrics.marketCapitalization || null,
                        metrics.dividendYieldIndicatedAnnual || null,
                        metrics.roeTTM || null,
                        metrics.totalDebt2TotalEquityAnnual || null,
                        metrics.currentRatioAnnual || null,
                        metrics.grossMarginTTM || null,
                        ticker
                    ]);
                    
                    successCount++;
                }
                
                // API 限制延迟
                await delay(120);
                
            } catch (error) {
                console.error(`❌ Failed to update financials for ${ticker}:`, error.message);
            }
        }
        
        await client.query('COMMIT');
        
        return res.json({
            success: true,
            message: `Financial data update completed`,
            successCount,
            totalProcessed: companies.length
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// 批量市场数据更新
async function updateMarketBatch(req, res, batchSize) {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    if (!POLYGON_API_KEY) {
        return res.status(500).json({ error: 'Polygon API key is not configured.' });
    }

    console.log(`📦 Starting batch market update (batch size: ${batchSize})`);
    const client = await pool.connect();

    try {
        // 获取需要更新的股票（按最后更新时间排序）
        const { rows: companies } = await client.query(`
            SELECT ticker FROM stocks 
            ORDER BY 
                CASE WHEN last_updated IS NULL THEN 0 ELSE 1 END,
                last_updated ASC 
            LIMIT $1
        `, [batchSize]);
        
        let successCount = 0;
        let errorCount = 0;
        const results = [];
        
        await client.query('BEGIN');
        
        for (const company of companies) {
            const ticker = company.ticker;
            
            try {
                const marketData = await getSingleTickerData(ticker, POLYGON_API_KEY);
                
                if (marketData) {
                    await client.query(`
                        UPDATE stocks SET 
                            last_price = $1,
                            change_percent = CASE 
                                WHEN previous_close > 0 THEN ROUND(((($1 - previous_close) / previous_close) * 100)::numeric, 2)
                                ELSE 0
                            END,
                            volume = $2,
                            high_52w = GREATEST(COALESCE(high_52w, $3), $3),
                            low_52w = LEAST(COALESCE(low_52w, $4), $4),
                            previous_close = $1,
                            last_updated = CURRENT_TIMESTAMP
                        WHERE ticker = $5
                    `, [marketData.c, marketData.v, marketData.h, marketData.l, ticker]);
                    
                    results.push({ ticker, status: 'success', price: marketData.c });
                    successCount++;
                } else {
                    results.push({ ticker, status: 'no_data' });
                    errorCount++;
                }
                
                // API 限制延迟
                await delay(200);
                
            } catch (error) {
                console.error(`❌ Failed to update ${ticker}:`, error.message);
                results.push({ ticker, status: 'error', error: error.message });
                errorCount++;
            }
        }
        
        await client.query('COMMIT');
        
        return res.json({
            success: true,
            message: `Batch update completed`,
            successCount,
            errorCount,
            totalProcessed: companies.length,
            results
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}