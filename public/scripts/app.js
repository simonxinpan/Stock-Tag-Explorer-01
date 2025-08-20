/**
 * Stock Tag Explorer - 主应用程序
 * 智能标签浏览器，用于发现投资机会
 */

class StockTagExplorer {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.selectedTag = null;
        this.activeTagIds = new Set(); // 用于存储选中的标签ID
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.totalCount = 0;
        this.currentSort = 'name-asc';
        this.stockData = [];
        this.tagData = [];
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            this.showLoading();
            await this.loadTags();
            this.bindEvents();
            this.hideLoading();
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败，请刷新页面重试');
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const tagGroups = document.getElementById('tag-groups');
        
        if (loading) loading.classList.remove('hidden');
        if (error) error.classList.add('hidden');
        if (tagGroups) tagGroups.classList.add('hidden');
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loading = document.getElementById('loading');
        const tagGroups = document.getElementById('tag-groups');
        
        if (loading) loading.classList.add('hidden');
        if (tagGroups) tagGroups.classList.remove('hidden');
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const tagGroups = document.getElementById('tag-groups');
        
        if (loading) loading.classList.add('hidden');
        if (error) {
            error.textContent = message;
            error.classList.remove('hidden');
        }
        if (tagGroups) tagGroups.classList.add('hidden');
    }

    /**
     * 加载标签数据
     */
    async loadTags() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.success && data.data) {
                // 检查是否是备用数据（数组格式）还是分组数据（对象格式）
                if (data.fallback || Array.isArray(data.data)) {
                    // 备用数据，使用本地备用数据
                    this.tagData = this.getFallbackTagData();
                    this.showToast('连接数据库失败，使用离线数据', 'warning');
                } else {
                    // 真实数据库数据，转换格式
                    this.tagData = this.convertDatabaseTagsToFrontendFormat(data.data);
                    this.showToast('已连接到真实数据库标签', 'success');
                }
                this.renderTagPlaza();
            } else {
                throw new Error('Invalid API response format');
            }
            
        } catch (error) {
            console.error('加载标签失败:', error);
            // 使用备用数据
            this.tagData = this.getFallbackTagData();
            this.renderTagPlaza();
            this.showToast('连接数据库失败，使用离线数据', 'warning');
        }
    }

    /**
     * 获取备用标签数据
     */
    /**
     * 将数据库标签数据转换为前端期望的格式
     */
    convertDatabaseTagsToFrontendFormat(dbTags) {
        // API现在返回已分组的数据
        const result = [];
        
        // 处理股市表现
        if (dbTags['股市表现'] && dbTags['股市表现'].length > 0) {
            result.push({
                id: 'stock-performance',
                name: '股市表现',
                type: 'performance',
                tags: dbTags['股市表现'].map(tag => ({
                    id: tag.id || tag.name,
                    name: tag.name,
                    description: tag.description,
                    stock_count: tag.stock_count || 0,
                    avg_market_cap: tag.avg_market_cap || 'N/A',
                    top_stocks: tag.top_stocks || []
                }))
            });
        }
        
        // 处理财务表现
        if (dbTags['财务表现'] && dbTags['财务表现'].length > 0) {
            result.push({
                id: 'financial-performance',
                name: '财务表现',
                type: 'financial',
                tags: dbTags['财务表现'].map(tag => ({
                    id: tag.id || tag.name,
                    name: tag.name,
                    description: tag.description,
                    stock_count: tag.stock_count || 0,
                    avg_market_cap: tag.avg_market_cap || 'N/A',
                    top_stocks: tag.top_stocks || []
                }))
            });
        }
        
        // 处理行业分类
        if (dbTags['行业分类'] && dbTags['行业分类'].length > 0) {
            result.push({
                id: 'industry',
                name: '行业分类',
                type: 'industry',
                tags: dbTags['行业分类'].map(tag => ({
                    id: tag.name,
                    name: tag.name,
                    description: tag.description || tag.name,
                    stock_count: tag.stock_count || 0,
                    avg_market_cap: tag.avg_market_cap || 'N/A',
                    top_stocks: tag.top_stocks || []
                }))
            });
        }
        
        // 处理市值分类
        if (dbTags['市值分类'] && dbTags['市值分类'].length > 0) {
            result.push({
                id: 'market-cap',
                name: '市值分类',
                type: 'market-cap',
                tags: dbTags['市值分类'].map(tag => ({
                    id: tag.name,
                    name: tag.name,
                    description: tag.description,
                    stock_count: tag.stock_count || 0,
                    avg_market_cap: tag.avg_market_cap || 'N/A',
                    top_stocks: tag.top_stocks || []
                }))
            });
        }
        
        // 处理特殊名单
        if (dbTags['特殊名单'] && dbTags['特殊名单'].length > 0) {
            result.push({
                id: 'special',
                name: '特殊名单',
                type: 'special',
                tags: dbTags['特殊名单'].map(tag => ({
                    id: tag.id || tag.name,
                    name: tag.name,
                    description: tag.description,
                    stock_count: tag.stock_count || 0,
                    avg_market_cap: tag.avg_market_cap || 'N/A',
                    top_stocks: tag.top_stocks || []
                }))
            });
        }
        
        // 处理趋势
        if (dbTags['趋势'] && dbTags['趋势'].length > 0) {
            result.push({
                id: 'trend-ranking',
                name: '趋势',
                type: 'trend',
                tags: dbTags['趋势'].map(tag => ({
                    id: tag.id || tag.name,
                    name: tag.name,
                    description: tag.description,
                    stock_count: tag.stock_count || 0,
                    avg_market_cap: tag.avg_market_cap || 'N/A',
                    top_stocks: tag.top_stocks || []
                }))
            });
        }
        
        return result;
    }
    
    getFallbackTagData() {
        return [
            {
                id: 'stock-performance',
                name: '🚀 股市表现类',
                type: 'performance',
                tags: [
                    { id: '52w-high', name: '52周最高', description: '股价接近52周最高点的股票', stock_count: 23 },
                    { id: '52w-low', name: '52周最低', description: '股价接近52周最低点的股票', stock_count: 12 },
                    { id: 'high-dividend', name: '高股息率', description: '股息收益率较高的股票', stock_count: 45 },
                    { id: 'low-pe', name: '低市盈率', description: '市盈率较低的价值股', stock_count: 67 },
                    { id: 'high-market-cap', name: '高市值', description: '市值较大的蓝筹股', stock_count: 50 }
                ]
            },
            {
                id: 'financial-performance',
                name: '💰 财务表现类',
                type: 'financial',
                tags: [
                    { id: 'high-roe', name: '高ROE', description: '净资产收益率较高的公司', stock_count: 50 },
                    { id: 'low-debt', name: '低负债率', description: '负债率较低的稳健公司', stock_count: 78 },
                    { id: 'high-growth-rate', name: '高增长率', description: '营收增长率较高的公司', stock_count: 34 },
                    { id: 'high-beta', name: '高贝塔系数', description: '贝塔系数较高的高风险股票', stock_count: 88 },
                    { id: 'vix-fear-index', name: 'VIX恐慌指数相关', description: '与VIX恐慌指数相关的股票', stock_count: 5 }
                ]
            },
            {
                id: 'trend-ranking',
                name: '📊 趋势排位类',
                type: 'trend',
                tags: [
                    { id: 'recent-strong', name: '近期强势', description: '近期表现强劲的股票', stock_count: 30 },
                    { id: 'recent-weak', name: '近期弱势', description: '近期表现疲弱的股票', stock_count: 25 },
                    { id: 'volume-surge', name: '成交量放大', description: '成交量显著增加的股票', stock_count: 18 },
                    { id: 'breakthrough', name: '突破新高', description: '股价突破历史新高的股票', stock_count: 23 },
                    { id: 'support-break', name: '跌破支撑', description: '股价跌破重要支撑位的股票', stock_count: 15 }
                ]
            },
            {
                id: 'industry',
                name: '🏭 行业分类',
                type: 'industry',
                tags: [
                    { id: 'technology', name: '科技股', description: '科技行业相关股票', stock_count: 76 },
                    { id: 'finance', name: '金融股', description: '金融行业相关股票', stock_count: 65 },
                    { id: 'healthcare', name: '医疗保健', description: '医疗保健行业股票', stock_count: 64 },
                    { id: 'energy', name: '能源股', description: '能源行业相关股票', stock_count: 23 },
                    { id: 'consumer', name: '消费品', description: '消费品行业相关股票', stock_count: 60 }
                ]
            },
            {
                id: 'special-lists',
                name: '⭐ 特殊名单类',
                type: 'special',
                tags: [
                    { id: 'sp500', name: '标普500', description: '标普500指数成分股', stock_count: 502 },
                    { id: 'nasdaq100', name: '纳斯达克100', description: '纳斯达克100指数成分股', stock_count: 100 },
                    { id: 'dow30', name: '道琼斯30', description: '道琼斯30指数成分股', stock_count: 30 },
                    { id: 'esg', name: 'ESG评级高', description: 'ESG评级较高的可持续发展股票', stock_count: 89 },
                    { id: 'analyst-recommend', name: '分析师推荐', description: '分析师强烈推荐的股票', stock_count: 120 }
                ]
            }
        ];
    }

    /**
     * 渲染标签广场
     */
    renderTagPlaza() {
        const container = document.getElementById('tag-groups');
        if (!container) return;

        container.innerHTML = '';

        // 如果是扁平的标签数组，创建一个默认分组
        if (this.tagData.length > 0 && !this.tagData[0].tags) {
            const defaultGroup = {
                name: '标签广场',
                tags: this.tagData
            };
            const groupElement = this.createTagGroup(defaultGroup);
            container.appendChild(groupElement);
        } else {
            // 如果是分组数据，按原逻辑处理
            this.tagData.forEach(group => {
                const groupElement = this.createTagGroup(group);
                container.appendChild(groupElement);
            });
        }
    }

    /**
     * 创建标签组
     */
    createTagGroup(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'tag-group';
        
        // 设置标签组类型，用于CSS样式区分
        if (group.type) {
            groupDiv.setAttribute('data-type', group.type);
        }
        
        groupDiv.innerHTML = `
            <h3 class="tag-group-title">${group.name}</h3>
            <div class="tag-cards"></div>
        `;

        const cardsContainer = groupDiv.querySelector('.tag-cards');
        group.tags.forEach(tag => {
            const tagCard = this.createTagCard(tag);
            cardsContainer.appendChild(tagCard);
        });

        return groupDiv;
    }

    /**
     * 创建标签卡片
     */
    createTagCard(tag) {
        const card = document.createElement('div');
        card.className = 'tag-card';
        
        // 确保使用正确的标签ID
        card.dataset.id = tag.id || tag.name; // 使用data-id而不是data-tag-id
        
        // 简化显示名称逻辑
        let displayName = tag.name;
        
        // 移除高分红标签
        if (tag.name && tag.name.toLowerCase().includes('高分红')) {
            card.style.display = 'none';
        }
        
        card.innerHTML = `
            <div class="tag-name">${displayName}</div>
            <div class="tag-description">${tag.description || ''}</div>
            <div class="tag-stats">
                <span class="stock-count">${tag.stock_count || 0} 只股票</span>
                <span class="last-updated">实时更新</span>
            </div>
        `;

        card.addEventListener('click', (event) => this.handleTagClick(event));
        return card;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 排序选择
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.currentPage = 1;
                this.loadStockData();
            });
        }

        // 清除选择
        const clearBtn = document.getElementById('clear-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }
    }

    /**
     * 处理标签点击
     */
    async handleTagClick(tag) {
        const clickedCard = document.querySelector(`[data-tag-id="${tag.id}"]`);
        if (!clickedCard) return;

        // 获取真实的标签ID - 对于动态标签使用特殊处理
        let realTagId = this.getRealTagId(tag);
        
        // 切换选中状态
        if (this.activeTagIds.has(realTagId)) {
            this.activeTagIds.delete(realTagId);
            clickedCard.classList.remove('selected');
        } else {
            this.activeTagIds.add(realTagId);
            clickedCard.classList.add('selected');
        }

        // 设置选中的标签用于API调用
        this.selectedTag = tag;
        this.currentPage = 1;
        
        // 如果有选中的标签，显示股票列表
        if (this.activeTagIds.size > 0) {
            this.showStockList();
            
            // 更新标题
            const title = document.getElementById('stock-list-title');
            if (title) {
                if (this.activeTagIds.size === 1) {
                    title.textContent = `${tag.name} - ${tag.stock_count} 只股票`;
                } else {
                    title.textContent = `已选择 ${this.activeTagIds.size} 个标签的股票`;
                }
            }
            
            // 加载股票数据
            await this.loadStockData();
        } else {
            // 如果没有选中的标签，隐藏股票列表
            this.hideStockList();
        }
    }

    /**
     * 显示股票列表
     */
    showStockList() {
        const section = document.getElementById('stock-list-section');
        if (section) {
            section.classList.remove('hidden');
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * 隐藏股票列表
     */
    hideStockList() {
        const section = document.getElementById('stock-list-section');
        if (section) {
            section.classList.add('hidden');
        }
    }

    /**
     * 获取真实的标签ID
     */
    getRealTagId(tag) {
        // 对于行业分类，使用sector_zh作为查询参数
        if (tag.type === '行业分类' && tag.sector_zh) {
            return tag.sector_zh;
        }
        
        // 对于市值分类，使用特定的标识符
        if (tag.type === '市值分类') {
            if (tag.name.includes('大盘股')) return 'large_cap';
            if (tag.name.includes('中盘股')) return 'mid_cap';
            if (tag.name.includes('小盘股')) return 'small_cap';
        }
        
        // 对于其他标签，使用原始ID
        return tag.id || tag.name;
    }

    /**
     * 清除选择
     */
    clearSelection() {
        document.querySelectorAll('.tag-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.selectedTag = null;
        this.activeTagIds.clear();
        this.hideStockList();
    }

    /**
     * 加载股票数据
     */
    async loadStockData() {
        // 如果没有选中的标签，清空股票列表
        if (this.activeTagIds.size === 0) {
            const stockListContainer = document.getElementById('stock-list');
            if (stockListContainer) {
                stockListContainer.innerHTML = '<p class="no-data">请选择一个或多个标签来筛选股票。</p>';
            }
            return;
        }

        try {
            // 将Set转换为逗号分隔的字符串
            const tagIdString = Array.from(this.activeTagIds).join(',');
            
            const params = new URLSearchParams({
                tags: tagIdString,
                page: this.currentPage,
                limit: this.pageSize,
                sort: this.currentSort
            });

            const apiUrl = `${this.apiBaseUrl}/api/stocks?${params}`;
            console.log('API请求URL:', apiUrl); // 调试日志
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API响应数据:', data); // 调试日志
            
            if (data.success && data.data) {
                this.stockData = data.data.stocks || [];
                this.totalPages = data.data.pagination?.total || 1;
                this.totalCount = data.data.pagination?.count || 0;
            } else {
                throw new Error('Invalid API response format');
            }
            
            this.renderStockList();
            this.renderPagination();
            
            // 显示成功连接到真实数据的提示
            if (this.stockData.length > 0) {
                this.showToast('已连接到真实数据库数据', 'success');
            } else {
                this.showToast('未找到符合条件的股票', 'info');
            }
            
        } catch (error) {
            console.error('加载股票数据失败:', error);
            // 使用模拟数据
            const mockData = this.generateMockStockData();
            this.stockData = mockData.stocks;
            this.totalPages = mockData.totalPages;
            this.totalCount = mockData.totalCount;
            
            this.renderStockList();
            this.renderPagination();
            this.showToast('连接数据库失败，使用模拟数据', 'warning');
        }
    }

    /**
     * 生成模拟股票数据
     */
    generateMockStockData() {
        const mockStocks = [
            {
                symbol: 'AAPL',
                name: '苹果公司',
                price: 175.43,
                change: 2.15,
                changePercent: 1.24,
                volume: 45678900,
                marketCap: 2800000000000,
                lastUpdated: new Date().toISOString()
            },
            {
                symbol: 'MSFT',
                name: '微软公司',
                price: 378.85,
                change: -1.23,
                changePercent: -0.32,
                volume: 23456789,
                marketCap: 2900000000000,
                lastUpdated: new Date().toISOString()
            },
            {
                symbol: 'GOOGL',
                name: '谷歌公司',
                price: 142.56,
                change: 0.89,
                changePercent: 0.63,
                volume: 34567890,
                marketCap: 1800000000000,
                lastUpdated: new Date().toISOString()
            }
        ];

        return {
            stocks: mockStocks,
            totalPages: 1,
            totalCount: mockStocks.length
        };
    }

    /**
     * 渲染股票列表
     */
    renderStockList() {
        const container = document.getElementById('stock-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.stockData.length === 0) {
            container.innerHTML = '<div class="text-center">暂无数据</div>';
            return;
        }

        this.stockData.forEach(stock => {
            const stockElement = this.createStockItem(stock);
            container.appendChild(stockElement);
        });
    }

    /**
     * 创建股票项
     */
    createStockItem(stock) {
        const item = document.createElement('div');
        item.className = 'stock-item';
        
        const changeClass = stock.change > 0 ? 'positive' : stock.change < 0 ? 'negative' : 'neutral';
        const changeSymbol = stock.change > 0 ? '+' : '';
        
        item.innerHTML = `
            <div class="stock-header">
                <div class="stock-info">
                    <div class="stock-name">${stock.name}</div>
                    <div class="stock-symbol">${stock.symbol}</div>
                </div>
                <div class="stock-price">
                    <div class="current-price">$${stock.price.toFixed(2)}</div>
                    <div class="price-change ${changeClass}">
                        ${changeSymbol}${stock.change.toFixed(2)} (${changeSymbol}${stock.changePercent.toFixed(2)}%)
                    </div>
                </div>
            </div>
            <div class="stock-details">
                <div class="detail-item">
                    <div class="detail-label">成交量</div>
                    <div class="detail-value">${this.formatVolume(stock.volume)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">市值</div>
                    <div class="detail-value">${this.formatMarketCap(stock.marketCap)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">更新时间</div>
                    <div class="detail-value">${this.formatTime(stock.lastUpdated)}</div>
                </div>
            </div>
        `;
        
        // 添加点击事件，跳转到个股详情页
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            this.navigateToStockDetail(stock.symbol);
        });

        return item;
    }

    /**
     * 渲染分页
     */
    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = '';

        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadStockData();
            }
        });
        container.appendChild(prevBtn);

        // 页码信息
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页`;
        container.appendChild(pageInfo);

        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.disabled = this.currentPage === this.totalPages;
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadStockData();
            }
        });
        container.appendChild(nextBtn);
    }

    /**
     * 格式化成交量
     */
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

    /**
     * 格式化市值
     */
    formatMarketCap(marketCap) {
        if (marketCap >= 1000000000000) {
            return (marketCap / 1000000000000).toFixed(2) + 'T';
        } else if (marketCap >= 1000000000) {
            return (marketCap / 1000000000).toFixed(1) + 'B';
        } else if (marketCap >= 1000000) {
            return (marketCap / 1000000).toFixed(1) + 'M';
        }
        return marketCap.toString();
    }

    /**
     * 格式化时间
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) { // 24小时内
            return Math.floor(diff / 3600000) + '小时前';
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    /**
     * 跳转到个股详情页
     */
    navigateToStockDetail(symbol) {
        // 构建个股详情页URL - 使用用户指定的详情页
        const detailUrl = `https://stock-details-final-1e1vcxew3-simon-pans-projects.vercel.app/?symbol=${symbol}`;
        
        // 在新标签页中打开
        window.open(detailUrl, '_blank');
        
        // 显示提示信息
        this.showToast(`正在打开 ${symbol} 的详情页面`, 'info');
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        // 3秒后自动隐藏
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// 当页面加载完成时初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new StockTagExplorer();
});

// 导出类以供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockTagExplorer;
}