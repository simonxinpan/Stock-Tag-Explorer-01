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
        this.pageSize = 12;
        this.totalPages = 1;
        this.currentSort = 'name-asc';
        this.currentView = 'grid';
        this.priceFilter = 'all';
        this.changeFilter = 'all';
        
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
            await this.loadTagData();
            // 相关标签将在loadTagData中一起加载
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
        const tagName = urlParams.get('tag');
        
        if (!tagName) {
            // 如果没有标签参数，重定向到首页
            window.location.href = 'index.html';
            return;
        }
        
        this.currentTag = decodeURIComponent(tagName);
        this.updatePageTitle();
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
     * 加载标签数据
     */
    async loadTagData() {
        try {
            // 调用新的智能路由API
            const response = await fetch(`${this.apiBaseUrl}/api/stocks-by-tag?tag=${encodeURIComponent(this.currentTag)}&page=${this.currentPage}&limit=${this.pageSize}&sort=${this.currentSort}`);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                const { stocks, stats, pagination, relatedTags } = result.data;
                
                this.stockData = stocks || [];
                this.relatedTags = relatedTags || [];
                this.totalPages = pagination?.totalPages || 1;
                
                // 直接渲染股票列表，不需要再次过滤排序
                this.filteredStocks = this.stockData;
                this.renderStockList();
                this.renderRelatedTags();
                this.renderPagination();
                
                // 更新股票数量显示和统计信息
                this.updateStatsFromAPI(stats);
                
                console.log(`成功加载「${this.currentTag}」标签数据: ${stocks.length} 只股票`);
            } else {
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            console.error('加载标签数据失败:', error);
            this.showError('加载数据失败，正在使用模拟数据');
            // 使用模拟数据作为后备
            this.stockData = this.getMockStockData();
            this.applyFiltersAndSorting();
            this.updateStats();
        }
    }



    /**
     * 获取模拟股票数据
     */
    getMockStockData() {
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
        // 重置到第一页
        this.currentPage = 1;
        
        // 显示加载状态
        this.showLoading();
        
        try {
            // 重新加载数据
            await this.loadTagData();
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
     * 渲染股票列表
     */
    renderStockList() {
        const stockList = document.getElementById('stock-list');
        if (!stockList) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageStocks = this.filteredStocks.slice(startIndex, endIndex);
        
        if (pageStocks.length === 0) {
            stockList.innerHTML = '<div class="no-results">没有找到符合条件的股票</div>';
            return;
        }
        
        stockList.innerHTML = pageStocks.map(stock => this.createStockCard(stock)).join('');
        
        // 绑定股票卡片点击事件
        stockList.querySelectorAll('.stock-card').forEach(card => {
            card.addEventListener('click', () => {
                const symbol = card.dataset.symbol;
                this.navigateToStockDetail(symbol);
            });
        });
    }

    /**
     * 创建股票卡片HTML
     */
    createStockCard(stock) {
        const changeClass = stock.change > 0 ? 'positive' : stock.change < 0 ? 'negative' : 'neutral';
        const changeSign = stock.change > 0 ? '+' : '';
        
        return `
            <div class="stock-card" data-symbol="${stock.symbol}">
                <div class="stock-header">
                    <div class="stock-info">
                        <div class="stock-symbol">${stock.symbol}</div>
                        <div class="stock-name">${stock.name}</div>
                    </div>
                    <div class="stock-price">
                        <div class="current-price">$${stock.price.toFixed(2)}</div>
                        <div class="price-change ${changeClass}">
                            ${changeSign}${stock.change.toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)
                        </div>
                    </div>
                </div>
                <div class="stock-metrics">
                    <div class="metric">
                        <span class="metric-label">成交量</span>
                        <span class="metric-value">${this.formatNumber(stock.volume)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">市值</span>
                        <span class="metric-value">${this.formatMarketCap(stock.marketCap)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染相关标签
     */
    renderRelatedTags() {
        const relatedTagsEl = document.getElementById('related-tags');
        if (!relatedTagsEl) return;
        
        if (!this.relatedTags || this.relatedTags.length === 0) {
            relatedTagsEl.innerHTML = '<p class="no-tags">暂无相关标签</p>';
            return;
        }
        
        relatedTagsEl.innerHTML = this.relatedTags.map(tag => {
            // 处理不同的标签数据格式
            const tagName = typeof tag === 'string' ? tag : tag.name;
            const tagType = tag.type || 'default';
            
            return `
                <a href="tag-detail.html?tag=${encodeURIComponent(tagName)}" 
                   class="tag-item tag-${tagType}" 
                   title="点击查看 ${tagName} 标签详情">
                    ${tagName}
                </a>
            `;
        }).join('');
    }

    /**
     * 渲染分页控件
     */
    renderPagination() {
        const paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;
        
        if (this.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        paginationContainer.innerHTML = '';
        
        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<span>←</span> 上一页';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => this.goToPage(this.currentPage - 1);
        paginationContainer.appendChild(prevBtn);
        
        // 页码按钮逻辑
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        // 如果不是从第1页开始，显示第1页和省略号
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'pagination-btn';
            firstPageBtn.textContent = '1';
            firstPageBtn.onclick = () => this.goToPage(1);
            paginationContainer.appendChild(firstPageBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
        }
        
        // 当前页面附近的页码
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this.goToPage(i);
            paginationContainer.appendChild(pageBtn);
        }
        
        // 如果不是到最后一页，显示省略号和最后一页
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'pagination-btn';
            lastPageBtn.textContent = this.totalPages;
            lastPageBtn.onclick = () => this.goToPage(this.totalPages);
            paginationContainer.appendChild(lastPageBtn);
        }
        
        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '下一页 <span>→</span>';
        nextBtn.disabled = this.currentPage === this.totalPages;
        nextBtn.onclick = () => this.goToPage(this.currentPage + 1);
        paginationContainer.appendChild(nextBtn);
        
        // 页面信息
        const pageInfo = document.createElement('div');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页`;
        paginationContainer.appendChild(pageInfo);
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
        this.showToast(`已切换到第 ${page} 页`);
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
     * 导航到股票详情页
     */
    navigateToStockDetail(symbol) {
        // 这里可以导航到股票详情页
        // window.location.href = `stock-detail.html?symbol=${symbol}`;
        this.showToast(`点击了 ${symbol}，股票详情页功能待开发`, 'info');
    }

    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num >= 1000000) {
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
        if (marketCap >= 1000000000000) {
            return (marketCap / 1000000000000).toFixed(1) + 'T';
        } else if (marketCap >= 1000000000) {
            return (marketCap / 1000000000).toFixed(1) + 'B';
        } else if (marketCap >= 1000000) {
            return (marketCap / 1000000).toFixed(1) + 'M';
        }
        return marketCap.toString();
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const stockList = document.getElementById('stock-list');
        
        if (loading) loading.classList.remove('hidden');
        if (error) error.classList.add('hidden');
        if (stockList) stockList.innerHTML = '';
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        const errorContainer = document.getElementById('error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            
            // 3秒后自动隐藏
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) {
            loadingEl.style.display = 'block';
        }
        
        // 禁用筛选和排序控件
        const controls = document.querySelectorAll('.filter-select, .sort-select');
        controls.forEach(control => {
            control.disabled = true;
        });
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        
        // 启用筛选和排序控件
        const controls = document.querySelectorAll('.filter-select, .sort-select');
        controls.forEach(control => {
            control.disabled = false;
        });
    }
    
    /**
     * 显示提示信息
     */
    showToast(message) {
        // 创建或获取toast元素
        let toast = document.getElementById('toast-message');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-message';
            toast.className = 'toast-message';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.display = 'block';
        toast.classList.add('show');
        
        // 2秒后自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 2000);
    }

    /**
     * 显示Toast通知
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// 初始化应用
let tagDetailPage;
document.addEventListener('DOMContentLoaded', () => {
    tagDetailPage = new TagDetailPage();
});

// 导出到全局作用域以供HTML调用
window.tagDetailPage = tagDetailPage;