/**
 * 热力图中心页面交互逻辑
 * 负责页面的动态功能、数据加载和用户交互
 */

class HeatmapCenter {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.isLoading = false;
        this.refreshInterval = null;
        this.heatmaps = {}; // 存储各个热力图实例
        
        this.init();
    }

    /**
     * 初始化页面
     */
    init() {
        this.setupEventListeners();
        this.handleUrlHash();
        this.loadInitialData();
        this.startAutoRefresh();
        this.updateStats();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 控制面板事件
        document.getElementById('market-data-source')?.addEventListener('change', () => {
            this.refreshMarketHeatmap();
        });
        
        document.getElementById('market-timeframe')?.addEventListener('change', () => {
            this.refreshMarketHeatmap();
        });
        
        document.getElementById('sector-sort')?.addEventListener('change', () => {
            this.refreshSectorHeatmap();
        });
        
        document.getElementById('tag-category')?.addEventListener('change', () => {
            this.refreshTagHeatmap();
        });

        // 快速导航点击事件
        document.querySelectorAll('.nav-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const href = card.getAttribute('href');
                if (href && href.startsWith('#')) {
                    this.scrollToSection(href.substring(1));
                }
            });
        });

        // 行业卡片点击事件
        document.querySelectorAll('.sector-card').forEach(card => {
            card.addEventListener('click', () => {
                const sector = card.dataset.sector;
                if (sector) {
                    this.showFeaturedSector(sector);
                }
            });
        });

        // 返回热力图中心按钮
        const backToCenterBtn = document.getElementById('back-to-center');
        if (backToCenterBtn) {
            backToCenterBtn.addEventListener('click', () => {
                this.showOverview();
            });
        }

        // 监听URL hash变化
        window.addEventListener('hashchange', () => {
            this.handleUrlHash();
        });

        // 标签卡片悬停效果
        document.querySelectorAll('.tag-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.highlightTagCard(card);
            });
            
            card.addEventListener('mouseleave', () => {
                this.unhighlightTagCard(card);
            });
            
            card.addEventListener('click', () => {
                const tagId = card.dataset.tag;
                if (tagId) {
                    this.viewTagDetail(tagId);
                }
            });
        });

        // 趋势卡片点击事件
        document.querySelectorAll('.trending-card').forEach(card => {
            card.addEventListener('click', () => {
                this.viewTrendingDetail(card);
            });
        });
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            this.showLoading();
            
            // 并行加载所有热力图数据
            await Promise.all([
                this.loadMarketHeatmap(),
                this.loadSectorHeatmaps(),
                this.loadTagHeatmaps(),
                this.loadTrendingHeatmaps()
            ]);
            
        } catch (error) {
            console.error('加载初始数据失败:', error);
            this.showError('数据加载失败，请刷新页面重试');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 加载市场全景热力图
     */
    async loadMarketHeatmap() {
        const container = document.getElementById('market-heatmap');
        if (!container) return;
        
        this.showHeatmapLoading(container);
        
        try {
            // 获取市场数据
            const marketData = await this.fetchMarketData();
            
            // 创建热力图容器
            const heatmapContainer = document.createElement('div');
            heatmapContainer.style.width = '100%';
            heatmapContainer.style.height = '400px';
            container.innerHTML = '';
            container.appendChild(heatmapContainer);
            
            // 使用StockHeatmap组件渲染
            const heatmap = new StockHeatmap(heatmapContainer, {
                metric: 'changePercent',
                category: 'market',
                interactive: true,
                showTooltip: true,
                onStockClick: (stock) => this.handleStockClick(stock)
            });
            
            // 渲染数据
            await heatmap.render(marketData);
            
            this.heatmaps.market = heatmap;
            
        } catch (error) {
            console.error('Failed to load market heatmap:', error);
            this.showHeatmapError(container, '市场热力图加载失败');
        }
    }

    /**
     * 加载分行业热力图
     */
    async loadSectorHeatmaps() {
        const container = document.getElementById('sector-heatmaps-grid');
        if (!container) return;
        
        this.showHeatmapLoading(container);
        
        try {
            const sectors = [
                { id: 'technology', name: '科技', icon: '💻' },
                { id: 'finance', name: '金融', icon: '🏦' },
                { id: 'healthcare', name: '医疗', icon: '🏥' },
                { id: 'energy', name: '能源', icon: '⚡' },
                { id: 'consumer', name: '消费', icon: '🛒' },
                { id: 'industrial', name: '工业', icon: '🏭' }
            ];
            
            container.innerHTML = '';
            
            for (const sector of sectors) {
                // 获取该行业的数据
                const sectorData = await this.fetchSectorData(sector.id);
                
                const sectorCard = document.createElement('div');
                sectorCard.className = 'sector-heatmap-card';
                sectorCard.innerHTML = `
                    <div class="sector-header">
                        <span class="sector-icon">${sector.icon}</span>
                        <h3 class="sector-name">${sector.name}</h3>
                    </div>
                    <div class="sector-heatmap" id="heatmap-${sector.id}"></div>
                `;
                
                container.appendChild(sectorCard);
                
                // 创建该行业的热力图
                const heatmapContainer = sectorCard.querySelector('.sector-heatmap');
                const heatmap = new StockHeatmap(heatmapContainer, {
                    metric: 'changePercent',
                    category: sector.id,
                    interactive: true,
                    showTooltip: true,
                    onStockClick: (stock) => this.handleStockClick(stock)
                });
                
                // 渲染数据
                await heatmap.render(sectorData.stocks);
                
                this.heatmaps[sector.id] = heatmap;
            }
            
        } catch (error) {
            console.error('Failed to load sector heatmaps:', error);
            this.showHeatmapError(container, '行业热力图加载失败');
        }
    }

    /**
     * 加载标签热力图
     */
    async loadTagHeatmaps() {
        const tags = ['ai', 'ev', 'cloud', 'biotech', 'sp500', 'dividend'];
        
        for (const tag of tags) {
            const container = document.getElementById(`${tag}-heatmap`);
            if (!container) continue;

            this.showHeatmapLoading(container);
            
            try {
                // 获取标签数据
                const tagData = await this.fetchTagData(tag);
                
                // 创建热力图容器
                const heatmapContainer = document.createElement('div');
                heatmapContainer.style.width = '100%';
                heatmapContainer.style.height = '120px';
                container.innerHTML = '';
                container.appendChild(heatmapContainer);
                
                // 使用StockHeatmap组件渲染
                const heatmap = new StockHeatmap(heatmapContainer, {
                    metric: 'changePercent',
                    category: 'tag',
                    interactive: true,
                    showTooltip: true,
                    onStockClick: (stock) => this.handleStockClick(stock)
                });
                
                // 渲染数据
                await heatmap.render(tagData.stocks);
                
                this.heatmaps[`${tag}-heatmap`] = heatmap;
                
            } catch (error) {
                console.error(`加载${tag}标签热力图失败:`, error);
                this.showHeatmapError(container, '数据加载失败');
            }
        }
    }

    /**
     * 加载趋势榜单热力图
     */
    async loadTrendingHeatmaps() {
        const trendingTypes = ['gainers', 'losers', 'volume', 'marketcap'];
        
        for (const type of trendingTypes) {
            const container = document.getElementById(`${type}-heatmap`);
            if (!container) continue;

            this.showHeatmapLoading(container);
            
            try {
                // 获取趋势数据
                const trendData = await this.fetchTrendingData(type);
                
                // 创建热力图容器
                const heatmapContainer = document.createElement('div');
                heatmapContainer.style.width = '100%';
                heatmapContainer.style.height = '120px';
                container.innerHTML = '';
                container.appendChild(heatmapContainer);
                
                // 使用StockHeatmap组件渲染
                const heatmap = new StockHeatmap(heatmapContainer, {
                    metric: type === 'volume' || type === 'marketcap' ? 'volume' : 'changePercent',
                    category: 'trending',
                    interactive: true,
                    showTooltip: true,
                    onStockClick: (stock) => this.handleStockClick(stock)
                });
                
                // 渲染数据
                await heatmap.render(trendData);
                
                this.heatmaps[`${type}-heatmap`] = heatmap;
                
            } catch (error) {
                console.error(`加载${type}趋势热力图失败:`, error);
                this.showHeatmapError(container, '数据加载失败');
            }
        }
    }

    /**
     * 模拟获取市场数据
     */
    async fetchMarketData() {
        // 模拟API延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 生成模拟数据
        const stocks = [];
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'CRM', 'ORCL'];
        
        symbols.forEach(symbol => {
            stocks.push({
                symbol,
                name: this.getCompanyName(symbol),
                price: Math.random() * 300 + 50,
                change: (Math.random() - 0.5) * 20,
                changePercent: (Math.random() - 0.5) * 10,
                volume: Math.random() * 100000000,
                marketCap: Math.random() * 3000000000000,
                sector: this.getSector(symbol)
            });
        });
        
        return { 
            stocks, 
            name: '市场概览',
            market: 'sp500'
        };
    }

    /**
     * 模拟获取行业数据
     */
    async fetchSectorData(sector) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const stocks = [];
        const sectorStocks = this.getSectorStocks(sector);
        
        sectorStocks.forEach(symbol => {
            stocks.push({
                symbol,
                name: this.getCompanyName(symbol),
                price: Math.random() * 300 + 50,
                change: (Math.random() - 0.5) * 20,
                changePercent: (Math.random() - 0.5) * 10,
                volume: Math.random() * 100000000,
                marketCap: Math.random() * 3000000000000,
                sector
            });
        });
        
        // 获取行业名称
        const sectorNames = {
            'technology': '信息技术',
            'healthcare': '医疗保健',
            'financial': '金融服务',
            'consumer': '消费品',
            'energy': '能源',
            'industrial': '工业',
            'materials': '材料',
            'utilities': '公用事业',
            'real-estate': '房地产',
            'communication': '通信',
            'transportation': '交通运输',
            'retail': '零售',
            'agriculture': '农业'
        };
        
        return {
            name: sectorNames[sector] || sector,
            stocks
        };
    }

    /**
     * 模拟获取标签数据
     */
    async fetchTagData(tag) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const stocks = [];
        const tagStocks = this.getTagStocks(tag);
        
        tagStocks.forEach(symbol => {
            stocks.push({
                symbol,
                name: this.getCompanyName(symbol),
                price: Math.random() * 300 + 50,
                change: (Math.random() - 0.5) * 20,
                changePercent: (Math.random() - 0.5) * 10,
                volume: Math.random() * 100000000,
                marketCap: Math.random() * 3000000000000,
                tag
            });
        });
        
        return stocks;
    }

    /**
     * 模拟获取趋势数据
     */
    async fetchTrendingData(type) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const stocks = [];
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
        
        symbols.forEach(symbol => {
            let changePercent;
            switch (type) {
                case 'gainers':
                    changePercent = Math.random() * 15 + 2;
                    break;
                case 'losers':
                    changePercent = -(Math.random() * 10 + 1);
                    break;
                default:
                    changePercent = (Math.random() - 0.5) * 10;
            }
            
            stocks.push({
                symbol,
                name: this.getCompanyName(symbol),
                price: Math.random() * 300 + 50,
                change: changePercent * (Math.random() * 300 + 50) / 100,
                changePercent,
                volume: Math.random() * 100000000,
                marketCap: Math.random() * 3000000000000
            });
        });
        
        return stocks;
    }

    /**
     * 刷新市场热力图
     */
    async refreshMarketHeatmap() {
        const container = document.getElementById('market-heatmap');
        if (!container) return;
        
        this.showHeatmapLoading(container);
        await this.loadMarketHeatmap();
    }

    /**
     * 刷新行业热力图
     */
    async refreshSectorHeatmap() {
        await this.loadSectorHeatmaps();
    }

    /**
     * 刷新标签热力图
     */
    async refreshTagHeatmap() {
        await this.loadTagHeatmaps();
    }

    /**
     * 刷新趋势热力图
     */
    async refreshTrendingHeatmap() {
        await this.loadTrendingHeatmaps();
    }

    /**
     * 处理股票点击事件
     */
    handleStockClick(stock) {
        // 添加触摸反馈效果
        if (event && event.currentTarget) {
            this.addTouchFeedback(event.currentTarget);
        }
        
        // 跳转到外部股票详情页
        const stockDetailUrl = `https://stock-details-final.vercel.app/mobile.html?symbol=${encodeURIComponent(stock.symbol)}`;
        window.open(stockDetailUrl, '_blank');
        
        console.log(`热力图股票点击: ${stock.symbol}，跳转到详情页`);
    }
    
    /**
     * 添加触摸反馈效果
     */
    addTouchFeedback(element) {
        if (!element) return;
        
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'transform 0.15s ease';
        
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    /**
     * 查看标签详情
     */
    viewTagDetail(tagId) {
        window.open(`tag-detail.html?tagId=${tagId}`, '_blank');
    }

    /**
     * 处理URL锚点
     */
    handleUrlHash() {
        const hash = window.location.hash.substring(1);
        if (hash.startsWith('sector-')) {
            const sector = hash.replace('sector-', '');
            this.showFeaturedSector(sector);
        } else {
            this.showOverview();
        }
    }
    
    /**
     * 显示特定行业热力图
     */
    showFeaturedSector(sector) {
        // 更新URL hash
        window.location.hash = `sector-${sector}`;
        
        // 隐藏主要内容区域
        const mainSections = ['market-overview', 'sector-analysis', 'tag-insights', 'trending-analysis'];
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
        
        // 显示特定行业区域
        const featuredSection = document.getElementById('featured-sector-section');
        if (featuredSection) {
            featuredSection.style.display = 'block';
            this.loadFeaturedSectorHeatmap(sector);
        }
    }
    
    /**
     * 显示概览页面
     */
    showOverview() {
        // 清除URL hash
        window.location.hash = '';
        
        // 显示主要内容区域
        const mainSections = ['market-overview', 'sector-analysis', 'tag-insights', 'trending-analysis'];
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
            }
        });
        
        // 隐藏特定行业区域
        const featuredSection = document.getElementById('featured-sector-section');
        if (featuredSection) {
            featuredSection.style.display = 'none';
        }
    }
    
    /**
     * 加载特定行业热力图
     */
    async loadFeaturedSectorHeatmap(sector) {
        const container = document.getElementById('featured-sector-heatmap');
        if (!container) return;
        
        try {
            // 显示加载状态
            this.showHeatmapLoading(container);
            
            // 获取行业数据
            const sectorData = await this.fetchSectorData(sector);
            
            // 更新行业标题和统计
            this.updateFeaturedSectorInfo(sector, sectorData);
            
            // 创建热力图
            const heatmap = new StockHeatmap(container, {
                metric: 'change_percent',
                timeRange: '1d',
                category: 'sector',
                sector: sector,
                interactive: true,
                showTooltip: true,
                colorScheme: 'default'
            });
            
            // 渲染热力图
            await heatmap.render(sectorData.stocks);
            
        } catch (error) {
            console.error('加载特定行业热力图失败:', error);
            this.showHeatmapError(container, '加载失败，请重试');
        }
    }
    
    /**
     * 更新特定行业信息
     */
    updateFeaturedSectorInfo(sector, sectorData) {
        // 更新标题
        const titleElement = document.getElementById('featured-sector-name');
        if (titleElement) {
            titleElement.textContent = `${sectorData.name}行业热力图`;
        }
        
        // 更新统计数据
        const countElement = document.getElementById('featured-sector-count');
        if (countElement) {
            countElement.textContent = sectorData.stocks.length;
        }
        
        const changeElement = document.getElementById('featured-sector-change');
        if (changeElement) {
            const avgChange = sectorData.stocks.reduce((sum, stock) => sum + stock.change_percent, 0) / sectorData.stocks.length;
            changeElement.textContent = `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
            changeElement.className = `stat-number ${avgChange >= 0 ? 'positive' : 'negative'}`;
        }
        
        const leaderElement = document.getElementById('featured-sector-leader');
        if (leaderElement) {
            const topStock = sectorData.stocks.sort((a, b) => b.change_percent - a.change_percent)[0];
            leaderElement.textContent = topStock ? topStock.symbol : 'N/A';
        }
    }
    
    /**
     * 查看行业详情
     */
    viewSectorDetail(sector) {
        this.showFeaturedSector(sector);
    }

    /**
     * 查看趋势榜单页面
     */
    viewTrendingPage() {
        window.open('trending.html', '_blank');
    }

    /**
     * 查看趋势详情
     */
    viewTrendingDetail(card) {
        const trendingType = card.querySelector('h3').textContent;
        window.open(`trending.html?type=${trendingType}`, '_blank');
    }

    /**
     * 滚动到指定区域
     */
    scrollToSection(target) {
        const element = document.querySelector(target);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * 高亮标签卡片
     */
    highlightTagCard(card) {
        card.style.transform = 'translateY(-4px) scale(1.02)';
        card.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)';
    }

    /**
     * 取消高亮标签卡片
     */
    unhighlightTagCard(card) {
        card.style.transform = '';
        card.style.boxShadow = '';
    }

    /**
     * 更新统计数据
     */
    updateStats() {
        // 模拟实时更新统计数据
        const totalStocks = document.getElementById('total-stocks');
        const totalSectors = document.getElementById('total-sectors');
        const totalTags = document.getElementById('total-tags');
        
        if (totalStocks) {
            totalStocks.textContent = '500+';
        }
        if (totalSectors) {
            totalSectors.textContent = '11';
        }
        if (totalTags) {
            totalTags.textContent = '50+';
        }
    }

    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        // 每5分钟自动刷新一次数据
        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.loadInitialData();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        this.isLoading = true;
        document.body.classList.add('loading');
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.isLoading = false;
        document.body.classList.remove('loading');
    }

    /**
     * 显示热力图加载状态
     */
    showHeatmapLoading(container) {
        container.innerHTML = `
            <div class="heatmap-placeholder">
                <div class="placeholder-icon">⏳</div>
                <p>正在加载数据...</p>
            </div>
        `;
    }

    /**
     * 显示热力图错误
     */
    showHeatmapError(container, message) {
        container.innerHTML = `
            <div class="heatmap-placeholder">
                <div class="placeholder-icon">❌</div>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-primary">重新加载</button>
            </div>
        `;
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        // 可以实现一个toast通知或者模态框
        console.error(message);
        alert(message);
    }

    // 辅助方法
    getCompanyName(symbol) {
        const names = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corp.',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'META': 'Meta Platforms Inc.',
            'NVDA': 'NVIDIA Corp.',
            'NFLX': 'Netflix Inc.',
            'CRM': 'Salesforce Inc.',
            'ORCL': 'Oracle Corp.'
        };
        return names[symbol] || `${symbol} Corp.`;
    }

    getSector(symbol) {
        const sectors = {
            'AAPL': 'technology',
            'MSFT': 'technology',
            'GOOGL': 'technology',
            'AMZN': 'consumer',
            'TSLA': 'consumer',
            'META': 'technology',
            'NVDA': 'technology',
            'NFLX': 'technology',
            'CRM': 'technology',
            'ORCL': 'technology'
        };
        return sectors[symbol] || 'technology';
    }

    getSectorStocks(sector) {
        const sectorStocks = {
            'technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'NFLX', 'CRM', 'ORCL'],
            'healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'DHR'],
            'financial': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C'],
            'consumer': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX'],
            'energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX'],
            'industrial': ['BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS']
        };
        return sectorStocks[sector] || [];
    }

    getTagStocks(tag) {
        const tagStocks = {
            'ai': ['NVDA', 'GOOGL', 'MSFT', 'AAPL', 'META'],
            'ev': ['TSLA', 'NIO', 'XPEV', 'LI', 'RIVN'],
            'cloud': ['MSFT', 'AMZN', 'GOOGL', 'CRM', 'ORCL'],
            'biotech': ['GILD', 'AMGN', 'BIIB', 'REGN', 'VRTX'],
            'sp500': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
            'dividend': ['JNJ', 'PG', 'KO', 'PEP', 'WMT']
        };
        return tagStocks[tag] || [];
    }
}

// 全局函数（供HTML调用）
function refreshMarketHeatmap() {
    if (window.heatmapCenter) {
        window.heatmapCenter.refreshMarketHeatmap();
    }
}

function refreshSectorHeatmap() {
    if (window.heatmapCenter) {
        window.heatmapCenter.refreshSectorHeatmap();
    }
}

function refreshTagHeatmap() {
    if (window.heatmapCenter) {
        window.heatmapCenter.refreshTagHeatmap();
    }
}

function refreshTrendingHeatmap() {
    if (window.heatmapCenter) {
        window.heatmapCenter.refreshTrendingHeatmap();
    }
}

function viewTagDetail(tagId) {
    if (window.heatmapCenter) {
        window.heatmapCenter.viewTagDetail(tagId);
    }
}

function viewTrendingPage() {
    if (window.heatmapCenter) {
        window.heatmapCenter.viewTrendingPage();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.heatmapCenter = new HeatmapCenter();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (window.heatmapCenter) {
        window.heatmapCenter.stopAutoRefresh();
    }
});