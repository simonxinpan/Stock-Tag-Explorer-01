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
        // 榜单标签页切换
        document.querySelectorAll('.ranking-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab, e.target);
            });
        });

        // 刷新按钮
        document.querySelectorAll('.refresh-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.refreshData();
            });
        });

        // 查看更多按钮
        document.querySelectorAll('.view-more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewMore(e.target);
            });
        });
    }

    switchTab(tabType, tabElement) {
        // 更新同一组标签页的状态
        const tabGroup = tabElement.closest('.ranking-tabs');
        tabGroup.querySelectorAll('.ranking-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        tabElement.classList.add('active');

        // 这里可以添加切换不同榜单数据的逻辑
        console.log(`切换到 ${tabType} 榜单`);
        this.loadTabData(tabType);
    }

    loadTabData(tabType) {
        // 根据标签页类型加载不同的数据
        // 这里可以实现具体的数据加载逻辑
        this.showToast(`正在加载${tabType}数据...`);
    }

    viewMore(button) {
        // 查看更多功能
        const section = button.closest('.ranking-section');
        const title = section.querySelector('.section-title').textContent;
        this.showToast(`查看更多${title}数据...`);
        
        // 这里可以实现跳转到详细页面或加载更多数据的逻辑
    }

    async loadTrendingData() {
        try {
            const data = await this.fetchTrendingData();
            this.renderTrendingLists(data);
            this.showToast('数据加载完成');
        } catch (error) {
            console.error('加载趋势数据失败:', error);
            this.showToast('加载失败，请稍后重试');
        }
    }

    async fetchTrendingData() {
        // 模拟API调用
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    rising: this.generateMockData('rising', 5),
                    decline: this.generateMockData('decline', 5),
                    value: this.generateMockData('value', 5)
                });
            }, 500);
        });
    }

    generateMockData(type, count) {
        const stockData = {
            rising: [
                { symbol: 'TSLA', name: 'Tesla Inc', price: '198.21', change: 8.32 },
                { symbol: 'NVDA', name: 'NVIDIA Corporation', price: '719.43', change: 7.89 },
                { symbol: 'AAPL', name: 'Apple Inc', price: '175.38', change: 6.75 },
                { symbol: 'MSFT', name: 'Microsoft Corporation', price: '378.29', change: 5.42 },
                { symbol: 'GOOGL', name: 'Alphabet Inc', price: '142.65', change: 4.91 }
            ],
            decline: [
                { symbol: 'META', name: 'Meta Platforms Inc', price: '324.56', change: -6.78 },
                { symbol: 'NFLX', name: 'Netflix Inc', price: '425.89', change: -5.43 },
                { symbol: 'AMZN', name: 'Amazon.com Inc', price: '142.31', change: -4.92 },
                { symbol: 'PYPL', name: 'PayPal Holdings Inc', price: '58.74', change: -4.15 },
                { symbol: 'UBER', name: 'Uber Technologies Inc', price: '67.23', change: -3.87 }
            ],
            value: [
                { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc', price: '548,325', change: 2.15 },
                { symbol: 'JPM', name: 'JPMorgan Chase & Co', price: '165.42', change: 1.87 },
                { symbol: 'JNJ', name: 'Johnson & Johnson', price: '159.73', change: 1.42 },
                { symbol: 'PG', name: 'Procter & Gamble Co', price: '152.89', change: 0.98 },
                { symbol: 'KO', name: 'The Coca-Cola Company', price: '58.94', change: 0.76 }
            ]
        };
        
        return stockData[type] || [];
    }

    renderTrendingLists(data) {
        this.renderList('rising-list', data.rising, 'rising');
        this.renderList('decline-list', data.decline, 'decline');
        this.renderList('value-list', data.value, 'value');
    }

    renderList(containerId, stocks, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = stocks.map((stock, index) => `
            <div class="stock-item" data-symbol="${stock.symbol}">
                <div class="stock-rank">${index + 1}</div>
                <div class="stock-info">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name}</div>
                </div>
                <div class="stock-price">
                    <div class="current-price">$${stock.price}</div>
                    <div class="price-change ${stock.change >= 0 ? 'positive' : 'negative'}">
                        ${stock.change >= 0 ? '+' : ''}${stock.change}%
                    </div>
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