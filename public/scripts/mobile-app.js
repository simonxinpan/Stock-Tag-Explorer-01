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
        this.setupRankingNavigation();
        this.setupHeatmapControls();
        this.setupTagsControls();
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

        // 榜单导航切换
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ranking-nav-btn')) {
                const btn = e.target.closest('.ranking-nav-btn');
                const ranking = btn.dataset.ranking;
                this.switchRanking(ranking);
            }
        });

        // 更多按钮点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.more-btn')) {
                const btn = e.target.closest('.more-btn');
                const listType = btn.dataset.list;
                this.showMoreStocks(listType);
            }
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

        const stockItems = stocks.slice(0, 4).map((stock, index) => {
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
        });

        // 在第四名后添加更多按钮
        if (stocks.length > 4) {
            const listType = this.getListTypeFromContainerId(containerId);
            stockItems.push(`
                <div class="more-btn-container">
                    <button class="more-btn" data-list="${listType}">更多</button>
                </div>
            `);
        }

        container.innerHTML = stockItems.join('');
    }

    getListTypeFromContainerId(containerId) {
        const typeMap = {
            'gainers-list': 'gainers',
            'market-cap-list': 'market-cap',
            'new-highs-list': 'new-highs'
        };
        return typeMap[containerId] || 'gainers';
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
        
        // 跳转到移动版标签详情页
        const tagDetailUrl = `mobile-tag-detail.html?tag=${encodeURIComponent(tagName)}`;
        window.location.href = tagDetailUrl;
    }

    handleStockClick(symbol) {
        // 添加触摸反馈
        this.addTouchFeedback(event.currentTarget);
        
        // 跳转到股票详情页
        console.log('Stock clicked:', symbol);
        
        // 跳转到移动版股票详情页
        const stockDetailUrl = `mobile-stock-detail.html?symbol=${encodeURIComponent(symbol)}`;
        window.location.href = stockDetailUrl;
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

    // 设置榜单导航
    setupRankingNavigation() {
        const rankingNav = document.querySelector('.ranking-nav');
        if (rankingNav) {
            // 添加滑动效果
            let isScrolling = false;
            rankingNav.addEventListener('scroll', () => {
                if (!isScrolling) {
                    window.requestAnimationFrame(() => {
                        // 可以在这里添加滑动时的视觉效果
                        isScrolling = false;
                    });
                    isScrolling = true;
                }
            });
        }
    }

    // 切换榜单类型
    switchRanking(ranking) {
        // 更新导航按钮状态
        const rankingButtons = document.querySelectorAll('.ranking-nav-btn');
        rankingButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ranking === ranking);
        });

        // 根据榜单类型加载对应数据
        this.loadRankingData(ranking);
    }

    // 加载特定榜单数据
    async loadRankingData(ranking) {
        try {
            const mockData = this.getMockRankingData(ranking);
            this.renderRankingData(mockData, ranking);
        } catch (error) {
            console.error('加载榜单数据失败:', error);
        }
    }

    // 显示更多股票
    showMoreStocks(listType) {
        // 跳转到完整的榜单页面
        console.log(`显示更多 ${listType} 股票`);
        const rankingDetailUrl = `mobile-ranking-detail.html?type=${encodeURIComponent(listType)}&market=${this.currentMarket}`;
        window.location.href = rankingDetailUrl;
    }

    setupHeatmapControls() {
        const marketSelector = document.getElementById('heatmap-market');
        const metricSelector = document.getElementById('heatmap-metric');
        
        if (marketSelector) {
            marketSelector.addEventListener('change', () => {
                this.loadHeatmapData();
            });
        }
        
        if (metricSelector) {
            metricSelector.addEventListener('change', () => {
                this.loadHeatmapData();
            });
        }
    }

    async loadHeatmapData() {
        try {
            const loadingEl = document.getElementById('heatmap-loading');
            const errorEl = document.getElementById('heatmap-error');
            const chartEl = document.getElementById('heatmap-chart');
            
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (errorEl) errorEl.classList.add('hidden');
            if (chartEl) chartEl.style.opacity = '0.5';
            
            // 模拟API调用延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 获取当前选择的市场和指标
            const market = document.getElementById('heatmap-market')?.value || 'US';
            const metric = document.getElementById('heatmap-metric')?.value || 'change';
            
            console.log(`加载热力图数据: 市场=${market}, 指标=${metric}`);
            
            // 更新iframe src以反映新的参数
            const iframe = document.getElementById('heatmap-frame');
            if (iframe) {
                iframe.src = `heatmap-center.html?market=${market}&metric=${metric}`;
            }
            
            if (loadingEl) loadingEl.classList.add('hidden');
            if (chartEl) chartEl.style.opacity = '1';
            
        } catch (error) {
            console.error('加载热力图数据失败:', error);
            
            const loadingEl = document.getElementById('heatmap-loading');
            const errorEl = document.getElementById('heatmap-error');
            
            if (loadingEl) loadingEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
        }
    }

    setupTagsControls() {
        // 分类导航按钮
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.switchTagCategory(category);
            });
        });
        
        // 搜索功能
        const searchInput = document.getElementById('tag-search');
        const searchBtn = document.querySelector('.search-btn');
        
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTags(e.target.value);
                }, 300);
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchTerm = searchInput?.value || '';
                this.searchTags(searchTerm);
            });
        }
    }
    
    switchTagCategory(category) {
        // 更新按钮状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // 清空搜索框
        const searchInput = document.getElementById('tag-search');
        if (searchInput) searchInput.value = '';
        
        // 重新加载数据
        this.loadTagsData(category);
    }
    
    searchTags(searchTerm) {
        const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';
        this.loadTagsData(activeCategory, searchTerm);
    }
    
    filterTags(tags, category, searchTerm) {
        let filteredTags = tags;
        
        // 按分类过滤
        if (category && category !== 'all') {
            filteredTags = filteredTags.filter(tag => tag.category === category);
        }
        
        // 按搜索词过滤
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredTags = filteredTags.filter(tag => 
                tag.name.toLowerCase().includes(term) || 
                (tag.description && tag.description.toLowerCase().includes(term))
            );
        }
        
        return filteredTags;
    }

    async loadTagsData(category = 'all', searchTerm = '') {
        try {
            const loadingEl = document.getElementById('tags-loading');
            const errorEl = document.getElementById('tags-error');
            const contentEl = document.getElementById('tags-content');
            
            if (loadingEl) loadingEl.classList.remove('hidden');
            if (errorEl) errorEl.classList.add('hidden');
            if (contentEl) contentEl.style.opacity = '0.5';
            
            // 模拟API调用延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 模拟API调用
            const response = await fetch('/api/tags');
            let tags = response.ok ? await response.json() : this.getMockTagsData();
            
            // 根据分类和搜索词过滤标签
            tags = this.filterTags(tags, category, searchTerm);
            
            this.renderTags(tags);
            
            if (loadingEl) loadingEl.classList.add('hidden');
            if (contentEl) contentEl.style.opacity = '1';
            
        } catch (error) {
            console.error('加载标签数据失败:', error);
            
            const loadingEl = document.getElementById('tags-loading');
            const errorEl = document.getElementById('tags-error');
            
            if (loadingEl) loadingEl.classList.add('hidden');
            if (errorEl) errorEl.classList.remove('hidden');
        }
    }

    renderTags(tags) {
        const container = document.getElementById('tags-content');
        if (!container) return;

        if (tags.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🔍 未找到相关标签</p>
                    <p>尝试调整搜索条件或选择其他分类</p>
                </div>
            `;
            return;
        }

        const tagsByCategory = this.groupTagsByCategory(tags);
        
        container.innerHTML = Object.entries(tagsByCategory).map(([category, categoryTags]) => {
            const categoryName = this.getCategoryName(category);
            return `
                <div class="tag-category">
                    <h3 class="category-title">
                        ${categoryName}
                        <span class="tag-count">${categoryTags.length}</span>
                    </h3>
                    <div class="tag-grid">
                        ${categoryTags.map(tag => `
                            <div class="tag-item" data-tag-id="${tag.id}">
                                <div class="tag-name">${tag.name}</div>
                                <div class="tag-description">${tag.description || '投资主题标签'}</div>
                                <div class="tag-stats">
                                    <span class="stock-count">${tag.stockCount || 0}只股票</span>
                                    <span class="trend-indicator ${tag.trend === 'up' ? 'trend-up' : tag.trend === 'down' ? 'trend-down' : ''}">
                                        ${tag.trend === 'up' ? '📈' : tag.trend === 'down' ? '📉' : '➖'}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    groupTagsByCategory(tags) {
        return tags.reduce((acc, tag) => {
            if (!acc[tag.category]) {
                acc[tag.category] = [];
            }
            acc[tag.category].push(tag);
            return acc;
        }, {});
    }

    getCategoryName(category) {
        const categoryNames = {
            'sector': '行业板块',
            'theme': '主题概念',
            'marketcap': '市值规模',
            'style': '投资风格',
            'region': '地区市场'
        };
        return categoryNames[category] || category;
    }

    getMockTagsData() {
        return [
            { id: 'tech', name: '科技股', category: 'sector', description: '科技创新领域', stockCount: 156, trend: 'up' },
            { id: 'finance', name: '金融股', category: 'sector', description: '银行保险证券', stockCount: 89, trend: 'down' },
            { id: 'healthcare', name: '医疗股', category: 'sector', description: '医药生物医疗', stockCount: 124, trend: 'up' },
            { id: 'energy', name: '能源股', category: 'sector', description: '石油天然气', stockCount: 67, trend: 'neutral' },
            { id: 'consumer', name: '消费股', category: 'sector', description: '消费品零售', stockCount: 98, trend: 'up' },
            { id: 'industrial', name: '工业股', category: 'sector', description: '制造业工业', stockCount: 145, trend: 'neutral' },
            
            { id: 'ai', name: '人工智能', category: 'theme', description: 'AI技术应用', stockCount: 78, trend: 'up' },
            { id: 'ev', name: '新能源车', category: 'theme', description: '电动汽车产业', stockCount: 56, trend: 'up' },
            { id: 'cloud', name: '云计算', category: 'theme', description: '云服务平台', stockCount: 43, trend: 'up' },
            { id: 'blockchain', name: '区块链', category: 'theme', description: '区块链技术', stockCount: 32, trend: 'down' },
            { id: '5g', name: '5G通信', category: 'theme', description: '5G网络建设', stockCount: 67, trend: 'neutral' },
            { id: 'biotech', name: '生物科技', category: 'theme', description: '生物技术研发', stockCount: 89, trend: 'up' },
            
            { id: 'large_cap', name: '大盘股', category: 'marketcap', description: '市值超过100亿', stockCount: 234, trend: 'up' },
            { id: 'mid_cap', name: '中盘股', category: 'marketcap', description: '市值20-100亿', stockCount: 456, trend: 'neutral' },
            { id: 'small_cap', name: '小盘股', category: 'marketcap', description: '市值低于20亿', stockCount: 789, trend: 'down' },
            
            { id: 'growth', name: '成长股', category: 'style', description: '高增长潜力', stockCount: 345, trend: 'up' },
            { id: 'value', name: '价值股', category: 'style', description: '低估值投资', stockCount: 267, trend: 'up' },
            { id: 'dividend', name: '分红股', category: 'style', description: '稳定分红收益', stockCount: 123, trend: 'neutral' },
            { id: 'momentum', name: '动量股', category: 'style', description: '价格趋势强劲', stockCount: 89, trend: 'up' },
            
            { id: 'us', name: '美国市场', category: 'region', description: '美股上市公司', stockCount: 1234, trend: 'up' },
            { id: 'china', name: '中国市场', category: 'region', description: 'A股港股中概', stockCount: 2345, trend: 'neutral' },
            { id: 'europe', name: '欧洲市场', category: 'region', description: '欧洲上市公司', stockCount: 567, trend: 'down' },
            { id: 'emerging', name: '新兴市场', category: 'region', description: '新兴经济体', stockCount: 456, trend: 'up' }
        ];
    }

    // 获取模拟榜单数据
    getMockRankingData(ranking) {
        const data = this.getMockTrendingData();
        switch (ranking) {
            case 'gainers':
                return data.gainers;
            case 'market-cap':
                return data.marketCap;
            case 'new-highs':
                return data.newHighs;
            default:
                return data.gainers;
        }
    }

    // 渲染榜单数据
    renderRankingData(data, ranking) {
        // 隐藏所有榜单
        document.querySelectorAll('.ranking-list').forEach(list => {
            list.classList.add('hidden');
        });

        // 显示对应榜单
        const targetList = document.getElementById(`${ranking}-list`);
        if (targetList) {
            targetList.classList.remove('hidden');
            this.renderStockList(`${ranking}-list`, data);
        }
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