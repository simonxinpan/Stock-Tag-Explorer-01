// 增强版趋势榜单页面 - 热力图集成功能

class TrendingEnhanced {
    constructor() {
        this.stockHeatmap = null;
        this.currentTrends = [];
        this.currentStocks = [];
        this.heatmapVisible = true;
        this.syncWithHeatmap = true;
        this.selectedCategory = 'all';
        
        this.init();
    }
    
    async init() {
        try {
            // 初始化页面
            this.initializeUI();
            this.bindEvents();
            
            // 加载数据
            await this.loadTrendingData();
            await this.loadMarketOverview();
            await this.loadHotTags();
            await this.initializeHeatmap();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('页面初始化失败');
        }
    }
    
    initializeUI() {
        // 设置页面标题
        document.title = '趋势风云榜 - Stock Tag Explorer';
        
        // 初始化统计显示
        this.updateTrendsStats();
    }
    
    bindEvents() {
        // 热力图控制器事件
        document.getElementById('heatmap-category')?.addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.updateHeatmapCategory(e.target.value);
        });
        
        document.getElementById('heatmap-metric')?.addEventListener('change', (e) => {
            this.updateHeatmapMetric(e.target.value);
        });
        
        document.getElementById('heatmap-timeframe')?.addEventListener('change', (e) => {
            this.updateHeatmapTimeframe(e.target.value);
        });
        
        document.getElementById('refresh-heatmap')?.addEventListener('click', () => {
            this.refreshHeatmap();
        });
        
        document.getElementById('fullscreen-heatmap')?.addEventListener('click', () => {
            this.openFullscreenHeatmap();
        });
        
        // 热力图切换按钮
        document.getElementById('toggle-heatmap')?.addEventListener('click', () => {
            this.toggleHeatmapView();
        });
        
        // 过滤器事件
        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });
        
        document.getElementById('timeframe-filter')?.addEventListener('change', (e) => {
            this.filterByTimeframe(e.target.value);
        });
        
        document.getElementById('sort-filter')?.addEventListener('change', (e) => {
            this.sortTrends(e.target.value);
        });
        
        // 同步控制
        document.getElementById('sync-with-heatmap')?.addEventListener('change', (e) => {
            this.syncWithHeatmap = e.target.checked;
            if (this.syncWithHeatmap) {
                this.syncTrendListWithHeatmap();
            }
        });
        
        // 视图切换
        document.getElementById('grid-view')?.addEventListener('click', () => {
            this.setViewMode('grid');
        });
        
        document.getElementById('list-view')?.addEventListener('click', () => {
            this.setViewMode('list');
        });
    }
    
    async loadTrendingData() {
        try {
            // 模拟API调用 - 获取趋势数据
            const response = await fetch('/api/trending/lists');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.currentTrends = data.trends || [];
            
            // 提取所有股票数据用于热力图
            this.currentStocks = this.extractStocksFromTrends(this.currentTrends);
            
            // 更新统计信息
            this.updateTrendsStats();
            
            // 渲染趋势列表
            this.renderTrendingLists();
            
        } catch (error) {
            console.error('加载趋势数据失败:', error);
            // 使用模拟数据
            this.currentTrends = this.generateMockTrendingData();
            this.currentStocks = this.extractStocksFromTrends(this.currentTrends);
            this.updateTrendsStats();
            this.renderTrendingLists();
        }
    }
    
    async loadMarketOverview() {
        try {
            // 模拟API调用 - 获取市场概览数据
            const response = await fetch('/api/market/overview');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.updateMarketOverview(data);
            
        } catch (error) {
            console.error('加载市场概览失败:', error);
            // 使用模拟数据
            this.updateMarketOverview(this.generateMockMarketData());
        }
    }
    
    async loadHotTags() {
        try {
            // 模拟API调用 - 获取热门标签
            const response = await fetch('/api/tags/hot');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.renderHotTags(data.tags || []);
            
        } catch (error) {
            console.error('加载热门标签失败:', error);
            // 使用模拟数据
            this.renderHotTags(this.generateMockHotTags());
        }
    }
    
    async initializeHeatmap() {
        try {
            const heatmapContainer = document.getElementById('trending-heatmap');
            if (!heatmapContainer) return;
            
            // 创建热力图实例
            this.stockHeatmap = new StockHeatmap(heatmapContainer, {
                width: heatmapContainer.offsetWidth - 20,
                height: 300,
                metric: 'change_percent',
                category: 'trending',
                timeRange: '1d',
                interactive: true,
                showTooltip: true,
                onCellClick: (stock) => this.onHeatmapCellClick(stock),
                onCellHover: (stock) => this.onHeatmapCellHover(stock)
            });
            
            // 更新图例和统计信息
            this.updateHeatmapLegend();
            this.updateHeatmapStats();
            
            // 标记为已加载
            heatmapContainer.classList.add('loaded');
            
        } catch (error) {
            console.error('初始化热力图失败:', error);
            this.showHeatmapError('热力图加载失败');
        }
    }
    
    async updateHeatmapCategory(category) {
        if (!this.stockHeatmap) return;
        
        try {
            // 根据类别过滤股票数据
            let filteredStocks = this.currentStocks;
            if (category !== 'all') {
                filteredStocks = this.currentStocks.filter(stock => 
                    stock.category === category || stock.categories?.includes(category)
                );
            }
            
            await this.stockHeatmap.updateData(filteredStocks);
            this.updateHeatmapStats();
            
            // 同步趋势列表
            if (this.syncWithHeatmap) {
                this.filterByCategory(category);
            }
            
        } catch (error) {
            console.error('更新热力图类别失败:', error);
            this.showToast('更新类别失败', 'error');
        }
    }
    
    async updateHeatmapMetric(metric) {
        if (!this.stockHeatmap) return;
        
        try {
            await this.stockHeatmap.updateMetric(metric);
            this.updateHeatmapLegend();
            this.updateHeatmapStats();
        } catch (error) {
            console.error('更新热力图指标失败:', error);
            this.showToast('更新指标失败', 'error');
        }
    }
    
    async updateHeatmapTimeframe(timeframe) {
        if (!this.stockHeatmap) return;
        
        try {
            await this.stockHeatmap.updateTimeframe(timeframe);
            this.updateHeatmapStats();
        } catch (error) {
            console.error('更新热力图时间范围失败:', error);
            this.showToast('更新时间范围失败', 'error');
        }
    }
    
    async refreshHeatmap() {
        if (!this.stockHeatmap) return;
        
        try {
            // 显示加载状态
            this.showHeatmapLoading();
            
            // 重新加载数据
            await this.loadTrendingData();
            
            // 更新热力图数据
            await this.stockHeatmap.updateData(this.currentStocks);
            
            // 更新统计信息
            this.updateTrendsStats();
            this.updateHeatmapStats();
            
            this.showToast('热力图已刷新', 'success');
            
        } catch (error) {
            console.error('刷新热力图失败:', error);
            this.showToast('刷新失败', 'error');
        } finally {
            this.hideHeatmapLoading();
        }
    }
    
    openFullscreenHeatmap() {
        const modal = document.getElementById('heatmap-modal');
        const container = document.getElementById('fullscreen-heatmap-container');
        
        if (!modal || !container) return;
        
        try {
            // 显示模态框
            modal.classList.remove('hidden');
            
            // 创建全屏热力图
            const fullscreenHeatmap = new StockHeatmap({
                container: container,
                data: this.currentStocks,
                metric: document.getElementById('heatmap-metric')?.value || 'change_percent',
                timeframe: document.getElementById('heatmap-timeframe')?.value || '1d',
                interactive: true,
                showTooltip: true,
                fullscreen: true,
                groupBy: 'category'
            });
            
            fullscreenHeatmap.render();
            
        } catch (error) {
            console.error('打开全屏热力图失败:', error);
            this.showToast('无法打开全屏视图', 'error');
        }
    }
    
    closeHeatmapModal() {
        const modal = document.getElementById('heatmap-modal');
        if (modal) {
            modal.classList.add('hidden');
            
            // 清空容器
            const container = document.getElementById('fullscreen-heatmap-container');
            if (container) {
                container.innerHTML = '';
            }
        }
    }
    
    toggleHeatmapView() {
        const section = document.getElementById('heatmap-section');
        const toggleBtn = document.getElementById('toggle-heatmap');
        
        if (!section || !toggleBtn) return;
        
        this.heatmapVisible = !this.heatmapVisible;
        
        if (this.heatmapVisible) {
            section.style.display = 'block';
            toggleBtn.classList.add('active');
            toggleBtn.querySelector('.toggle-text').textContent = '热力图视图';
        } else {
            section.style.display = 'none';
            toggleBtn.classList.remove('active');
            toggleBtn.querySelector('.toggle-text').textContent = '显示热力图';
        }
    }
    
    onHeatmapCellClick(stock) {
        // 点击热力图单元格时的处理
        if (this.syncWithHeatmap) {
            this.highlightTrendInList(stock);
        }
        
        // 显示股票详情或跳转到相关页面
        this.showStockDetails(stock);
    }
    
    onHeatmapCellHover(stock) {
        // 悬停热力图单元格时的处理
        if (this.syncWithHeatmap) {
            this.previewTrendInList(stock);
        }
    }
    
    highlightTrendInList(stock) {
        // 在趋势列表中高亮显示相关趋势
        const trendElements = document.querySelectorAll('.trend-card');
        trendElements.forEach(el => {
            el.classList.remove('highlighted');
            const trendStocks = JSON.parse(el.dataset.stocks || '[]');
            if (trendStocks.some(s => s.symbol === stock.symbol)) {
                el.classList.add('highlighted');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
    
    previewTrendInList(stock) {
        // 在趋势列表中预览相关趋势
        const trendElements = document.querySelectorAll('.trend-card');
        trendElements.forEach(el => {
            el.classList.remove('preview');
            const trendStocks = JSON.parse(el.dataset.stocks || '[]');
            if (trendStocks.some(s => s.symbol === stock.symbol)) {
                el.classList.add('preview');
            }
        });
    }
    
    syncTrendListWithHeatmap() {
        // 同步趋势列表与热力图的显示
        if (!this.stockHeatmap || !this.syncWithHeatmap) return;
        
        const sortedStocks = this.stockHeatmap.getSortedData();
        this.reorderTrendList(sortedStocks);
    }
    
    reorderTrendList(sortedStocks) {
        // 重新排序趋势列表
        const trendList = document.getElementById('trending-lists');
        if (!trendList) return;
        
        // 根据热力图中股票的表现重新排序趋势
        const trendCards = Array.from(trendList.querySelectorAll('.trend-card'));
        
        trendCards.sort((a, b) => {
            const aStocks = JSON.parse(a.dataset.stocks || '[]');
            const bStocks = JSON.parse(b.dataset.stocks || '[]');
            
            const aAvgPerformance = this.calculateTrendPerformance(aStocks, sortedStocks);
            const bAvgPerformance = this.calculateTrendPerformance(bStocks, sortedStocks);
            
            return bAvgPerformance - aAvgPerformance;
        });
        
        // 重新添加到DOM
        trendCards.forEach(card => trendList.appendChild(card));
    }
    
    calculateTrendPerformance(trendStocks, sortedStocks) {
        // 计算趋势的平均表现
        let totalPerformance = 0;
        let count = 0;
        
        trendStocks.forEach(trendStock => {
            const sortedStock = sortedStocks.find(s => s.symbol === trendStock.symbol);
            if (sortedStock && typeof sortedStock.change_percent === 'number') {
                totalPerformance += sortedStock.change_percent;
                count++;
            }
        });
        
        return count > 0 ? totalPerformance / count : 0;
    }
    
    filterByCategory(category) {
        // 按类别过滤趋势
        const trendCards = document.querySelectorAll('.trend-card');
        
        trendCards.forEach(card => {
            const cardCategory = card.dataset.category;
            if (category === 'all' || cardCategory === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        
        this.updateTrendsStats();
    }
    
    filterByTimeframe(timeframe) {
        // 按时间范围过滤趋势
        // 这里可以实现时间范围过滤逻辑
        this.showToast(`已切换到${timeframe}时间范围`, 'info');
    }
    
    sortTrends(sortBy) {
        // 排序趋势
        const trendList = document.getElementById('trending-lists');
        if (!trendList) return;
        
        const trendCards = Array.from(trendList.querySelectorAll('.trend-card'));
        
        trendCards.sort((a, b) => {
            const [field, direction] = sortBy.split('-');
            const aValue = this.getTrendSortValue(a, field);
            const bValue = this.getTrendSortValue(b, field);
            
            if (direction === 'desc') {
                return bValue - aValue;
            } else {
                return aValue - bValue;
            }
        });
        
        // 重新添加到DOM
        trendCards.forEach(card => trendList.appendChild(card));
    }
    
    getTrendSortValue(trendCard, field) {
        // 获取趋势卡片的排序值
        switch (field) {
            case 'popularity':
                return parseInt(trendCard.dataset.popularity || '0');
            case 'change':
                return parseFloat(trendCard.dataset.change || '0');
            case 'volume':
                return parseInt(trendCard.dataset.volume || '0');
            default:
                return 0;
        }
    }
    
    setViewMode(mode) {
        const trendList = document.getElementById('trending-lists');
        const gridBtn = document.getElementById('grid-view');
        const listBtn = document.getElementById('list-view');
        
        if (!trendList) return;
        
        if (mode === 'grid') {
            trendList.classList.remove('list-view');
            trendList.classList.add('grid-view');
            gridBtn?.classList.add('active');
            listBtn?.classList.remove('active');
        } else {
            trendList.classList.remove('grid-view');
            trendList.classList.add('list-view');
            listBtn?.classList.add('active');
            gridBtn?.classList.remove('active');
        }
    }
    
    renderTrendingLists() {
        const container = document.getElementById('trending-lists');
        if (!container) return;
        
        container.innerHTML = this.currentTrends.map(trend => this.createTrendCard(trend)).join('');
    }
    
    createTrendCard(trend) {
        const avgChange = this.calculateAverageChange(trend.stocks);
        const totalVolume = this.calculateTotalVolume(trend.stocks);
        
        return `
            <div class="trend-card" 
                 data-category="${trend.category}"
                 data-popularity="${trend.popularity}"
                 data-change="${avgChange}"
                 data-volume="${totalVolume}"
                 data-trend-id="${trend.id}"
                 data-stocks='${JSON.stringify(trend.stocks)}'
                 onclick="navigateToTrendFocus('${trend.id}')" 
                 style="cursor: pointer;">
                <div class="trend-header">
                    <div class="trend-title-group">
                        <h4 class="trend-title">${trend.title}</h4>
                        <span class="trend-category">${this.getCategoryDisplayName(trend.category)}</span>
                    </div>
                    <div class="trend-stats">
                        <span class="trend-change ${avgChange >= 0 ? 'positive' : 'negative'}">
                            ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%
                        </span>
                    </div>
                </div>
                
                <div class="trend-description">
                    <p>${trend.description}</p>
                </div>
                
                <div class="trend-stocks">
                    <div class="stocks-preview">
                        ${trend.stocks.slice(0, 5).map(stock => `
                            <div class="stock-preview" onclick="showStockDetails('${stock.symbol}')">
                                <span class="stock-symbol">${stock.symbol}</span>
                                <span class="stock-change ${stock.change_percent >= 0 ? 'positive' : 'negative'}">
                                    ${stock.change_percent >= 0 ? '+' : ''}${stock.change_percent.toFixed(2)}%
                                </span>
                            </div>
                        `).join('')}
                        ${trend.stocks.length > 5 ? `<div class="more-stocks">+${trend.stocks.length - 5} 更多</div>` : ''}
                    </div>
                </div>
                
                <div class="trend-actions">
                    <button class="btn-view-heatmap" onclick="viewTrendHeatmap('${trend.id}')">
                        <span class="btn-icon">🔥</span>
                        <span class="btn-text">查看热力图</span>
                    </button>
                    <button class="btn-view-details" onclick="viewTrendDetails('${trend.id}')">
                        <span class="btn-icon">📊</span>
                        <span class="btn-text">详细分析</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    calculateAverageChange(stocks) {
        if (!stocks || stocks.length === 0) return 0;
        const total = stocks.reduce((sum, stock) => sum + (stock.change_percent || 0), 0);
        return total / stocks.length;
    }
    
    calculateTotalVolume(stocks) {
        if (!stocks || stocks.length === 0) return 0;
        return stocks.reduce((sum, stock) => sum + (stock.volume || 0), 0);
    }
    
    getCategoryDisplayName(category) {
        const categoryNames = {
            'gainers': '涨幅榜',
            'losers': '跌幅榜',
            'volume': '成交量榜',
            'market_cap': '市值榜',
            'sector': '行业榜'
        };
        return categoryNames[category] || category;
    }
    
    updateMarketOverview(data) {
        document.getElementById('market-gainers').textContent = data.gainers || '-';
        document.getElementById('market-losers').textContent = data.losers || '-';
        document.getElementById('market-volume').textContent = this.formatNumber(data.volume || 0);
        
        const changeElement = document.getElementById('market-change');
        if (changeElement && typeof data.change === 'number') {
            changeElement.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
            changeElement.className = `market-stat-number ${data.change >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    renderHotTags(tags) {
        const container = document.getElementById('hot-tags');
        if (!container) return;
        
        container.innerHTML = tags.map(tag => `
            <a href="tag-detail-enhanced.html?tag=${encodeURIComponent(tag.name)}" class="hot-tag">
                <span class="tag-name">${tag.name}</span>
                <span class="tag-count">${tag.count}</span>
            </a>
        `).join('');
    }
    
    updateHeatmapLegend() {
        const legendContainer = document.getElementById('heatmap-legend-scale');
        if (!legendContainer || !this.stockHeatmap) return;
        
        // 使用StockHeatmap内置的图例更新功能
        this.stockHeatmap.updateLegendStats(this.currentStocks || []);
    }
    
    updateHeatmapStats() {
        if (!this.currentStocks.length) return;
        
        const metric = document.getElementById('heatmap-metric')?.value || 'change_percent';
        
        let bestPerformer = null;
        let worstPerformer = null;
        let total = 0;
        let count = 0;
        
        this.currentStocks.forEach(stock => {
            const value = stock[metric];
            if (typeof value === 'number') {
                if (!bestPerformer || value > bestPerformer[metric]) {
                    bestPerformer = stock;
                }
                if (!worstPerformer || value < worstPerformer[metric]) {
                    worstPerformer = stock;
                }
                total += value;
                count++;
            }
        });
        
        // 更新统计显示
        const bestElement = document.getElementById('best-performer');
        const worstElement = document.getElementById('worst-performer');
        const avgElement = document.getElementById('average-change');
        const totalListsElement = document.getElementById('total-lists');
        
        if (bestElement && bestPerformer) {
            bestElement.textContent = `${bestPerformer.name} (${this.formatValue(bestPerformer[metric], metric)})`;
        }
        
        if (worstElement && worstPerformer) {
            worstElement.textContent = `${worstPerformer.name} (${this.formatValue(worstPerformer[metric], metric)})`;
        }
        
        if (avgElement && count > 0) {
            const average = total / count;
            avgElement.textContent = this.formatValue(average, metric);
            avgElement.className = `stat-value ${average >= 0 ? 'positive' : 'negative'}`;
        }
        
        if (totalListsElement) {
            totalListsElement.textContent = this.currentTrends.length;
        }
    }
    
    updateTrendsStats() {
        const totalDisplay = document.getElementById('total-trends-display');
        if (totalDisplay) {
            const visibleTrends = document.querySelectorAll('.trend-card:not([style*="display: none"])');
            totalDisplay.textContent = `总计 ${visibleTrends.length} 个趋势`;
        }
    }
    
    extractStocksFromTrends(trends) {
        // 从趋势数据中提取所有股票
        const stocksMap = new Map();
        
        trends.forEach(trend => {
            trend.stocks.forEach(stock => {
                if (!stocksMap.has(stock.symbol)) {
                    stocksMap.set(stock.symbol, {
                        ...stock,
                        category: trend.category,
                        categories: [trend.category]
                    });
                } else {
                    // 如果股票已存在，添加类别
                    const existingStock = stocksMap.get(stock.symbol);
                    if (!existingStock.categories.includes(trend.category)) {
                        existingStock.categories.push(trend.category);
                    }
                }
            });
        });
        
        return Array.from(stocksMap.values());
    }
    
    showStockDetails(stock) {
        // 显示股票详情
        this.showToast(`查看 ${stock.name || stock.symbol} 详情`, 'info');
    }
    
    showHeatmapLoading() {
        const container = document.getElementById('trending-heatmap');
        if (!container) return;
        
        const loading = document.createElement('div');
        loading.className = 'heatmap-loading';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>正在更新热力图...</p>
        `;
        
        container.appendChild(loading);
    }
    
    hideHeatmapLoading() {
        const loading = document.querySelector('.heatmap-loading');
        if (loading) {
            loading.remove();
        }
    }
    
    showHeatmapError(message) {
        const container = document.getElementById('trending-heatmap');
        if (!container) return;
        
        container.innerHTML = `
            <div class="heatmap-placeholder">
                <div class="placeholder-icon">⚠️</div>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">重新加载</button>
            </div>
        `;
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast-message');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast-message ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
    
    showError(message) {
        const errorElement = document.getElementById('error');
        const errorMessage = document.getElementById('error-message');
        
        if (errorElement && errorMessage) {
            errorMessage.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }
    
    formatValue(value, metric) {
        if (typeof value !== 'number') return '-';
        
        switch (metric) {
            case 'change_percent':
                return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
            case 'volume':
                return this.formatNumber(value);
            case 'market_cap':
                return this.formatMarketCap(value);
            case 'price':
                return `$${value.toFixed(2)}`;
            default:
                return value.toFixed(2);
        }
    }
    
    formatNumber(num) {
        if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toString();
    }
    
    formatMarketCap(value) {
        if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        return `$${value.toFixed(0)}`;
    }
    
    generateMockTrendingData() {
        // 生成模拟趋势数据
        return [
            {
                id: 'trend-1',
                title: '科技股强势反弹',
                category: 'gainers',
                description: '科技板块领涨，AI概念股表现突出',
                popularity: 95,
                stocks: this.generateMockStocks(['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'])
            },
            {
                id: 'trend-2',
                title: '能源股承压下跌',
                category: 'losers',
                description: '油价下跌拖累能源板块整体表现',
                popularity: 78,
                stocks: this.generateMockStocks(['XOM', 'CVX', 'COP', 'EOG', 'SLB'])
            },
            {
                id: 'trend-3',
                title: '成交量活跃股票',
                category: 'volume',
                description: '市场关注度高，交易活跃的热门股票',
                popularity: 88,
                stocks: this.generateMockStocks(['AMC', 'GME', 'PLTR', 'NIO', 'RIVN'])
            }
        ];
    }
    
    generateMockStocks(symbols) {
        return symbols.map(symbol => ({
            symbol: symbol,
            name: `${symbol} Inc.`,
            price: 50 + Math.random() * 200,
            change_percent: (Math.random() - 0.5) * 10,
            volume: Math.floor(Math.random() * 10000000),
            market_cap: Math.floor(Math.random() * 1000000000000)
        }));
    }
    
    generateMockMarketData() {
        return {
            gainers: Math.floor(Math.random() * 2000) + 1000,
            losers: Math.floor(Math.random() * 1500) + 800,
            volume: Math.floor(Math.random() * 50000000000) + 10000000000,
            change: (Math.random() - 0.5) * 4
        };
    }
    
    generateMockHotTags() {
        const tags = ['AI人工智能', '新能源汽车', '半导体', '生物医药', '云计算', '5G通信', '新材料', '消费电子'];
        return tags.map(name => ({
            name: name,
            count: Math.floor(Math.random() * 100) + 20
        }));
    }
}

// 全局函数
function toggleHeatmapView() {
    if (window.trendingEnhanced) {
        window.trendingEnhanced.toggleHeatmapView();
    }
}

function exportHeatmap() {
    if (window.trendingEnhanced && window.trendingEnhanced.stockHeatmap) {
        window.trendingEnhanced.stockHeatmap.exportAsImage();
    }
}

function shareHeatmap() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            window.trendingEnhanced?.showToast('链接已复制到剪贴板', 'success');
        });
    }
}

function compareCategories() {
    window.open('/heatmap-center.html', '_blank');
}

function closeHeatmapModal() {
    if (window.trendingEnhanced) {
        window.trendingEnhanced.closeHeatmapModal();
    }
}

function viewTrendHeatmap(trendId) {
    // 查看特定趋势的热力图
    window.trendingEnhanced?.showToast('正在加载趋势热力图...', 'info');
}

function viewTrendDetails(trendId) {
    // 查看趋势详情
    window.trendingEnhanced?.showToast('正在加载趋势详情...', 'info');
}

function showStockDetails(symbol) {
    // 显示股票详情
    window.trendingEnhanced?.showToast(`查看 ${symbol} 详情`, 'info');
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 导航到榜单焦点视图
function navigateToTrendFocus(trendId) {
    // 更新URL hash
    window.location.hash = `#trending-${trendId}`;
    
    // 触发特色内容显示
    if (window.featuredContentManager) {
        window.featuredContentManager.showFeaturedContent('trending', trendId);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    window.trendingEnhanced = new TrendingEnhanced();
});