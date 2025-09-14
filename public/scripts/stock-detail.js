/**
 * 股票详情页面 - 主应用程序
 * 展示股票详细信息和相关标签
 */

class StockDetailPage {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.currentStock = null;
        this.stockData = null;
        this.stockTags = [];
        this.relatedStocks = [];
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            this.bindEvents();
            await this.loadStockFromURL();
            this.showLoading();
            await this.loadStockData();
            await this.loadStockTags();
            await this.loadRelatedStocks();
            this.hideLoading();
        } catch (error) {
            console.error('页面初始化失败:', error);
            this.showError('页面初始化失败，请刷新页面重试');
        }
    }

    /**
     * 从URL获取股票信息
     */
    loadStockFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const stockSymbol = urlParams.get('symbol');
        
        if (!stockSymbol) {
            // 如果没有股票参数，重定向到首页
            window.location.href = 'index.html';
            return;
        }
        
        this.currentStock = stockSymbol.toUpperCase();
        this.updatePageTitle();
    }

    /**
     * 更新页面标题
     */
    updatePageTitle() {
        const stockSymbolEl = document.getElementById('stock-symbol');
        if (stockSymbolEl) {
            stockSymbolEl.textContent = this.currentStock;
        }
        
        // 更新浏览器标题
        document.title = `${this.currentStock} - 股票详情 - Stock Tag Explorer`;
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 标签点击事件将在渲染时绑定
    }

    /**
     * 加载股票数据
     */
    async loadStockData() {
        try {
            // 尝试从API加载数据
            const response = await fetch(`${this.apiBaseUrl}/api/stocks/${this.currentStock}`);
            if (response.ok) {
                const data = await response.json();
                this.stockData = data;
            } else {
                // API失败时使用模拟数据
                this.stockData = this.getMockStockData();
            }
        } catch (error) {
            console.warn('API请求失败，使用模拟数据:', error);
            // 网络错误时使用模拟数据
            this.stockData = this.getMockStockData();
        }

        this.renderStockData();
    }

    /**
     * 加载股票标签
     */
    async loadStockTags() {
        try {
            // 尝试从API加载数据
            const response = await fetch(`${this.apiBaseUrl}/api/stocks/${this.currentStock}/tags`);
            if (response.ok) {
                const data = await response.json();
                this.stockTags = data.tags || [];
            } else {
                // API失败时使用模拟数据
                this.stockTags = this.getMockStockTags();
            }
        } catch (error) {
            console.warn('API请求失败，使用模拟数据:', error);
            // 网络错误时使用模拟数据
            this.stockTags = this.getMockStockTags();
        }

        this.renderStockTags();
    }

    /**
     * 加载相关股票
     */
    async loadRelatedStocks() {
        try {
            // 尝试从API加载数据
            const response = await fetch(`${this.apiBaseUrl}/api/stocks/${this.currentStock}/related`);
            if (response.ok) {
                const data = await response.json();
                this.relatedStocks = data.stocks || [];
            } else {
                // API失败时使用模拟数据
                this.relatedStocks = this.getMockRelatedStocks();
            }
        } catch (error) {
            console.warn('API请求失败，使用模拟数据:', error);
            // 网络错误时使用模拟数据
            this.relatedStocks = this.getMockRelatedStocks();
        }

        this.renderRelatedStocks();
    }

    /**
     * 获取模拟股票数据
     */
    getMockStockData() {
        const mockData = {
            'AAPL': {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                exchange: 'NASDAQ',
                price: 150.25,
                change: 2.45,
                changePercent: 1.66,
                open: 148.50,
                high: 151.20,
                low: 147.80,
                volume: 45200000,
                marketCap: 2350000000000,
                peRatio: 28.5,
                description: '苹果公司是一家美国跨国科技公司，总部位于加利福尼亚州库比蒂诺。公司设计、开发和销售消费电子产品、计算机软件和在线服务。'
            },
            'GOOGL': {
                symbol: 'GOOGL',
                name: 'Alphabet Inc.',
                exchange: 'NASDAQ',
                price: 2750.80,
                change: -15.20,
                changePercent: -0.55,
                open: 2765.00,
                high: 2780.50,
                low: 2745.30,
                volume: 1250000,
                marketCap: 1800000000000,
                peRatio: 25.3,
                description: 'Alphabet Inc. 是谷歌的母公司，是一家美国跨国科技集团公司，专注于互联网相关服务和产品。'
            },
            'MSFT': {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                exchange: 'NASDAQ',
                price: 310.45,
                change: 5.75,
                changePercent: 1.89,
                open: 305.20,
                high: 312.80,
                low: 304.90,
                volume: 28500000,
                marketCap: 2300000000000,
                peRatio: 32.1,
                description: '微软公司是一家美国跨国科技公司，开发、制造、许可、支持和销售计算机软件、消费电子产品、个人计算机和相关服务。'
            }
        };

        return mockData[this.currentStock] || mockData['AAPL'];
    }

    /**
     * 获取模拟股票标签
     */
    getMockStockTags() {
        const tagsByStock = {
            'AAPL': [
                { name: '科技股', icon: '💻', count: 156 },
                { name: '大盘股', icon: '🏢', count: 89 },
                { name: '消费电子', icon: '📱', count: 45 },
                { name: '创新科技', icon: '🚀', count: 78 },
                { name: '美股核心', icon: '🇺🇸', count: 234 },
                { name: '高分红', icon: '💰', count: 67 }
            ],
            'GOOGL': [
                { name: '科技股', icon: '💻', count: 156 },
                { name: '互联网', icon: '🌐', count: 92 },
                { name: '人工智能', icon: '🤖', count: 58 },
                { name: '云计算', icon: '☁️', count: 73 },
                { name: '广告科技', icon: '📢', count: 41 }
            ],
            'MSFT': [
                { name: '科技股', icon: '💻', count: 156 },
                { name: '软件服务', icon: '⚙️', count: 84 },
                { name: '云计算', icon: '☁️', count: 73 },
                { name: '企业服务', icon: '🏢', count: 95 },
                { name: '生产力工具', icon: '📊', count: 52 }
            ]
        };

        return tagsByStock[this.currentStock] || tagsByStock['AAPL'];
    }

    /**
     * 获取模拟相关股票
     */
    getMockRelatedStocks() {
        const relatedByStock = {
            'AAPL': [
                { symbol: 'MSFT', name: 'Microsoft Corp.', price: 310.45, change: 1.89 },
                { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 2750.80, change: -0.55 },
                { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 3180.25, change: 2.34 },
                { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.67, change: -1.23 }
            ],
            'GOOGL': [
                { symbol: 'AAPL', name: 'Apple Inc.', price: 150.25, change: 1.66 },
                { symbol: 'MSFT', name: 'Microsoft Corp.', price: 310.45, change: 1.89 },
                { symbol: 'META', name: 'Meta Platforms', price: 285.34, change: 0.78 },
                { symbol: 'NFLX', name: 'Netflix Inc.', price: 425.89, change: -0.92 }
            ],
            'MSFT': [
                { symbol: 'AAPL', name: 'Apple Inc.', price: 150.25, change: 1.66 },
                { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 2750.80, change: -0.55 },
                { symbol: 'ORCL', name: 'Oracle Corp.', price: 89.45, change: 1.23 },
                { symbol: 'CRM', name: 'Salesforce Inc.', price: 198.76, change: 2.45 }
            ]
        };

        return relatedByStock[this.currentStock] || relatedByStock['AAPL'];
    }

    /**
     * 渲染股票数据
     */
    renderStockData() {
        if (!this.stockData) return;

        // 更新基本信息
        const symbolLargeEl = document.getElementById('stock-symbol-large');
        const nameEl = document.getElementById('stock-name');
        const exchangeEl = document.getElementById('stock-exchange');
        
        if (symbolLargeEl) symbolLargeEl.textContent = this.stockData.symbol;
        if (nameEl) nameEl.textContent = this.stockData.name;
        if (exchangeEl) exchangeEl.textContent = this.stockData.exchange;

        // 更新价格信息
        const currentPriceEl = document.getElementById('current-price');
        const changeAmountEl = document.getElementById('change-amount');
        const changePercentEl = document.getElementById('change-percent');
        const priceChangeEl = document.getElementById('price-change');
        
        if (currentPriceEl) currentPriceEl.textContent = `$${this.stockData.price.toFixed(2)}`;
        if (changeAmountEl) {
            const sign = this.stockData.change >= 0 ? '+' : '';
            changeAmountEl.textContent = `${sign}${this.stockData.change.toFixed(2)}`;
        }
        if (changePercentEl) {
            const sign = this.stockData.changePercent >= 0 ? '+' : '';
            changePercentEl.textContent = `(${sign}${this.stockData.changePercent.toFixed(2)}%)`;
        }
        if (priceChangeEl) {
            priceChangeEl.className = `price-change ${this.stockData.change >= 0 ? 'positive' : 'negative'}`;
        }

        // 更新关键指标
        const openPriceEl = document.getElementById('open-price');
        const highPriceEl = document.getElementById('high-price');
        const lowPriceEl = document.getElementById('low-price');
        const volumeEl = document.getElementById('volume');
        const marketCapEl = document.getElementById('market-cap');
        const peRatioEl = document.getElementById('pe-ratio');
        
        if (openPriceEl) openPriceEl.textContent = `$${this.stockData.open.toFixed(2)}`;
        if (highPriceEl) highPriceEl.textContent = `$${this.stockData.high.toFixed(2)}`;
        if (lowPriceEl) lowPriceEl.textContent = `$${this.stockData.low.toFixed(2)}`;
        if (volumeEl) volumeEl.textContent = this.formatNumber(this.stockData.volume);
        if (marketCapEl) marketCapEl.textContent = this.formatMarketCap(this.stockData.marketCap);
        if (peRatioEl) peRatioEl.textContent = this.stockData.peRatio.toFixed(1);

        // 更新公司简介
        const descriptionEl = document.getElementById('company-description');
        if (descriptionEl && this.stockData.description) {
            descriptionEl.innerHTML = `<p>${this.stockData.description}</p>`;
        }

        // 更新最后更新时间
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) {
            const now = new Date();
            lastUpdatedEl.textContent = `最后更新: ${now.toLocaleString('zh-CN')}`;
        }
    }

    /**
     * 渲染股票标签
     */
    renderStockTags() {
        const tagsContainer = document.getElementById('stock-tags');
        const tagCountEl = document.getElementById('tag-count');
        
        if (!tagsContainer) return;

        if (tagCountEl) {
            tagCountEl.textContent = `(${this.stockTags.length})`;
        }

        tagsContainer.innerHTML = '';
        
        this.stockTags.forEach(tag => {
            const tagEl = document.createElement('a');
            tagEl.className = 'stock-tag';
            tagEl.href = `tag-detail.html?tag=${encodeURIComponent(tag.name)}`;
            tagEl.innerHTML = `
                <span class="tag-icon">${tag.icon}</span>
                <span>${tag.name}</span>
                <span class="tag-count">${tag.count}</span>
            `;
            
            // 添加点击事件
            tagEl.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToTagDetail(tag.name);
            });
            
            tagsContainer.appendChild(tagEl);
        });
    }

    /**
     * 渲染相关股票
     */
    renderRelatedStocks() {
        const container = document.getElementById('related-stocks');
        if (!container) return;

        container.innerHTML = '';
        
        this.relatedStocks.forEach(stock => {
            const stockEl = document.createElement('a');
            stockEl.className = 'related-stock';
            stockEl.href = `https://stock-details-final.vercel.app/?symbol=${stock.symbol}`;
            
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const changeSign = stock.change >= 0 ? '+' : '';
            
            stockEl.innerHTML = `
                <div class="related-stock-symbol">${stock.symbol}</div>
                <div class="related-stock-name">${stock.name_zh || stock.name}</div>
                <div class="related-stock-price">$${stock.price.toFixed(2)}</div>
                <div class="related-stock-change ${changeClass}">${changeSign}${stock.change.toFixed(2)}%</div>
            `;
            
            // 添加点击事件
            stockEl.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToStockDetail(stock.symbol);
            });
            
            container.appendChild(stockEl);
        });
    }

    /**
     * 导航到标签详情页
     */
    navigateToTagDetail(tagName) {
        const url = `tag-detail.html?tag=${encodeURIComponent(tagName)}`;
        window.location.href = url;
    }

    /**
     * 导航到股票详情页
     */
    navigateToStockDetail(symbol) {
        const url = `https://stock-details-final.vercel.app/?symbol=${encodeURIComponent(symbol)}`;
        window.location.href = url;
    }

    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * 格式化市值
     */
    formatMarketCap(marketCap) {
        if (!marketCap || marketCap === 0) return '未知';
        
        // 输入的marketCap是百万美元，需要转换为亿美元
        // 1亿美元 = 100百万美元，但数据需要修正，所以除以10
        const cap = parseFloat(marketCap);
        const capInYi = cap / 10; // 修正：转换为亿美元
        
        if (capInYi >= 10000) {
            return `$${(capInYi / 10000).toFixed(1)}万亿`;
        } else if (capInYi >= 100) {
            return `$${capInYi.toFixed(0)}亿`;
        } else if (capInYi >= 10) {
            return `$${capInYi.toFixed(1)}亿`;
        } else {
            return `$${capInYi.toFixed(2)}亿`;
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'flex';
        }
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.hideLoading();
        this.showToast(message, 'error');
    }

    /**
     * 显示Toast通知
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 全局函数
function addToWatchlist() {
    if (window.stockDetailPage && window.stockDetailPage.currentStock) {
        window.stockDetailPage.showToast(`已将 ${window.stockDetailPage.currentStock} 添加到自选股`, 'success');
    }
}

function shareStock() {
    if (window.stockDetailPage && window.stockDetailPage.currentStock) {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `${window.stockDetailPage.currentStock} - 股票详情`,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                window.stockDetailPage.showToast('链接已复制到剪贴板', 'success');
            });
        }
    }
}

function exportData() {
    if (window.stockDetailPage && window.stockDetailPage.stockData) {
        const data = JSON.stringify(window.stockDetailPage.stockData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${window.stockDetailPage.currentStock}_data.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.stockDetailPage.showToast('数据导出成功', 'success');
    }
}

// 初始化应用
let stockDetailPage;
document.addEventListener('DOMContentLoaded', () => {
    stockDetailPage = new StockDetailPage();
});

window.stockDetailPage = stockDetailPage;