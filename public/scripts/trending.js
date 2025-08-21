// 趋势榜单页面脚本
class TrendingPage {
    constructor() {
        this.currentCategory = 'all';
        this.currentTimeFilter = 'today';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTrendingData();
        this.updateStats();
    }

    bindEvents() {
        // 榜单分类切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });

        // 时间筛选
        document.getElementById('time-filter').addEventListener('change', (e) => {
            this.currentTimeFilter = e.target.value;
            this.loadTrendingData();
        });

        // 刷新按钮
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });
    }

    switchCategory(category) {
        this.currentCategory = category;
        
        // 更新导航标签状态
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // 显示/隐藏对应榜单
        this.showCategoryContent(category);
    }

    showCategoryContent(category) {
        const categories = document.querySelectorAll('.ranking-category');
        
        if (category === 'all') {
            categories.forEach(cat => cat.style.display = 'block');
        } else {
            categories.forEach(cat => {
                if (cat.dataset.category === category) {
                    cat.style.display = 'block';
                } else {
                    cat.style.display = 'none';
                }
            });
        }
    }

    async loadTrendingData() {
        try {
            this.showLoading(true);
            
            // 模拟API调用
            const response = await this.fetchTrendingData();
            
            if (response.success) {
                this.renderTrendingLists(response.data);
                this.hideError();
            } else {
                this.showError('数据加载失败');
            }
        } catch (error) {
            console.error('加载趋势数据失败:', error);
            this.showError('网络连接失败，请稍后重试');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchTrendingData() {
        // 模拟数据，实际应该调用真实API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        golden: this.generateMockData('golden', 10),
                        risk: this.generateMockData('risk', 8),
                        value: this.generateMockData('value', 12)
                    }
                });
            }, 1000);
        });
    }

    generateMockData(type, count) {
        const stocks = [];
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL'];
        
        for (let i = 0; i < count; i++) {
            const symbol = symbols[i % symbols.length];
            const price = (Math.random() * 500 + 50).toFixed(2);
            const change = type === 'risk' ? 
                -(Math.random() * 10 + 1).toFixed(2) : 
                (Math.random() * 15 + 0.5).toFixed(2);
            const changePercent = ((change / price) * 100).toFixed(2);
            
            stocks.push({
                symbol,
                name: `${symbol} Inc.`,
                price: parseFloat(price),
                change: parseFloat(change),
                changePercent: parseFloat(changePercent),
                volume: Math.floor(Math.random() * 10000000),
                rank: i + 1
            });
        }
        
        return stocks;
    }

    renderTrendingLists(data) {
        this.renderList('golden-list', data.golden, 'golden');
        this.renderList('risk-list', data.risk, 'risk');
        this.renderList('value-list', data.value, 'value');
    }

    renderList(containerId, stocks, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = stocks.map(stock => `
            <div class="ranking-item ${type}">
                <div class="rank-number">${stock.rank}</div>
                <div class="stock-info">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name}</div>
                </div>
                <div class="stock-metrics">
                    <div class="stock-price">$${stock.price.toFixed(2)}</div>
                    <div class="stock-change ${stock.change >= 0 ? 'positive' : 'negative'}">
                        ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)
                    </div>
                    <div class="stock-volume">成交量: ${this.formatVolume(stock.volume)}</div>
                </div>
            </div>
        `).join('');
    }

    formatVolume(volume) {
        if (volume >= 1000000) {
            return (volume / 1000000).toFixed(1) + 'M';
        } else if (volume >= 1000) {
            return (volume / 1000).toFixed(1) + 'K';
        }
        return volume.toString();
    }

    async updateStats() {
        // 模拟统计数据更新
        const stats = {
            rising: Math.floor(Math.random() * 200 + 100),
            falling: Math.floor(Math.random() * 150 + 50),
            volume: (Math.random() * 500 + 100).toFixed(1) + 'B',
            newHigh: Math.floor(Math.random() * 50 + 10)
        };

        document.getElementById('rising-count').textContent = stats.rising;
        document.getElementById('falling-count').textContent = stats.falling;
        document.getElementById('volume-total').textContent = stats.volume;
        document.getElementById('new-high-count').textContent = stats.newHigh;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        const error = document.getElementById('error');
        if (error) {
            error.textContent = message;
            error.classList.remove('hidden');
        }
    }

    hideError() {
        const error = document.getElementById('error');
        if (error) {
            error.classList.add('hidden');
        }
    }

    refreshData() {
        this.loadTrendingData();
        this.updateStats();
        this.showToast('数据已刷新');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new TrendingPage();
});