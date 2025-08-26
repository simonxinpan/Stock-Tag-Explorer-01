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
                this.applyFiltersAndSorting();
            });
        }

        // 价格过滤器
        const priceFilter = document.getElementById('price-filter');
        if (priceFilter) {
            priceFilter.addEventListener('change', (e) => {
                this.priceFilter = e.target.value;
                this.applyFiltersAndSorting();
            });
        }

        // 涨跌幅过滤器
        const changeFilter = document.getElementById('change-filter');
        if (changeFilter) {
            changeFilter.addEventListener('change', (e) => {
                this.changeFilter = e.target.value;
                this.applyFiltersAndSorting();
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
            
            this.applyFiltersAndSorting();
            this.updateStats();
            
        } catch (error) {
            console.error('加载标签数据失败:', error);
            // 使用模拟数据作为备用
            this.stockData = this.getMockStockData();
            this.applyFiltersAndSorting();
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
     * 应用过滤和排序
     */
    applyFiltersAndSorting() {
        // 确保stockData是数组
        if (!Array.isArray(this.stockData)) {
            console.warn('stockData is not an array, initializing with empty array');
            this.stockData = [];
        }
        
        // 先应用过滤器
        this.filteredStocks = this.stockData.filter(stock => {
            // 价格过滤
            if (this.priceFilter !== 'all') {
                const price = stock.price;
                switch (this.priceFilter) {
                    case 'under-50':
                        if (price >= 50) return false;
                        break;
                    case '50-100':
                        if (price < 50 || price >= 100) return false;
                        break;
                    case '100-200':
                        if (price < 100 || price >= 200) return false;
                        break;
                    case 'over-200':
                        if (price < 200) return false;
                        break;
                }
            }

            // 涨跌幅过滤
            if (this.changeFilter !== 'all') {
                const changePercent = stock.changePercent;
                switch (this.changeFilter) {
                    case 'rising':
                        if (changePercent <= 0) return false;
                        break;
                    case 'falling':
                        if (changePercent >= 0) return false;
                        break;
                    case 'strong-rising':
                        if (changePercent <= 5) return false;
                        break;
                    case 'strong-falling':
                        if (changePercent >= -5) return false;
                        break;
                }
            }

            return true;
        });
        
        // 然后应用排序
        this.filteredStocks.sort((a, b) => {
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
        
        this.currentPage = 1;
        this.updatePagination();
        this.renderStockList();
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
        
        relatedTagsEl.innerHTML = this.relatedTags.map(tag => `
            <a href="tag-detail.html?tag=${encodeURIComponent(tag.name)}" class="tag-item">
                ${tag.name}
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