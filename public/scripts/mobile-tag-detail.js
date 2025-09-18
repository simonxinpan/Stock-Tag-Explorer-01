// 移动版标签详情页面应用
class MobileTagDetailApp {
    constructor() {
        this.tagId = null;
        this.stocks = [];
        this.currentSort = 'market-cap';
        this.init();
    }

    // 初始化应用
    init() {
        this.updateTime();
        this.parseUrlParams();
        this.setupEventListeners();
        this.loadTagData();
        this.setupPullToRefresh();
        
        // 每分钟更新时间
        setInterval(() => this.updateTime(), 60000);
    }

    // 更新时间显示
    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }

    // 解析URL参数
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.tagId = urlParams.get('tagId');
        
        if (!this.tagId) {
            console.error('未找到标签ID参数');
            this.showError('无效的标签ID');
            return;
        }
        
        // 解码标签ID
        this.tagId = decodeURIComponent(this.tagId);
        console.log('标签ID:', this.tagId);
    }

    // 设置事件监听器
    setupEventListeners() {
        // 排序按钮点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sort-btn')) {
                const btn = e.target.closest('.sort-btn');
                const sortType = btn.dataset.sort;
                this.changeSortType(sortType);
            }
        });

        // 股票卡片点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.stock-card')) {
                const card = e.target.closest('.stock-card');
                const symbol = card.dataset.symbol;
                this.openStockDetail(symbol);
            }
        });

        // 添加触摸反馈
        this.addTouchFeedback();
    }

    // 添加触摸反馈
    addTouchFeedback() {
        const interactiveElements = document.querySelectorAll('.sort-btn, .stock-card, .back-btn');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.style.transform = 'scale(0.95)';
            });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.style.transform = '';
                }, 100);
            });
        });
    }

    // 设置下拉刷新
    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;
            
            if (pullDistance > 100) {
                // 触发刷新
                this.refreshData();
                isPulling = false;
            }
        });
        
        document.addEventListener('touchend', () => {
            isPulling = false;
        });
    }

    // 刷新数据
    async refreshData() {
        await this.loadTagData();
    }

    // 加载标签数据
    async loadTagData() {
        const loadingElement = document.getElementById('loading-stocks');
        const errorElement = document.getElementById('error-stocks');
        const containerElement = document.getElementById('stocks-container');
        
        try {
            loadingElement?.classList.remove('hidden');
            errorElement?.classList.add('hidden');
            containerElement?.classList.add('hidden');
            
            // 尝试从真实API加载数据
            try {
                const realData = await this.fetchRealTagStocks();
                if (realData) {
                    this.renderTagData(realData);
                    return;
                }
            } catch (apiError) {
                console.log('真实API不可用，尝试备用API');
            }
            
            // 尝试从备用API加载数据
            try {
                const response = await fetch(`/api/tag-stocks?tagId=${encodeURIComponent(this.tagId)}`);
                if (response.ok) {
                    const data = await response.json();
                    this.renderTagData(data);
                    return;
                }
            } catch (apiError) {
                console.log('备用API不可用，使用模拟数据');
            }
            
            // 最后使用模拟数据
            const mockData = this.getMockTagData();
            this.renderTagData(mockData);
            
        } catch (error) {
            console.error('加载标签数据失败:', error);
            this.showError('加载失败，请下拉刷新重试');
        } finally {
            loadingElement?.classList.add('hidden');
        }
    }

    // 获取真实标签股票数据
    async fetchRealTagStocks() {
        try {
            // 根据标签类型获取相应的股票数据
            const tagType = this.getTagType(this.tagId);
            let stocks = [];
            
            switch (tagType) {
                case 'sector':
                    stocks = await this.fetchSectorStocks();
                    break;
                case 'theme':
                    stocks = await this.fetchThemeStocks();
                    break;
                case 'concept':
                    stocks = await this.fetchConceptStocks();
                    break;
                default:
                    stocks = await this.fetchGeneralStocks();
            }
            
            if (stocks && stocks.length > 0) {
                return this.formatTagStockData(stocks);
            }
            
            return null;
        } catch (error) {
            console.error('获取真实标签股票数据失败:', error);
            return null;
        }
    }

    // 判断标签类型
    getTagType(tagId) {
        const sectorTags = ['科技', '金融', '医疗', '能源', '消费', '工业', '材料', '公用事业', '房地产', '通信'];
        const themeTags = ['ESG投资', '元宇宙', '区块链', '量子计算', '自动驾驶', '远程办公', '数字货币', '智能制造', '基因编辑', '太空经济'];
        const conceptTags = ['芯片概念', '新能源', '医药生物', '人工智能', '云计算', '新能源汽车', '生物技术', '半导体'];
        
        if (sectorTags.some(tag => tagId.includes(tag))) return 'sector';
        if (themeTags.some(tag => tagId.includes(tag))) return 'theme';
        if (conceptTags.some(tag => tagId.includes(tag))) return 'concept';
        
        return 'general';
    }

    // 获取行业股票数据
    async fetchSectorStocks() {
        try {
            // 使用Yahoo Finance API获取行业股票
            const response = await fetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=en-US&region=US&scrIds=most_actives&count=20');
            if (response.ok) {
                const data = await response.json();
                return data.finance?.result?.[0]?.quotes || [];
            }
            return null;
        } catch (error) {
            console.error('获取行业股票数据失败:', error);
            return null;
        }
    }

    // 获取主题股票数据
    async fetchThemeStocks() {
        try {
            // 使用Financial Modeling Prep API获取主题相关股票
            const response = await fetch('https://financialmodelingprep.com/api/v3/stock-screener?marketCapMoreThan=1000000000&limit=20&apikey=demo');
            if (response.ok) {
                const data = await response.json();
                return data || [];
            }
            return null;
        } catch (error) {
            console.error('获取主题股票数据失败:', error);
            return null;
        }
    }

    // 获取概念股票数据
    async fetchConceptStocks() {
        try {
            // 使用Alpha Vantage API获取概念股数据
            const response = await fetch('https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo');
            if (response.ok) {
                const data = await response.json();
                return data.top_gainers?.slice(0, 20) || [];
            }
            return null;
        } catch (error) {
            console.error('获取概念股数据失败:', error);
            return null;
        }
    }

    // 获取通用股票数据
    async fetchGeneralStocks() {
        try {
            // 使用IEX Cloud API获取通用股票数据
            const response = await fetch('https://cloud.iexapis.com/stable/stock/market/list/mostactive?token=demo');
            if (response.ok) {
                const data = await response.json();
                return data.slice(0, 20) || [];
            }
            return null;
        } catch (error) {
            console.error('获取通用股票数据失败:', error);
            return null;
        }
    }

    // 格式化标签股票数据
    formatTagStockData(stocks) {
        const formattedStocks = stocks.map(stock => {
            // 处理不同API返回的数据格式
            const symbol = stock.symbol || stock.ticker;
            const name = stock.shortName || stock.longName || stock.companyName || symbol;
            const price = stock.regularMarketPrice || stock.price || stock.latestPrice || 0;
            const changePercent = stock.regularMarketChangePercent || stock.changesPercentage || stock.changePercent || 0;
            const volume = stock.regularMarketVolume || stock.volume || stock.latestVolume || 0;
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
        
        // 生成标签统计信息
        const totalStocks = formattedStocks.length;
        const risingStocks = formattedStocks.filter(stock => stock.changePercent > 0).length;
        const fallingStocks = formattedStocks.filter(stock => stock.changePercent < 0).length;
        const flatStocks = totalStocks - risingStocks - fallingStocks;
        
        return {
            tag: {
                name: this.tagId,
                description: `${this.tagId}相关股票列表`
            },
            stats: {
                totalStocks,
                risingStocks,
                fallingStocks,
                flatStocks
            },
            stocks: formattedStocks
        };
    }

    // 渲染标签数据
    renderTagData(data) {
        // 更新标签信息
        this.updateTagInfo(data.tag);
        
        // 更新统计信息
        this.updateTagStats(data.stats);
        
        // 保存股票数据
        this.stocks = data.stocks || [];
        
        // 渲染股票列表
        this.renderStockList();
        
        // 显示容器
        const containerElement = document.getElementById('stocks-container');
        containerElement?.classList.remove('hidden');
    }

    // 更新标签信息
    updateTagInfo(tag) {
        const titleElement = document.getElementById('tag-title');
        const descriptionElement = document.getElementById('tag-description');
        
        if (titleElement && tag) {
            titleElement.textContent = tag.name || this.getTagDisplayName();
        }
        
        if (descriptionElement && tag) {
            descriptionElement.textContent = tag.description || `查看${tag.name || '该标签'}下的股票列表`;
        }
    }

    // 获取标签显示名称
    getTagDisplayName() {
        // 根据tagId生成显示名称
        if (this.tagId.includes('marketcap_')) {
            const capType = this.tagId.replace('marketcap_', '');
            const capNames = {
                '大盘股': '大盘股',
                '中盘股': '中盘股',
                '小盘股': '小盘股'
            };
            return capNames[capType] || '市值分类';
        }
        
        return this.tagId.replace(/_/g, ' ');
    }

    // 更新统计信息
    updateTagStats(stats) {
        const stockCountElement = document.getElementById('stock-count');
        const totalMarketCapElement = document.getElementById('total-market-cap');
        const avgChangeElement = document.getElementById('avg-change');
        
        if (stockCountElement && stats) {
            stockCountElement.textContent = stats.stockCount || this.stocks.length;
        }
        
        if (totalMarketCapElement && stats) {
            totalMarketCapElement.textContent = this.formatMarketCap(stats.totalMarketCap || 0);
        }
        
        if (avgChangeElement && stats) {
            const avgChange = stats.avgChange || 0;
            avgChangeElement.textContent = `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
            avgChangeElement.className = `stat-value ${avgChange >= 0 ? 'positive' : 'negative'}`;
        }
    }

    // 格式化市值
    formatMarketCap(marketCap) {
        if (marketCap >= 1e12) {
            return `$${(marketCap / 1e12).toFixed(2)}万亿`;
        } else if (marketCap >= 1e9) {
            return `$${(marketCap / 1e9).toFixed(2)}十亿`;
        } else if (marketCap >= 1e6) {
            return `$${(marketCap / 1e6).toFixed(2)}百万`;
        }
        return `$${marketCap.toLocaleString()}`;
    }

    // 改变排序类型
    changeSortType(sortType) {
        // 更新按钮状态
        const sortButtons = document.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortType);
        });
        
        this.currentSort = sortType;
        this.renderStockList();
    }

    // 渲染股票列表
    renderStockList() {
        const container = document.getElementById('stocks-container');
        const emptyState = document.getElementById('empty-state');
        
        if (!this.stocks || this.stocks.length === 0) {
            container.innerHTML = '';
            emptyState?.classList.remove('hidden');
            return;
        }
        
        emptyState?.classList.add('hidden');
        
        // 排序股票
        const sortedStocks = this.sortStocks([...this.stocks]);
        
        // 渲染股票卡片
        container.innerHTML = sortedStocks.map(stock => this.createStockCard(stock)).join('');
    }

    // 排序股票
    sortStocks(stocks) {
        return stocks.sort((a, b) => {
            switch (this.currentSort) {
                case 'market-cap':
                    return (b.marketCap || 0) - (a.marketCap || 0);
                case 'change':
                    return (b.changePercent || 0) - (a.changePercent || 0);
                case 'volume':
                    return (b.volume || 0) - (a.volume || 0);
                case 'price':
                    return (b.price || 0) - (a.price || 0);
                default:
                    return 0;
            }
        });
    }

    // 创建股票卡片
    createStockCard(stock) {
        const changeClass = stock.changePercent >= 0 ? 'positive' : (stock.changePercent < 0 ? 'negative' : 'neutral');
        const changeSymbol = stock.changePercent >= 0 ? '+' : '';
        
        return `
            <div class="stock-card" data-symbol="${stock.symbol}">
                <div class="stock-logo">
                    ${stock.symbol.substring(0, 2)}
                </div>
                <div class="stock-info">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name}</div>
                    <div class="stock-market-cap">市值: ${this.formatMarketCap(stock.marketCap || 0)}</div>
                </div>
                <div class="stock-price-info">
                    <div class="stock-price">$${(stock.price || 0).toFixed(2)}</div>
                    <div class="stock-change ${changeClass}">
                        ${changeSymbol}${(stock.changePercent || 0).toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }

    // 打开股票详情
    openStockDetail(symbol) {
        // 跳转到外部个股详情页面
        window.open(`https://stock-details-final.vercel.app/mobile.html?symbol=${encodeURIComponent(symbol)}`, '_blank');
    }

    // 显示错误
    showError(message) {
        const errorElement = document.getElementById('error-stocks');
        if (errorElement) {
            errorElement.innerHTML = `<p>${message}</p>`;
            errorElement.classList.remove('hidden');
        }
    }

    // 获取模拟标签数据
    getMockTagData() {
        const tagName = this.getTagDisplayName();
        
        return {
            tag: {
                id: this.tagId,
                name: tagName,
                description: `查看${tagName}下的股票列表`
            },
            stats: {
                stockCount: 25,
                totalMarketCap: 2.5e12,
                avgChange: 1.25
            },
            stocks: [
                {
                    symbol: 'AAPL',
                    name: '苹果公司',
                    price: 175.43,
                    changePercent: 2.15,
                    marketCap: 2.8e12,
                    volume: 45678900
                },
                {
                    symbol: 'MSFT',
                    name: '微软公司',
                    price: 338.11,
                    changePercent: 1.87,
                    marketCap: 2.5e12,
                    volume: 23456789
                },
                {
                    symbol: 'GOOGL',
                    name: '谷歌A类',
                    price: 125.68,
                    changePercent: -0.95,
                    marketCap: 1.6e12,
                    volume: 34567890
                },
                {
                    symbol: 'AMZN',
                    name: '亚马逊',
                    price: 142.56,
                    changePercent: 0.78,
                    marketCap: 1.4e12,
                    volume: 28901234
                },
                {
                    symbol: 'TSLA',
                    name: '特斯拉',
                    price: 248.42,
                    changePercent: 3.21,
                    marketCap: 7.8e11,
                    volume: 67890123
                },
                {
                    symbol: 'META',
                    name: 'Meta平台',
                    price: 298.75,
                    changePercent: -1.45,
                    marketCap: 7.5e11,
                    volume: 19876543
                },
                {
                    symbol: 'NVDA',
                    name: '英伟达',
                    price: 421.33,
                    changePercent: 4.67,
                    marketCap: 1.0e12,
                    volume: 45123678
                },
                {
                    symbol: 'NFLX',
                    name: '奈飞',
                    price: 387.92,
                    changePercent: -2.13,
                    marketCap: 1.7e11,
                    volume: 12345678
                }
            ]
        };
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new MobileTagDetailApp();
});