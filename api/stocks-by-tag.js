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
        // 不使用模拟数据，返回空数组
        return [];
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
                        ticker as symbol,
                        name,
                        price,
                        change_amount as change,
                        change_percent,
                        volume,
                        market_cap,
                        pe_ttm,
                        roe,
                        sector,
                        updated_at
                    FROM stocks
                    WHERE market_cap >= 200000000000
                    ORDER BY 
                        CASE WHEN $1 = 'market_cap' THEN market_cap END DESC,
                        CASE WHEN $1 = 'change_percent' THEN change_percent END DESC,
                        CASE WHEN $1 = 'volume' THEN volume END DESC,
                        market_cap DESC
                    LIMIT $2 OFFSET $3
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks
                    WHERE market_cap >= 200000000000
                `;
                queryParams = [sort, limitNum, offset];
            } else if (currentTag === '中盘股' || currentTag === 'marketcap_中盘股') {
                stockQuery = `
                    SELECT 
                        ticker as symbol,
                        name,
                        price,
                        change_amount as change,
                        change_percent,
                        volume,
                        market_cap,
                        pe_ttm,
                        roe,
                        sector,
                        updated_at
                    FROM stocks
                    WHERE market_cap >= 10000000000 AND market_cap < 200000000000
                    ORDER BY 
                        CASE WHEN $1 = 'market_cap' THEN market_cap END DESC,
                        CASE WHEN $1 = 'change_percent' THEN change_percent END DESC,
                        CASE WHEN $1 = 'volume' THEN volume END DESC,
                        market_cap DESC
                    LIMIT $2 OFFSET $3
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks
                    WHERE market_cap >= 10000000000 AND market_cap < 200000000000
                `;
                queryParams = [sort, limitNum, offset];
            } else if (currentTag === '小盘股' || currentTag === 'marketcap_小盘股') {
                stockQuery = `
                    SELECT 
                        ticker as symbol,
                        name,
                        price,
                        change_amount as change,
                        change_percent,
                        volume,
                        market_cap,
                        pe_ttm,
                        roe,
                        sector,
                        updated_at
                    FROM stocks
                    WHERE market_cap < 10000000000 AND market_cap > 0
                    ORDER BY 
                        CASE WHEN $1 = 'market_cap' THEN market_cap END DESC,
                        CASE WHEN $1 = 'change_percent' THEN change_percent END DESC,
                        CASE WHEN $1 = 'volume' THEN volume END DESC,
                        market_cap DESC
                    LIMIT $2 OFFSET $3
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks
                    WHERE market_cap < 10000000000 AND market_cap > 0
                `;
                queryParams = [sort, limitNum, offset];
            } else if (currentTag === '高ROE' || currentTag === 'rank_roe_top10') {
                stockQuery = `
                    SELECT 
                        ticker as symbol,
                        name,
                        price,
                        change_amount as change,
                        change_percent,
                        volume,
                        market_cap,
                        pe_ratio as pe_ttm,
                        roe as roe_ttm,
                        sector,
                        updated_at
                    FROM stocks
                    WHERE roe IS NOT NULL AND roe > 0
                    ORDER BY roe DESC
                    LIMIT $1 OFFSET $2
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks
                    WHERE roe IS NOT NULL AND roe > 0
                `;
                queryParams = [limitNum, offset];
            } else if (currentTag === '低PE' || currentTag === 'rank_pe_low') {
                stockQuery = `
                    SELECT 
                        ticker as symbol,
                        name,
                        price,
                        change_amount as change,
                        change_percent,
                        volume,
                        market_cap,
                        pe_ratio as pe_ttm,
                        roe as roe_ttm,
                        sector,
                        updated_at
                    FROM stocks
                    WHERE pe_ttm IS NOT NULL AND pe_ttm > 0
                    ORDER BY pe_ttm ASC
                    LIMIT $1 OFFSET $2
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks
                    WHERE pe_ttm IS NOT NULL AND pe_ttm > 0
                `;
                queryParams = [limitNum, offset];
            } else if (currentTag === '市值前10%' || currentTag === 'rank_market_cap_top10') {
                // 市值前10%：返回市值最高的约50只股票（约占总数的10%）
                stockQuery = `
                    SELECT 
                        ticker as symbol,
                        name,
                        price,
                        change_amount as change,
                        change_percent,
                        volume,
                        market_cap,
                        pe_ratio as pe_ttm,
                        roe,
                        sector,
                        updated_at
                    FROM (
                        SELECT *
                        FROM stocks
                        WHERE market_cap IS NOT NULL AND market_cap > 0
                        ORDER BY market_cap DESC
                        LIMIT 50
                    ) s
                    ORDER BY s.market_cap DESC
                    LIMIT $1 OFFSET $2
                `;
                countQuery = `
                    SELECT 50 as total
                `;
                queryParams = [limitNum, offset];
            } else if (currentTag.startsWith('sector_')) {
                // 处理行业分类标签 (sector_开头)
                const sectorName = currentTag.replace('sector_', '');
                stockQuery = `
                    SELECT 
                        ticker as symbol,
                        name,
                        price,
                        change_amount as change,
                        change_percent,
                        volume,
                        market_cap,
                        pe_ttm,
                        roe,
                        sector_zh as sector,
                        updated_at
                    FROM stocks
                    WHERE (sector_zh = $1 OR sector_en = $1)
                    ORDER BY 
                        CASE WHEN $2 = 'market_cap' THEN market_cap END DESC,
                        CASE WHEN $2 = 'change_percent' THEN change_percent END DESC,
                        CASE WHEN $2 = 'volume' THEN volume END DESC,
                        market_cap DESC
                    LIMIT $3 OFFSET $4
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM stocks
                    WHERE (sector_zh = $1 OR sector_en = $1)
                `;
                queryParams = [sectorName, sort, limitNum, offset];
            } else {
                // 默认：通过标签表查询
                stockQuery = `
                    SELECT DISTINCT
                        s.ticker as symbol,
                        s.name,
                        s.price,
                        s.change_amount as change,
                        s.change_percent,
                        s.volume,
                        s.market_cap,
                        s.pe_ttm,
                        s.roe,
                        s.sector,
                        s.updated_at
                    FROM stocks s
                    JOIN stock_tags st ON s.ticker = st.symbol
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
                    SELECT COUNT(DISTINCT s.ticker) as total
                    FROM stocks s
                    JOIN stock_tags st ON s.ticker = st.symbol
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
                currentTag === '低PE' || currentTag === 'rank_pe_low' ||
                currentTag === '市值前10%' || currentTag === 'rank_market_cap_top10') {
                [stockResult, countResult] = await Promise.all([
                    pool.query(stockQuery, queryParams),
                    pool.query(countQuery)
                ]);
            } else if (currentTag.startsWith('sector_')) {
                const sectorName = currentTag.replace('sector_', '');
                [stockResult, countResult] = await Promise.all([
                    pool.query(stockQuery, queryParams),
                    pool.query(countQuery, [sectorName])
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
            console.error('数据库查询失败:', dbError);
            
            // 不使用模拟数据，直接返回空结果
            stocks = [];
            totalCount = 0;
            relatedTags = [];
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
            } else if (currentTag === '市值前10%' || currentTag === 'rank_market_cap_top10') {
                allStocksQuery = `
                    SELECT s.change_amount as change, s.change_percent, s.pe_ratio as pe_ttm, s.roe
                    FROM (
                        SELECT *
                        FROM stocks
                        WHERE market_cap IS NOT NULL AND market_cap > 0
                        ORDER BY market_cap DESC
                        LIMIT 50
                    ) s
                `;
                allStocksParams = [];
            } else if (currentTag.startsWith('sector_')) {
                const sectorName = currentTag.replace('sector_', '');
                allStocksQuery = `
                    SELECT s.change_amount as change, s.change_percent, s.pe_ttm, s.roe
                    FROM stocks s
                    WHERE (s.sector_zh = $1 OR s.sector_en = $1)
                `;
                allStocksParams = [sectorName];
            } else {
                allStocksQuery = `
                    SELECT DISTINCT s.change_amount as change, s.change_percent, s.pe_ttm, s.roe
                    FROM stocks s
                    JOIN stock_tags st ON s.ticker = st.symbol
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

        console.log(`标签查询「${currentTag}」完成，返回 ${formattedStocks.length} 只股票，总计 ${totalCount} 只`);

        return res.status(200).json({
            success: true,
            data: {
                tag: currentTag,
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
    
    // 输入的marketCap是百万美元，需要转换为亿美元
    // 1亿美元 = 100百万美元
    const cap = parseFloat(marketCap);
    const capInYi = cap / 100; // 转换为亿美元
    
    if (capInYi >= 10000) {
        return `${(capInYi / 10000).toFixed(1)}万亿美元`;
    } else if (capInYi >= 100) {
        return `${capInYi.toFixed(0)}亿美元`;
    } else if (capInYi >= 10) {
        return `${capInYi.toFixed(1)}亿美元`;
    } else {
        return `${capInYi.toFixed(2)}亿美元`;
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