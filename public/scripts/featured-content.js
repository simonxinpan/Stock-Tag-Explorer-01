/**
 * 特色内容焦点显示功能
 * 实现点击行业/榜单/标签后将对应内容提到页首的交互
 */

class FeaturedContentManager {
    constructor() {
        this.currentFeaturedType = null;
        this.currentFeaturedId = null;
        this.heatmapRenderer = null;
        this.init();
    }

    init() {
        // 检查URL hash参数
        this.checkUrlHash();
        
        // 监听hash变化
        window.addEventListener('hashchange', () => {
            this.checkUrlHash();
        });
        
        // 绑定返回按钮事件
        this.bindReturnButtons();
    }

    bindReturnButtons() {
        // 为所有返回按钮绑定事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('return-btn') || e.target.closest('.return-btn')) {
                this.hideFeaturedContent();
            }
        });
    }

    checkUrlHash() {
        const hash = window.location.hash;
        if (hash) {
            const match = hash.match(/#(sector|trending|tag)-(.+)/);
            if (match) {
                const [, type, id] = match;
                this.showFeaturedContent(type, id);
            }
        }
    }

    /**
     * 显示特色内容
     * @param {string} type - 内容类型: 'sector', 'trending', 'tag'
     * @param {string} id - 内容ID
     */
    async showFeaturedContent(type, id) {
        this.currentFeaturedType = type;
        this.currentFeaturedId = id;

        try {
            // 隐藏所有其他区域
            this.hideOtherSections(type);
            
            switch (type) {
                case 'sector':
                    await this.showFeaturedSector(id);
                    break;
                case 'trending':
                    await this.showFeaturedTrending(id);
                    break;
                case 'tag':
                    await this.showFeaturedTag(id);
                    break;
            }

            // 滚动到页面顶部
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('显示特色内容失败:', error);
        }
    }

    /**
     * 显示特色行业
     */
    async showFeaturedSector(sectorId) {
        const section = document.getElementById('featured-sector-section');
        if (!section) return;

        // 获取行业数据
        const sectorData = await this.fetchSectorData(sectorId);
        
        // 更新标题和描述
        document.getElementById('featured-sector-name').textContent = sectorData.name;
        document.getElementById('featured-sector-description').textContent = sectorData.description;
        
        // 更新统计信息
        this.updateSectorStats(sectorData);
        
        // 渲染热力图
        await this.renderSectorHeatmap(sectorData.stocks);
        
        // 显示区域
        section.style.display = 'block';
        
        // 隐藏其他区域
        this.hideOtherSections('sector');
    }

    /**
     * 显示特色榜单
     */
    async showFeaturedTrending(trendingId) {
        const section = document.getElementById('featured-trending-section');
        if (!section) return;

        // 获取榜单数据
        const trendingData = await this.fetchTrendingData(trendingId);
        
        // 更新标题和描述
        document.getElementById('featured-trending-name').textContent = trendingData.name;
        document.getElementById('featured-trending-description').textContent = trendingData.description;
        
        // 更新统计信息
        this.updateTrendingStats(trendingData);
        
        // 渲染热力图
        await this.renderTrendingHeatmap(trendingData.stocks);
        
        // 显示区域
        section.style.display = 'block';
        
        // 隐藏其他区域
        this.hideOtherSections('trending');
    }

    /**
     * 显示特色标签
     */
    async showFeaturedTag(tagId) {
        const section = document.getElementById('featured-tag-section');
        if (!section) return;

        // 获取标签数据
        const tagData = await this.fetchTagData(tagId);
        
        // 更新标题和描述
        document.getElementById('featured-tag-name').textContent = tagData.name;
        document.getElementById('featured-tag-description').textContent = tagData.description;
        
        // 更新统计信息
        this.updateTagStats(tagData);
        
        // 渲染热力图
        await this.renderTagHeatmap(tagData.stocks);
        
        // 显示区域
        section.style.display = 'block';
        
        // 隐藏其他区域
        this.hideOtherSections('tag');
    }

    /**
     * 隐藏其他区域
     */
    hideOtherSections(activeType = null) {
        // 隐藏主要内容区域
        const mainSections = [
            'panoramic-heatmap-section',
            'sector-heatmaps-section', 
            'trending-heatmap-section',
            'trending-list-section',
            'tag-content-section',
            'main-content'
        ];
        
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
        
        // 隐藏其他特色内容区域
        const featuredSections = {
            'sector': 'featured-sector-section',
            'trending': 'featured-trending-section',
            'tag': 'featured-tag-section'
        };
        
        Object.entries(featuredSections).forEach(([type, sectionId]) => {
            if (type !== activeType) {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'none';
                    section.classList.remove('active');
                }
            }
        });
    }

    /**
     * 获取行业数据
     */
    async fetchSectorData(sectorId) {
        // 模拟数据，实际应该从API获取
        const sectorMap = {
            'technology': {
                name: '科技行业',
                description: '包含软件、硬件、互联网等科技类股票',
                stocks: this.generateMockStocks(120, 'technology')
            },
            'healthcare': {
                name: '医疗健康',
                description: '医药、医疗器械、生物科技等健康产业股票',
                stocks: this.generateMockStocks(85, 'healthcare')
            },
            'finance': {
                name: '金融服务',
                description: '银行、保险、证券等金融服务类股票',
                stocks: this.generateMockStocks(95, 'finance')
            }
        };
        
        return sectorMap[sectorId] || sectorMap['technology'];
    }

    /**
     * 获取榜单数据
     */
    async fetchTrendingData(trendingId) {
        const trendingMap = {
            'hot-stocks': {
                name: '热门股票',
                description: '近期交易活跃、关注度高的股票',
                stocks: this.generateMockStocks(50, 'hot')
            },
            'gainers': {
                name: '涨幅榜',
                description: '今日涨幅最大的股票排行',
                stocks: this.generateMockStocks(30, 'gainers')
            },
            'volume-leaders': {
                name: '成交量榜',
                description: '今日成交量最大的股票排行',
                stocks: this.generateMockStocks(40, 'volume')
            }
        };
        
        return trendingMap[trendingId] || trendingMap['hot-stocks'];
    }

    /**
     * 获取标签数据
     */
    async fetchTagData(tagId) {
        const tagMap = {
            'high-roe': {
                name: '高ROE',
                description: '净资产收益率超过15%的优质股票',
                stocks: this.generateMockStocks(65, 'high-roe')
            },
            'dividend-stocks': {
                name: '高分红',
                description: '股息率超过3%的分红股票',
                stocks: this.generateMockStocks(45, 'dividend')
            },
            'growth-stocks': {
                name: '成长股',
                description: '营收增长率超过20%的成长型股票',
                stocks: this.generateMockStocks(75, 'growth')
            }
        };
        
        return tagMap[tagId] || tagMap['high-roe'];
    }

    /**
     * 生成模拟股票数据
     */
    generateMockStocks(count, category) {
        const stocks = [];
        const stockNames = [
            '贵州茅台', '腾讯控股', '阿里巴巴', '中国平安', '招商银行',
            '五粮液', '美团', '宁德时代', '比亚迪', '迈瑞医疗',
            '恒瑞医药', '海康威视', '立讯精密', '药明康德', '爱尔眼科'
        ];
        
        for (let i = 0; i < count; i++) {
            const changePercent = (Math.random() - 0.5) * 20; // -10% 到 +10%
            stocks.push({
                symbol: `${String(i).padStart(6, '0')}`,
                name: stockNames[i % stockNames.length] + (i > 14 ? ` ${Math.floor(i/15)}` : ''),
                price: (Math.random() * 200 + 10).toFixed(2),
                change_percent: changePercent,
                market_cap: Math.random() * 1000000000000, // 随机市值
                volume: Math.floor(Math.random() * 10000000)
            });
        }
        
        return stocks;
    }

    /**
     * 更新行业统计信息
     */
    updateSectorStats(sectorData) {
        const stocks = sectorData.stocks;
        const avgChange = stocks.reduce((sum, stock) => sum + stock.change_percent, 0) / stocks.length;
        const topStock = stocks.reduce((max, stock) => 
            stock.change_percent > max.change_percent ? stock : max
        );
        
        document.getElementById('featured-sector-count').textContent = stocks.length;
        document.getElementById('featured-sector-avg-change').textContent = 
            (avgChange >= 0 ? '+' : '') + avgChange.toFixed(2) + '%';
        document.getElementById('featured-sector-avg-change').className = 
            'stat-number ' + (avgChange >= 0 ? 'positive' : 'negative');
        document.getElementById('featured-sector-top-stock').textContent = topStock.name;
    }

    /**
     * 更新榜单统计信息
     */
    updateTrendingStats(trendingData) {
        const stocks = trendingData.stocks;
        const avgChange = stocks.reduce((sum, stock) => sum + stock.change_percent, 0) / stocks.length;
        const topStock = stocks.reduce((max, stock) => 
            stock.change_percent > max.change_percent ? stock : max
        );
        
        document.getElementById('featured-trending-count').textContent = stocks.length;
        document.getElementById('featured-trending-avg-change').textContent = 
            (avgChange >= 0 ? '+' : '') + avgChange.toFixed(2) + '%';
        document.getElementById('featured-trending-avg-change').className = 
            'stat-number ' + (avgChange >= 0 ? 'positive' : 'negative');
        document.getElementById('featured-trending-top-stock').textContent = topStock.name;
    }

    /**
     * 更新标签统计信息
     */
    updateTagStats(tagData) {
        const stocks = tagData.stocks;
        const avgChange = stocks.reduce((sum, stock) => sum + stock.change_percent, 0) / stocks.length;
        const topStock = stocks.reduce((max, stock) => 
            stock.change_percent > max.change_percent ? stock : max
        );
        
        document.getElementById('featured-tag-count').textContent = stocks.length;
        document.getElementById('featured-tag-avg-change').textContent = 
            (avgChange >= 0 ? '+' : '') + avgChange.toFixed(2) + '%';
        document.getElementById('featured-tag-avg-change').className = 
            'stat-number ' + (avgChange >= 0 ? 'positive' : 'negative');
        document.getElementById('featured-tag-top-stock').textContent = topStock.name;
    }

    /**
     * 渲染行业热力图
     */
    async renderSectorHeatmap(stocks) {
        const container = document.getElementById('featured-sector-heatmap');
        if (!container || !window.StockHeatmap) return;
        
        // 清除现有内容
        container.innerHTML = '';
        
        // 创建热力图实例
        this.heatmapRenderer = new StockHeatmap(container);
        this.heatmapRenderer.render(stocks);
    }

    /**
     * 渲染榜单热力图
     */
    async renderTrendingHeatmap(stocks) {
        const container = document.getElementById('featured-trending-heatmap');
        if (!container || !window.StockHeatmap) return;
        
        container.innerHTML = '';
        this.heatmapRenderer = new StockHeatmap(container);
        this.heatmapRenderer.render(stocks);
    }

    /**
     * 渲染标签热力图
     */
    async renderTagHeatmap(stocks) {
        const container = document.getElementById('featured-tag-heatmap');
        if (!container || !window.StockHeatmap) return;
        
        container.innerHTML = '';
        this.heatmapRenderer = new StockHeatmap(container);
        this.heatmapRenderer.render(stocks);
    }

    /**
     * 隐藏特色内容
     */
    hideFeaturedContent() {
        // 隐藏所有特色区域
        const sections = {
            'sector': 'featured-sector-section',
            'trending': 'featured-trending-section', 
            'tag': 'featured-tag-section'
        };

        Object.values(sections).forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
                section.classList.remove('active');
            }
        });
        
        // 清除URL hash
        history.pushState('', document.title, window.location.pathname + window.location.search);
        
        // 重置状态
        this.currentFeaturedType = null;
        this.currentFeaturedId = null;
    }
}

// 全局函数，供HTML调用
function hideFeaturedSector() {
    if (window.featuredContentManager) {
        window.featuredContentManager.hideFeaturedContent();
    }
}

function hideFeaturedTrending() {
    if (window.featuredContentManager) {
        window.featuredContentManager.hideFeaturedContent();
    }
}

function hideFeaturedTag() {
    if (window.featuredContentManager) {
        window.featuredContentManager.hideFeaturedContent();
    }
}

// 初始化特色内容管理器
document.addEventListener('DOMContentLoaded', () => {
    window.featuredContentManager = new FeaturedContentManager();
});

// 确保在其他脚本加载前就可用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.featuredContentManager) {
            window.featuredContentManager = new FeaturedContentManager();
        }
    });
} else {
    // 如果DOM已经加载完成
    if (!window.featuredContentManager) {
        window.featuredContentManager = new FeaturedContentManager();
    }
}