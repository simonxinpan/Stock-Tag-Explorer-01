// 增强版标签详情页面 - 热力图集成功能

class TagDetailEnhanced {
    constructor() {
        this.tagName = null;
        this.stockHeatmap = null;
        this.currentStocks = [];
        this.heatmapVisible = true;
        this.syncWithHeatmap = true;
        
        this.init();
    }
    
    async init() {
        try {
            // 获取URL参数
            const urlParams = new URLSearchParams(window.location.search);
            this.tagName = urlParams.get('tag');
            
            if (!this.tagName) {
                this.showError('未指定标签参数');
                return;
            }
            
            // 初始化页面
            this.initializeUI();
            this.bindEvents();
            
            // 加载数据
            await this.loadTagData();
            await this.initializeHeatmap();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('页面初始化失败');
        }
    }
    
    initializeUI() {
        // 更新页面标题和描述
        document.getElementById('tag-name').textContent = this.tagName;
        document.getElementById('page-title').textContent = `${this.tagName} 标签详情`;
        document.getElementById('tag-description').textContent = `查看 "${this.tagName}" 标签下的所有股票及热力图分析`;
        document.getElementById('heatmap-title-text').textContent = `${this.tagName} 热力图`;
        
        // 设置页面标题
        document.title = `${this.tagName} - 标签详情 - Stock Tag Explorer`;
    }
    
    bindEvents() {
        // 热力图控制器事件
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
        
        // 同步控制
        document.getElementById('sync-with-heatmap')?.addEventListener('change', (e) => {
            this.syncWithHeatmap = e.target.checked;
            if (this.syncWithHeatmap) {
                this.syncStockListWithHeatmap();
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
    
    async loadTagData() {
        try {
            // 模拟API调用 - 获取标签下的股票数据
            const response = await fetch(`/api/tags/${encodeURIComponent(this.tagName)}/stocks`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.currentStocks = data.stocks || [];
            
            // 更新统计信息
            this.updateTagStats();
            
        } catch (error) {
            console.error('加载标签数据失败:', error);
            // 使用模拟数据
            this.currentStocks = this.generateMockStockData();
            this.updateTagStats();
        }
    }
    
    async initializeHeatmap() {
        try {
            const heatmapContainer = document.getElementById('tag-heatmap');
            if (!heatmapContainer) return;
            
            // 创建热力图实例
            this.stockHeatmap = new StockHeatmap({
                container: heatmapContainer,
                data: this.currentStocks,
                metric: 'change_percent',
                timeframe: '1d',
                interactive: true,
                showTooltip: true,
                onCellClick: (stock) => this.onHeatmapCellClick(stock),
                onCellHover: (stock) => this.onHeatmapCellHover(stock)
            });
            
            // 渲染热力图
            await this.stockHeatmap.render();
            
            // 更新图例
            this.updateHeatmapLegend();
            
            // 更新统计信息
            this.updateHeatmapStats();
            
            // 标记为已加载
            heatmapContainer.classList.add('loaded');
            
        } catch (error) {
            console.error('初始化热力图失败:', error);
            this.showHeatmapError('热力图加载失败');
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
            await this.loadTagData();
            
            // 更新热力图数据
            await this.stockHeatmap.updateData(this.currentStocks);
            
            // 更新统计信息
            this.updateTagStats();
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
                fullscreen: true
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
            this.highlightStockInList(stock.symbol);
        }
        
        // 显示股票详情
        this.showStockDetails(stock);
    }
    
    onHeatmapCellHover(stock) {
        // 悬停热力图单元格时的处理
        if (this.syncWithHeatmap) {
            this.previewStockInList(stock.symbol);
        }
    }
    
    highlightStockInList(symbol) {
        // 在股票列表中高亮显示指定股票
        const stockElements = document.querySelectorAll('.stock-card');
        stockElements.forEach(el => {
            el.classList.remove('highlighted');
            if (el.dataset.symbol === symbol) {
                el.classList.add('highlighted');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
    
    previewStockInList(symbol) {
        // 在股票列表中预览指定股票
        const stockElements = document.querySelectorAll('.stock-card');
        stockElements.forEach(el => {
            el.classList.remove('preview');
            if (el.dataset.symbol === symbol) {
                el.classList.add('preview');
            }
        });
    }
    
    syncStockListWithHeatmap() {
        // 同步股票列表与热力图的显示顺序
        if (!this.stockHeatmap || !this.syncWithHeatmap) return;
        
        const sortedStocks = this.stockHeatmap.getSortedData();
        this.reorderStockList(sortedStocks);
    }
    
    reorderStockList(sortedStocks) {
        // 重新排序股票列表
        const stockList = document.getElementById('stock-list');
        if (!stockList) return;
        
        const stockCards = Array.from(stockList.querySelectorAll('.stock-card'));
        
        // 按照热力图的顺序重新排列
        sortedStocks.forEach((stock, index) => {
            const card = stockCards.find(el => el.dataset.symbol === stock.symbol);
            if (card) {
                stockList.appendChild(card);
            }
        });
    }
    
    updateHeatmapLegend() {
        const legendContainer = document.getElementById('heatmap-legend-scale');
        if (!legendContainer || !this.stockHeatmap) return;
        
        const metric = document.getElementById('heatmap-metric')?.value || 'change_percent';
        const legend = this.stockHeatmap.generateLegend(metric);
        
        legendContainer.innerHTML = legend;
    }
    
    updateHeatmapStats() {
        if (!this.currentStocks.length) return;
        
        const metric = document.getElementById('heatmap-metric')?.value || 'change_percent';
        
        let bestPerformer = null;
        let worstPerformer = null;
        let total = 0;
        let count = 0;
        let totalMarketCap = 0;
        
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
            
            if (stock.market_cap) {
                totalMarketCap += stock.market_cap;
            }
        });
        
        // 更新统计显示
        const bestElement = document.getElementById('best-performer');
        const worstElement = document.getElementById('worst-performer');
        const avgElement = document.getElementById('average-change');
        const marketCapElement = document.getElementById('total-market-cap');
        
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
        
        if (marketCapElement) {
            marketCapElement.textContent = this.formatMarketCap(totalMarketCap);
        }
    }
    
    updateTagStats() {
        const totalElement = document.getElementById('total-stocks');
        const risingElement = document.getElementById('rising-stocks');
        const fallingElement = document.getElementById('falling-stocks');
        const flatElement = document.getElementById('flat-stocks');
        
        const total = this.currentStocks.length;
        const rising = this.currentStocks.filter(s => s.change_percent > 0).length;
        const falling = this.currentStocks.filter(s => s.change_percent < 0).length;
        const flat = this.currentStocks.filter(s => s.change_percent === 0).length;
        
        if (totalElement) totalElement.textContent = total;
        if (risingElement) risingElement.textContent = rising;
        if (fallingElement) fallingElement.textContent = falling;
        if (flatElement) flatElement.textContent = flat;
        
        // 更新总计显示
        const totalDisplay = document.getElementById('total-stocks-display');
        if (totalDisplay) {
            totalDisplay.textContent = `总计 ${total} 只股票`;
        }
    }
    
    setViewMode(mode) {
        const stockList = document.getElementById('stock-list');
        const gridBtn = document.getElementById('grid-view');
        const listBtn = document.getElementById('list-view');
        
        if (!stockList) return;
        
        if (mode === 'grid') {
            stockList.classList.remove('list-view');
            stockList.classList.add('grid-view');
            gridBtn?.classList.add('active');
            listBtn?.classList.remove('active');
        } else {
            stockList.classList.remove('grid-view');
            stockList.classList.add('list-view');
            listBtn?.classList.add('active');
            gridBtn?.classList.remove('active');
        }
    }
    
    showStockDetails(stock) {
        // 显示股票详情（可以是模态框或侧边栏）
        this.showToast(`查看 ${stock.name} (${stock.symbol}) 详情`, 'info');
        
        // 这里可以实现跳转到股票详情页或显示详情模态框
        window.open(`https://stock-details-final.vercel.app/?symbol=${stock.symbol}`, '_blank');
    }
    
    showHeatmapLoading() {
        const container = document.getElementById('tag-heatmap');
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
        const container = document.getElementById('tag-heatmap');
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
    
    generateMockStockData() {
        // 生成模拟股票数据
        const mockStocks = [];
        const companies = [
            'Apple Inc.', 'Microsoft Corp.', 'Amazon.com Inc.', 'Alphabet Inc.',
            'Tesla Inc.', 'Meta Platforms', 'NVIDIA Corp.', 'Netflix Inc.',
            'Adobe Inc.', 'Salesforce Inc.', 'PayPal Holdings', 'Intel Corp.',
            'Cisco Systems', 'Oracle Corp.', 'IBM Corp.', 'AMD Inc.'
        ];
        
        companies.forEach((name, index) => {
            const symbol = name.split(' ')[0].toUpperCase();
            mockStocks.push({
                symbol: symbol,
                name: name,
                price: 50 + Math.random() * 200,
                change_percent: (Math.random() - 0.5) * 10,
                volume: Math.floor(Math.random() * 10000000),
                market_cap: Math.floor(Math.random() * 1000000000000),
                tags: [this.tagName]
            });
        });
        
        return mockStocks;
    }
}

// 全局函数
function toggleHeatmapView() {
    if (window.tagDetailEnhanced) {
        window.tagDetailEnhanced.toggleHeatmapView();
    }
}

function exportHeatmap() {
    if (window.tagDetailEnhanced && window.tagDetailEnhanced.stockHeatmap) {
        window.tagDetailEnhanced.stockHeatmap.exportAsImage();
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
            window.tagDetailEnhanced?.showToast('链接已复制到剪贴板', 'success');
        });
    }
}

function compareWithMarket() {
    window.open('https://heatmap-pro.vercel.app/sector-aggregation.html', '_blank');
}

function closeHeatmapModal() {
    if (window.tagDetailEnhanced) {
        window.tagDetailEnhanced.closeHeatmapModal();
    }
}

// 导航到标签焦点视图
function navigateToTagFocus(tagName) {
    // 更新URL hash
    window.location.hash = `#tag-${tagName}`;
    
    // 触发特色内容显示
    if (window.featuredContentManager) {
        window.featuredContentManager.showFeaturedContent('tag', tagName);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.tagDetailEnhanced = new TagDetailEnhanced();
});