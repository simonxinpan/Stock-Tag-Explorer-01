// 移动版个股详情页面交互逻辑

class MobileStockDetail {
    constructor() {
        this.stockSymbol = null;
        this.stockData = null;
        this.chartData = null;
        this.currentTimeRange = '1D';
        this.isFavorite = false;
        
        this.init();
    }

    init() {
        // 获取URL参数
        this.stockSymbol = this.getUrlParameter('symbol');
        
        if (!this.stockSymbol) {
            this.showError('未找到股票代码');
            return;
        }

        // 绑定事件监听器
        this.bindEvents();
        
        // 加载股票数据
        this.loadStockData();
    }

    bindEvents() {
        // 返回按钮
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
            });
        }

        // 收藏按钮
        const favoriteBtn = document.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                this.toggleFavorite();
            });
        }

        // 时间范围按钮
        const timeButtons = document.querySelectorAll('.time-btn');
        timeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeRange = e.target.dataset.range;
                this.switchTimeRange(timeRange);
            });
        });

        // 标签点击
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-chip')) {
                const tagId = e.target.dataset.tagId;
                this.goToTagDetail(tagId);
            }
        });
    }

    async loadStockData() {
        try {
            this.showLoading();
            
            // 模拟API调用
            const response = await this.fetchStockData(this.stockSymbol);
            this.stockData = response;
            
            this.renderStockInfo();
            this.loadChartData();
            
        } catch (error) {
            console.error('加载股票数据失败:', error);
            this.showError('加载数据失败，请稍后重试');
        }
    }

    async fetchStockData(symbol) {
        // 模拟数据，实际应该调用真实API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    symbol: symbol,
                    name: this.getStockName(symbol),
                    price: 150.25,
                    change: 2.35,
                    changePercent: 1.59,
                    volume: 1234567,
                    marketCap: '2.5T',
                    peRatio: 28.5,
                    eps: 5.25,
                    high52Week: 180.50,
                    low52Week: 120.30,
                    avgVolume: 987654,
                    beta: 1.15,
                    dividend: 0.88,
                    dividendYield: 0.59,
                    description: '这是一家领先的科技公司，专注于创新技术和产品开发。公司在多个领域都有重要布局，包括人工智能、云计算和移动设备等。',
                    tags: [
                        { id: 'tech', name: '科技股', category: 'sector' },
                        { id: 'large_cap', name: '大盘股', category: 'marketcap' },
                        { id: 'growth', name: '成长股', category: 'style' },
                        { id: 'ai', name: '人工智能', category: 'theme' }
                    ]
                });
            }, 800);
        });
    }

    getStockName(symbol) {
        const stockNames = {
            'AAPL': '苹果公司',
            'GOOGL': '谷歌',
            'MSFT': '微软',
            'TSLA': '特斯拉',
            'AMZN': '亚马逊',
            'META': 'Meta',
            'NVDA': '英伟达',
            'NFLX': '奈飞'
        };
        return stockNames[symbol] || symbol;
    }

    renderStockInfo() {
        if (!this.stockData) return;

        const data = this.stockData;
        
        // 更新页面标题
        document.querySelector('.stock-symbol').textContent = data.symbol;
        document.querySelector('.stock-name').textContent = data.name;
        
        // 更新股价信息
        document.querySelector('.price-value').textContent = `$${data.price.toFixed(2)}`;
        
        const changeValue = document.querySelector('.change-value');
        const changePercent = document.querySelector('.change-percent');
        
        changeValue.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}`;
        changePercent.textContent = `(${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`;
        
        // 设置涨跌颜色
        const changeClass = data.change > 0 ? 'positive' : data.change < 0 ? 'negative' : 'neutral';
        changeValue.className = `change-value ${changeClass}`;
        changePercent.className = `change-percent ${changeClass}`;
        
        // 更新快速统计
        this.updateQuickStats(data);
        
        // 更新公司信息
        this.updateCompanyInfo(data);
        
        // 更新相关标签
        this.updateRelatedTags(data.tags);
        
        // 更新时间戳
        document.querySelector('.price-time').textContent = `更新时间: ${new Date().toLocaleTimeString()}`;
    }

    updateQuickStats(data) {
        const stats = [
            { label: '成交量', value: this.formatVolume(data.volume) },
            { label: '市值', value: data.marketCap },
            { label: '市盈率', value: data.peRatio.toFixed(1) },
            { label: '每股收益', value: `$${data.eps.toFixed(2)}` },
            { label: '52周最高', value: `$${data.high52Week.toFixed(2)}` },
            { label: '52周最低', value: `$${data.low52Week.toFixed(2)}` }
        ];
        
        const quickStats = document.querySelector('.quick-stats');
        quickStats.innerHTML = stats.map(stat => `
            <div class="stat-item">
                <span class="stat-label">${stat.label}</span>
                <span class="stat-value">${stat.value}</span>
            </div>
        `).join('');
    }

    updateCompanyInfo(data) {
        const infoItems = [
            { label: '平均成交量', value: this.formatVolume(data.avgVolume) },
            { label: 'Beta系数', value: data.beta.toFixed(2) },
            { label: '股息', value: `$${data.dividend.toFixed(2)}` },
            { label: '股息收益率', value: `${data.dividendYield.toFixed(2)}%` }
        ];
        
        const infoGrid = document.querySelector('.info-grid');
        infoGrid.innerHTML = infoItems.map(item => `
            <div class="info-item">
                <span class="info-label">${item.label}</span>
                <span class="info-value">${item.value}</span>
            </div>
        `).join('');
        
        // 更新公司描述
        document.querySelector('.company-description p').textContent = data.description;
    }

    updateRelatedTags(tags) {
        const tagsContainer = document.querySelector('.tags-container');
        tagsContainer.innerHTML = tags.map(tag => `
            <span class="tag-chip" data-tag-id="${tag.category}_${tag.id}">
                ${tag.name}
            </span>
        `).join('');
    }

    async loadChartData() {
        try {
            // 模拟图表数据加载
            const chartContainer = document.querySelector('.price-chart');
            chartContainer.innerHTML = `
                <div style="color: var(--text-secondary); font-size: 14px;">
                    📈 ${this.currentTimeRange} 价格走势图
                    <br><br>
                    <small>图表功能开发中...</small>
                </div>
            `;
        } catch (error) {
            console.error('加载图表数据失败:', error);
        }
    }

    switchTimeRange(timeRange) {
        this.currentTimeRange = timeRange;
        
        // 更新按钮状态
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-range="${timeRange}"]`).classList.add('active');
        
        // 重新加载图表数据
        this.loadChartData();
    }

    toggleFavorite() {
        this.isFavorite = !this.isFavorite;
        const favoriteBtn = document.querySelector('.favorite-btn');
        
        if (this.isFavorite) {
            favoriteBtn.classList.add('active');
            favoriteBtn.innerHTML = '❤️';
        } else {
            favoriteBtn.classList.remove('active');
            favoriteBtn.innerHTML = '🤍';
        }
        
        // 这里可以添加保存到本地存储或发送到服务器的逻辑
        console.log(`${this.stockSymbol} 收藏状态:`, this.isFavorite);
    }

    goToTagDetail(tagId) {
        window.location.href = `mobile-tag-detail.html?tagId=${encodeURIComponent(tagId)}`;
    }

    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'mobile.html';
        }
    }

    showLoading() {
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>加载股票数据中...</p>
            </div>
        `;
    }

    showError(message) {
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <div class="error-state">
                <p>❌ ${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 16px;
                    padding: 8px 16px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">重新加载</button>
            </div>
        `;
    }

    formatVolume(volume) {
        if (volume >= 1000000000) {
            return (volume / 1000000000).toFixed(1) + 'B';
        } else if (volume >= 1000000) {
            return (volume / 1000000).toFixed(1) + 'M';
        } else if (volume >= 1000) {
            return (volume / 1000).toFixed(1) + 'K';
        }
        return volume.toString();
    }

    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new MobileStockDetail();
});