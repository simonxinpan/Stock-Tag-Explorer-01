// /api/stocks-by-rank.js - 动态排名标签API接口
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 支持的指标映射
const METRIC_MAPPING = {
    'roe_ttm': 'roe',
    'pe_ratio': 'pe_ratio',
    'revenue_growth': 'revenue_growth',
    'market_cap': 'market_cap',
    'dividend_yield': 'dividend_yield',
    'debt_to_equity': 'debt_to_equity',
    'current_ratio': 'current_ratio',
    'gross_margin': 'gross_margin'
};

// 备用排名数据
const fallbackRankData = {
    'roe_ttm_top10': [
        { ticker: 'AAPL', name: 'Apple Inc.', roe_ttm: 0.28, market_cap: 3000000 },
        { ticker: 'MSFT', name: 'Microsoft Corporation', roe_ttm: 0.25, market_cap: 2800000 },
        { ticker: 'GOOGL', name: 'Alphabet Inc.', roe_ttm: 0.22, market_cap: 1700000 }
    ],
    'pe_ratio_low10': [
        { ticker: 'META', name: 'Meta Platforms Inc.', pe_ratio: 12.5, market_cap: 800000 },
        { ticker: 'TSLA', name: 'Tesla Inc.', pe_ratio: 15.2, market_cap: 900000 },
        { ticker: 'NFLX', name: 'Netflix Inc.', pe_ratio: 18.7, market_cap: 200000 }
    ]
};

function handler(req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    getStocksByRank(req, res);
}

async function getStocksByRank(req, res) {
    try {
        const { metric, percentile } = req.query;
        
        if (!metric || !percentile) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: metric and percentile'
            });
        }
        
        const client = await pool.connect();
        
        // 确定排序方向
        let orderDirection = 'DESC'; // 默认是"高"
        if (percentile.includes('low') || percentile.includes('bottom')) {
            orderDirection = 'ASC'; // "低"就是升序排列
        }
        
        // 验证指标是否支持
        const dbColumn = METRIC_MAPPING[metric];
        if (!dbColumn) {
            client.release();
            return res.status(400).json({
                success: false,
                error: `Unsupported metric: ${metric}. Supported metrics: ${Object.keys(METRIC_MAPPING).join(', ')}`
            });
        }
        
        // 使用窗口函数 NTILE 来计算百分位
        const query = `
            WITH RankedStocks AS (
                SELECT 
                    ticker,
                    name,
                    ${dbColumn},
                    market_cap,
                    sector_zh,
                    current_price,
                    price_change,
                    change_percent,
                    trading_volume,
                    last_updated,
                    NTILE(10) OVER (ORDER BY ${dbColumn} ${orderDirection} NULLS LAST) AS percentile_rank
                FROM stocks 
                WHERE ${dbColumn} IS NOT NULL
                    AND ${dbColumn} > 0
                    AND ticker IS NOT NULL
                    AND name IS NOT NULL
            )
            SELECT 
                ticker,
                name,
                ${dbColumn} as metric_value,
                market_cap,
                sector_zh,
                current_price,
                price_change,
                change_percent,
                trading_volume,
                last_updated
            FROM RankedStocks
            WHERE percentile_rank = 1
            ORDER BY ${dbColumn} ${orderDirection}
            LIMIT 50;
        `;
        
        const result = await client.query(query);
        client.release();
        
        const stocks = result.rows.map(stock => ({
            ticker: stock.ticker,
            symbol: stock.ticker,
            name: stock.name,
            company_name: stock.name,
            sector: stock.sector_zh,
            price: parseFloat(stock.current_price) || 0,
            current_price: parseFloat(stock.current_price) || 0,
            change: parseFloat(stock.price_change) || 0,
            price_change: parseFloat(stock.price_change) || 0,
            changePercent: parseFloat(stock.change_percent) || 0,
            change_percent: parseFloat(stock.change_percent) || 0,
            volume: parseInt(stock.trading_volume) || 0,
            trading_volume: parseInt(stock.trading_volume) || 0,
            marketCap: parseFloat(stock.market_cap) || 0,
            market_cap: parseFloat(stock.market_cap) || 0,
            metricValue: parseFloat(stock.metric_value) || 0,
            lastUpdated: stock.last_updated,
            last_updated: stock.last_updated
        }));
        
        res.status(200).json({
            success: true,
            data: {
                stocks: stocks,
                pagination: {
                    current: 1,
                    total: 1,
                    count: stocks.length,
                    limit: 50
                },
                query: {
                    metric: metric,
                    percentile: percentile,
                    dbColumn: dbColumn,
                    orderDirection: orderDirection
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Database query failed for ranking, using fallback data:', error.message);
        
        // 使用备用数据
        const fallbackKey = `${req.query.metric}_${req.query.percentile}`;
        const fallbackStocks = fallbackRankData[fallbackKey] || fallbackRankData['roe_ttm_top10'];
        
        const stocks = fallbackStocks.map(stock => ({
            symbol: stock.ticker,
            name: stock.name,
            price: 150 + Math.random() * 100,
            change: (Math.random() - 0.5) * 10,
            changePercent: (Math.random() - 0.5) * 5,
            volume: Math.floor(Math.random() * 10000000),
            marketCap: stock.market_cap || Math.floor(Math.random() * 1000000),
            sector: '科技',
            lastUpdated: new Date().toISOString()
        }));
        
        res.status(200).json({
            success: true,
            data: {
                stocks: stocks,
                pagination: {
                    total: 1,
                    count: stocks.length,
                    page: 1,
                    limit: 50
                }
            },
            fallback: true,
            message: 'Using fallback ranking data due to database connection issue',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = handler;
