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
        this.filters = {
            minPrice: null,
            maxPrice: null,
            changeFilter: 'all'
        };
        
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
            await this.loadRelatedTags();
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
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFiltersAndSort();
            });
        }

        // 价格过滤器
        const minPriceInput = document.getElementById('min-price');
        const maxPriceInput = document.getElementById('max-price');
        
        if (minPriceInput) {
            minPriceInput.addEventListener('input', this.debounce(() => {
                this.filters.minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
                this.applyFiltersAndSort();
            }, 500));
        }
        
        if (maxPriceInput) {
            maxPriceInput.addEventListener('input', this.debounce(() => {
                this.filters.maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
                this.applyFiltersAndSort();
            }, 500));
        }

        // 涨跌幅过滤器
        const changeBtns = document.querySelectorAll('.change-btn');
        changeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                changeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filters.changeFilter = btn.dataset.filter;
                this.applyFiltersAndSort();
            });
        });

        // 重置过滤器
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
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
            // 调用标签股票API
            const response = await fetch(`${this.apiBaseUrl}/api/tag-stocks?tag=${encodeURIComponent(this.currentTag)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                this.stockData = data.data;
            } else {
                // 使用模拟数据
                this.stockData = this.getMockStockData();
                this.showToast('使用模拟数据展示', 'warning');
            }
            
            this.applyFiltersAndSort();
            this.updateStats();
            
        } catch (error) {
            console.error('加载标签数据失败:', error);
            // 使用模拟数据作为备用
            this.stockData = this.getMockStockData();
            this.applyFiltersAndSort();
            this.updateStats();
            this.showToast('连接服务器失败，使用模拟数据', 'warning');
        }
    }

    /**
     * 加载相关标签
     */
    async loadRelatedTags() {
        try {
            // 模拟相关标签数据
            this.relatedTags = this.getMockRelatedTags();
            this.renderRelatedTags();
        } catch (error) {
            console.error('加载相关标签失败:', error);
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
            }
        ];
        
        return mockStocks;
    }

    /**
     * 获取模拟相关标签
     */
    getMockRelatedTags() {
        return [
            { name: '大型科技股', count: 25 },
            { name: '人工智能', count: 18 },
            { name: '云计算', count: 15 },
            { name: '电动汽车', count: 12 },
            { name: '半导体', count: 20 },
            { name: '消费电子', count: 14 },
            { name: '软件服务', count: 22 },
            { name: '互联网', count: 16 }
        ];
    }

    /**
     * 应用过滤器和排序
     */
    applyFiltersAndSort() {
        let filtered = [...this.stockData];
        
        // 应用价格过滤器
        if (this.filters.minPrice !== null) {
            filtered = filtered.filter(stock => stock.price >= this.filters.minPrice);
        }
        
        if (this.filters.maxPrice !== null) {
            filtered = filtered.filter(stock => stock.price <= this.filters.maxPrice);
        }
        
        // 应用涨跌幅过滤器
        if (this.filters.changeFilter !== 'all') {
            switch (this.filters.changeFilter) {
                case 'up':
                    filtered = filtered.filter(stock => stock.change > 0);
                    break;
                case 'down':
                    filtered = filtered.filter(stock => stock.change < 0);
                    break;
                case 'flat':
                    filtered = filtered.filter(stock => stock.change === 0);
                    break;
            }
        }
        
        // 应用排序
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name-asc':
                    return a.symbol.localeCompare(b.symbol);
                case 'name-desc':
                    return b.symbol.localeCompare(a.symbol);
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'change-asc':
                    return a.changePercent - b.changePercent;
                case 'change-desc':
                    return b.changePercent - a.changePercent;
                case 'volume-asc':
                    return a.volume - b.volume;
                case 'volume-desc':
                    return b.volume - a.volume;
                default:
                    return 0;
            }
        });
        
        this.filteredStocks = filtered;
        this.currentPage = 1;
        this.updatePagination();
        this.renderStockList();
    }

    /**
     * 重置过滤器
     */
    resetFilters() {
        // 重置过滤器状态
        this.filters = {
            minPrice: null,
            maxPrice: null,
            changeFilter: 'all'
        };
        
        // 重置UI
        const minPriceInput = document.getElementById('min-price');
        const maxPriceInput = document.getElementById('max-price');
        const changeBtns = document.querySelectorAll('.change-btn');
        
        if (minPriceInput) minPriceInput.value = '';
        if (maxPriceInput) maxPriceInput.value = '';
        
        changeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'all') {
                btn.classList.add('active');
            }
        });
        
        this.applyFiltersAndSort();
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
        
        relatedTagsEl.innerHTML = this.relatedTags.map(tag => `
            <a href="tag-detail.html?tag=${encodeURIComponent(tag.name)}" class="tag-item">
                ${tag.name}
                <span class="tag-count">${tag.count}</span>
            </a>
        `).join('');
    }

    /**
     * 渲染分页
     */
    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        if (this.totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }
        
        pagination.classList.remove('hidden');
        
        let paginationHTML = '';
        
        // 上一页按钮
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="tagDetailPage.goToPage(${this.currentPage - 1})">
                ← 上一页
            </button>
        `;
        
        // 页码按钮
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="tagDetailPage.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // 下一页按钮
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="tagDetailPage.goToPage(${this.currentPage + 1})">
                下一页 →
            </button>
        `;
        
        // 页面信息
        paginationHTML += `
            <span class="pagination-info">
                第 ${this.currentPage} 页，共 ${this.totalPages} 页
            </span>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    /**
     * 跳转到指定页面
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.renderStockList();
        this.renderPagination();
        
        // 滚动到顶部
        document.querySelector('.stock-list-section').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalStocks = this.stockData.length;
        const upStocks = this.stockData.filter(stock => stock.change > 0).length;
        const downStocks = this.stockData.filter(stock => stock.change < 0).length;
        const flatStocks = this.stockData.filter(stock => stock.change === 0).length;
        const avgChange = this.stockData.reduce((sum, stock) => sum + stock.changePercent, 0) / totalStocks;
        
        // 更新头部统计
        const stockCountEl = document.getElementById('stock-count');
        const avgChangeEl = document.getElementById('avg-change');
        
        if (stockCountEl) stockCountEl.textContent = totalStocks;
        if (avgChangeEl) {
            const changeClass = avgChange > 0 ? 'stats-up' : avgChange < 0 ? 'stats-down' : 'stats-flat';
            avgChangeEl.textContent = `${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
            avgChangeEl.className = `stat-value ${changeClass}`;
        }
        
        // 更新右侧统计
        const totalStocksEl = document.getElementById('total-stocks');
        const upStocksEl = document.getElementById('up-stocks');
        const downStocksEl = document.getElementById('down-stocks');
        const flatStocksEl = document.getElementById('flat-stocks');
        
        if (totalStocksEl) totalStocksEl.textContent = totalStocks;
        if (upStocksEl) upStocksEl.textContent = upStocks;
        if (downStocksEl) downStocksEl.textContent = downStocks;
        if (flatStocksEl) flatStocksEl.textContent = flatStocks;
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
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        
        if (loading) loading.classList.add('hidden');
        if (error) {
            error.textContent = message;
            error.classList.remove('hidden');
        }
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