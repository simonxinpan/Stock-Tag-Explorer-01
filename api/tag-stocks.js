/**
 * 标签股票API - 根据标签返回股票列表
 * 路径: /api/tag-stocks
 */

const { Pool } = require('pg');

// 根据市场类型获取数据库连接字符串
function getDatabaseUrl(market) {
    switch (market) {
        case 'chinese_stocks':
            return process.env.CHINESE_STOCKS_DATABASE_URL;
        case 'sp500':
        default:
            return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    }
}

// 创建数据库连接池
function createPool(market) {
    return new Pool({
        connectionString: getDatabaseUrl(market),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
}

// 备用模拟数据
const getMockStocksByTag = (tagName) => {
    const mockData = {
        '大型科技股': [
            {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                price: 175.43,
                change: 2.15,
                change_percent: 1.24,
                volume: 45678900,
                market_cap: 2800000000000,
                tags: ['大型科技股', '消费电子', '创新科技']
            },
            {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                price: 378.85,
                change: -1.23,
                change_percent: -0.32,
                volume: 23456789,
                market_cap: 2900000000000,
                tags: ['大型科技股', '云计算', '软件服务']
            },
            {
                symbol: 'GOOGL',
                name: 'Alphabet Inc.',
                price: 142.56,
                change: 0.89,
                change_percent: 0.63,
                volume: 34567890,
                market_cap: 1800000000000,
                tags: ['大型科技股', '互联网', '人工智能']
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
                tags: ['人工智能', '半导体', '游戏技术']
            },
            {
                symbol: 'GOOGL',
                name: 'Alphabet Inc.',
                price: 142.56,
                change: 0.89,
                change_percent: 0.63,
                volume: 34567890,
                market_cap: 1800000000000,
                tags: ['大型科技股', '互联网', '人工智能']
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
                tags: ['电动汽车', '清洁能源', '创新科技']
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

// 主处理函数
module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        res.status(405).json({ 
            success: false, 
            error: 'Method not allowed',
            message: '只支持GET请求'
        });
        return;
    }
    
    try {
        const { tag, page = 1, limit = 20, sort = 'change-desc', market = 'sp500' } = req.query;
        
        if (!tag) {
            res.status(400).json({
                success: false,
                error: 'Missing tag parameter',
                message: '缺少标签参数'
            });
            return;
        }
        
        const tagName = decodeURIComponent(tag);
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        
        // 根据市场类型创建对应的数据库连接池
        const pool = createPool(market);
        
        console.log(`获取标签「${tagName}」的股票列表，页码: ${pageNum}, 限制: ${limitNum}`);
        
        let stockData = [];
        let totalCount = 0;
        let relatedTags = [];
        let useFallback = false;
        
        try {
            // 构建排序子句
            let orderClause = 'ORDER BY s.symbol ASC';
            switch (sort) {
                case 'name-desc':
                    orderClause = 'ORDER BY s.symbol DESC';
                    break;
                case 'price-asc':
                    orderClause = 'ORDER BY s.current_price ASC';
                    break;
                case 'price-desc':
                    orderClause = 'ORDER BY s.current_price DESC';
                    break;
                case 'change-asc':
                    orderClause = 'ORDER BY s.change_percent ASC';
                    break;
                case 'change-desc':
                    orderClause = 'ORDER BY s.change_percent DESC';
                    break;
                case 'volume-asc':
                    orderClause = 'ORDER BY s.volume ASC';
                    break;
                case 'volume-desc':
                    orderClause = 'ORDER BY s.volume DESC';
                    break;
            }
            
            // 查询股票数据
            const stockQuery = `
                SELECT DISTINCT
                    s.symbol,
                    s.name,
                    s.current_price,
                    s.change_amount,
                    s.change_percent,
                    s.volume,
                    s.market_cap,
                    s.sector,
                    s.industry,
                    s.last_updated
                FROM stocks s
                JOIN stock_tags st ON s.symbol = st.symbol
                JOIN tags t ON st.tag_id = t.id
                WHERE t.tag_name = $1
                AND s.current_price IS NOT NULL
                ${orderClause}
                LIMIT $2 OFFSET $3
            `;
            
            // 查询总数
            const countQuery = `
                SELECT COUNT(DISTINCT s.symbol) as total
                FROM stocks s
                JOIN stock_tags st ON s.symbol = st.symbol
                JOIN tags t ON st.tag_id = t.id
                WHERE t.tag_name = $1
                AND s.current_price IS NOT NULL
            `;
            
            const [stockResult, countResult] = await Promise.all([
                pool.query(stockQuery, [tagName, limitNum, offset]),
                pool.query(countQuery, [tagName])
            ]);
            
            stockData = stockResult.rows;
            totalCount = parseInt(countResult.rows[0]?.total || 0);
            
            // 获取相关标签
            relatedTags = await getRelatedTags(tagName);
            
            console.log(`从数据库获取到 ${stockData.length} 只股票，总计 ${totalCount} 只`);
            
        } catch (dbError) {
            console.error('数据库查询失败，使用备用数据:', dbError);
            useFallback = true;
            
            // 使用模拟数据
            const mockStocks = getMockStocksByTag(tagName);
            totalCount = mockStocks.length;
            stockData = mockStocks.slice(offset, offset + limitNum);
            relatedTags = await getRelatedTags(tagName);
        }
        
        // 格式化股票数据
        const formattedStocks = stockData.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            price: parseFloat(stock.current_price || stock.price || 0),
            change: parseFloat(stock.change_amount || stock.change || 0),
            changePercent: parseFloat(stock.change_percent || stock.change_percent || 0),
            volume: parseInt(stock.volume || 0),
            marketCap: parseInt(stock.market_cap || 0),
            sector: stock.sector || '',
            industry: stock.industry || '',
            lastUpdated: stock.last_updated || new Date().toISOString(),
            tags: stock.tags || []
        }));
        
        // 计算统计信息
        const stats = {
            total: totalCount,
            upCount: formattedStocks.filter(s => s.change > 0).length,
            downCount: formattedStocks.filter(s => s.change < 0).length,
            flatCount: formattedStocks.filter(s => s.change === 0).length,
            avgChange: formattedStocks.length > 0 
                ? formattedStocks.reduce((sum, s) => sum + s.changePercent, 0) / formattedStocks.length 
                : 0
        };
        
        const response = {
            success: true,
            data: {
                tag: tagName,
                stocks: formattedStocks,
                relatedTags: relatedTags,
                stats: stats,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limitNum)
                }
            },
            fallback: useFallback,
            message: useFallback ? '使用备用数据' : '数据获取成功',
            timestamp: new Date().toISOString()
        };
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('API处理失败:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: '服务器内部错误',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

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
