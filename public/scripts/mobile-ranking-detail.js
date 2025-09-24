class MobileRankingDetailApp {
    constructor() {
        this.rankingType = null;
        this.currentMarket = 'sp500';
        this.currentSort = 'changePercent';
        this.currentFilter = 'all';
        this.stocks = [];
        this.filteredStocks = [];
        this.isLoading = false;
        this.page = 1;
        this.pageSize = 20;
        this.hasMore = true;
    }

    init() {
        this.parseUrlParams();
        this.setupEventListeners();
        this.loadRankingData();
    }

    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        // 支持 type 和 list 两种参数名
        this.rankingType = urlParams.get('list') || urlParams.get('type') || 'top_gainers';
        this.currentMarket = urlParams.get('market') || 'sp500';
        
        // 更新页面标题和UI
        this.updatePageTitle();
        this.updateMarketTabs();
    }

    updatePageTitle() {
        const rankingConfig = {
            'top_gainers': { title: '涨幅榜', icon: '📈', subtitle: '实时股票涨幅排行' },
            'top_losers': { title: '跌幅榜', icon: '📉', subtitle: '实时股票跌幅排行' },
            'top_market_cap': { title: '市值榜', icon: '💰', subtitle: '按市值规模排序' },
            'top_turnover': { title: '成交额榜', icon: '💵', subtitle: '按成交额排序' },
            'new_highs': { title: '创新高榜', icon: '🚀', subtitle: '创年内新高股票' },
            'new_lows': { title: '创新低榜', icon: '📉', subtitle: '创年内新低股票' },
            'top_volatility': { title: '振幅榜', icon: '📊', subtitle: '按振幅排序' },
            'top_gap_up': { title: '高开缺口榜', icon: '⬆️', subtitle: '高开缺口股票' },
            'institutional_focus': { title: '机构关注榜', icon: '🏛️', subtitle: '机构重点关注股票' },
            'retail_hot': { title: '散户热门榜', icon: '👥', subtitle: '散户热门股票' },
            'smart_money': { title: '主力动向榜', icon: '🎯', subtitle: '主力资金动向' },
            'high_liquidity': { title: '高流动性榜', icon: '💧', subtitle: '高流动性股票' },
            'unusual_activity': { title: '异动榜', icon: '⚡', subtitle: '异常交易活动股票' },
            'momentum_stocks': { title: '动量榜', icon: '🚀', subtitle: '强势股票排行' },
            // 兼容旧的参数名
            'gainers': { title: '涨幅榜', icon: '📈', subtitle: '实时股票涨幅排行' },
            'losers': { title: '跌幅榜', icon: '📉', subtitle: '实时股票跌幅排行' },
            'market-cap': { title: '市值榜', icon: '💰', subtitle: '按市值规模排序' },
            'volume': { title: '成交量榜', icon: '📊', subtitle: '按成交量排序' },
            'momentum': { title: '动量榜', icon: '⚡', subtitle: '强势股票排行' }
        };

        const config = rankingConfig[this.rankingType] || rankingConfig['gainers'];
        const marketNames = {
            'sp500': '标普500',
            'chinese_stocks': '中概股'
        };
        
        const marketName = marketNames[this.currentMarket] || '全市场';
        
        document.getElementById('ranking-title').textContent = config.title;
        document.getElementById('page-title').textContent = `${config.icon} ${marketName}${config.title}`;
        document.getElementById('page-subtitle').textContent = config.subtitle;
    }

    updateMarketTabs() {
        document.querySelectorAll('.market-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.market === this.currentMarket) {
                btn.classList.add('active');
            }
        });
    }

    setupEventListeners() {
        // 市场切换
        document.querySelectorAll('.market-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const market = e.currentTarget.dataset.market;
                this.switchMarket(market);
            });
        });

        // 排序选择
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.applyFiltersAndSort();
        });

        // 筛选选择
        document.getElementById('filter-select').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.applyFiltersAndSort();
        });

        // 股票项点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.stock-item')) {
                const stockItem = e.target.closest('.stock-item');
                const symbol = stockItem.dataset.symbol;
                this.handleStockClick(symbol);
            }
        });

        // 加载更多按钮
        document.getElementById('load-more-btn').addEventListener('click', () => {
            this.loadMoreStocks();
        });

        // 下拉刷新
        this.setupPullToRefresh();
    }

    switchMarket(market) {
        if (this.currentMarket === market) return;
        
        this.currentMarket = market;
        this.updateMarketTabs();
        this.updatePageTitle();
        this.page = 1;
        this.hasMore = true;
        this.loadRankingData();
        
        // 更新URL
        const url = new URL(window.location);
        url.searchParams.set('market', market);
        window.history.replaceState({}, '', url);
    }

    async loadRankingData() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading();
            
            // 尝试从真实API加载数据
            try {
                const realData = await this.fetchRealRankingData();
                if (realData && realData.length > 0) {
                    this.stocks = realData;
                    this.applyFiltersAndSort();
                    return;
                }
            } catch (apiError) {
                console.log('真实API不可用，使用模拟数据');
            }
            
            // 使用模拟数据
            const mockData = this.generateMockRankingData();
            this.stocks = mockData;
            this.applyFiltersAndSort();
            
        } catch (error) {
            console.error('加载榜单数据失败:', error);
            this.showError();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async fetchRealRankingData() {
        try {
            let apiUrl = '';
            
            // 根据榜单类型和市场构建API URL
            switch (this.rankingType) {
                case 'gainers':
                    apiUrl = `https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=demo`;
                    break;
                case 'losers':
                    apiUrl = `https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=demo`;
                    break;
                case 'market-cap':
                    apiUrl = `https://financialmodelingprep.com/api/v3/stock-screener?marketCapMoreThan=1000000000&limit=50&apikey=demo`;
                    break;
                case 'volume':
                    apiUrl = `https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=demo`;
                    break;
                default:
                    apiUrl = `https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=demo`;
            }
            
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                return this.formatRealRankingData(data);
            }
            
            return null;
        } catch (error) {
            console.error('获取真实榜单数据失败:', error);
            return null;
        }
    }

    formatRealRankingData(data) {
        if (!Array.isArray(data)) return [];
        
        return data.map(stock => {
            const symbol = stock.symbol || stock.ticker;
            const name = stock.name || stock.companyName || symbol;
            const price = stock.price || stock.latestPrice || 0;
            const changePercent = stock.changesPercentage || stock.changePercent || 0;
            const volume = stock.volume || stock.latestVolume || 0;
            const marketCap = stock.marketCap || stock.marketCapitalization || 0;
            
            return {
                symbol,
                name,
                price: parseFloat(price) || 0,
                changePercent: parseFloat(changePercent) || 0,
                volume: parseInt(volume) || 0,
                marketCap: parseInt(marketCap) || 0
            };
        }).filter(stock => stock.symbol && stock.price > 0);
    }

    generateMockRankingData() {
        const sp500Stocks = [
            { symbol: 'AAPL', name: '苹果公司' },
            { symbol: 'MSFT', name: '微软公司' },
            { symbol: 'GOOGL', name: '谷歌' },
            { symbol: 'AMZN', name: '亚马逊' },
            { symbol: 'TSLA', name: '特斯拉' },
            { symbol: 'META', name: 'Meta平台' },
            { symbol: 'NVDA', name: '英伟达' },
            { symbol: 'NFLX', name: '奈飞' },
            { symbol: 'AMD', name: 'AMD' },
            { symbol: 'CRM', name: 'Salesforce' }
        ];
        
        const chineseStocks = [
            { symbol: 'BABA', name: '阿里巴巴' },
            { symbol: 'JD', name: '京东' },
            { symbol: 'PDD', name: '拼多多' },
            { symbol: 'BIDU', name: '百度' },
            { symbol: 'NIO', name: '蔚来' },
            { symbol: 'XPEV', name: '小鹏汽车' },
            { symbol: 'LI', name: '理想汽车' },
            { symbol: 'TME', name: '腾讯音乐' },
            { symbol: 'BILI', name: '哔哩哔哩' },
            { symbol: 'IQ', name: '爱奇艺' }
        ];
        
        const baseStocks = this.currentMarket === 'chinese_stocks' ? chineseStocks : sp500Stocks;
        
        return baseStocks.map((stock, index) => {
            const basePrice = 50 + Math.random() * 200;
            let changePercent;
            
            // 根据榜单类型生成相应的涨跌幅
            switch (this.rankingType) {
                case 'gainers':
                    changePercent = Math.random() * 15 + 0.5; // 0.5% 到 15.5%
                    break;
                case 'losers':
                    changePercent = -(Math.random() * 15 + 0.5); // -0.5% 到 -15.5%
                    break;
                case 'new-highs':
                    changePercent = Math.random() * 10 + 2; // 2% 到 12%
                    break;
                default:
                    changePercent = (Math.random() - 0.5) * 20; // -10% 到 10%
            }
            
            return {
                symbol: stock.symbol,
                name: stock.name,
                price: basePrice,
                changePercent: changePercent,
                volume: Math.floor(Math.random() * 10000000) + 1000000,
                marketCap: Math.floor(Math.random() * 1000000000000) + 10000000000
            };
        });
    }

    applyFiltersAndSort() {
        let filtered = [...this.stocks];
        
        // 应用筛选
        switch (this.currentFilter) {
            case 'rising':
                filtered = filtered.filter(stock => stock.changePercent > 0);
                break;
            case 'falling':
                filtered = filtered.filter(stock => stock.changePercent < 0);
                break;
            case 'large-cap':
                filtered = filtered.filter(stock => stock.marketCap > 10000000000);
                break;
            case 'mid-cap':
                filtered = filtered.filter(stock => stock.marketCap > 2000000000 && stock.marketCap <= 10000000000);
                break;
            case 'small-cap':
                filtered = filtered.filter(stock => stock.marketCap <= 2000000000);
                break;
        }
        
        // 应用排序
        switch (this.currentSort) {
            case 'changePercent':
                filtered.sort((a, b) => b.changePercent - a.changePercent);
                break;
            case 'volume':
                filtered.sort((a, b) => b.volume - a.volume);
                break;
            case 'marketCap':
                filtered.sort((a, b) => b.marketCap - a.marketCap);
                break;
            case 'price':
                filtered.sort((a, b) => b.price - a.price);
                break;
        }
        
        this.filteredStocks = filtered;
        this.updateStats();
        this.renderStocks();
    }

    updateStats() {
        const totalCount = this.filteredStocks.length;
        const risingCount = this.filteredStocks.filter(stock => stock.changePercent > 0).length;
        const fallingCount = this.filteredStocks.filter(stock => stock.changePercent < 0).length;
        const flatCount = totalCount - risingCount - fallingCount;
        
        document.getElementById('total-count').textContent = totalCount;
        document.getElementById('rising-count').textContent = risingCount;
        document.getElementById('falling-count').textContent = fallingCount;
        document.getElementById('flat-count').textContent = flatCount;
    }

    renderStocks() {
        const container = document.getElementById('stocks-container');
        const displayStocks = this.filteredStocks.slice(0, this.page * this.pageSize);
        
        if (displayStocks.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>暂无符合条件的股票</p></div>';
            document.getElementById('load-more-container').classList.add('hidden');
            return;
        }
        
        const stocksHtml = displayStocks.map((stock, index) => this.createStockItem(stock, index)).join('');
        container.innerHTML = stocksHtml;
        
        // 显示/隐藏加载更多按钮
        const hasMore = displayStocks.length < this.filteredStocks.length;
        document.getElementById('load-more-container').classList.toggle('hidden', !hasMore);
    }

    createStockItem(stock, index) {
        const changeClass = stock.changePercent >= 0 ? 'positive' : 'negative';
        const changeSymbol = stock.changePercent >= 0 ? '+' : '';
        
        return `
            <div class="stock-item" data-symbol="${stock.symbol}">
                <div class="stock-rank">${index + 1}</div>
                <div class="stock-info">
                    <div class="stock-name">${stock.name}</div>
                    <div class="stock-symbol">${stock.symbol}</div>
                </div>
                <div class="stock-price-section">
                    <div class="stock-price">$${stock.price.toFixed(2)}</div>
                    <div class="stock-change ${changeClass}">
                        ${changeSymbol}${stock.changePercent.toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }

    loadMoreStocks() {
        this.page++;
        this.renderStocks();
    }

    handleStockClick(symbol) {
        // 添加触摸反馈
        this.addTouchFeedback(event.currentTarget);
        
        // 跳转到外部股票详情页
        const stockDetailUrl = `https://stock-details-final.vercel.app/mobile.html?symbol=${encodeURIComponent(symbol)}`;
        window.open(stockDetailUrl, '_blank');
    }

    addTouchFeedback(element) {
        element.style.transform = 'scale(0.98)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;
        
        const mainElement = document.querySelector('.main-content');
        
        mainElement.addEventListener('touchstart', (e) => {
            if (mainElement.scrollTop === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        });
        
        mainElement.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;
            
            if (pullDistance > 0 && pullDistance < 100) {
                e.preventDefault();
            }
        });
        
        mainElement.addEventListener('touchend', (e) => {
            if (!isPulling) return;
            
            const pullDistance = currentY - startY;
            
            if (pullDistance > 60) {
                this.refreshData();
            }
            
            isPulling = false;
            startY = 0;
            currentY = 0;
        });
    }

    async refreshData() {
        this.page = 1;
        this.hasMore = true;
        await this.loadRankingData();
        this.showToast('数据已更新');
    }

    formatNumber(num) {
        if (num >= 1e9) {
            return (num / 1e9).toFixed(1) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(1) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatMarketCap(marketCap) {
        if (marketCap >= 1e12) {
            return `$${(marketCap / 1e12).toFixed(2)}万亿`;
        } else if (marketCap >= 1e9) {
            return `$${(marketCap / 1e9).toFixed(0)}亿`;
        } else if (marketCap >= 1e6) {
            return `$${(marketCap / 1e6).toFixed(0)}百万`;
        }
        return `$${marketCap.toFixed(0)}`;
    }

    showLoading() {
        document.getElementById('loading-ranking').classList.remove('hidden');
        document.getElementById('error-ranking').classList.add('hidden');
        document.getElementById('ranking-list').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading-ranking').classList.add('hidden');
    }

    showError() {
        document.getElementById('loading-ranking').classList.add('hidden');
        document.getElementById('error-ranking').classList.remove('hidden');
        document.getElementById('ranking-list').classList.add('hidden');
    }

    showToast(message) {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // 显示toast
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);
        
        // 隐藏toast
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }
}

// 初始化应用
let rankingDetailApp;

document.addEventListener('DOMContentLoaded', () => {
    rankingDetailApp = new MobileRankingDetailApp();
    rankingDetailApp.init();
});

// 页面可见性变化时刷新数据
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && rankingDetailApp) {
        rankingDetailApp.refreshData();
    }
});