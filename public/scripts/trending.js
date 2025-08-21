// 趋势榜单页面JavaScript

class TrendingApp {
    constructor() {
        this.currentCategory = 'all';
        this.currentTimeFilter = 'today';
        this.rankingData = {};
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadInitialData();
        this.updateLastUpdateTime();
    }
    
    bindEvents() {
        // 导航标签切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });
        
        // 时间筛选
        document.getElementById('time-filter').addEventListener('change', (e) => {
            this.currentTimeFilter = e.target.value;
            this.loadRankingData();
        });
        
        // 刷新按钮
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });
        
        // 查看更多按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-more-btn')) {
                const rankingType = e.target.dataset.ranking;
                this.showFullRanking(rankingType);
            }
        });
        
        // 股票项点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.stock-item')) {
                const stockItem = e.target.closest('.stock-item');
                const symbol = stockItem.dataset.symbol;
                this.showStockDetail(symbol);
            }
        });
        
        // 模态框关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
                this.closeModal();
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }
    
    async loadInitialData() {
        this.showLoading();
        try {
            await Promise.all([
                this.loadOverviewStats(),
                this.loadRankingData()
            ]);
            this.hideLoading();
        } catch (error) {
            this.showError('加载数据失败，请刷新重试');
            console.error('Failed to load initial data:', error);
        }
    }
    
    async loadOverviewStats() {
        try {
            // 模拟API调用 - 实际应该调用后端API
            const stats = {
                risingCount: 1247,
                fallingCount: 892,
                volumeTotal: '$2.8T',
                newHighCount: 156
            };
            
            document.getElementById('rising-count').textContent = stats.risingCount;
            document.getElementById('falling-count').textContent = stats.fallingCount;
            document.getElementById('volume-total').textContent = stats.volumeTotal;
            document.getElementById('new-high-count').textContent = stats.newHighCount;
        } catch (error) {
            console.error('Failed to load overview stats:', error);
        }
    }
    
    async loadRankingData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            // 模拟API调用 - 实际应该调用后端API获取榜单数据
            const mockData = this.generateMockRankingData();
            this.rankingData = mockData;
            this.renderRankingLists();
        } catch (error) {
            this.showError('加载榜单数据失败');
            console.error('Failed to load ranking data:', error);
        } finally {
            this.isLoading = false;
        }
    }
    
    generateMockRankingData() {
        // 生成模拟数据 - 实际应该从API获取
        const mockStocks = [
            { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change: 5.67, changePercent: 3.34 },
            { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.85, change: -2.15, changePercent: -0.56 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.21, change: 8.92, changePercent: 6.90 },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 151.94, change: 4.23, changePercent: 2.86 },
            { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: -12.30, changePercent: -4.72 },
            { symbol: 'META', name: 'Meta Platforms Inc.', price: 484.20, change: 15.67, changePercent: 3.35 },
            { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.28, change: 45.82, changePercent: 5.52 },
            { symbol: 'NFLX', name: 'Netflix Inc.', price: 445.03, change: -8.97, changePercent: -1.98 }
        ];
        
        return {
            daily_gainers: mockStocks.filter(s => s.change > 0).sort((a, b) => b.changePercent - a.changePercent),
            daily_losers: mockStocks.filter(s => s.change < 0).sort((a, b) => a.changePercent - b.changePercent),
            new_highs: mockStocks.slice(0, 5),
            new_lows: mockStocks.slice(-3),
            volume_leaders: mockStocks.sort((a, b) => b.price - a.price),
            low_pe: mockStocks.slice(2, 7),
            high_dividend: mockStocks.slice(1, 6)
        };
    }
    
    renderRankingLists() {
        const rankings = [
            { id: 'daily-gainers-list', type: 'daily_gainers', limit: 5 },
            { id: 'daily-losers-list', type: 'daily_losers', limit: 5 },
            { id: 'new-highs-list', type: 'new_highs', limit: 5 },
            { id: 'new-lows-list', type: 'new_lows', limit: 5 },
            { id: 'volume-leaders-list', type: 'volume_leaders', limit: 5 },
            { id: 'low-pe-list', type: 'low_pe', limit: 5 },
            { id: 'high-dividend-list', type: 'high_dividend', limit: 5 }
        ];
        
        rankings.forEach(ranking => {
            const container = document.getElementById(ranking.id);
            if (container && this.rankingData[ranking.type]) {
                const stocks = this.rankingData[ranking.type].slice(0, ranking.limit);
                container.innerHTML = this.renderStockList(stocks);
            }
        });
    }
    
    renderStockList(stocks) {
        return stocks.map((stock, index) => {
            const changeClass = stock.change > 0 ? 'positive' : stock.change < 0 ? 'negative' : 'neutral';
            const changeSymbol = stock.change > 0 ? '+' : '';
            
            return `
                <div class="stock-item" data-symbol="${stock.symbol}">
                    <div class="stock-info">
                        <div class="stock-rank">${index + 1}</div>
                        <div class="stock-details">
                            <div class="stock-symbol">${stock.symbol}</div>
                            <div class="stock-name">${stock.name}</div>
                        </div>
                    </div>
                    <div class="stock-metrics">
                        <div class="stock-price">$${stock.price.toFixed(2)}</div>
                        <div class="stock-change ${changeClass}">
                            ${changeSymbol}${stock.changePercent.toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    switchCategory(category) {
        // 更新导航状态
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // 显示/隐藏对应分类
        document.querySelectorAll('.ranking-category').forEach(cat => {
            if (category === 'all') {
                cat.style.display = 'block';
            } else {
                cat.style.display = cat.dataset.category === category ? 'block' : 'none';
            }
        });
        
        this.currentCategory = category;
    }
    
    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '🔄 刷新中...';
        
        try {
            await this.loadInitialData();
            this.showToast('数据已更新', 'success');
            this.updateLastUpdateTime();
        } catch (error) {
            this.showToast('刷新失败，请重试', 'error');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '🔄 刷新数据';
        }
    }
    
    showFullRanking(rankingType) {
        const data = this.rankingData[rankingType] || [];
        const title = this.getRankingTitle(rankingType);
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="full-ranking">
                <div class="ranking-header-full">
                    <h4>${title} - 完整榜单</h4>
                    <p>共 ${data.length} 只股票</p>
                </div>
                <div class="full-stock-list">
                    ${this.renderStockList(data)}
                </div>
            </div>
        `;
        
        document.getElementById('modal-title').textContent = title;
        document.getElementById('stock-modal').classList.remove('hidden');
    }
    
    async showStockDetail(symbol) {
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = '<div class="loading">加载股票详情中...</div>';
        
        document.getElementById('modal-title').textContent = `${symbol} - 股票详情`;
        document.getElementById('stock-modal').classList.remove('hidden');
        
        try {
            // 模拟API调用获取股票详情
            const stockDetail = await this.fetchStockDetail(symbol);
            modalBody.innerHTML = this.renderStockDetail(stockDetail);
        } catch (error) {
            modalBody.innerHTML = '<div class="error">加载股票详情失败</div>';
        }
    }
    
    async fetchStockDetail(symbol) {
        // 模拟API调用 - 实际应该调用后端API
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    symbol: symbol,
                    name: 'Apple Inc.',
                    price: 175.43,
                    change: 5.67,
                    changePercent: 3.34,
                    volume: '45.2M',
                    marketCap: '$2.8T',
                    pe: 28.5,
                    dividend: '0.96%',
                    high52w: 198.23,
                    low52w: 124.17
                });
            }, 500);
        });
    }
    
    renderStockDetail(stock) {
        const changeClass = stock.change > 0 ? 'positive' : stock.change < 0 ? 'negative' : 'neutral';
        const changeSymbol = stock.change > 0 ? '+' : '';
        
        return `
            <div class="stock-detail">
                <div class="stock-detail-header">
                    <h3>${stock.symbol}</h3>
                    <p>${stock.name}</p>
                </div>
                <div class="stock-detail-price">
                    <div class="current-price">$${stock.price.toFixed(2)}</div>
                    <div class="price-change ${changeClass}">
                        ${changeSymbol}$${Math.abs(stock.change).toFixed(2)} (${changeSymbol}${stock.changePercent.toFixed(2)}%)
                    </div>
                </div>
                <div class="stock-detail-metrics">
                    <div class="metric-row">
                        <span class="metric-label">成交量:</span>
                        <span class="metric-value">${stock.volume}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">市值:</span>
                        <span class="metric-value">${stock.marketCap}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">市盈率:</span>
                        <span class="metric-value">${stock.pe}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">股息率:</span>
                        <span class="metric-value">${stock.dividend}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">52周最高:</span>
                        <span class="metric-value">$${stock.high52w.toFixed(2)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">52周最低:</span>
                        <span class="metric-value">$${stock.low52w.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    closeModal() {
        document.getElementById('stock-modal').classList.add('hidden');
    }
    
    getRankingTitle(rankingType) {
        const titles = {
            daily_gainers: '涨幅先锋',
            daily_losers: '跌幅最多',
            new_highs: '创新高',
            new_lows: '创新低',
            volume_leaders: '成交额巨头',
            low_pe: '低市盈率',
            high_dividend: '高股息'
        };
        return titles[rankingType] || '未知榜单';
    }
    
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.querySelector('.trending-content').style.opacity = '0.6';
    }
    
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.querySelector('.trending-content').style.opacity = '1';
    }
    
    showError(message) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('error').textContent = message;
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
    
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('last-update').textContent = timeString;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TrendingApp();
});

// 添加股票详情样式到CSS中
const additionalStyles = `
<style>
.stock-detail {
    max-width: 500px;
}

.stock-detail-header h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.stock-detail-header p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
}

.stock-detail-price {
    text-align: center;
    padding: 1.5rem;
    background: var(--background-color);
    border-radius: var(--radius-lg);
    margin-bottom: 1.5rem;
}

.current-price {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.price-change {
    font-size: 1.1rem;
    font-weight: 600;
}

.stock-detail-metrics {
    display: grid;
    gap: 0.75rem;
}

.metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--background-color);
    border-radius: var(--radius-md);
}

.metric-label {
    color: var(--text-secondary);
    font-weight: 500;
}

.metric-value {
    color: var(--text-primary);
    font-weight: 600;
}

.full-ranking {
    max-height: 60vh;
    overflow-y: auto;
}

.ranking-header-full {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.ranking-header-full h4 {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.ranking-header-full p {
    color: var(--text-secondary);
    font-size: 0.9rem;
}
</style>
`;

// 将样式添加到页面头部
document.head.insertAdjacentHTML('beforeend', additionalStyles);