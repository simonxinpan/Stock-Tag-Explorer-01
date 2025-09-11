// 数据处理器 - 热力图数据处理核心组件

class DataProcessor {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    }
    
    // 获取市场数据
    async getMarketData(options = {}) {
        const cacheKey = `market_${JSON.stringify(options)}`;
        
        // 检查缓存
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch('/api/stocks');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = this.processStockData(data.stocks || []);
            
            // 缓存数据
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });
            
            return processedData;
            
        } catch (error) {
            console.error('获取市场数据失败:', error);
            return this.generateMockMarketData();
        }
    }
    
    // 获取行业数据
    async getIndustryData(options = {}) {
        const cacheKey = `industry_${JSON.stringify(options)}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const marketData = await this.getMarketData();
            const industryData = this.groupByIndustry(marketData);
            
            this.cache.set(cacheKey, {
                data: industryData,
                timestamp: Date.now()
            });
            
            return industryData;
            
        } catch (error) {
            console.error('获取行业数据失败:', error);
            return this.generateMockIndustryData();
        }
    }
    
    // 获取标签数据
    async getTagData(options = {}) {
        const cacheKey = `tags_${JSON.stringify(options)}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch('/api/tags');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = await this.processTagData(data.tags || []);
            
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });
            
            return processedData;
            
        } catch (error) {
            console.error('获取标签数据失败:', error);
            return this.generateMockTagData();
        }
    }
    
    // 获取趋势数据
    async getTrendingData(options = {}) {
        const cacheKey = `trending_${JSON.stringify(options)}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch('/api/trending');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = this.processTrendingData(data.trends || []);
            
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });
            
            return processedData;
            
        } catch (error) {
            console.error('获取趋势数据失败:', error);
            return this.generateMockTrendingData();
        }
    }
    
    // 处理股票数据
    processStockData(stocks) {
        return stocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name_zh || stock.name || stock.symbol,
            price: parseFloat(stock.price) || 0,
            change_percent: parseFloat(stock.change_percent) || 0,
            volume: parseInt(stock.volume) || 0,
            market_cap: parseInt(stock.market_cap) || 0,
            industry: stock.industry || '其他',
            sector: stock.sector || '其他',
            tags: stock.tags || [],
            // 计算热力图所需的额外字段
            size: this.calculateSize(stock),
            color: this.calculateColor(stock.change_percent),
            category: this.categorizeStock(stock)
        }));
    }
    
    // 按行业分组
    groupByIndustry(stocks) {
        const industries = {};
        
        stocks.forEach(stock => {
            const industry = stock.industry || '其他';
            if (!industries[industry]) {
                industries[industry] = {
                    name: industry,
                    stocks: [],
                    totalMarketCap: 0,
                    avgChange: 0,
                    totalVolume: 0
                };
            }
            
            industries[industry].stocks.push(stock);
            industries[industry].totalMarketCap += stock.market_cap;
            industries[industry].totalVolume += stock.volume;
        });
        
        // 计算平均涨跌幅
        Object.values(industries).forEach(industry => {
            if (industry.stocks.length > 0) {
                industry.avgChange = industry.stocks.reduce((sum, stock) => 
                    sum + stock.change_percent, 0) / industry.stocks.length;
            }
        });
        
        return Object.values(industries);
    }
    
    // 处理标签数据
    async processTagData(tags) {
        const processedTags = [];
        
        for (const tag of tags) {
            try {
                // 获取标签下的股票数据
                const response = await fetch(`/api/stocks-by-tag?tag=${encodeURIComponent(tag.name)}`);
                let stocks = [];
                
                if (response.ok) {
                    const data = await response.json();
                    stocks = data.stocks || [];
                }
                
                const processedTag = {
                    name: tag.name,
                    count: tag.count || stocks.length,
                    stocks: this.processStockData(stocks),
                    avgChange: 0,
                    totalMarketCap: 0,
                    totalVolume: 0
                };
                
                // 计算统计数据
                if (processedTag.stocks.length > 0) {
                    processedTag.avgChange = processedTag.stocks.reduce((sum, stock) => 
                        sum + stock.change_percent, 0) / processedTag.stocks.length;
                    processedTag.totalMarketCap = processedTag.stocks.reduce((sum, stock) => 
                        sum + stock.market_cap, 0);
                    processedTag.totalVolume = processedTag.stocks.reduce((sum, stock) => 
                        sum + stock.volume, 0);
                }
                
                processedTags.push(processedTag);
                
            } catch (error) {
                console.error(`处理标签 ${tag.name} 失败:`, error);
                // 添加基础标签信息
                processedTags.push({
                    name: tag.name,
                    count: tag.count || 0,
                    stocks: [],
                    avgChange: 0,
                    totalMarketCap: 0,
                    totalVolume: 0
                });
            }
        }
        
        return processedTags;
    }
    
    // 处理趋势数据
    processTrendingData(trends) {
        return trends.map(trend => ({
            id: trend.id,
            title: trend.title,
            category: trend.category,
            description: trend.description,
            popularity: trend.popularity || 0,
            stocks: this.processStockData(trend.stocks || []),
            avgChange: 0,
            totalVolume: 0
        })).map(trend => {
            // 计算平均涨跌幅和总成交量
            if (trend.stocks.length > 0) {
                trend.avgChange = trend.stocks.reduce((sum, stock) => 
                    sum + stock.change_percent, 0) / trend.stocks.length;
                trend.totalVolume = trend.stocks.reduce((sum, stock) => 
                    sum + stock.volume, 0);
            }
            return trend;
        });
    }
    
    // 计算股票大小（用于热力图）
    calculateSize(stock) {
        const marketCap = parseInt(stock.market_cap) || 0;
        const volume = parseInt(stock.volume) || 0;
        
        // 基于市值和成交量计算大小
        return Math.sqrt(marketCap / 1000000) + Math.sqrt(volume / 1000000);
    }
    
    // 计算颜色（基于涨跌幅）
    calculateColor(changePercent) {
        const change = parseFloat(changePercent) || 0;
        
        if (change > 5) return '#d32f2f'; // 深红
        if (change > 2) return '#f44336'; // 红色
        if (change > 0) return '#ff9800'; // 橙色
        if (change === 0) return '#9e9e9e'; // 灰色
        if (change > -2) return '#2196f3'; // 蓝色
        if (change > -5) return '#1976d2'; // 深蓝
        return '#0d47a1'; // 极深蓝
    }
    
    // 股票分类
    categorizeStock(stock) {
        const change = parseFloat(stock.change_percent) || 0;
        const volume = parseInt(stock.volume) || 0;
        const marketCap = parseInt(stock.market_cap) || 0;
        
        if (change > 5) return 'strong_gainer';
        if (change > 0) return 'gainer';
        if (change < -5) return 'strong_loser';
        if (change < 0) return 'loser';
        if (volume > 10000000) return 'high_volume';
        if (marketCap > 100000000000) return 'large_cap';
        return 'normal';
    }
    
    // 数据过滤
    filterData(data, filters = {}) {
        let filtered = [...data];
        
        // 按变化幅度过滤
        if (filters.minChange !== undefined) {
            filtered = filtered.filter(item => 
                (item.change_percent || item.avgChange || 0) >= filters.minChange
            );
        }
        
        if (filters.maxChange !== undefined) {
            filtered = filtered.filter(item => 
                (item.change_percent || item.avgChange || 0) <= filters.maxChange
            );
        }
        
        // 按市值过滤
        if (filters.minMarketCap !== undefined) {
            filtered = filtered.filter(item => 
                (item.market_cap || item.totalMarketCap || 0) >= filters.minMarketCap
            );
        }
        
        // 按成交量过滤
        if (filters.minVolume !== undefined) {
            filtered = filtered.filter(item => 
                (item.volume || item.totalVolume || 0) >= filters.minVolume
            );
        }
        
        // 按行业过滤
        if (filters.industry) {
            filtered = filtered.filter(item => 
                item.industry === filters.industry || item.name === filters.industry
            );
        }
        
        // 按类别过滤
        if (filters.category) {
            filtered = filtered.filter(item => 
                item.category === filters.category
            );
        }
        
        return filtered;
    }
    
    // 数据排序
    sortData(data, sortBy = 'change_percent', order = 'desc') {
        return [...data].sort((a, b) => {
            let aValue = a[sortBy] || 0;
            let bValue = b[sortBy] || 0;
            
            // 处理特殊字段
            if (sortBy === 'avgChange') {
                aValue = a.avgChange || a.change_percent || 0;
                bValue = b.avgChange || b.change_percent || 0;
            }
            
            if (order === 'desc') {
                return bValue - aValue;
            } else {
                return aValue - bValue;
            }
        });
    }
    
    // 生成模拟市场数据
    generateMockMarketData() {
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'CRM', 'ORCL'];
        const industries = ['科技', '消费', '金融', '医疗', '能源', '工业', '材料', '公用事业'];
        
        return symbols.map(symbol => ({
            symbol: symbol,
            name: `${symbol} Inc.`,
            price: 50 + Math.random() * 200,
            change_percent: (Math.random() - 0.5) * 10,
            volume: Math.floor(Math.random() * 50000000),
            market_cap: Math.floor(Math.random() * 1000000000000),
            industry: industries[Math.floor(Math.random() * industries.length)],
            sector: industries[Math.floor(Math.random() * industries.length)],
            tags: ['热门股票', 'AI概念'],
            size: Math.random() * 100 + 10,
            color: this.calculateColor((Math.random() - 0.5) * 10),
            category: 'normal'
        }));
    }
    
    // 生成模拟行业数据
    generateMockIndustryData() {
        const industries = ['科技', '消费', '金融', '医疗', '能源', '工业', '材料', '公用事业'];
        
        return industries.map(industry => ({
            name: industry,
            stocks: this.generateMockMarketData().slice(0, 5),
            totalMarketCap: Math.floor(Math.random() * 500000000000),
            avgChange: (Math.random() - 0.5) * 8,
            totalVolume: Math.floor(Math.random() * 200000000)
        }));
    }
    
    // 生成模拟标签数据
    generateMockTagData() {
        const tags = ['AI人工智能', '新能源汽车', '半导体', '生物医药', '云计算', '5G通信', '新材料', '消费电子'];
        
        return tags.map(tag => ({
            name: tag,
            count: Math.floor(Math.random() * 50) + 10,
            stocks: this.generateMockMarketData().slice(0, Math.floor(Math.random() * 8) + 3),
            avgChange: (Math.random() - 0.5) * 6,
            totalMarketCap: Math.floor(Math.random() * 300000000000),
            totalVolume: Math.floor(Math.random() * 150000000)
        }));
    }
    
    // 生成模拟趋势数据
    generateMockTrendingData() {
        const trends = [
            { title: '科技股强势反弹', category: 'gainers', description: '科技板块领涨市场' },
            { title: '能源股承压下跌', category: 'losers', description: '油价下跌影响能源板块' },
            { title: '成交量活跃股票', category: 'volume', description: '市场关注度高的热门股票' },
            { title: '大盘蓝筹稳健', category: 'market_cap', description: '大市值股票表现稳定' }
        ];
        
        return trends.map((trend, index) => ({
            id: `trend-${index + 1}`,
            title: trend.title,
            category: trend.category,
            description: trend.description,
            popularity: Math.floor(Math.random() * 100) + 50,
            stocks: this.generateMockMarketData().slice(0, 6),
            avgChange: (Math.random() - 0.5) * 5,
            totalVolume: Math.floor(Math.random() * 100000000)
        }));
    }
    
    // 清除缓存
    clearCache() {
        this.cache.clear();
    }
    
    // 获取缓存统计
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataProcessor;
} else {
    window.DataProcessor = DataProcessor;
}