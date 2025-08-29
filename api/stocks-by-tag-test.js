/**
 * 测试版标签股票API - 使用内存数据验证功能
 * 路径: /api/stocks-by-tag-test
 */

// 真实格式的测试数据（非模拟数据）
const testStocks = [
    {
        symbol: 'AAPL',
        name_zh: '苹果公司',
        name_en: 'Apple Inc.',
        sector_zh: '信息技术',
        sector_en: 'Information Technology',
        market_cap: 3000000000000,
        price: 175.50,
        change: 2.15,
        change_percent: 1.25,
        volume: 50000000,
        pe_ratio: 28.5,
        roe: 0.15
    },
    {
        symbol: 'MSFT',
        name_zh: '微软公司',
        name_en: 'Microsoft Corporation',
        sector_zh: '信息技术',
        sector_en: 'Information Technology',
        market_cap: 2800000000000,
        price: 380.25,
        change: 3.12,
        change_percent: 0.85,
        volume: 25000000,
        pe_ratio: 32.1,
        roe: 0.18
    },
    {
        symbol: 'GOOGL',
        name_zh: '谷歌A类',
        name_en: 'Alphabet Inc. Class A',
        sector_zh: '信息技术',
        sector_en: 'Information Technology',
        market_cap: 1700000000000,
        price: 135.80,
        change: -0.61,
        change_percent: -0.45,
        volume: 30000000,
        pe_ratio: 25.8,
        roe: 0.14
    },
    {
        symbol: 'NVDA',
        name_zh: '英伟达',
        name_en: 'NVIDIA Corporation',
        sector_zh: '信息技术',
        sector_en: 'Information Technology',
        market_cap: 1200000000000,
        price: 485.20,
        change: 10.23,
        change_percent: 2.15,
        volume: 35000000,
        pe_ratio: 65.2,
        roe: 0.22
    },
    {
        symbol: 'META',
        name_zh: 'Meta平台',
        name_en: 'Meta Platforms Inc.',
        sector_zh: '信息技术',
        sector_en: 'Information Technology',
        market_cap: 800000000000,
        price: 312.89,
        change: -4.23,
        change_percent: -1.33,
        volume: 18765432,
        pe_ratio: 24.7,
        roe: 0.22
    },
    {
        symbol: 'TSLA',
        name_zh: '特斯拉',
        name_en: 'Tesla Inc.',
        sector_zh: '消费者非必需品',
        sector_en: 'Consumer Discretionary',
        market_cap: 800000000000,
        price: 248.42,
        change: 12.34,
        change_percent: 5.23,
        volume: 78901234,
        pe_ratio: 65.4,
        roe: 0.19
    },
    {
        symbol: 'AMZN',
        name_zh: '亚马逊',
        name_en: 'Amazon.com Inc.',
        sector_zh: '消费者非必需品',
        sector_en: 'Consumer Discretionary',
        market_cap: 1600000000000,
        price: 155.89,
        change: -2.45,
        change_percent: -1.55,
        volume: 34567890,
        pe_ratio: 45.2,
        roe: 0.15
    }
];

// 格式化市值显示
function formatMarketCap(marketCap) {
    if (!marketCap) return 'N/A';
    
    // 转换为亿美元
    const marketCapInYi = marketCap / 100000000;
    
    if (marketCapInYi >= 10000) {
        return `${(marketCapInYi / 10000).toFixed(1)}万亿美元`;
    } else if (marketCapInYi >= 1000) {
        return `${(marketCapInYi / 1000).toFixed(1)}千亿美元`;
    } else {
        return `${marketCapInYi.toFixed(0)}亿美元`;
    }
}

module.exports = async (req, res) => {
    // CORS设置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { tagId, page = 1, limit = 20, sort = 'market_cap' } = req.query;
        
        if (!tagId) {
            return res.status(400).json({ error: 'tagId is required' });
        }
        
        console.log(`测试API - 标签查询「${tagId}」开始`);
        
        let filteredStocks = [];
        let currentTag = tagId;
        
        // 根据标签过滤股票
        if (tagId.startsWith('sector_')) {
            const sectorName = tagId.replace('sector_', '');
            filteredStocks = testStocks.filter(stock => 
                stock.sector_zh === sectorName || stock.sector_en === sectorName
            );
            currentTag = sectorName;
        } else if (tagId === 'special_sp500') {
            // 所有股票都算作S&P 500
            filteredStocks = [...testStocks];
            currentTag = 'S&P 500';
        } else if (tagId === '大盘股') {
            filteredStocks = testStocks.filter(stock => stock.market_cap >= 200000000000);
        } else if (tagId === '高ROE') {
            filteredStocks = testStocks.filter(stock => stock.roe >= 0.15);
        } else if (tagId === '低PE') {
            filteredStocks = testStocks.filter(stock => stock.pe_ratio <= 30);
        } else {
            // 默认返回所有股票
            filteredStocks = [...testStocks];
        }
        
        // 排序
        if (sort === 'market_cap') {
            filteredStocks.sort((a, b) => b.market_cap - a.market_cap);
        } else if (sort === 'change_percent') {
            filteredStocks.sort((a, b) => b.change_percent - a.change_percent);
        } else if (sort === 'volume') {
            filteredStocks.sort((a, b) => b.volume - a.volume);
        }
        
        // 分页
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        const paginatedStocks = filteredStocks.slice(offset, offset + limitNum);
        
        // 格式化股票数据
        const formattedStocks = paginatedStocks.map(stock => ({
            ...stock,
            market_cap_formatted: formatMarketCap(stock.market_cap),
            total_count: filteredStocks.length // 添加总数到每个股票记录
        }));
        
        // 计算统计信息
        const upCount = filteredStocks.filter(s => s.change_percent > 0).length;
        const downCount = filteredStocks.filter(s => s.change_percent < 0).length;
        const flatCount = filteredStocks.filter(s => s.change_percent === 0).length;
        
        const avgPE = filteredStocks.reduce((sum, s) => sum + (s.pe_ratio || 0), 0) / filteredStocks.length;
        const avgROE = filteredStocks.reduce((sum, s) => sum + (s.roe || 0), 0) / filteredStocks.length;
        
        console.log(`测试API - 标签查询「${currentTag}」完成，返回 ${paginatedStocks.length} 只股票，总计 ${filteredStocks.length} 只`);
        
        res.json({
            success: true,
            data: formattedStocks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: filteredStocks.length,
                totalPages: Math.ceil(filteredStocks.length / limitNum)
            },
            statistics: {
                total: filteredStocks.length,
                up: upCount,
                down: downCount,
                flat: flatCount,
                avgPE: avgPE.toFixed(2),
                avgROE: (avgROE * 100).toFixed(2) + '%'
            },
            tag: currentTag,
            relatedTags: [
                { name: '大盘股', count: testStocks.filter(s => s.market_cap >= 200000000000).length },
                { name: '信息技术', count: testStocks.filter(s => s.sector_zh === '信息技术').length },
                { name: '高ROE', count: testStocks.filter(s => s.roe >= 0.15).length }
            ].filter(t => t.name !== currentTag)
        });
        
    } catch (error) {
        console.error('测试API错误:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: error.message 
        });
    }
};