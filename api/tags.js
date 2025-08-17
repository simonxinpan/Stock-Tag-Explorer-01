// /api/tags.js - 标签API接口
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 备用标签数据
const fallbackTags = [
    { name: '52周高点', type: 'market_performance', stock_count: 23, description: '接近52周最高价的股票' },
    { name: '52周低点', type: 'market_performance', stock_count: 12, description: '接近52周最低价的股票' },
    { name: '高成长', type: 'market_performance', stock_count: 45, description: '高增长率股票' },
    { name: '低波动', type: 'market_performance', stock_count: 67, description: '价格波动较小的股票' },
    { name: '高分红', type: 'market_performance', stock_count: 30, description: '高股息率股票' },
    { name: '高ROE', type: 'financial_performance', stock_count: 56, description: 'ROE > 15%的股票' },
    { name: '低负债率', type: 'financial_performance', stock_count: 78, description: '负债率较低的股票' },
    { name: '高现金流', type: 'financial_performance', stock_count: 42, description: '现金流充裕的股票' },
    { name: '盈利稳定', type: 'financial_performance', stock_count: 65, description: '盈利稳定增长的股票' },
    { name: '科技股', type: 'industry_classification', stock_count: 89, description: '科技行业股票' },
    { name: '金融股', type: 'industry_classification', stock_count: 67, description: '金融行业股票' },
    { name: '医疗股', type: 'industry_classification', stock_count: 45, description: '医疗健康行业股票' },
    { name: '消费股', type: 'industry_classification', stock_count: 78, description: '消费行业股票' },
    { name: '标普500', type: 'special_lists', stock_count: 500, description: '标普500指数成分股' },
    { name: '纳斯达克100', type: 'special_lists', stock_count: 100, description: '纳斯达克100指数成分股' },
    { name: '道琼斯30', type: 'special_lists', stock_count: 30, description: '道琼斯工业平均指数成分股' }
];

// 备用股票数据
const fallbackStocks = {
    '高ROE': [
        { symbol: 'AAPL', name: '苹果公司', price: 195.89, change_percent: 1.21, volume: 45234567, market_cap: '3.1T' },
        { symbol: 'MSFT', name: '微软公司', price: 378.85, change_percent: -0.32, volume: 23456789, market_cap: '2.8T' },
        { symbol: 'NVDA', name: '英伟达', price: 495.22, change_percent: 1.80, volume: 45123456, market_cap: '1.2T' }
    ],
    '科技股': [
        { symbol: 'AAPL', name: '苹果公司', price: 195.89, change_percent: 1.21, volume: 45234567, market_cap: '3.1T' },
        { symbol: 'MSFT', name: '微软公司', price: 378.85, change_percent: -0.32, volume: 23456789, market_cap: '2.8T' },
        { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change_percent: 2.48, volume: 34567890, market_cap: '1.8T' },
        { symbol: 'META', name: 'Meta平台', price: 352.96, change_percent: -0.60, volume: 19876543, market_cap: '896B' }
    ],
    '标普500': [
        { symbol: 'AAPL', name: '苹果公司', price: 195.89, change_percent: 1.21, volume: 45234567, market_cap: '3.1T' },
        { symbol: 'MSFT', name: '微软公司', price: 378.85, change_percent: -0.32, volume: 23456789, market_cap: '2.8T' },
        { symbol: 'AMZN', name: '亚马逊', price: 155.23, change_percent: -0.56, volume: 28901234, market_cap: '1.6T' },
        { symbol: 'TSLA', name: '特斯拉', price: 248.42, change_percent: 5.23, volume: 67890123, market_cap: '789B' }
    ]
};

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { tag_name, symbol } = req.query;
    
    try {
        // 如果请求特定标签的股票
        if (tag_name) {
            let stocks = [];
            
            try {
                const client = await pool.connect();
                
                // 检查表是否存在
                const tableCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'stocks'
                    );
                `);
                
                if (tableCheck.rows[0].exists) {
                    // 从数据库获取数据
                    const result = await client.query(`
                        SELECT s.symbol, s.name_zh as name, s.price, s.change_percent, 
                               s.volume, s.market_cap, s.sector, s.industry
                        FROM stocks s
                        JOIN stock_tags st ON s.symbol = st.stock_symbol
                        JOIN tags t ON st.tag_id = t.tag_id
                        WHERE t.tag_name = $1
                        ORDER BY s.market_cap DESC NULLS LAST
                        LIMIT 50
                    `, [tag_name]);
                    
                    stocks = result.rows;
                }
                
                client.release();
            } catch (dbError) {
                console.warn('Database query failed, using fallback data:', dbError.message);
                stocks = fallbackStocks[tag_name] || [];
            }
            
            // 如果没有数据，使用备用数据
            if (stocks.length === 0) {
                stocks = fallbackStocks[tag_name] || [];
            }
            
            return res.status(200).json({
                success: true,
                tag_info: {
                    tag_name: tag_name,
                    description: `${tag_name}相关股票`
                },
                data: stocks,
                meta: {
                    total_stocks: stocks.length,
                    query_time: new Date().toISOString()
                }
            });
        }
        
        // 如果请求特定股票的标签
        if (symbol) {
            let tags = [];
            
            try {
                const client = await pool.connect();
                
                const result = await client.query(`
                    SELECT t.tag_name, t.category as type, t.description
                    FROM tags t
                    JOIN stock_tags st ON t.tag_id = st.tag_id
                    WHERE st.stock_symbol = $1
                `, [symbol]);
                
                tags = result.rows;
                client.release();
            } catch (dbError) {
                console.warn('Database query failed for symbol tags:', dbError.message);
                // 返回一些默认标签
                tags = [{ tag_name: '科技股', type: 'industry_classification', description: '科技行业股票' }];
            }
            
            return res.status(200).json({
                success: true,
                symbol: symbol,
                data: tags,
                meta: {
                    total_tags: tags.length,
                    query_time: new Date().toISOString()
                }
            });
        }
        
        // 获取所有标签统计
        let tags = [];
        
        try {
            const client = await pool.connect();
            
            // 检查表是否存在
            const tableCheck = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'tags'
                );
            `);
            
            if (tableCheck.rows[0].exists) {
                const result = await client.query(`
                    SELECT t.tag_name as name, t.category as type, 
                           COUNT(st.stock_symbol)::int as stock_count,
                           t.description
                    FROM tags t
                    LEFT JOIN stock_tags st ON t.tag_id = st.tag_id
                    GROUP BY t.tag_id, t.tag_name, t.category, t.description
                    ORDER BY t.category, stock_count DESC
                `);
                
                tags = result.rows;
            }
            
            client.release();
        } catch (dbError) {
            console.warn('Database query failed, using fallback tags:', dbError.message);
            tags = fallbackTags;
        }
        
        // 如果没有数据，使用备用数据
        if (tags.length === 0) {
            tags = fallbackTags;
        }
        
        return res.status(200).json({
            success: true,
            data: tags,
            meta: {
                total_tags: tags.length,
                last_updated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
        });
    }
}