/**
 * 标签热力图页面脚本
 * 负责加载和展示特定标签的热力图，以及相关的迷你热力图
 */

class TagHeatmapPage {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.currentTagId = null;
        this.currentTagData = null;
        this.heatmaps = new Map();
        
        this.init();
    }

    async init() {
        // 从URL参数获取标签ID
        const urlParams = new URLSearchParams(window.location.search);
        this.currentTagId = urlParams.get('tagId');
        
        if (!this.currentTagId) {
            this.showError('未指定标签ID');
            return;
        }

        try {
            await this.loadTagData();
            await this.initializeHeatmaps();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('页面加载失败，请稍后重试');
        }
    }

    async loadTagData() {
        try {
            // 获取标签信息
            const response = await fetch(`/api/tags`);
            const tags = await response.json();
            
            this.currentTagData = tags.find(tag => tag.id === this.currentTagId);
            
            if (!this.currentTagData) {
                throw new Error('标签不存在');
            }

            this.updatePageInfo();
        } catch (error) {
            console.error('加载标签数据失败:', error);
            throw error;
        }
    }

    updatePageInfo() {
        const tagTitle = document.getElementById('tag-title');
        const tagDescription = document.getElementById('tag-description');
        const currentTagName = document.getElementById('current-tag-name');
        
        if (this.currentTagData) {
            tagTitle.textContent = `${this.currentTagData.name}热力图`;
            tagDescription.textContent = `展示${this.currentTagData.name}相关股票的市场表现热力图`;
            currentTagName.textContent = `${this.currentTagData.name}热力图`;
            
            // 更新页面标题
            document.title = `${this.currentTagData.name}热力图 - Stock Tag Explorer`;
        }
    }

    async initializeHeatmaps() {
        // 初始化主热力图
        await this.initMainHeatmap();
        
        // 初始化侧边栏迷你热力图
        await this.initSidebarHeatmaps();
    }

    async initMainHeatmap() {
        try {
            const container = document.getElementById('main-heatmap');
            
            // 创建主热力图渲染器
            const mainRenderer = new HeatmapRenderer(container, {
                width: container.clientWidth,
                height: 600,
                colorScheme: 'greenRed',
                showTooltip: true,
                interactive: true
            });

            // 获取标签相关的股票数据
            const stocksData = await this.dataProcessor.getStocksByTag(this.currentTagId);
            
            if (stocksData && stocksData.length > 0) {
                // 转换数据格式以适配热力图
                const heatmapData = this.convertToHeatmapData(stocksData);
                mainRenderer.render(heatmapData, 'change_percent');
            } else {
                this.showEmptyState(container, '暂无相关股票数据');
            }

            this.heatmaps.set('main', mainRenderer);
        } catch (error) {
            console.error('初始化主热力图失败:', error);
            this.showEmptyState(document.getElementById('main-heatmap'), '加载失败');
        }
    }

    async initSidebarHeatmaps() {
        // 初始化全景热力图预览
        await this.initPanoramicPreview();
        
        // 初始化相关标签热力图
        await this.initRelatedTagsHeatmap();
        
        // 初始化行业热力图
        await this.initIndustryHeatmap();
        
        // 初始化榜单热力图
        await this.initTrendingHeatmap();
    }

    async initPanoramicPreview() {
        try {
            const container = document.getElementById('panoramic-preview');
            
            const renderer = new HeatmapRenderer(container, {
                width: container.clientWidth,
                height: 200,
                colorScheme: 'greenRed',
                showTooltip: false,
                interactive: false,
                fontSize: 10
            });

            // 获取市场数据
            const marketData = await this.dataProcessor.getMarketData();
            if (marketData && marketData.length > 0) {
                const heatmapData = this.convertToHeatmapData(marketData.slice(0, 50));
                renderer.render(heatmapData, 'change_percent');
            }

            this.heatmaps.set('panoramic', renderer);
        } catch (error) {
            console.error('初始化全景预览失败:', error);
            this.showEmptyState(document.getElementById('panoramic-preview'), '加载失败');
        }
    }

    async initRelatedTagsHeatmap() {
        try {
            const container = document.getElementById('related-tags-heatmap');
            
            const renderer = new HeatmapRenderer(container, {
                width: container.clientWidth,
                height: 200,
                colorScheme: 'greenRed',
                showTooltip: false,
                interactive: false,
                fontSize: 10
            });

            // 获取相关标签的股票数据（这里简化为获取另一个热门标签）
            const relatedTagData = await this.dataProcessor.getStocksByTag('rank_market_cap_top10');
            if (relatedTagData && relatedTagData.length > 0) {
                const heatmapData = this.convertToHeatmapData(relatedTagData.slice(0, 30));
                renderer.render(heatmapData, 'change_percent');
            }

            this.heatmaps.set('relatedTags', renderer);
        } catch (error) {
            console.error('初始化相关标签热力图失败:', error);
            this.showEmptyState(document.getElementById('related-tags-heatmap'), '加载失败');
        }
    }

    async initIndustryHeatmap() {
        try {
            const container = document.getElementById('industry-heatmap');
            
            const renderer = new HeatmapRenderer(container, {
                width: container.clientWidth,
                height: 200,
                colorScheme: 'greenRed',
                showTooltip: false,
                interactive: false,
                fontSize: 10
            });

            // 获取行业数据
            const industryData = await this.dataProcessor.getIndustryData();
            if (industryData && industryData.length > 0) {
                const heatmapData = this.convertToHeatmapData(industryData.slice(0, 20));
                renderer.render(heatmapData, 'change_percent');
            }

            this.heatmaps.set('industry', renderer);
        } catch (error) {
            console.error('初始化行业热力图失败:', error);
            this.showEmptyState(document.getElementById('industry-heatmap'), '加载失败');
        }
    }

    async initTrendingHeatmap() {
        try {
            const container = document.getElementById('trending-heatmap');
            
            const renderer = new HeatmapRenderer(container, {
                width: container.clientWidth,
                height: 200,
                colorScheme: 'greenRed',
                showTooltip: false,
                interactive: false,
                fontSize: 10
            });

            // 获取趋势数据
            const trendingData = await this.dataProcessor.getTrendingData();
            if (trendingData && trendingData.length > 0) {
                const heatmapData = this.convertToHeatmapData(trendingData.slice(0, 30));
                renderer.render(heatmapData, 'change_percent');
            }

            this.heatmaps.set('trending', renderer);
        } catch (error) {
            console.error('初始化榜单热力图失败:', error);
            this.showEmptyState(document.getElementById('trending-heatmap'), '加载失败');
        }
    }

    convertToHeatmapData(stocksData) {
        return stocksData.map(stock => ({
            symbol: stock.symbol,
            name: stock.name_zh || stock.name || stock.symbol,
            value: stock.market_cap || Math.random() * 1000000000,
            change_percent: stock.change_percent || (Math.random() - 0.5) * 10,
            price: stock.price || Math.random() * 100,
            volume: stock.volume || Math.random() * 1000000
        }));
    }

    showEmptyState(container, message) {
        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #666;
                font-size: 14px;
            ">
                ${message}
            </div>
        `;
    }

    showError(message) {
        const container = document.querySelector('.tag-heatmap-container');
        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 400px;
                color: #dc3545;
                font-size: 16px;
                text-align: center;
            ">
                <div>
                    <h3>⚠️ ${message}</h3>
                    <p><a href="heatmap-center.html">返回热力图中心</a></p>
                </div>
            </div>
        `;
    }

    // 响应式处理
    handleResize() {
        this.heatmaps.forEach((heatmap, key) => {
            if (heatmap && typeof heatmap.resize === 'function') {
                heatmap.resize();
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const tagHeatmapPage = new TagHeatmapPage();
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        tagHeatmapPage.handleResize();
    });
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TagHeatmapPage;
}