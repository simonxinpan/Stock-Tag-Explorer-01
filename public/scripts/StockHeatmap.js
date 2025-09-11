// 股票热力图组件 - 整合数据处理和渲染功能

class StockHeatmap {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? 
            document.querySelector(container) : container;
        
        if (!this.container) {
            throw new Error('Container element not found');
        }
        
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            metric: options.metric || 'change_percent',
            category: options.category || 'market',
            timeRange: options.timeRange || '1d',
            autoRefresh: options.autoRefresh || false,
            refreshInterval: options.refreshInterval || 30000,
            showControls: options.showControls !== false,
            showLegend: options.showLegend !== false,
            interactive: options.interactive !== false,
            onCellClick: options.onCellClick || null,
            onCellHover: options.onCellHover || null,
            onDataUpdate: options.onDataUpdate || null,
            ...options
        };
        
        this.dataProcessor = new DataProcessor();
        this.renderer = null;
        this.currentData = [];
        this.refreshTimer = null;
        this.isLoading = false;
        
        this.initialize();
    }
    
    initialize() {
        this.createLayout();
        this.createRenderer();
        this.bindEvents();
        this.loadInitialData();
        
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
    }
    
    createLayout() {
        this.container.innerHTML = '';
        this.container.className = 'stock-heatmap-container';
        
        // 创建控制面板
        if (this.options.showControls) {
            this.controlsContainer = document.createElement('div');
            this.controlsContainer.className = 'heatmap-controls';
            this.createControls();
            this.container.appendChild(this.controlsContainer);
        }
        
        // 创建主要内容区域
        this.mainContainer = document.createElement('div');
        this.mainContainer.className = 'heatmap-main';
        
        // 创建热力图容器
        this.heatmapContainer = document.createElement('div');
        this.heatmapContainer.className = 'heatmap-canvas';
        this.heatmapContainer.style.cssText = `
            width: ${this.options.width}px;
            height: ${this.options.height}px;
            position: relative;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        `;
        
        this.mainContainer.appendChild(this.heatmapContainer);
        
        // 创建图例
        if (this.options.showLegend) {
            this.legendContainer = document.createElement('div');
            this.legendContainer.className = 'heatmap-legend';
            this.createLegend();
            this.mainContainer.appendChild(this.legendContainer);
        }
        
        this.container.appendChild(this.mainContainer);
        
        // 创建加载状态
        this.createLoadingState();
        
        // 添加样式
        this.addStyles();
    }
    
    createControls() {
        this.controlsContainer.innerHTML = `
            <div class="heatmap-controls-row">
                <div class="control-group">
                    <label>类别:</label>
                    <select class="category-select">
                        <option value="market">市场全景</option>
                        <option value="industry">分行业</option>
                        <option value="tag">投资标签</option>
                        <option value="trending">趋势榜单</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>指标:</label>
                    <select class="metric-select">
                        <option value="change_percent">涨跌幅</option>
                        <option value="volume">成交量</option>
                        <option value="market_cap">市值</option>
                        <option value="price">价格</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>时间:</label>
                    <select class="timerange-select">
                        <option value="1d">1天</option>
                        <option value="1w">1周</option>
                        <option value="1m">1月</option>
                        <option value="3m">3月</option>
                        <option value="1y">1年</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <button class="refresh-btn">刷新</button>
                    <button class="fullscreen-btn">全屏</button>
                </div>
            </div>
        `;
        
        // 设置默认值
        this.controlsContainer.querySelector('.category-select').value = this.options.category;
        this.controlsContainer.querySelector('.metric-select').value = this.options.metric;
        this.controlsContainer.querySelector('.timerange-select').value = this.options.timeRange;
    }
    
    createLegend() {
        this.legendContainer.innerHTML = `
            <div class="legend-title">图例</div>
            <div class="legend-content">
                <div class="legend-color-scale">
                    <div class="legend-item">
                        <div class="legend-color" style="background: #d32f2f;"></div>
                        <span>强涨 (>6%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #f44336;"></div>
                        <span>上涨 (3-6%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #ff9800;"></div>
                        <span>微涨 (1-3%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #9e9e9e;"></div>
                        <span>平盘 (±1%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #2196f3;"></div>
                        <span>微跌 (-1~-3%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #1976d2;"></div>
                        <span>下跌 (-3~-6%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #0d47a1;"></div>
                        <span>重跌 (<-6%)</span>
                    </div>
                </div>
                <div class="legend-stats">
                    <div class="stat-item">
                        <span class="stat-label">总数:</span>
                        <span class="stat-value" id="total-count">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">上涨:</span>
                        <span class="stat-value" id="up-count">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">下跌:</span>
                        <span class="stat-value" id="down-count">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">平盘:</span>
                        <span class="stat-value" id="flat-count">-</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    createLoadingState() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'heatmap-loading';
        this.loadingOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;
        
        this.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">加载中...</div>
            </div>
        `;
        
        this.heatmapContainer.appendChild(this.loadingOverlay);
    }
    
    createRenderer() {
        const rendererOptions = {
            width: this.options.width,
            height: this.options.height,
            interactive: this.options.interactive,
            onCellClick: (data, index) => {
                if (this.options.onCellClick) {
                    this.options.onCellClick(data, index);
                }
                this.handleCellClick(data, index);
            },
            onCellHover: (data, index) => {
                if (this.options.onCellHover) {
                    this.options.onCellHover(data, index);
                }
            }
        };
        
        this.renderer = new HeatmapRenderer(this.heatmapContainer, rendererOptions);
    }
    
    bindEvents() {
        if (!this.controlsContainer) return;
        
        // 类别选择
        const categorySelect = this.controlsContainer.querySelector('.category-select');
        categorySelect?.addEventListener('change', (e) => {
            this.updateCategory(e.target.value);
        });
        
        // 指标选择
        const metricSelect = this.controlsContainer.querySelector('.metric-select');
        metricSelect?.addEventListener('change', (e) => {
            this.updateMetric(e.target.value);
        });
        
        // 时间范围选择
        const timerangeSelect = this.controlsContainer.querySelector('.timerange-select');
        timerangeSelect?.addEventListener('change', (e) => {
            this.updateTimeRange(e.target.value);
        });
        
        // 刷新按钮
        const refreshBtn = this.controlsContainer.querySelector('.refresh-btn');
        refreshBtn?.addEventListener('click', () => {
            this.refresh();
        });
        
        // 全屏按钮
        const fullscreenBtn = this.controlsContainer.querySelector('.fullscreen-btn');
        fullscreenBtn?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .stock-heatmap-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .heatmap-controls {
                padding: 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }
            
            .heatmap-controls-row {
                display: flex;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            .control-group {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .control-group label {
                font-size: 14px;
                font-weight: 500;
                color: #495057;
                white-space: nowrap;
            }
            
            .control-group select {
                padding: 6px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                background: white;
                min-width: 100px;
            }
            
            .control-group button {
                padding: 6px 16px;
                border: 1px solid #007bff;
                border-radius: 4px;
                background: #007bff;
                color: white;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .control-group button:hover {
                background: #0056b3;
                border-color: #0056b3;
            }
            
            .heatmap-main {
                padding: 16px;
            }
            
            .heatmap-legend {
                margin-top: 16px;
                padding: 16px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .legend-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                color: #212529;
            }
            
            .legend-content {
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
            }
            
            .legend-color-scale {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
            }
            
            .legend-color {
                width: 16px;
                height: 16px;
                border-radius: 2px;
                border: 1px solid rgba(0,0,0,0.1);
            }
            
            .legend-stats {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
            }
            
            .stat-label {
                color: #6c757d;
            }
            
            .stat-value {
                font-weight: 600;
                color: #212529;
            }
            
            .loading-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 8px;
            }
            
            .loading-text {
                color: #6c757d;
                font-size: 14px;
            }
            
            .loading-content {
                text-align: center;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .heatmap-loading.show {
                opacity: 1;
                visibility: visible;
            }
            
            @media (max-width: 768px) {
                .heatmap-controls-row {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px;
                }
                
                .control-group {
                    justify-content: space-between;
                }
                
                .legend-content {
                    flex-direction: column;
                    gap: 16px;
                }
            }
        `;
        
        if (!document.querySelector('#stock-heatmap-styles')) {
            style.id = 'stock-heatmap-styles';
            document.head.appendChild(style);
        }
    }
    
    async loadInitialData() {
        await this.loadData();
    }
    
    async loadData() {
        if (this.isLoading) return;
        
        this.showLoading();
        this.isLoading = true;
        
        try {
            let data;
            
            switch (this.options.category) {
                case 'market':
                    data = await this.dataProcessor.getMarketData(this.options.timeRange);
                    break;
                case 'industry':
                    data = await this.dataProcessor.getIndustryData(this.options.timeRange);
                    break;
                case 'tag':
                    data = await this.dataProcessor.getTagData(this.options.timeRange);
                    break;
                case 'trending':
                    data = await this.dataProcessor.getTrendingData(this.options.timeRange);
                    break;
                default:
                    data = await this.dataProcessor.getMarketData(this.options.timeRange);
            }
            
            this.currentData = data;
            this.renderer.render(data, this.options.metric);
            this.updateLegendStats(data);
            
            if (this.options.onDataUpdate) {
                this.options.onDataUpdate(data);
            }
            
        } catch (error) {
            console.error('Failed to load heatmap data:', error);
            this.showError('数据加载失败，请稍后重试');
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }
    
    updateLegendStats(data) {
        if (!this.legendContainer) return;
        
        const stats = this.calculateStats(data);
        
        const totalCount = this.legendContainer.querySelector('#total-count');
        const upCount = this.legendContainer.querySelector('#up-count');
        const downCount = this.legendContainer.querySelector('#down-count');
        const flatCount = this.legendContainer.querySelector('#flat-count');
        
        if (totalCount) totalCount.textContent = stats.total;
        if (upCount) upCount.textContent = stats.up;
        if (downCount) downCount.textContent = stats.down;
        if (flatCount) flatCount.textContent = stats.flat;
    }
    
    calculateStats(data) {
        const stats = { total: 0, up: 0, down: 0, flat: 0 };
        
        data.forEach(item => {
            const value = this.renderer.getValue(item, this.options.metric);
            stats.total++;
            
            if (value > 0.1) stats.up++;
            else if (value < -0.1) stats.down++;
            else stats.flat++;
        });
        
        return stats;
    }
    
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('show');
        }
    }
    
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('show');
        }
    }
    
    showError(message) {
        // 可以实现错误提示逻辑
        console.error(message);
    }
    
    handleCellClick(data, index) {
        // 默认点击处理逻辑
        if (data.symbol) {
            // 跳转到生产服务器上的股票详情页
            window.open(`https://stock-details-final.vercel.app/?symbol=${data.symbol}`, '_blank');
        } else if (data.tag) {
            // 跳转到标签详情页
            window.open(`/tag/${data.tag}`, '_blank');
        } else if (data.industry) {
            // 跳转到行业页面
            window.open(`/industry/${data.industry}`, '_blank');
        }
    }
    
    // 公共方法
    updateCategory(category) {
        this.options.category = category;
        this.loadData();
    }
    
    updateMetric(metric) {
        this.options.metric = metric;
        if (this.currentData.length > 0) {
            this.renderer.updateMetric(metric);
            this.updateLegendStats(this.currentData);
        }
    }
    
    updateTimeRange(timeRange) {
        this.options.timeRange = timeRange;
        this.loadData();
    }
    
    refresh() {
        this.loadData();
    }
    
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.container.requestFullscreen();
        }
    }
    
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, this.options.refreshInterval);
    }
    
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    
    resize(width, height) {
        this.options.width = width;
        this.options.height = height;
        
        this.heatmapContainer.style.width = width + 'px';
        this.heatmapContainer.style.height = height + 'px';
        
        if (this.renderer) {
            this.renderer.resize(width, height);
        }
    }
    
    exportImage(filename) {
        if (this.renderer) {
            this.renderer.exportAsImage(filename);
        }
    }
    
    getData() {
        return this.currentData;
    }
    
    getOptions() {
        return { ...this.options };
    }
    
    destroy() {
        this.stopAutoRefresh();
        
        if (this.renderer) {
            this.renderer.destroy();
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockHeatmap;
} else {
    window.StockHeatmap = StockHeatmap;
}