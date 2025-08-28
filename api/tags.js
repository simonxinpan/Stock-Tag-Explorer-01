// /api/tags.js - 标签API接口
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 备用标签数据
const fallbackTags = {
    '股市表现': [
        {
            id: 'marketcap_大盘股',
            name: '大盘股',
            description: '市值超过2000亿美元的股票',
            stock_count: 156,
            avg_market_cap: '500B',
            top_stocks: ['AAPL', 'MSFT', 'GOOGL']
        },
        {
            id: 'marketcap_中盘股',
            name: '中盘股',
            description: '市值在100亿-2000亿美元之间的股票',
            stock_count: 89,
            avg_market_cap: '200B',
            top_stocks: ['JPM', 'BAC', 'WFC']
        },
        {
            id: 'marketcap_小盘股',
            name: '小盘股',
            description: '市值低于100亿美元的股票',
            stock_count: 67,
            avg_market_cap: '50B',
            top_stocks: ['XOM', 'CVX', 'COP']
        }
    ],
    '财务表现': [
        {
            id: 'rank_roe_ttm_top10',
            name: '高ROE',
            description: '净资产收益率(ROE)最高的前10%股票',
            stock_count: 50,
            avg_market_cap: 'N/A',
            top_stocks: ['AAPL', 'MSFT', 'GOOGL'],
            dynamic_rank: true,
            metric: 'roe_ttm',
            percentile: 'top10'
        },
        {
            id: 'rank_pe_ttm_low10',
            name: '低PE',
            description: '市盈率(PE)最低的前10%股票',
            stock_count: 50,
            avg_market_cap: 'N/A',
            top_stocks: ['META', 'TSLA', 'NFLX'],
            dynamic_rank: true,
            metric: 'pe_ttm',
            percentile: 'low10'
        }
    ],
    '行业分类': [
        {
            id: 'sector_科技',
            name: '科技',
            description: '科技类股票，包括软件、硬件、互联网等',
            stock_count: 156,
            avg_market_cap: '500B',
            top_stocks: ['AAPL', 'MSFT', 'GOOGL']
        },
        {
            id: 'sector_金融',
            name: '金融',
            description: '银行、保险、证券等金融服务类股票',
            stock_count: 89,
            avg_market_cap: '200B',
            top_stocks: ['JPM', 'BAC', 'WFC']
        },
        {
            id: 'sector_医疗健康',
            name: '医疗健康',
            description: '制药、医疗设备、生物技术等健康相关股票',
            stock_count: 124,
            avg_market_cap: '150B',
            top_stocks: ['JNJ', 'PFE', 'UNH']
        },
        {
            id: 'sector_消费品',
            name: '消费品',
            description: '日用消费品、零售、餐饮等消费相关股票',
            stock_count: 203,
            avg_market_cap: '100B',
            top_stocks: ['AMZN', 'TSLA', 'HD']
        },
        {
            id: 'sector_能源',
            name: '能源',
            description: '石油、天然气、可再生能源等能源类股票',
            stock_count: 67,
            avg_market_cap: '80B',
            top_stocks: ['XOM', 'CVX', 'COP']
        }
    ],
    '特殊名单': [
        {
            id: 'special_sp500',
            name: 'S&P 500',
            description: '标准普尔500指数成分股',
            stock_count: 500,
            avg_market_cap: '300B',
            top_stocks: ['AAPL', 'MSFT', 'GOOGL']
        }
    ],
    '趋势排名': [
        {
            id: 'rank_market_cap_top10',
            name: '市值前10%',
            description: '市值最大的前10%股票',
            stock_count: 50,
            avg_market_cap: 'N/A',
            top_stocks: ['AAPL', 'MSFT', 'GOOGL'],
            dynamic_rank: true,
            metric: 'market_cap',
            percentile: 'top10'
        }
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
    
    getTags(req, res);
}

async function getTags(req, res) {
    try {
        const client = await pool.connect();
        
        // 1. 获取静态标签
        const staticTagsQuery = `
            SELECT 
                t.id,
                t.name,
                t.description,
                t.type,
                COUNT(st.stock_ticker) as stock_count,
                COALESCE(AVG(s.market_cap), 0) as avg_market_cap,
                ARRAY_AGG(
                    CASE 
                        WHEN s.market_cap IS NOT NULL 
                        THEN st.stock_ticker 
                        ELSE NULL 
                    END
                    ORDER BY s.market_cap DESC NULLS LAST
                ) FILTER (WHERE s.market_cap IS NOT NULL) as top_stocks
            FROM tags t
            LEFT JOIN stock_tags st ON t.id = st.tag_id
            LEFT JOIN stocks s ON st.stock_ticker = s.ticker
            GROUP BY t.id, t.name, t.description, t.type
            ORDER BY stock_count DESC, t.name;
        `;
        
        // 2. 获取行业分类
        const industryTagsQuery = `
            SELECT 
                sector_zh as name,
                '行业分类' as type,
                sector_zh as description,
                COUNT(*) as stock_count,
                COALESCE(AVG(market_cap), 0) as avg_market_cap,
                ARRAY_AGG(ticker ORDER BY market_cap DESC NULLS LAST) as top_stocks
            FROM stocks 
            WHERE sector_zh IS NOT NULL AND sector_zh != ''
            GROUP BY sector_zh
            ORDER BY stock_count DESC;
        `;
        
        // 3. 获取市值分类
        const marketCapQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE market_cap >= 200000) as large_cap_count,
                COUNT(*) FILTER (WHERE market_cap >= 10000 AND market_cap < 200000) as mid_cap_count,
                COUNT(*) FILTER (WHERE market_cap < 10000 AND market_cap > 0) as small_cap_count,
                ARRAY_AGG(ticker ORDER BY market_cap DESC) FILTER (WHERE market_cap >= 200000) as large_cap_stocks,
                ARRAY_AGG(ticker ORDER BY market_cap DESC) FILTER (WHERE market_cap >= 10000 AND market_cap < 200000) as mid_cap_stocks,
                ARRAY_AGG(ticker ORDER BY market_cap DESC) FILTER (WHERE market_cap < 10000 AND market_cap > 0) as small_cap_stocks
            FROM stocks;
        `;
        
        const [staticResult, industryResult, marketCapResult] = await Promise.all([
            client.query(staticTagsQuery),
            client.query(industryTagsQuery),
            client.query(marketCapQuery)
        ]);
        
        // 处理静态标签
        const staticTags = staticResult.rows.map(tag => ({
            ...tag,
            id: String(tag.id),
            avg_market_cap: formatMarketCap(tag.avg_market_cap),
            top_stocks: (tag.top_stocks || []).slice(0, 3)
        }));
        
        // 处理行业标签
        const industryTags = industryResult.rows.map(tag => ({
            ...tag,
            id: `sector_${tag.name}`,
            avg_market_cap: formatMarketCap(tag.avg_market_cap),
            top_stocks: (tag.top_stocks || []).slice(0, 3)
        }));
        
        // 处理市值标签
        const marketCapData = marketCapResult.rows[0];
        const marketCapTags = [
            {
                id: 'marketcap_大盘股',
                name: '大盘股',
                type: '股市表现',
                description: '市值超过2000亿美元的股票',
                stock_count: parseInt(marketCapData.large_cap_count) || 0,
                avg_market_cap: 'N/A',
                top_stocks: (marketCapData.large_cap_stocks || []).slice(0, 3)
            },
            {
                id: 'marketcap_中盘股',
                name: '中盘股',
                type: '股市表现',
                description: '市值在100亿-2000亿美元之间的股票',
                stock_count: parseInt(marketCapData.mid_cap_count) || 0,
                avg_market_cap: 'N/A',
                top_stocks: (marketCapData.mid_cap_stocks || []).slice(0, 3)
            },
            {
                id: 'marketcap_小盘股',
                name: '小盘股',
                type: '股市表现',
                description: '市值低于100亿美元的股票',
                stock_count: parseInt(marketCapData.small_cap_count) || 0,
                avg_market_cap: 'N/A',
                top_stocks: (marketCapData.small_cap_stocks || []).slice(0, 3)
            }
        ];
        
        // 添加新的动态排名标签
        const financialTags = [
            {
                id: 'rank_roe_ttm_top10',
                name: '高ROE',
                type: '财务表现',
                description: '净资产收益率(ROE)最高的前10%股票',
                stock_count: 50,
                avg_market_cap: 'N/A',
                top_stocks: [],
                dynamic_rank: true,
                metric: 'roe_ttm',
                percentile: 'top10'
            },
            {
                id: 'rank_pe_ttm_low10',
                name: '低PE',
                type: '财务表现',
                description: '市盈率(PE)最低的前10%股票',
                stock_count: 50,
                avg_market_cap: 'N/A',
                top_stocks: [],
                dynamic_rank: true,
                metric: 'pe_ttm',
                percentile: 'low10'
            }
        ];
        
        const trendTags = [
            {
                id: 'rank_market_cap_top10',
                name: '市值前10%',
                type: '趋势排名',
                description: '市值最大的前10%股票',
                stock_count: 50,
                avg_market_cap: 'N/A',
                top_stocks: [],
                dynamic_rank: true,
                metric: 'market_cap',
                percentile: 'top10'
            }
        ];
        
        // 合并所有标签并按类型分组
        const allTags = [...staticTags, ...industryTags, ...marketCapTags, ...financialTags, ...trendTags];
        
        // 确保所有标签的 id 都是字符串格式
        allTags.forEach(tag => {
            tag.id = String(tag.id);
        });
        
        // 如果静态标签为空，使用fallback数据中的静态标签
        const fallbackStaticTags = {
            '股市表现': staticTags.filter(tag => tag.type === '股市表现').length > 0 ? 
                staticTags.filter(tag => tag.type === '股市表现') : 
                fallbackTags['股市表现'].filter(tag => !tag.dynamic_rank),
            '财务表现': staticTags.filter(tag => tag.type === '财务表现').length > 0 ? 
                staticTags.filter(tag => tag.type === '财务表现') : 
                [],
            '特殊名单': staticTags.filter(tag => tag.type === '特殊名单' || tag.type === 'special').length > 0 ? 
                staticTags.filter(tag => tag.type === '特殊名单' || tag.type === 'special') : 
                fallbackTags['特殊名单'],
            '趋势排名': staticTags.filter(tag => tag.type === '趋势排名').length > 0 ? 
                staticTags.filter(tag => tag.type === '趋势排名') : 
                []
        };
        
        const groupedTags = {
            '股市表现': [
                ...marketCapTags
            ],
            '财务表现': [
                ...financialTags,
                ...fallbackStaticTags['财务表现']
            ],
            '行业分类': industryTags,
            '特殊名单': fallbackStaticTags['特殊名单'],
            '趋势排名': [
                ...trendTags,
                ...fallbackStaticTags['趋势排名']
            ]
        };
        
        client.release();
        
        res.status(200).json({
            success: true,
            data: groupedTags,
            total: allTags.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Database query failed, using fallback tags:', error.message);
        
        // 使用备用数据
        res.status(200).json({
            success: true,
            data: fallbackTags,
            total: Object.values(fallbackTags).reduce((sum, tags) => sum + tags.length, 0),
            timestamp: new Date().toISOString(),
            fallback: true,
            message: 'Using fallback data due to database connection issue'
        });
    }
}

function formatMarketCap(marketCap) {
    if (!marketCap || marketCap === 0) return 'N/A';
    
    const num = parseFloat(marketCap);
    if (num >= 1e12) {
        return (num / 1e12).toFixed(1) + 'T';
    } else if (num >= 1e9) {
        return (num / 1e9).toFixed(1) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(1) + 'M';
    } else {
        return num.toFixed(0);
    }
}

module.exports = handler;