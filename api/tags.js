// /api/tags.js - 标签API接口
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 备用标签数据
const fallbackTags = [
    {
        id: 1,
        name: "科技股",
        description: "科技类股票，包括软件、硬件、互联网等",
        color: "#3B82F6",
        stock_count: 156,
        avg_market_cap: "500B",
        top_stocks: ["AAPL", "MSFT", "GOOGL"]
    },
    {
        id: 2,
        name: "金融股",
        description: "银行、保险、证券等金融服务类股票",
        color: "#10B981",
        stock_count: 89,
        avg_market_cap: "200B",
        top_stocks: ["JPM", "BAC", "WFC"]
    },
    {
        id: 3,
        name: "医疗健康",
        description: "制药、医疗设备、生物技术等健康相关股票",
        color: "#F59E0B",
        stock_count: 124,
        avg_market_cap: "150B",
        top_stocks: ["JNJ", "PFE", "UNH"]
    },
    {
        id: 4,
        name: "消费品",
        description: "日用消费品、零售、餐饮等消费相关股票",
        color: "#EF4444",
        stock_count: 203,
        avg_market_cap: "100B",
        top_stocks: ["AMZN", "TSLA", "HD"]
    },
    {
        id: 5,
        name: "能源股",
        description: "石油、天然气、可再生能源等能源类股票",
        color: "#8B5CF6",
        stock_count: 67,
        avg_market_cap: "80B",
        top_stocks: ["XOM", "CVX", "COP"]
    },
    {
        id: 6,
        name: "工业股",
        description: "制造业、航空航天、基础设施等工业类股票",
        color: "#06B6D4",
        stock_count: 145,
        avg_market_cap: "75B",
        top_stocks: ["BA", "CAT", "GE"]
    },
    {
        id: 7,
        name: "房地产",
        description: "房地产开发、REITs等房地产相关股票",
        color: "#84CC16",
        stock_count: 78,
        avg_market_cap: "50B",
        top_stocks: ["AMT", "PLD", "CCI"]
    },
    {
        id: 8,
        name: "材料股",
        description: "化工、金属、建材等原材料类股票",
        color: "#F97316",
        stock_count: 92,
        avg_market_cap: "45B",
        top_stocks: ["LIN", "APD", "SHW"]
    }
];

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
            avg_market_cap: formatMarketCap(tag.avg_market_cap),
            top_stocks: (tag.top_stocks || []).slice(0, 3)
        }));
        
        // 处理行业标签
        const industryTags = industryResult.rows.map(tag => ({
            ...tag,
            avg_market_cap: formatMarketCap(tag.avg_market_cap),
            top_stocks: (tag.top_stocks || []).slice(0, 3)
        }));
        
        // 处理市值标签
        const marketCapData = marketCapResult.rows[0];
        const marketCapTags = [
            {
                name: '大盘股',
                type: '市值分类',
                description: '市值超过2000亿美元的股票',
                stock_count: parseInt(marketCapData.large_cap_count) || 0,
                avg_market_cap: 'N/A',
                top_stocks: (marketCapData.large_cap_stocks || []).slice(0, 3)
            },
            {
                name: '中盘股',
                type: '市值分类',
                description: '市值在100亿-2000亿美元之间的股票',
                stock_count: parseInt(marketCapData.mid_cap_count) || 0,
                avg_market_cap: 'N/A',
                top_stocks: (marketCapData.mid_cap_stocks || []).slice(0, 3)
            },
            {
                name: '小盘股',
                type: '市值分类',
                description: '市值低于100亿美元的股票',
                stock_count: parseInt(marketCapData.small_cap_count) || 0,
                avg_market_cap: 'N/A',
                top_stocks: (marketCapData.small_cap_stocks || []).slice(0, 3)
            }
        ];
        
        // 合并所有标签并按类型分组
        const allTags = [...staticTags, ...industryTags, ...marketCapTags];
        
        const groupedTags = {
            '股市表现': allTags.filter(tag => tag.type === '股市表现' || tag.type === 'performance'),
            '财务表现': allTags.filter(tag => tag.type === '财务表现' || tag.type === 'financial'),
            '行业分类': industryTags,
            '市值分类': marketCapTags,
            '特殊名单': allTags.filter(tag => tag.type === '特殊名单' || tag.type === 'special'),
            '趋势': allTags.filter(tag => tag.type === '趋势' || tag.type === 'trend')
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
            total: fallbackTags.length,
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