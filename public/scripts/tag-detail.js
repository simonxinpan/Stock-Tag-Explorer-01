/**
 * 标签详情页面 - 主应用程序
 * 展示特定标签下的股票列表和相关功能
 */

class TagDetailPage {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.currentTag = null;
        this.stockData = [];
        this.filteredStocks = [];
        this.relatedTags = [];
        this.currentPage = 1;
        this.pageSize = 20; // 改为20只股票每页，匹配原网站设计
        this.totalPages = 1;
        this.totalStocks = 0;
        this.currentSort = 'name-asc';
        this.currentView = 'grid';
        this.priceFilter = 'all';
        this.changeFilter = 'all';
        
        // 无限滚动状态管理
        this.isLoading = false;
        this.allStocksLoaded = false;
        this.hasMoreData = true;
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            this.bindEvents();
            await this.loadTagFromURL();
            this.showLoading();
            await this.loadTagData(true); // 首次加载，传入isNewTag=true
            // 独立加载所有标签数据用于相关标签板块
            await this.loadAllTags();
            this.hideLoading();
        } catch (error) {
            console.error('页面初始化失败:', error);
            this.showError('页面初始化失败，请刷新页面重试');
        }
    }

    /**
     * 从URL获取标签信息
     */
    loadTagFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const tagId = urlParams.get('tagId');
        const tagName = urlParams.get('tag'); // 兼容旧格式
        
        if (!tagId && !tagName) {
            // 如果没有标签参数，重定向到首页
            window.location.href = 'index.html';
            return;
        }
        
        // 优先使用新的tagId格式
        if (tagId) {
            this.currentTagId = decodeURIComponent(tagId);
            this.currentTag = this.extractDisplayNameFromTagId(this.currentTagId);
        } else {
            // 兼容旧格式，尝试转换
            this.currentTag = decodeURIComponent(tagName);
            this.currentTagId = this.convertTagNameToApiFormat(this.currentTag);
        }
        
        this.updatePageTitle();
    }

    /**
     * 从tagId提取显示名称
     */
    extractDisplayNameFromTagId(tagId) {
        // 行业标签
        if (tagId.startsWith('sector_')) {
            return tagId.replace('sector_', '');
        }
        
        // 特殊名单
        if (tagId === 'sp500_all') {
            return 'S&P 500';
        }
        
        // 趋势排名标签的映射
        const rankingMap = {
            'rank_market_cap_top10': '市值前10%'
        };
        
        return rankingMap[tagId] || tagId;
    }

    /**
     * 将标签名称转换为API需要的格式（兼容旧格式）
     */
    convertTagNameToApiFormat(tagName) {
        // 行业标签 - 对应数据库sector_zh字段
        const sectorTags = {
            '信息技术': 'sector_信息技术',
            '工业': 'sector_工业', 
            '医疗保健': 'sector_医疗保健',
            '非必需消费品': 'sector_非必需消费品',
            '金融': 'sector_金融',
            '其他': 'sector_其他',
            '公用事业': 'sector_公用事业',
            '房地产': 'sector_房地产',
            '日常消费品': 'sector_日常消费品',
            '能源': 'sector_能源',
            '金融服务': 'sector_金融服务',
            '原材料': 'sector_原材料',
            '半导体': 'sector_半导体',
            '媒体娱乐': 'sector_媒体娱乐',
            '通讯服务': 'sector_通讯服务'
        };
        
        if (sectorTags[tagName]) {
            return sectorTags[tagName];
        }
        
        // 特殊名单
        if (tagName === 'S&P 500') {
            return 'sp500_all';
        }
        
        // 趋势排名标签
        const rankingMap = {
            '市值前10%': 'rank_market_cap_top10'
        };
        
        if (rankingMap[tagName]) {
            return rankingMap[tagName];
        }
        
        return tagName;
    }

    /**
     * 更新页面标题
     */
    updatePageTitle() {
        const tagNameEl = document.getElementById('tag-name');
        const pageTitleEl = document.getElementById('page-title');
        const tagDescriptionEl = document.getElementById('tag-description');
        
        if (tagNameEl) tagNameEl.textContent = this.currentTag;
        if (pageTitleEl) pageTitleEl.textContent = `${this.currentTag} - 标签详情`;
        if (tagDescriptionEl) tagDescriptionEl.textContent = `查看「${this.currentTag}」标签下的所有股票`;
        
        // 更新浏览器标题
        document.title = `${this.currentTag} - 标签详情 - Stock Tag Explorer`;
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 排序选择器
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', async (e) => {
                this.currentSort = e.target.value;
                await this.applyFiltersAndSorting();
                this.showToast(`已按「${e.target.selectedOptions[0].text}」排序`);
            });
        }

        // 价格过滤器
        const priceFilter = document.getElementById('price-filter');
        if (priceFilter) {
            priceFilter.addEventListener('change', async (e) => {
                this.priceFilter = e.target.value;
                await this.applyFiltersAndSorting();
                const filterText = e.target.selectedOptions[0].text;
                this.showToast(`已筛选「${filterText}」价格区间`);
            });
        }

        // 涨跌幅过滤器
        const changeFilter = document.getElementById('change-filter');
        if (changeFilter) {
            changeFilter.addEventListener('change', async (e) => {
                this.changeFilter = e.target.value;
                await this.applyFiltersAndSorting();
                const filterText = e.target.selectedOptions[0].text;
                this.showToast(`已筛选「${filterText}」股票`);
            });
        }

        // 视图切换
        const gridViewBtn = document.getElementById('grid-view');
        const listViewBtn = document.getElementById('list-view');
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                this.switchView('grid');
            });
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                this.switchView('list');
            });
        }
        
        // 无限滚动事件监听
        this.setupInfiniteScroll();
    }
    
    /**
     * 设置无限滚动
     */
    setupInfiniteScroll() {
        const scrollHandler = this.debounce(() => {
            // 检查是否滚动到接近底部（距离底部200px时开始加载）
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            if (scrollTop + windowHeight >= documentHeight - 200) {
                // 如果还有更多数据且当前没在加载，则加载下一页
                if (this.hasMoreData && !this.isLoading && !this.allStocksLoaded) {
                    console.log('触发无限滚动，加载下一页数据');
                    this.loadTagData(false, true); // append=true，追加数据
                }
            }
        }, 100); // 100ms防抖
        
        window.addEventListener('scroll', scrollHandler);
        
        // 保存引用以便后续移除
        this.scrollHandler = scrollHandler;
    }

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 加载标签数据 - 支持无限滚动分页
     * @param {boolean} isNewTag - 是否为新标签（重置状态）
     * @param {boolean} append - 是否追加到现有数据
     */
    async loadTagData(isNewTag = false, append = false) {
        // 防止重复加载或已加载完所有数据
        if (this.isLoading || (this.allStocksLoaded && !isNewTag)) {
            return;
        }
        
        this.isLoading = true;
        
        // 如果是新标签，重置所有状态
        if (isNewTag) {
            this.currentPage = 1;
            this.allStocksLoaded = false;
            this.hasMoreData = true;
            this.stockData = [];
            this.filteredStocks = [];
            this.hideLoadComplete();
            this.showLoading();
        } else {
            // 无限滚动加载更多
            this.showInfiniteLoading();
        }
        
        try {
            // 使用分页API，每页20只股票
            const apiUrl = `${this.apiBaseUrl}/api/stocks-by-tag?tagId=${encodeURIComponent(this.currentTagId)}&page=${this.currentPage}&limit=${this.pageSize}&sort=${this.currentSort}`;
            
            console.log('API请求URL:', apiUrl); // 调试日志
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            
            console.log('API响应数据:', result); // 调试日志
            
            if (result.success) {
                // 处理新的API数据格式：直接从result中获取stocks和totalCount
                const stocks = result.stocks || [];
                const totalCount = result.totalCount || 0;
                
                if (isNewTag) {
                    // 首次加载：替换所有数据并设置总数
                    this.stockData = stocks;
                    this.totalStocks = totalCount;
                    // 只在首次加载时更新页面标题显示总数
                    this.updatePageTitleWithTotal(totalCount);
                } else {
                    // 追加模式：将新数据添加到现有数据末尾
                    this.stockData = [...this.stockData, ...stocks];
                }
                
                this.filteredStocks = this.stockData;
                
                // 检查是否还有更多数据
                if (!stocks || stocks.length < this.pageSize || this.stockData.length >= this.totalStocks) {
                    this.allStocksLoaded = true;
                    this.hasMoreData = false;
                    this.showLoadComplete();
                } else {
                    this.hasMoreData = true;
                }
                
                // 渲染股票列表（无限滚动模式）
                this.renderStockListInfinite(isNewTag);
                this.renderPagination();
                
                // 更新统计信息（仅在首次加载时）
                if (isNewTag && result.stats) {
                    this.updateStatsFromAPI(result.stats);
                }
                
                // 准备下一页
                this.currentPage++;
                
                console.log(`成功加载「${this.currentTag}」标签数据: ${stocks.length} 只股票 (总计: ${this.stockData.length}/${this.totalStocks} 只)`);
                
                if (isNewTag) {
                    this.hideLoading();
                }
            } else {
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            console.error('加载标签数据失败:', error);
            this.showError('加载数据失败，请稍后重试');
            // 清空数据并显示错误状态
            if (isNewTag) {
                this.stockData = [];
                this.filteredStocks = [];
                this.renderStockList();
                this.renderPagination();
            }
        } finally {
            this.isLoading = false;
            this.hideInfiniteLoading();
        }
    }

    /**
     * 加载所有标签数据用于相关标签板块
     */
    async loadAllTags() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/tags`);
            
            if (!response.ok) {
                throw new Error(`标签API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.allTagsData = result.data;
                this.renderRelatedTags();
                console.log('成功加载所有标签数据');
            } else {
                throw new Error('标签API返回数据格式错误');
            }
        } catch (error) {
            console.error('加载所有标签失败:', error);
            // 使用空数据作为后备
            this.allTagsData = {};
        }
    }



    /**
     * 根据标签获取模拟股票数据
     */
    getMockStocksByTag(tag) {
        const allStocks = this.getMockStockData();
        // 根据标签过滤股票，这里简化处理，返回所有股票
        return allStocks;
    }

    /**
     * 获取模拟所有标签数据
     */
    getMockAllTags() {
        return {
            '行业分类': [
                { name: '科技股' },
                { name: '金融股' },
                { name: '医疗股' },
                { name: '消费股' }
            ],
            '市值分类': [
                { name: '大盘股' },
                { name: '中盘股' },
                { name: '小盘股' }
            ],
            '概念分类': [
                { name: '人工智能' },
                { name: '云计算' },
                { name: '电动汽车' },
                { name: '半导体' }
            ]
        };
    }

    /**
      * 获取模拟股票数据
      */
     getMockStockData() {
         return [
             {
                 symbol: 'AAPL',
                 name: 'Apple Inc.',
                 price: 175.43,
                 change: 2.15,
                 changePercent: 1.24,
                 volume: 45678900,
                 marketCap: 2800000000000,
                 pe: 28.5,
                 roe: 0.26,
                 sector: '科技'
             },
             {
                 symbol: 'MSFT',
                 name: 'Microsoft Corporation',
                 price: 378.85,
                 change: -1.23,
                 changePercent: -0.32,
                 volume: 23456789,
                 marketCap: 2900000000000,
                 pe: 32.1,
                 roe: 0.31,
                 sector: '科技'
             },
             {
                 symbol: 'GOOGL',
                 name: 'Alphabet Inc.',
                 price: 142.56,
                 change: 3.45,
                 changePercent: 2.48,
                 volume: 34567890,
                 marketCap: 1800000000000,
                 pe: 25.3,
                 roe: 0.22,
                 sector: '科技'
             },
             {
                 symbol: 'TSLA',
                 name: 'Tesla Inc.',
                 price: 248.42,
                 change: -5.67,
                 changePercent: -2.23,
                 volume: 56789012,
                 marketCap: 800000000000,
                 pe: 45.2,
                 roe: 0.18,
                 sector: '汽车'
             },
             {
                 symbol: 'NVDA',
                 name: 'NVIDIA Corporation',
                 price: 875.28,
                 change: 15.67,
                 changePercent: 1.82,
                 volume: 45678901,
                 marketCap: 2200000000000,
                 pe: 65.4,
                 roe: 0.35,
                 sector: '科技'
             },
             {
                 symbol: 'AMZN',
                 name: 'Amazon.com Inc.',
                 price: 155.89,
                 change: 2.34,
                 changePercent: 1.52,
                 volume: 34567891,
                 marketCap: 1600000000000,
                 pe: 42.8,
                 roe: 0.15,
                 sector: '消费'
             }
         ];
     }

    /**
     * 获取模拟股票数据（旧版本，已删除重复）
     */
    getMockStockDataOld() {
        const mockStocks = [
            {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                price: 175.43,
                change: 2.15,
                changePercent: 1.24,
                volume: 45678900,
                marketCap: 2800000000000
            },
            {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                price: 378.85,
                change: -1.23,
                changePercent: -0.32,
                volume: 23456789,
                marketCap: 2900000000000
            },
            {
                symbol: 'GOOGL',
                name: 'Alphabet Inc.',
                price: 142.56,
                change: 0.89,
                changePercent: 0.63,
                volume: 34567890,
                marketCap: 1800000000000
            },
            {
                symbol: 'AMZN',
                name: 'Amazon.com Inc.',
                price: 155.89,
                change: -2.45,
                changePercent: -1.55,
                volume: 56789012,
                marketCap: 1600000000000
            },
            {
                symbol: 'TSLA',
                name: 'Tesla Inc.',
                price: 248.42,
                change: 12.34,
                changePercent: 5.23,
                volume: 78901234,
                marketCap: 800000000000
            },
            {
                symbol: 'NVDA',
                name: 'NVIDIA Corporation',
                price: 875.28,
                change: 15.67,
                changePercent: 1.82,
                volume: 45678901,
                marketCap: 2200000000000
            },
            {
                symbol: 'META',
                name: 'Meta Platforms Inc.',
                price: 485.32,
                change: 8.45,
                changePercent: 1.77,
                volume: 18765432,
                marketCap: 1200000000000
            },
            {
                symbol: 'NFLX',
                name: 'Netflix Inc.',
                price: 425.67,
                change: -3.21,
                changePercent: -0.75,
                volume: 12345678,
                marketCap: 190000000000
            },
            {
                symbol: 'CRM',
                name: 'Salesforce Inc.',
                price: 245.89,
                change: 4.56,
                changePercent: 1.89,
                volume: 8765432,
                marketCap: 240000000000
            },
            {
                symbol: 'ORCL',
                name: 'Oracle Corporation',
                price: 112.34,
                change: -0.87,
                changePercent: -0.77,
                volume: 15432109,
                marketCap: 310000000000
            },
            {
                symbol: 'ADBE',
                name: 'Adobe Inc.',
                price: 567.89,
                change: 12.45,
                changePercent: 2.24,
                volume: 6543210,
                marketCap: 260000000000
            },
            {
                symbol: 'INTC',
                name: 'Intel Corporation',
                price: 43.21,
                change: -1.23,
                changePercent: -2.77,
                volume: 32109876,
                marketCap: 180000000000
            },
            {
                symbol: 'AMD',
                name: 'Advanced Micro Devices',
                price: 156.78,
                change: 5.67,
                changePercent: 3.75,
                volume: 28765432,
                marketCap: 250000000000
            },
            {
                symbol: 'PYPL',
                name: 'PayPal Holdings Inc.',
                price: 78.45,
                change: 2.34,
                changePercent: 3.08,
                volume: 19876543,
                marketCap: 85000000000
            },
            {
                symbol: 'UBER',
                name: 'Uber Technologies Inc.',
                price: 65.32,
                change: -1.45,
                changePercent: -2.17,
                volume: 24567890,
                marketCap: 130000000000
            },
            {
                symbol: 'ZOOM',
                name: 'Zoom Video Communications',
                price: 89.67,
                change: 3.21,
                changePercent: 3.71,
                volume: 7654321,
                marketCap: 27000000000
            },
            {
                symbol: 'SHOP',
                name: 'Shopify Inc.',
                price: 78.90,
                change: 4.32,
                changePercent: 5.79,
                volume: 9876543,
                marketCap: 98000000000
            },
            {
                symbol: 'SQ',
                name: 'Block Inc.',
                price: 87.65,
                change: -2.10,
                changePercent: -2.34,
                volume: 13456789,
                marketCap: 50000000000
            },
            {
                symbol: 'TWTR',
                name: 'Twitter Inc.',
                price: 54.20,
                change: 0.00,
                changePercent: 0.00,
                volume: 5432109,
                marketCap: 41000000000
            },
            {
                symbol: 'SNAP',
                name: 'Snap Inc.',
                price: 12.45,
                change: 0.67,
                changePercent: 5.69,
                volume: 18765432,
                marketCap: 20000000000
            }
        ];
        
        return mockStocks;
    }

    /**
     * 获取模拟相关标签
     */
    getMockRelatedTags() {
        return [
            { name: '大型科技股' },
            { name: '人工智能' },
            { name: '云计算' },
            { name: '电动汽车' },
            { name: '半导体' },
            { name: '消费电子' },
            { name: '软件服务' },
            { name: '互联网' }
        ];
    }

    /**
     * 应用过滤和排序（重新调用API）
     */
    async applyFiltersAndSorting() {
        // 重置分页状态
        this.currentPage = 1;
        this.allStocksLoaded = false;
        this.hasMoreData = true;
        this.stockData = [];
        this.filteredStocks = [];
        
        // 显示加载状态
        this.showLoading();
        
        try {
            // 重新加载数据（作为新标签处理）
            await this.loadTagData(true);
        } catch (error) {
            console.error('应用筛选排序失败:', error);
            this.showError('筛选排序失败，请重试');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 应用排序（保持向后兼容）
     */
    applySorting() {
        this.applyFiltersAndSorting();
    }



    /**
     * 切换视图模式
     */
    switchView(view) {
        this.currentView = view;
        
        const gridBtn = document.getElementById('grid-view');
        const listBtn = document.getElementById('list-view');
        const stockList = document.getElementById('stock-list');
        
        if (view === 'grid') {
            gridBtn?.classList.add('active');
            listBtn?.classList.remove('active');
            stockList?.classList.remove('list-view');
        } else {
            listBtn?.classList.add('active');
            gridBtn?.classList.remove('active');
            stockList?.classList.add('list-view');
        }
        
        this.renderStockList();
    }

    /**
     * 更新分页
     */
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredStocks.length / this.pageSize);
        this.renderPagination();
    }

    /**
     * 渲染股票列表 - 使用通用渲染器
     */
    renderStockList() {
        if (!window.stockRenderer) {
            console.error('Stock renderer not available');
            return;
        }

        // 计算分页
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageStocks = this.filteredStocks.slice(startIndex, endIndex);

        // 使用通用渲染器渲染股票列表
        window.stockRenderer.renderStockList(pageStocks, 'stock-list');

        // 更新分页
        this.totalPages = Math.ceil(this.filteredStocks.length / this.pageSize);
        this.renderPagination();
    }

    /**
     * 渲染股票列表 - 无限滚动模式
     */
    renderStockListInfinite(isNewTag = false) {
        const stockListContainer = document.getElementById('stock-list');
        if (!stockListContainer) {
            console.error('找不到股票列表容器');
            return;
        }

        if (isNewTag) {
            // 首次加载：清空容器并渲染所有已加载的股票
            stockListContainer.innerHTML = '';
            if (window.stockRenderer) {
                window.stockRenderer.renderStockList(this.stockData, 'stock-list');
            }
        } else {
            // 追加模式：只渲染新加载的股票
            const currentStockCount = stockListContainer.children.length;
            const newStocks = this.stockData.slice(currentStockCount);
            if (window.stockRenderer && newStocks.length > 0) {
                // 创建临时容器来渲染新股票
                const tempContainer = document.createElement('div');
                tempContainer.id = 'temp-stock-container';
                document.body.appendChild(tempContainer);
                window.stockRenderer.renderStockList(newStocks, 'temp-stock-container');
                // 将新股票追加到现有列表末尾
                while (tempContainer.firstChild) {
                    stockListContainer.appendChild(tempContainer.firstChild);
                }
                // 清理临时容器
                document.body.removeChild(tempContainer);
            }
        }
    }

    /**
     * 更新页面标题显示总数
     */
    updatePageTitleWithTotal(totalCount) {
        const titleElement = document.querySelector('.tag-title');
        if (titleElement && this.currentTag) {
            titleElement.textContent = `${this.currentTag} (${totalCount}只股票)`;
        }
    }

    /**
     * 渲染相关标签
     */
    renderRelatedTags() {
        const relatedTagsEl = document.getElementById('related-tags');
        if (!relatedTagsEl) return;
        
        if (!this.allTagsData || Object.keys(this.allTagsData).length === 0) {
            relatedTagsEl.innerHTML = '<p class="no-tags">暂无相关标签</p>';
            return;
        }
        
        let html = '';
        
        // 循环遍历每一个分类
        for (const category in this.allTagsData) {
            if (this.allTagsData[category] && this.allTagsData[category].length > 0) {
                // 创建分类标题
                html += `<div class="related-tags-category">`;
                html += `<h4 class="related-tags-category-title">${category}</h4>`;
                
                // 创建该分类下所有标签的容器
                html += `<div class="related-tags-wrapper">`;
                
                // 循环创建每一个标签按钮
                this.allTagsData[category].forEach(tag => {
                    const tagName = tag.name;
                    const tagId = tag.id || this.convertTagNameToApiFormat(tagName);
                    const isCurrentTag = tagName === this.currentTag;
                    const tagClass = isCurrentTag ? 'tag-button-small current-tag' : 'tag-button-small';
                    
                    html += `
                        <a href="tag-detail.html?tagId=${encodeURIComponent(tagId)}" 
                           class="${tagClass}" 
                           title="点击查看 ${tagName} 标签详情">
                            ${tagName}
                        </a>
                    `;
                });
                
                html += `</div></div>`;
            }
        }
        
        relatedTagsEl.innerHTML = html;
    }

    /**
     * 渲染分页控件 - 使用通用渲染器
     */
    renderPagination() {
        if (window.stockRenderer) {
            const pagination = {
                currentPage: this.currentPage,
                totalPages: this.totalPages
            };
            
            const onPageChange = (newPage) => {
                this.currentPage = newPage;
                this.renderStockList();
                if (window.stockRenderer) {
                    window.stockRenderer.showToast(`已切换到第 ${newPage} 页`);
                }
            };
            
            window.stockRenderer.renderPagination(pagination, onPageChange, 'pagination');
        } else {
            console.error('Stock renderer not available');
        }
    }

    /**
     * 跳转到指定页面
     */
    async goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        
        // 重新加载数据
        this.showLoading();
        await this.loadTagData();
        this.hideLoading();
        
        // 滚动到顶部
        document.querySelector('.stock-list-section')?.scrollIntoView({ behavior: 'smooth' });
        
        // 显示加载提示
        if (window.stockRenderer) {
            window.stockRenderer.showToast(`已切换到第 ${page} 页`);
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalStocks = this.filteredStocks.length;
        const risingStocks = this.filteredStocks.filter(stock => stock.changePercent > 0).length;
        const fallingStocks = this.filteredStocks.filter(stock => stock.changePercent < 0).length;
        const flatStocks = this.filteredStocks.filter(stock => stock.changePercent === 0).length;

        // 更新过滤器区域的统计显示
        const statsDisplay = document.querySelector('.stats-display');
        if (statsDisplay) {
            statsDisplay.textContent = `共 ${totalStocks} 只股票`;
        }

        // 更新右侧统计卡片
        const totalEl = document.getElementById('total-stocks');
        const risingEl = document.getElementById('rising-stocks');
        const fallingEl = document.getElementById('falling-stocks');
        const flatEl = document.getElementById('flat-stocks');

        if (totalEl) totalEl.textContent = totalStocks;
        if (risingEl) risingEl.textContent = risingStocks;
        if (fallingEl) fallingEl.textContent = fallingStocks;
        if (flatEl) flatEl.textContent = flatStocks;
    }

    /**
     * 从API数据更新统计信息
     */
    updateStatsFromAPI(stats) {
        if (!stats) {
            this.updateStats();
            return;
        }
        
        // 更新统计显示
        const totalStocksEl = document.getElementById('total-stocks');
        const risingStocksEl = document.getElementById('rising-stocks');
        const fallingStocksEl = document.getElementById('falling-stocks');
        const flatStocksEl = document.getElementById('flat-stocks');
        
        if (totalStocksEl) totalStocksEl.textContent = stats.total || 0;
        if (risingStocksEl) risingStocksEl.textContent = stats.upCount || 0;
        if (fallingStocksEl) fallingStocksEl.textContent = stats.downCount || 0;
        if (flatStocksEl) flatStocksEl.textContent = stats.flatCount || 0;
        
        // 更新标签名称和描述
        const tagNameEl = document.getElementById('tag-name');
        const tagDescriptionEl = document.getElementById('tag-description');
        
        if (tagNameEl) tagNameEl.textContent = this.currentTag;
        if (tagDescriptionEl) {
            tagDescriptionEl.textContent = `共找到 ${stats.total || 0} 只「${this.currentTag}」相关股票`;
        }
        
        // 显示平均指标（如果有）
        if (stats.avgPE && stats.avgPE > 0) {
            console.log(`平均PE: ${stats.avgPE.toFixed(2)}`);
        }
        if (stats.avgROE && stats.avgROE > 0) {
            console.log(`平均ROE: ${(stats.avgROE * 100).toFixed(2)}%`);
        }
    }


    /**
     * 显示加载状态 - 与index.html保持一致
     */
    showLoading() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const stockList = document.getElementById('stock-list');
        
        if (loading) loading.classList.remove('hidden');
        if (error) error.classList.add('hidden');
        if (stockList) stockList.style.display = 'none';
    }

    /**
     * 隐藏加载状态 - 与index.html保持一致
     */
    hideLoading() {
        const loading = document.getElementById('loading');
        const stockList = document.getElementById('stock-list');
        
        if (loading) loading.classList.add('hidden');
        if (stockList) stockList.style.display = 'block';
    }

    /**
     * 显示无限滚动加载指示器
     */
    showInfiniteLoading() {
        const infiniteLoadingElement = document.getElementById('infinite-loading');
        if (infiniteLoadingElement) {
            infiniteLoadingElement.classList.remove('hidden');
        }
    }

    /**
     * 隐藏无限滚动加载指示器
     */
    hideInfiniteLoading() {
        const infiniteLoadingElement = document.getElementById('infinite-loading');
        if (infiniteLoadingElement) {
            infiniteLoadingElement.classList.add('hidden');
        }
    }

    /**
     * 显示加载完成提示
     */
    showLoadComplete() {
        const loadCompleteElement = document.getElementById('load-complete');
        if (loadCompleteElement) {
            loadCompleteElement.classList.remove('hidden');
        }
    }

    /**
     * 隐藏加载完成提示
     */
    hideLoadComplete() {
        const loadCompleteElement = document.getElementById('load-complete');
        if (loadCompleteElement) {
            loadCompleteElement.classList.add('hidden');
        }
    }

    /**
     * 显示错误信息 - 与index.html保持一致
     */
    showError(message) {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const errorMessage = document.getElementById('error-message');
        const stockList = document.getElementById('stock-list');
        
        if (loading) loading.classList.add('hidden');
        if (stockList) stockList.style.display = 'none';
        if (error) error.classList.remove('hidden');
        if (errorMessage) errorMessage.textContent = message;
    }
    

}

// 初始化应用
let tagDetailPage;
document.addEventListener('DOMContentLoaded', () => {
    tagDetailPage = new TagDetailPage();
});

// 导出到全局作用域以供HTML调用
window.tagDetailPage = tagDetailPage;