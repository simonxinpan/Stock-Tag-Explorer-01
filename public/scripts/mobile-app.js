// 移动版美股数据应用 JavaScript

class MobileStockApp {
    constructor() {
        this.currentPage = 'tag-plaza-mobile';
        this.currentMarket = 'sp500';
        this.isLoading = false;
        this.tagData = null;
        this.trendingData = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupPullToRefresh();
    }

    setupEventListeners() {
        // 底部导航
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });

        // 市场切换标签
        document.querySelectorAll('.market-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const market = e.currentTarget.dataset.market;
                this.switchMarket(market);
            });
        });

        // 标签卡片点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tag-card')) {
                const tagCard = e.target.closest('.tag-card');
                const tagName = tagCard.dataset.tag;
                this.handleTagClick(tagName);
            }
        });

        // 股票项点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.stock-item')) {
                const stockItem = e.target.closest('.stock-item');
                const symbol = stockItem.dataset.symbol;
                this.handleStockClick(symbol);
            }
        });
    }

    switchPage(pageId) {
        // 隐藏所有页面
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;

            // 更新导航状态
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

            // 加载页面数据
            if (pageId === 'trending-mobile' && !this.trendingData) {
                this.loadTrendingData();
            }
        }
    }

    switchMarket(market) {
        this.currentMarket = market;
        
        // 更新标签状态
        document.querySelectorAll('.market-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-market="${market}"]`).classList.add('active');

        // 重新加载趋势数据
        this.loadTrendingData();
    }

    async loadInitialData() {
        await this.loadTagData();
    }

    async loadTagData() {
        try {
            this.showLoading('tags');
            
            // 尝试从API加载数据
            try {
                const response = await fetch('/api/tags');
                if (response.ok) {
                    const data = await response.json();
                    this.tagData = data;
                    this.renderTagGroups(data);
                    this.hideLoading('tags');
                    return;
                }
            } catch (apiError) {
                console.log('API not available, using mock data');
            }
            
            // 使用模拟数据
            const mockData = this.getMockTagData();
            this.tagData = mockData;
            this.renderTagGroups(mockData);
            
            this.hideLoading('tags');
        } catch (error) {
            console.error('Error loading tag data:', error);
            this.showError('tags');
        }
    }

    async loadTrendingData() {
        try {
            this.showLoading('trending');
            
            // 尝试从API加载数据
            try {
                const marketParam = this.currentMarket === 'chinese_stocks' ? '?market=chinese_stocks' : '';
                const response = await fetch(`/api/trending${marketParam}`);
                if (response.ok) {
                    const data = await response.json();
                    this.trendingData = data;
                    this.renderTrendingData(data);
                    this.hideLoading('trending');
                    return;
                }
            } catch (apiError) {
                console.log('API not available, using mock data');
            }
            
            // 使用模拟数据
            const mockData = this.getMockTrendingData();
            this.trendingData = mockData;
            this.renderTrendingData(mockData);
            
            this.hideLoading('trending');
        } catch (error) {
            console.error('Error loading trending data:', error);
            this.showError('trending');
        }
    }

    renderTagGroups(data) {
        const categories = {
            'market-performance-tags': {
                title: '股市表现',
                tags: ['大盘股', '中盘股', '小盘股']
            },
            'financial-performance-tags': {
                title: '财务表现', 
                tags: ['高ROE', '低PE']
            },
            'industry-tags': {
                title: '行业分类',
                tags: ['信息技术', '医疗保健', '工业', '金融', '非必需消费品', '其他', '公用事业', '房地产', '日常消费品', '能源', '原材料', '金融服务', '半导体', '通讯服务', '媒体娱乐']
            },
            'special-tags': {
                title: '特殊名单',
                tags: ['S&P 500']
            }
        };

        Object.entries(categories).forEach(([containerId, category]) => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = category.tags.map(tagName => {
                    const tagInfo = data.find(tag => tag.name === tagName) || {
                        name: tagName,
                        description: this.getTagDescription(tagName),
                        count: 0
                    };
                    
                    return this.createTagCard(tagInfo);
                }).join('');
            }
        });

        // 显示标签组
        document.getElementById('tag-groups-mobile').classList.remove('hidden');
    }

    createTagCard(tag) {
        return `
            <div class="tag-card" data-tag="${tag.name}">
                <div class="tag-name">${tag.name}</div>
                <div class="tag-description">${tag.description}</div>
                <div class="tag-stats">
                    <span class="tag-count">${tag.count} 只股票</span>
                    <span class="tag-status">⚡ 实时更新</span>
                </div>
            </div>
        `;
    }

    getTagDescription(tagName) {
        const descriptions = {
            '大盘股': '市值超过2000亿美元的股票',
            '中盘股': '市值在100亿-2000亿美元之间的股票',
            '小盘股': '市值低于100亿美元的股票',
            '高ROE': '净资产收益率(ROE)最高的前10%股票',
            '低PE': '市盈率(PE)最低的前10%股票',
            'S&P 500': '标准普尔500指数成分股',
            '信息技术': '信息技术行业股票',
            '医疗保健': '医疗保健行业股票',
            '工业': '工业行业股票',
            '金融': '金融行业股票'
        };
        return descriptions[tagName] || `${tagName}相关股票`;
    }

    async renderTrendingData(data) {
        // 更新市场概览数据
        this.updateMarketOverview(data.summary || {
            totalStocks: this.currentMarket === 'sp500' ? 502 : 55,
            risingStocks: this.currentMarket === 'sp500' ? 326 : 24,
            fallingStocks: this.currentMarket === 'sp500' ? 163 : 29,
            totalMarketCap: this.currentMarket === 'sp500' ? '$60.54万亿' : '$9,992.47亿'
        });

        // 渲染各个榜单
        await this.renderStockList('gainers-list', data.gainers || []);
        await this.renderStockList('market-cap-list', data.marketCap || []);
        await this.renderStockList('new-highs-list', data.newHighs || []);

        // 显示榜单内容
        document.getElementById('trending-lists').classList.remove('hidden');
    }

    updateMarketOverview(summary) {
        document.getElementById('total-stocks').textContent = summary.totalStocks;
        document.getElementById('rising-stocks').textContent = summary.risingStocks;
        document.getElementById('falling-stocks').textContent = summary.fallingStocks;
        document.getElementById('total-market-cap').textContent = summary.totalMarketCap;
        
        // 更新标签页计数
        if (this.currentMarket === 'sp500') {
            document.getElementById('sp500-count-mobile').textContent = summary.totalStocks;
        } else {
            document.getElementById('chinese-count-mobile').textContent = summary.totalStocks;
        }
    }

    async renderStockList(containerId, stocks) {
        const container = document.getElementById(containerId);
        if (!container || !stocks.length) {
            container.innerHTML = '<div class="stock-item"><div class="stock-info">暂无数据</div></div>';
            return;
        }

        container.innerHTML = stocks.slice(0, 5).map((stock, index) => {
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const changeSymbol = stock.change >= 0 ? '+' : '';
            
            return `
                <div class="stock-item" data-symbol="${stock.symbol}">
                    <div class="stock-rank">${index + 1}</div>
                    <div class="stock-info">
                        <div class="stock-name">${stock.name || stock.symbol}</div>
                        <div class="stock-symbol">${stock.symbol}</div>
                    </div>
                    <div class="stock-price">
                        <div class="stock-current-price">$${stock.price?.toFixed(2) || '0.00'}</div>
                        <div class="stock-change ${changeClass}">
                            ${changeSymbol}${stock.changePercent?.toFixed(2) || '0.00'}%
                        </div>
                        ${stock.marketCap ? `<div class="stock-market-cap">${this.formatMarketCap(stock.marketCap)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
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

    showLoading(type) {
        const loadingElement = document.getElementById(`loading-${type}`);
        const errorElement = document.getElementById(`error-${type}`);
        
        if (loadingElement) loadingElement.classList.remove('hidden');
        if (errorElement) errorElement.classList.add('hidden');
        
        this.isLoading = true;
    }

    hideLoading(type) {
        const loadingElement = document.getElementById(`loading-${type}`);
        if (loadingElement) loadingElement.classList.add('hidden');
        
        this.isLoading = false;
    }

    showError(type) {
        const loadingElement = document.getElementById(`loading-${type}`);
        const errorElement = document.getElementById(`error-${type}`);
        
        if (loadingElement) loadingElement.classList.add('hidden');
        if (errorElement) errorElement.classList.remove('hidden');
        
        this.isLoading = false;
    }

    handleTagClick(tagName) {
        // 添加触摸反馈
        this.addTouchFeedback(event.currentTarget);
        
        // 这里可以跳转到标签详情页或显示相关股票
        console.log('Tag clicked:', tagName);
        
        // 模拟跳转到标签详情页
        const tagDetailUrl = `/tag-detail.html?tag=${encodeURIComponent(tagName)}`;
        window.open(tagDetailUrl, '_blank');
    }

    handleStockClick(symbol) {
        // 添加触摸反馈
        this.addTouchFeedback(event.currentTarget);
        
        // 跳转到股票详情页
        console.log('Stock clicked:', symbol);
        
        // 模拟跳转到股票详情页
        const stockDetailUrl = `https://stock-details-final.vercel.app/?symbol=${symbol}`;
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
        
        const mainElement = document.querySelector('.mobile-main');
        
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
                // 可以在这里添加下拉刷新的视觉反馈
            }
        });
        
        mainElement.addEventListener('touchend', (e) => {
            if (!isPulling) return;
            
            const pullDistance = currentY - startY;
            
            if (pullDistance > 60) {
                // 触发刷新
                this.refreshCurrentPage();
            }
            
            isPulling = false;
            startY = 0;
            currentY = 0;
        });
    }

    async refreshCurrentPage() {
        if (this.isLoading) return;
        
        try {
            if (this.currentPage === 'tag-plaza-mobile') {
                await this.loadTagData();
            } else if (this.currentPage === 'trending-mobile') {
                await this.loadTrendingData();
            }
            
            // 显示刷新成功提示
            this.showToast('数据已更新');
        } catch (error) {
            this.showToast('刷新失败，请重试');
        }
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
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
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

    // 模拟数据加载（当API不可用时）
    getMockTagData() {
        return [
            { name: '大盘股', description: '市值超过2000亿美元的股票', count: 47 },
            { name: '中盘股', description: '市值在100亿-2000亿美元之间的股票', count: 404 },
            { name: '小盘股', description: '市值低于100亿美元的股票', count: 48 },
            { name: '高ROE', description: '净资产收益率(ROE)最高的前10%股票', count: 50 },
            { name: '低PE', description: '市盈率(PE)最低的前10%股票', count: 50 },
            { name: 'S&P 500', description: '标准普尔500指数成分股', count: 500 },
            { name: '信息技术', description: '信息技术行业股票', count: 68 },
            { name: '医疗保健', description: '医疗保健行业股票', count: 62 }
        ];
    }

    getMockTrendingData() {
        const sp500Data = {
            summary: {
                totalStocks: 502,
                risingStocks: 326,
                fallingStocks: 163,
                totalMarketCap: '$60.54万亿'
            },
            gainers: [
                { symbol: 'PARA', name: '派拉蒙环球', price: 11.04, changePercent: 15.55 },
                { symbol: 'LRCX', name: '泛林集团', price: 115.58, changePercent: 7.66 },
                { symbol: 'MU', name: 'Micron Technology', price: 150.57, changePercent: 7.55 },
                { symbol: 'WBD', name: '华纳兄弟探索', price: 16.17, changePercent: 6.93 },
                { symbol: 'CE', name: '赛拉尼斯', price: 46.87, changePercent: 5.99 }
            ],
            marketCap: [
                { symbol: 'NVDA', name: 'NVIDIA Corp', price: 177.17, changePercent: 0.47, marketCap: 4.31e12 },
                { symbol: 'MSFT', name: 'Microsoft Corp', price: 501.01, changePercent: 0.13, marketCap: 3.77e12 },
                { symbol: 'AAPL', name: '苹果公司', price: 230.03, changePercent: 1.43, marketCap: 3.36e12 },
                { symbol: 'GOOG', name: '谷歌C', price: 240.78, changePercent: 0.51, marketCap: 2.91e12 },
                { symbol: 'GOOGL', name: '谷歌A', price: 240.37, changePercent: 0.50, marketCap: 2.90e12 }
            ],
            newHighs: [
                { symbol: 'WST', name: '西部制药', price: 263.53, changePercent: -0.47 },
                { symbol: 'WMB', name: '威廉姆斯', price: 59.29, changePercent: -0.76 },
                { symbol: 'VMC', name: '火神材料', price: 301.51, changePercent: -0.68 },
                { symbol: 'OGN', name: 'Organon & Co', price: 10.66, changePercent: 3.90 },
                { symbol: 'STE', name: '斯特瑞斯', price: 252.46, changePercent: -0.30 }
            ]
        };

        const chineseData = {
            summary: {
                totalStocks: 55,
                risingStocks: 24,
                fallingStocks: 29,
                totalMarketCap: '$9,992.47亿'
            },
            gainers: [
                { symbol: 'BZUN', name: '宝尊电商', price: 4.77, changePercent: 6.95 },
                { symbol: 'JKS', name: '晶科能源', price: 25.09, changePercent: 6.31 },
                { symbol: 'MOGU', name: '蘑菇街', price: 4.90, changePercent: 6.29 },
                { symbol: 'VNET', name: '世纪互联', price: 9.57, changePercent: 5.05 },
                { symbol: 'IMAB', name: '天境生物', price: 4.09, changePercent: 4.87 }
            ],
            marketCap: [
                { symbol: 'BABA', name: '阿里巴巴', price: 155.06, changePercent: -0.24, marketCap: 3.50794e11 },
                { symbol: 'PDD', name: '拼多多', price: 125.44, changePercent: -0.22, marketCap: 1.74207e11 },
                { symbol: 'NTES', name: '网易', price: 152.80, changePercent: 1.80, marketCap: 9.0637e10 },
                { symbol: 'TCOM', name: '携程', price: 73.87, changePercent: -1.28, marketCap: 4.8815e10 },
                { symbol: 'JD', name: '京东', price: 33.67, changePercent: -2.12, marketCap: 4.8274e10 }
            ],
            newHighs: [
                { symbol: 'NTES', name: '网易', price: 152.91, changePercent: 1.80 },
                { symbol: 'BZ', name: '看准网（BOSS直聘）', price: 24.72, changePercent: -0.08 }
            ]
        };

        return this.currentMarket === 'sp500' ? sp500Data : chineseData;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileStockApp();
});

// 处理页面可见性变化，自动刷新数据
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.mobileApp) {
        // 页面重新可见时刷新数据
        setTimeout(() => {
            window.mobileApp.refreshCurrentPage();
        }, 1000);
    }
});