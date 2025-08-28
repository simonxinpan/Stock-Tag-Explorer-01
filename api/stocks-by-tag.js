/**
 * 标签股票API - 根据标签返回股票列表
 * 路径: /api/stocks-by-tag
 */

const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 备用模拟数据
const getMockStocksByTag = (tagName) => {
    const mockData = {
        '大盘股': [
            {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                price: 175.43,
                change: 2.15,
                change_percent: 1.24,
                volume: 45678900,
                market_cap: 2800000000000,
                pe_ttm: 28.5,
                roe_ttm: 0.26,
                sector: '科技'
            },
            {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                price: 378.85,
                change: -1.23,
                change_percent: -0.32,
                volume: 23456789,
                market_cap: 2900000000000,
                pe_ttm: 32.1,
                roe_ttm: 0.31,
                sector: '科技'
            },
            {
                symbol: 'GOOGL',
                name: 'Alphabet Inc.',
                price: 142.56,
                change: 1.87,
                change_percent: 1.33,
                volume: 28901234,
                market_cap: 1800000000000,
                pe_ttm: 25.8,
                roe_ttm: 0.28,
                sector: '科技'
            },
            {
                symbol: 'AMZN',
                name: 'Amazon.com Inc.',
                price: 155.89,
                change: -2.45,
                change_percent: -1.55,
                volume: 34567890,
                market_cap: 1600000000000,
                pe_ttm: 45.2,
                roe_ttm: 0.15,
                sector: '消费'
            },
            {
                symbol: 'TSLA',
                name: 'Tesla Inc.',
                price: 248.42,
                change: 12.34,
                change_percent: 5.23,
                volume: 78901234,
                market_cap: 800000000000,
                pe_ttm: 65.4,
                roe_ttm: 0.19,
                sector: '汽车'
            }
        ],
        '大型科技股': [
            {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                price: 175.43,
                change: 2.15,
                change_percent: 1.24,
                volume: 45678900,
                market_cap: 2800000000000,
                pe_ttm: 28.5,
                roe_ttm: 0.26,
                sector: '科技'
            },
            {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                price: 378.85,
                change: -1.23,
                change_percent: -0.32,
                volume: 23456789,
                market_cap: 2900000000000,
                pe_ttm: 32.1,
                roe_ttm: 0.31,
                sector: '科技'
            }
        ],
        '人工智能': [
            {
                symbol: 'NVDA',
                name: 'NVIDIA Corporation',
                price: 875.28,
                change: 15.67,
                change_percent: 1.82,
                volume: 45678901,
                market_cap: 2200000000000,
                pe_ttm: 71.2,
                roe_ttm: 0.35,
                sector: '科技'
            }
        ],
        '电动汽车': [
            {
                symbol: 'TSLA',
                name: 'Tesla Inc.',
                price: 248.42,
                change: 12.34,
                change_percent: 5.23,
                volume: 78901234,
                market_cap: 800000000000,
                pe_ttm: 65.4,
                roe_ttm: 0.19,
                sector: '汽车'
            }
        ],
        '高ROE': [
            {
                symbol: 'NVDA',
                name: 'NVIDIA Corporation',
                price: 875.28,
                change: 15.67,
                change_percent: 1.82,
                volume: 45678901,
                market_cap: 2200000000000,
                pe_ttm: 71.2,
                roe_ttm: 0.45,
                sector: '科技'
            },
            {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                price: 378.85,
                change: -1.23,
                change_percent: -0.32,
                volume: 23456789,
                market_cap: 2900000000000,
                pe_ttm: 32.1,
                roe_ttm: 0.38,
                sector: '科技'
            },
            {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                price: 175.43,
                change: 2.15,
                change_percent: 1.24,
                volume: 45678900,
                market_cap: 2800000000000,
                pe_ttm: 28.5,
                roe_ttm: 0.35,
                sector: '科技'
            }
        ],
        '低PE': [
            {
                symbol: 'BRK.A',
                name: 'Berkshire Hathaway Inc.',
                price: 545000.00,
                change: 2500.00,
                change_percent: 0.46,
                volume: 12345,
                market_cap: 780000000000,
                pe_ttm: 8.5,
                roe_ttm: 0.12,
                sector: '金融'
            },
            {
                symbol: 'JPM',
                name: 'JPMorgan Chase & Co.',
                price: 165.43,
                change: 1.25,
                change_percent: 0.76,
                volume: 12345678,
                market_cap: 485000000000,
                pe_ttm: 12.3,
                roe_ttm: 0.15,
                sector: '金融'
            },
            {
                symbol: 'XOM',
                name: 'Exxon Mobil Corporation',
                price: 108.75,
                change: -0.85,
                change_percent: -0.78,
                volume: 18765432,
                market_cap: 450000000000,
                pe_ttm: 14.2,
                roe_ttm: 0.18,
                sector: '能源'
            }
        ]
    };
    
    return mockData[tagName] || [];
};

// 获取相关标签
const getRelatedTags = async (currentTag) => {
    try {
        const query = `
            SELECT 
                t.tag_name,
                COUNT(DISTINCT st.symbol) as stock_count
            FROM tags t
            JOIN stock_tags st ON t.id = st.tag_id
            WHERE t.tag_name != $1
            AND st.symbol IN (
                SELECT DISTINCT st2.symbol 
                FROM stock_tags st2 
                JOIN tags t2 ON st2.tag_id = t2.id 
                WHERE t2.tag_name = $1
            )
            GROUP BY t.tag_name
            ORDER BY stock_count DESC, t.tag_name
            LIMIT 20
        `;
        
        const result = await pool.query(query, [currentTag]);
        return result.rows.map(row => ({
            name: row.tag_name,
            count: parseInt(row.stock_count)
        }));
    } catch (error) {
        console.error('获取相关标签失败:', error);
        // 返回模拟相关标签
        return [
            { name: '大型科技股', count: 25 },
            { name: '人工智能', count: 18 },
            { name: '云计算', count: 15 },
            { name: '电动汽车', count: 12 },
            { name: '半导体', count: 20 },
            { name: '消费电子', count: 14 },
            { name: '软件服务', count: 22 },
            { name: '互联网', count: 16 }
        ].filter(tag => tag.name !== currentTag);
    }
};

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tag, tagId, page = 1, limit = 100, sort = 'market_cap' } = req.query;

    // 优先使用tagId，如果没有则使用tag（兼容旧格式）
    const currentTag = tagId || tag;
    
    if (!currentTag) {
        return res.status(400).json({ error: 'Tag or tagId parameter is required' });
    }

    try {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        console.log(`标签股票查询: ${currentTag}, 页码: ${pageNum}, 限制: ${limitNum}`);

        let stocks = [];
        let totalCount = 0;
        let relatedTags = [];

        try {
            let stockQuery, countQuery, queryParams;
            
            // 根据标签类型构建不同的查询
            if (currentTag === '大盘股' || currentTag === 'marketcap_大盘股') {
                stockQuery = `
                    SELECT 
                        s.symbol,
                        s.name,
                        s.price,
                        s.change_amount as change,
                        s.change_percent,
                        s.volume,
                        s.market_cap,
                        s.pe_ratio as pe_ttm,
                        s.roe,
                        s.sector,
                        s.updated_at
                    FROM stocks s
                    WHERE s.market_cap >= 200000000000
                    ORDER BY 
                        CASE WHEN $1 = 'market_cap' THEN s.market_cap END DESC,
                        CASE WHEN $1 = 'change_percent' THEN s.change_percent END DESC,
                        CASE WHEN $1 = 'volume' THEN s.volume END DESC,
                        s.market_cap DESC
                    LIMIT $2 OFFSET $3
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks s
                    WHERE s.market_cap >= 200000000000
                `;
                queryParams = [sort, limitNum, offset];
            } else if (currentTag === '中盘股' || currentTag === 'marketcap_中盘股') {
                stockQuery = `
                    SELECT 
                        s.symbol,
                        s.name,
                        s.price,
                        s.change_amount as change,
                        s.change_percent,
                        s.volume,
                        s.market_cap,
                        s.pe_ratio as pe_ttm,
                        s.roe,
                        s.sector,
                        s.updated_at
                    FROM stocks s
                    WHERE s.market_cap >= 10000000000 AND s.market_cap < 200000000000
                    ORDER BY 
                        CASE WHEN $1 = 'market_cap' THEN s.market_cap END DESC,
                        CASE WHEN $1 = 'change_percent' THEN s.change_percent END DESC,
                        CASE WHEN $1 = 'volume' THEN s.volume END DESC,
                        s.market_cap DESC
                    LIMIT $2 OFFSET $3
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks s
                    WHERE s.market_cap >= 10000000000 AND s.market_cap < 200000000000
                `;
                queryParams = [sort, limitNum, offset];
            } else if (currentTag === '小盘股' || currentTag === 'marketcap_小盘股') {
                stockQuery = `
                    SELECT 
                        s.symbol,
                        s.name,
                        s.price,
                        s.change_amount as change,
                        s.change_percent,
                        s.volume,
                        s.market_cap,
                        s.pe_ratio as pe_ttm,
                        s.roe,
                        s.sector,
                        s.updated_at
                    FROM stocks s
                    WHERE s.market_cap < 10000000000 AND s.market_cap > 0
                    ORDER BY 
                        CASE WHEN $1 = 'market_cap' THEN s.market_cap END DESC,
                        CASE WHEN $1 = 'change_percent' THEN s.change_percent END DESC,
                        CASE WHEN $1 = 'volume' THEN s.volume END DESC,
                        s.market_cap DESC
                    LIMIT $2 OFFSET $3
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks s
                    WHERE s.market_cap < 10000000000 AND s.market_cap > 0
                `;
                queryParams = [sort, limitNum, offset];
            } else if (currentTag === '高ROE' || currentTag === 'rank_roe_top10') {
                stockQuery = `
                    SELECT 
                        s.symbol,
                        s.name,
                        s.price,
                        s.change_amount as change,
                        s.change_percent,
                        s.volume,
                        s.market_cap,
                        s.pe_ratio as pe_ttm,
                        s.roe_ttm,
                        s.sector,
                        s.updated_at
                    FROM stocks s
                    WHERE s.roe_ttm IS NOT NULL AND s.roe_ttm > 0
                    ORDER BY s.roe_ttm DESC
                    LIMIT $1 OFFSET $2
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks s
                    WHERE s.roe_ttm IS NOT NULL AND s.roe_ttm > 0
                `;
                queryParams = [limitNum, offset];
            } else if (currentTag === '低PE' || currentTag === 'rank_pe_low') {
                stockQuery = `
                    SELECT 
                        s.symbol,
                        s.name,
                        s.price,
                        s.change_amount as change,
                        s.change_percent,
                        s.volume,
                        s.market_cap,
                        s.pe_ttm,
                        s.roe_ttm,
                        s.sector,
                        s.updated_at
                    FROM stocks s
                    WHERE s.pe_ttm IS NOT NULL AND s.pe_ttm > 0
                    ORDER BY s.pe_ttm ASC
                    LIMIT $1 OFFSET $2
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks s
                    WHERE s.pe_ttm IS NOT NULL AND s.pe_ttm > 0
                `;
                queryParams = [limitNum, offset];
            } else {
                // 默认：通过标签表查询
                stockQuery = `
                    SELECT DISTINCT
                        s.symbol,
                        s.name,
                        s.price,
                        s.change_amount as change,
                        s.change_percent,
                        s.volume,
                        s.market_cap,
                        s.pe_ratio as pe_ttm,
                        s.roe,
                        s.sector,
                        s.updated_at
                    FROM stocks s
                    JOIN stock_tags st ON s.symbol = st.symbol
                    JOIN tags t ON st.tag_id = t.id
                    WHERE t.tag_name = $1
                    ORDER BY 
                        CASE WHEN $2 = 'market_cap' THEN s.market_cap END DESC,
                        CASE WHEN $2 = 'change_percent' THEN s.change_percent END DESC,
                        CASE WHEN $2 = 'volume' THEN s.volume END DESC,
                        s.market_cap DESC
                    LIMIT $3 OFFSET $4
                `;
                countQuery = `
                    SELECT COUNT(DISTINCT s.symbol) as total
                    FROM stocks s
                    JOIN stock_tags st ON s.symbol = st.symbol
                    JOIN tags t ON st.tag_id = t.id
                    WHERE t.tag_name = $1
                `;
                queryParams = [currentTag, sort, limitNum, offset];
            }

            let stockResult, countResult;
            
            if (currentTag === '大盘股' || currentTag === 'marketcap_大盘股' || 
                currentTag === '中盘股' || currentTag === 'marketcap_中盘股' || 
                currentTag === '小盘股' || currentTag === 'marketcap_小盘股' || 
                currentTag === '高ROE' || currentTag === 'rank_roe_top10' || 
                currentTag === '低PE' || currentTag === 'rank_pe_low') {
                [stockResult, countResult] = await Promise.all([
                    pool.query(stockQuery, queryParams),
                    pool.query(countQuery)
                ]);
            } else {
                [stockResult, countResult] = await Promise.all([
                    pool.query(stockQuery, queryParams),
                    pool.query(countQuery, [currentTag])
                ]);
            }

            stocks = stockResult.rows;
            totalCount = parseInt(countResult.rows[0]?.total || 0);

            // 获取相关标签
            relatedTags = await getRelatedTags(currentTag);

            console.log(`数据库查询成功: 找到 ${stocks.length} 只股票，总计 ${totalCount} 只`);

        } catch (dbError) {
            console.error('数据库查询失败，使用模拟数据:', dbError);
            
            // 使用备用模拟数据
            const mockData = getMockStocksByTag(currentTag);
            
            // 应用排序
            let sortedMockData = [...mockData];
            if (sort === 'market_cap') {
                sortedMockData.sort((a, b) => b.market_cap - a.market_cap);
            } else if (sort === 'price') {
                sortedMockData.sort((a, b) => b.price - a.price);
            } else if (sort === 'change_percent') {
                sortedMockData.sort((a, b) => b.change_percent - a.change_percent);
            }
            
            stocks = sortedMockData.slice(offset, offset + limitNum);
            totalCount = sortedMockData.length;
            
            // 模拟相关标签
            relatedTags = [
                { name: '大型科技股', count: 25 },
                { name: '人工智能', count: 18 },
                { name: '云计算', count: 15 },
                { name: '电动汽车', count: 12 },
                { name: '半导体', count: 20 }
            ].filter(t => t.name !== currentTag);
        }

        // 格式化股票数据
        const formattedStocks = stocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            price: parseFloat(stock.price || 0),
            change: parseFloat(stock.change || 0),
            changePercent: parseFloat(stock.change_percent || 0),
            volume: parseInt(stock.volume || 0),
            marketCap: parseInt(stock.market_cap || 0),
            marketCapFormatted: formatMarketCap(stock.market_cap),
            sector: stock.sector || '',
            pe: parseFloat(stock.pe_ttm || 0),
            roe: parseFloat(stock.roe || 0)
        }));

        // 计算统计信息 - 需要基于所有符合条件的股票，而不是当前页
        let allStocksForStats = [];
        
        try {
            // 查询所有符合条件的股票用于统计计算
            let allStocksQuery;
            let allStocksParams;
            
            if (currentTag === '大盘股' || currentTag === 'marketcap_大盘股') {
                allStocksQuery = `
                    SELECT s.change_amount as change, s.change_percent, s.pe_ratio as pe_ttm, s.roe
                    FROM stocks s
                    WHERE s.market_cap >= 200000000000 AND s.market_cap > 0
                `;
                allStocksParams = [];
            } else if (currentTag === '中盘股' || currentTag === 'marketcap_中盘股') {
                allStocksQuery = `
                    SELECT s.change_amount as change, s.change_percent, s.pe_ratio as pe_ttm, s.roe
                    FROM stocks s
                    WHERE s.market_cap >= 10000000000 AND s.market_cap < 200000000000 AND s.market_cap > 0
                `;
                allStocksParams = [];
            } else if (currentTag === '小盘股' || currentTag === 'marketcap_小盘股') {
                allStocksQuery = `
                    SELECT s.change_amount as change, s.change_percent, s.pe_ratio as pe_ttm, s.roe
                    FROM stocks s
                    WHERE s.market_cap < 10000000000 AND s.market_cap > 0
                `;
                allStocksParams = [];
            } else if (currentTag === '高ROE' || currentTag === 'rank_roe_top10') {
                allStocksQuery = `
                    SELECT s.change_amount as change, s.change_percent, s.pe_ratio as pe_ttm, s.roe_ttm as roe
                    FROM stocks s
                    WHERE s.roe_ttm IS NOT NULL AND s.roe_ttm > 0
                `;
                allStocksParams = [];
            } else if (currentTag === '低PE' || currentTag === 'rank_pe_low') {
                allStocksQuery = `
                    SELECT s.change_amount as change, s.change_percent, s.pe_ttm, s.roe_ttm as roe
                    FROM stocks s
                    WHERE s.pe_ttm IS NOT NULL AND s.pe_ttm > 0
                `;
                allStocksParams = [];
            } else {
                allStocksQuery = `
                    SELECT DISTINCT s.change_amount as change, s.change_percent, s.pe_ratio as pe_ttm, s.roe
                    FROM stocks s
                    JOIN stock_tags st ON s.symbol = st.symbol
                    JOIN tags t ON st.tag_id = t.id
                    WHERE t.tag_name = $1
                `;
                allStocksParams = [currentTag];
            }
            
            const allStocksResult = await pool.query(allStocksQuery, allStocksParams);
            allStocksForStats = allStocksResult.rows;
            
        } catch (statsError) {
            console.error('统计查询失败，使用当前页数据:', statsError);
            // 如果统计查询失败，使用当前页数据作为备选
            allStocksForStats = formattedStocks.map(s => ({
                change: s.change,
                change_percent: s.changePercent,
                pe_ttm: s.pe,
                roe: s.roe
            }));
        }
        
        const stats = {
            total: totalCount,
            upCount: allStocksForStats.filter(s => parseFloat(s.change || 0) > 0).length,
            downCount: allStocksForStats.filter(s => parseFloat(s.change || 0) < 0).length,
            flatCount: allStocksForStats.filter(s => parseFloat(s.change || 0) === 0).length,
            avgChange: allStocksForStats.length > 0 
                ? allStocksForStats.reduce((sum, s) => sum + parseFloat(s.change_percent || 0), 0) / allStocksForStats.length 
                : 0,
            avgPE: allStocksForStats.length > 0
                ? allStocksForStats.filter(s => parseFloat(s.pe_ttm || 0) > 0).reduce((sum, s) => sum + parseFloat(s.pe_ttm || 0), 0) / allStocksForStats.filter(s => parseFloat(s.pe_ttm || 0) > 0).length
                : 0,
            avgROE: allStocksForStats.length > 0
                ? allStocksForStats.filter(s => parseFloat(s.roe || 0) > 0).reduce((sum, s) => sum + parseFloat(s.roe || 0), 0) / allStocksForStats.filter(s => parseFloat(s.roe || 0) > 0).length
                : 0
        };

        // 分页信息
        const pagination = {
            currentPage: pageNum,
            totalPages: Math.ceil(totalCount / limitNum),
            pageSize: limitNum,
            hasNext: pageNum < Math.ceil(totalCount / limitNum),
            hasPrev: pageNum > 1
        };

        console.log(`标签查询「${tag}」完成，返回 ${formattedStocks.length} 只股票，总计 ${totalCount} 只`);

        return res.status(200).json({
            success: true,
            data: {
                tag: tag,
                stocks: formattedStocks,
                stats,
                pagination,
                relatedTags,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('API处理失败:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

// 格式化市值显示
function formatMarketCap(marketCap) {
    if (!marketCap) return '未知';
    
    const cap = parseFloat(marketCap);
    if (cap >= 1000000000000) {
        return `${(cap / 1000000000000).toFixed(1)}万亿`;
    } else if (cap >= 100000000) {
        return `${(cap / 100000000).toFixed(0)}亿`;
    } else if (cap >= 100000000) {
        return `${(cap / 100000000).toFixed(1)}亿`;
    } else {
        return `${(cap / 100000000).toFixed(2)}亿`;
    }
}

// 优雅关闭数据库连接
process.on('SIGINT', async () => {
    console.log('正在关闭数据库连接...');
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('正在关闭数据库连接...');
    await pool.end();
    process.exit(0);
});