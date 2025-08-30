/**
 * 全景热力图页面主控制器
 * 负责全景热力图和行业热力图的渲染与交互
 */
class PanoramicHeatmapController {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.panoramicHeatmap = null;
        this.sectorHeatmaps = new Map();
        this.currentMetric = 'change_percent';
        this.currentTimeframe = '1d';
        this.isFullscreen = false;
        
        this.init();
    }
    
    /**
     * 初始化控制器
     */
    async init() {
        try {
            this.setupEventListeners();
            this.handleUrlHash();
            await this.loadPanoramicData();
            await this.loadSectorData();
            this.updateLastRefreshTime();
        } catch (error) {
            console.error('初始化全景热力图失败:', error);
            this.showError('初始化失败，请刷新页面重试');
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 指标选择
        const metricSelect = document.getElementById('panoramic-metric');
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                this.currentMetric = e.target.value;
                this.refreshPanoramicHeatmap();
            });
        }
        
        // 时间范围选择
        const timeframeSelect = document.getElementById('panoramic-timeframe');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.currentTimeframe = e.target.value;
                this.refreshPanoramicHeatmap();
            });
        }
        
        // 刷新按钮
        const refreshBtn = document.getElementById('panoramic-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
            });
        }
        
        // 全屏按钮
        const fullscreenBtn = document.getElementById('panoramic-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
        
        // 关闭全屏
        const closeFullscreenBtn = document.getElementById('close-fullscreen');
        if (closeFullscreenBtn) {
            closeFullscreenBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }
        
        // 返回全景按钮
        const backToOverviewBtn = document.getElementById('back-to-overview');
        if (backToOverviewBtn) {
            backToOverviewBtn.addEventListener('click', () => {
                this.showOverview();
            });
        }
        
        // 行业卡片点击
        const sectorCards = document.querySelectorAll('.sector-card');
        sectorCards.forEach(card => {
            card.addEventListener('click', () => {
                const sector = card.dataset.sector;
                this.showFeaturedSector(sector);
            });
        });
        
        // 监听URL hash变化
        window.addEventListener('hashchange', () => {
            this.handleUrlHash();
        });
        
        // ESC键退出全屏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }
    
    /**
     * 加载全景热力图数据
     */
    async loadPanoramicData() {
        try {
            const container = document.getElementById('panoramic-heatmap');
            if (!container) return;
            
            // 显示加载状态
            this.showPanoramicLoading();
            
            // 创建热力图
            if (this.panoramicHeatmap) {
                this.panoramicHeatmap.destroy();
            }
            
            this.panoramicHeatmap = new StockHeatmap(container, {
                metric: this.currentMetric,
                timeRange: this.currentTimeframe,
                category: 'market',
                interactive: true,
                showTooltip: true,
                colorScheme: 'default'
            });
            
            // StockHeatmap会自动加载数据
            // 获取数据用于统计
            try {
                const marketData = await this.dataProcessor.getMarketData();
                const trendingData = await this.dataProcessor.getTrendingData();
                const allStocks = this.mergeStockData(marketData, trendingData);
                this.updatePanoramicStats(allStocks);
            } catch (error) {
                console.error('获取统计数据失败:', error);
            }
            
        } catch (error) {
            console.error('加载全景数据失败:', error);
            this.showPanoramicError('获取全景数据失败');
        }
    }
    
    /**
     * 加载行业数据
     */
    async loadSectorData() {
        const sectors = [
            'technology', 'financial', 'healthcare', 'consumer',
            'industrial', 'energy', 'materials', 'realestate',
            'communication', 'utilities', 'transportation', 'retail', 'agriculture'
        ];
        
        for (const sector of sectors) {
            try {
                await this.loadSectorHeatmap(sector);
            } catch (error) {
                console.error(`加载${sector}行业数据失败:`, error);
                this.showSectorError(sector);
            }
        }
    }
    
    /**
     * 加载单个行业热力图
     */
    async loadSectorHeatmap(sector) {
        const container = document.getElementById(`${sector}-heatmap`);
        if (!container) return;
        
        try {
            // 显示加载状态
            container.innerHTML = '<div class="mini-loading">加载中...</div>';
            
            // 获取行业数据（模拟）
            const sectorData = await this.getSectorData(sector);
            
            // 创建迷你热力图渲染器
            const miniRenderer = new HeatmapRenderer(container, {
                width: 200,
                height: 120,
                padding: 2,
                showLabels: false,
                interactive: false
            });
            
            miniRenderer.render(sectorData.stocks, this.currentMetric);
            
            // 更新行业统计
            this.updateSectorStats(sector, sectorData);
            
            // 保存引用
            this.sectorHeatmaps.set(sector, miniRenderer);
            
            // 添加点击事件
            const sectorCard = container.closest('.sector-card');
            if (sectorCard) {
                sectorCard.addEventListener('click', () => {
                    this.navigateToSectorFocus(sector);
                });
                sectorCard.style.cursor = 'pointer';
            }
            
        } catch (error) {
            console.error(`渲染${sector}行业热力图失败:`, error);
            container.innerHTML = '<div class="mini-error">加载失败</div>';
        }
    }
    
    /**
     * 获取行业数据（模拟）
     */
    async getSectorData(sector) {
        // 模拟行业数据
        const sectorMap = {
            technology: { name: '科技', stocks: this.generateMockSectorStocks(sector, 45) },
            financial: { name: '金融', stocks: this.generateMockSectorStocks(sector, 38) },
            healthcare: { name: '医疗健康', stocks: this.generateMockSectorStocks(sector, 32) },
            consumer: { name: '消费品', stocks: this.generateMockSectorStocks(sector, 28) },
            industrial: { name: '工业', stocks: this.generateMockSectorStocks(sector, 35) },
            energy: { name: '能源', stocks: this.generateMockSectorStocks(sector, 22) },
            materials: { name: '材料', stocks: this.generateMockSectorStocks(sector, 25) },
            realestate: { name: '房地产', stocks: this.generateMockSectorStocks(sector, 18) },
            communication: { name: '通信', stocks: this.generateMockSectorStocks(sector, 15) },
            utilities: { name: '公用事业', stocks: this.generateMockSectorStocks(sector, 12) },
            transportation: { name: '交通运输', stocks: this.generateMockSectorStocks(sector, 20) },
            retail: { name: '零售', stocks: this.generateMockSectorStocks(sector, 16) },
            agriculture: { name: '农业', stocks: this.generateMockSectorStocks(sector, 14) }
        };
        
        return sectorMap[sector] || { name: '未知', stocks: [] };
    }
    
    /**
     * 生成模拟行业股票数据
     */
    generateMockSectorStocks(sector, count) {
        const stocks = [];
        const sectorMultipliers = {
            technology: 1.2,
            financial: 0.8,
            healthcare: 1.1,
            consumer: 0.9,
            industrial: 0.7,
            energy: 1.5,
            materials: 1.3,
            realestate: 0.6,
            communication: 1.0,
            utilities: 0.5,
            transportation: 0.8,
            retail: 0.9,
            agriculture: 1.1
        };
        
        const multiplier = sectorMultipliers[sector] || 1.0;
        
        for (let i = 0; i < count; i++) {
            const baseChange = (Math.random() - 0.5) * 10 * multiplier;
            stocks.push({
                symbol: `${sector.toUpperCase()}${String(i + 1).padStart(3, '0')}`,
                name: `${sector}股票${i + 1}`,
                change_percent: baseChange,
                volume: Math.random() * 1000000,
                market_cap: Math.random() * 10000000000,
                turnover_rate: Math.random() * 15,
                sector: sector
            });
        }
        
        return stocks;
    }
    
    /**
     * 合并股票数据
     */
    mergeStockData(marketData, trendingData) {
        const allStocks = [];
        
        // 添加市场数据
        if (marketData && marketData.stocks) {
            allStocks.push(...marketData.stocks);
        }
        
        // 添加趋势数据
        if (trendingData && trendingData.rising) {
            allStocks.push(...trendingData.rising);
        }
        if (trendingData && trendingData.falling) {
            allStocks.push(...trendingData.falling);
        }
        
        // 去重
        const uniqueStocks = allStocks.filter((stock, index, self) => 
            index === self.findIndex(s => s.symbol === stock.symbol)
        );
        
        return uniqueStocks;
    }
    
    /**
     * 更新全景统计信息
     */
    updatePanoramicStats(stocks) {
        const risingCount = stocks.filter(s => s.change_percent > 0).length;
        const fallingCount = stocks.filter(s => s.change_percent < 0).length;
        const flatCount = stocks.filter(s => s.change_percent === 0).length;
        
        const risingElement = document.getElementById('panoramic-rising-count');
        const fallingElement = document.getElementById('panoramic-falling-count');
        const flatElement = document.getElementById('panoramic-flat-count');
        
        if (risingElement) risingElement.textContent = risingCount;
        if (fallingElement) fallingElement.textContent = fallingCount;
        if (flatElement) flatElement.textContent = flatCount;
    }
    
    /**
     * 更新行业统计信息
     */
    updateSectorStats(sector, sectorData) {
        const card = document.querySelector(`[data-sector="${sector}"]`);
        if (!card) return;
        
        const countElement = card.querySelector('.sector-count');
        const changeElement = card.querySelector('.sector-change');
        
        if (countElement) {
            countElement.textContent = `${sectorData.stocks.length}只`;
        }
        
        if (changeElement && sectorData.stocks.length > 0) {
            const avgChange = sectorData.stocks.reduce((sum, stock) => 
                sum + stock.change_percent, 0) / sectorData.stocks.length;
            
            changeElement.textContent = `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
            changeElement.className = `sector-change ${avgChange >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    /**
     * 刷新全景热力图
     */
    async refreshPanoramicHeatmap() {
        await this.loadPanoramicData();
    }
    
    /**
     * 刷新所有数据
     */
    async refreshAllData() {
        try {
            await Promise.all([
                this.loadPanoramicData(),
                this.loadSectorData()
            ]);
            this.updateLastRefreshTime();
        } catch (error) {
            console.error('刷新数据失败:', error);
            this.showError('刷新失败，请稍后重试');
        }
    }
    
    /**
     * 切换全屏模式
     */
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    /**
     * 进入全屏模式
     */
    async enterFullscreen() {
        const modal = document.getElementById('fullscreen-modal');
        const fullscreenContainer = document.getElementById('fullscreen-heatmap');
        
        if (!modal || !fullscreenContainer) return;
        
        this.isFullscreen = true;
        modal.classList.remove('hidden');
        
        // 创建全屏热力图
        try {
            const fullscreenHeatmap = new StockHeatmap(fullscreenContainer, {
                metric: this.currentMetric,
                timeRange: this.currentTimeframe,
                category: 'market',
                interactive: true,
                showTooltip: true,
                width: 1200,
                height: 800,
                colorScheme: 'default'
            });
            
            // StockHeatmap会自动加载和渲染数据
            
        } catch (error) {
            console.error('创建全屏热力图失败:', error);
            fullscreenContainer.innerHTML = '<div class="error-state">全屏模式加载失败</div>';
        }
    }
    
    /**
     * 退出全屏模式
     */
    exitFullscreen() {
        const modal = document.getElementById('fullscreen-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.isFullscreen = false;
    }
    
    /**
     * 处理URL锚点
     */
    handleUrlHash() {
        const hash = window.location.hash.substring(1);
        if (hash.startsWith('sector-')) {
            const sector = hash.replace('sector-', '');
            this.showFeaturedSector(sector);
        } else {
            this.showOverview();
        }
    }
    
    /**
     * 显示特定行业热力图
     */
    showFeaturedSector(sector) {
        // 更新URL hash
        window.location.hash = `sector-${sector}`;
        
        // 隐藏全景视图
        const overviewSection = document.getElementById('panoramic-overview');
        if (overviewSection) {
            overviewSection.style.display = 'none';
        }
        
        // 显示行业详情视图
        const sectorSection = document.getElementById('sector-detail');
        if (sectorSection) {
            sectorSection.style.display = 'block';
            this.loadSectorDetailHeatmap(sector);
        }
    }
    
    /**
     * 显示全景概览
     */
    showOverview() {
        // 清除URL hash
        window.location.hash = '';
        
        // 显示全景视图
        const overviewSection = document.getElementById('panoramic-overview');
        if (overviewSection) {
            overviewSection.style.display = 'block';
        }
        
        // 隐藏行业详情视图
        const sectorSection = document.getElementById('sector-detail');
        if (sectorSection) {
            sectorSection.style.display = 'none';
        }
    }
    
    /**
     * 加载行业详情热力图
     */
    async loadSectorDetailHeatmap(sector) {
        const container = document.getElementById('sector-detail-heatmap');
        if (!container) return;
        
        try {
            // 显示加载状态
            container.innerHTML = '<div class="loading-state">正在加载行业热力图...</div>';
            
            // 创建行业详情热力图
            const sectorHeatmap = new StockHeatmap(container, {
                metric: this.currentMetric,
                timeRange: this.currentTimeframe,
                category: 'sector',
                sector: sector,
                interactive: true,
                showTooltip: true,
                colorScheme: 'default'
            });
            
            // 更新行业标题
            const sectorTitle = document.getElementById('sector-detail-title');
            if (sectorTitle) {
                const sectorData = await this.getSectorData(sector);
                sectorTitle.textContent = `${sectorData.name}行业热力图`;
            }
            
        } catch (error) {
            console.error('加载行业详情热力图失败:', error);
            container.innerHTML = '<div class="error-state">加载失败，请重试</div>';
        }
    }
    
    /**
     * 导航到行业详情
     */
    navigateToSectorDetail(sector) {
        // 这里可以导航到具体的行业详情页面
        // 暂时跳转到热力图汇总页面
        window.location.href = `heatmap-center.html?sector=${sector}`;
    }
    
    /**
     * 导航到行业焦点视图
     */
    navigateToSectorFocus(sector) {
        // 更新URL hash
        window.location.hash = `#sector-${sector}`;
        
        // 触发特色内容显示
        if (window.featuredContentManager) {
            window.featuredContentManager.showFeaturedContent('sector', sector);
        }
    }
    
    /**
     * 显示全景加载状态
     */
    showPanoramicLoading() {
        const container = document.getElementById('panoramic-heatmap');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>正在加载全景热力图...</p>
                </div>
            `;
        }
    }
    
    /**
     * 显示全景错误状态
     */
    showPanoramicError(message) {
        const container = document.getElementById('panoramic-heatmap');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p class="error-message">${message}</p>
                    <button class="retry-btn" onclick="panoramicController.refreshPanoramicHeatmap()">重试</button>
                </div>
            `;
        }
    }
    
    /**
     * 显示行业错误状态
     */
    showSectorError(sector) {
        const container = document.getElementById(`${sector}-heatmap`);
        if (container) {
            container.innerHTML = '<div class="mini-error">加载失败</div>';
        }
    }
    
    /**
     * 显示通用错误
     */
    showError(message) {
        console.error(message);
        // 这里可以添加全局错误提示
    }
    
    /**
     * 更新最后刷新时间
     */
    updateLastRefreshTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN');
        console.log(`数据已刷新 - ${timeString}`);
    }
}

// 页面加载完成后初始化
let panoramicController;
document.addEventListener('DOMContentLoaded', () => {
    panoramicController = new PanoramicHeatmapController();
});

// 导出供全局使用
window.panoramicController = panoramicController;