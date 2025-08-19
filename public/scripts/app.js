/**
 * Stock-Tag-Explorer 主应用脚本
 * 实现标签广场的动态交互功能
 */

class StockTagExplorer {
    constructor() {
        this.selectedTags = new Set();
        this.stockData = [];
        this.filteredStocks = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.isLoading = false;
        
        // API配置
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? (window.location.port === '8000' ? 'http://localhost:3000' : window.location.origin)
            : window.location.origin;
        
        // 标签数据将从API获取
        this.tagData = {};
        
        this.init();
    }
    
    /**
     * 初始化应用
     */
    async init() {
        await this.loadTagData();
        this.renderTagPlaza();
        this.bindEvents();
        this.showWelcomeMessage();
    }
    
    /**
     * 加载标签数据
     */
    async loadTagData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                this.tagData = result.data;
            } else {
                throw new Error(result.message || 'Failed to load tags');
            }
        } catch (error) {
            console.warn('Failed to fetch tags from API, using fallback data:', error);
            // 使用备用数据
            this.tagData = {
                'market-performance': [
                    { name: '52周高点', count: 23, id: '52w-high' },
                    { name: '52周低点', count: 12, id: '52w-low' },
                    { name: '高股息率', count: 45, id: 'high-dividend' },
                    { name: '低市盈率', count: 67, id: 'low-pe' },
                    { name: '高市值', count: 30, id: 'high-cap' }
                ],
                'financial-performance': [
                    { name: '高ROE', count: 56, id: 'high-roe' },
                    { name: '低负债率', count: 78, id: 'low-debt' },
                    { name: '高增长率', count: 34, id: 'high-growth' },
                    { name: '高现金流', count: 42, id: 'high-cashflow' },
                    { name: 'VIX恐慌指数相关', count: 8, id: 'vix-related' }
                ],
                'trend-ranking': [
                    { name: '近期涨幅', count: 36, id: 'recent-gain' },
                    { name: '近期跌幅', count: 25, id: 'recent-loss' },
                    { name: '成交量放大', count: 18, id: 'volume-surge' },
                    { name: '突破新高', count: 29, id: 'breakout' },
                    { name: '数据支持', count: 15, id: 'data-support' }
                ],
                'industry': [
                    { name: '科技股', count: 76, id: 'tech' },
                    { name: '金融股', count: 65, id: 'finance' },
                    { name: '医疗保健', count: 54, id: 'healthcare' },
                    { name: '能源股', count: 43, id: 'energy' },
                    { name: '消费品', count: 60, id: 'consumer' }
                ],
                'special-list': [
                    { name: '标普500', count: 500, id: 'sp500' },
                    { name: '纳斯达克100', count: 100, id: 'nasdaq100' },
                    { name: '道琼斯', count: 30, id: 'dow' },
                    { name: 'ESG评级高', count: 89, id: 'esg-high' },
                    { name: '分析师推荐', count: 120, id: 'analyst-rec' }
                ]
            };
        }
    }
    
    /**
     * 渲染标签广场
     */
    renderTagPlaza() {
        const tagGroups = {
            'market_performance': { title: '股市表现类', icon: '📈' },
            'financial_performance': { title: '财务表现类', icon: '💰' },
            'trend_ranking': { title: '趋势排位类', icon: '📊' },
            'industry_category': { title: '行业分类', icon: '🏭' },
            'special_lists': { title: '特殊名单类', icon: '⭐' }
        };
        
        const tagGroupsContainer = document.getElementById('tag-groups');
        tagGroupsContainer.innerHTML = '';
        
        Object.entries(tagGroups).forEach(([groupId, groupInfo]) => {
            const tags = this.tagData[groupId] || [];
            const groupElement = this.createTagGroup(groupId, groupInfo, tags);
            tagGroupsContainer.appendChild(groupElement);
        });
    }
    
    /**
     * 创建标签组
     */
    createTagGroup(groupId, groupInfo, tags) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'tag-group';
        groupDiv.innerHTML = `
            <div class="tag-group-header">
                <span class="tag-group-icon">${groupInfo.icon}</span>
                <h3 class="tag-group-title">${groupInfo.title}</h3>
            </div>
            <div class="tag-cards" data-group="${groupId}">
                ${tags.map(tag => this.createTagCard(tag, groupId)).join('')}
            </div>
        `;
        return groupDiv;
    }
    
    /**
     * 创建标签卡片
     */
    createTagCard(tag, groupType) {
        return `
            <div class="tag-card" 
                 data-tag-id="${tag.id}" 
                 data-type="${groupType}"
                 role="button"
                 tabindex="0"
                 aria-label="选择标签 ${tag.name}">
                <div class="tag-name">${tag.name}</div>
                <div class="tag-count">${tag.count}</div>
            </div>
        `;
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 标签点击事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tag-card')) {
                this.handleTagClick(e.target.closest('.tag-card'));
            }
        });
        
        // 键盘事件支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest('.tag-card')) {
                    e.preventDefault();
                    this.handleTagClick(e.target.closest('.tag-card'));
                }
            }
        });
        
        // 排序选择事件
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                this.sortBy = sortBy;
                this.sortOrder = sortOrder;
                this.renderStockList();
            });
        }
        
        // 清除选择按钮
        const clearBtn = document.getElementById('clear-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }
        
        // 分页按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('.page-btn[data-action="prev"]')) {
                this.previousPage();
            } else if (e.target.matches('.page-btn[data-action="next"]')) {
                this.nextPage();
            }
        });
        
        // 重试按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('.retry-btn')) {
                this.loadStockData();
            }
        });
    }
    
    /**
     * 处理标签点击
     */
    handleTagClick(tagCard) {
        const tagId = tagCard.dataset.tagId;
        const isActive = tagCard.classList.contains('active');
        
        if (isActive) {
            // 取消选择
            tagCard.classList.remove('active');
            this.selectedTags.delete(tagId);
        } else {
            // 选择标签
            tagCard.classList.add('active');
            this.selectedTags.add(tagId);
        }
        
        // 添加点击动画
        tagCard.style.transform = 'scale(0.95)';
        setTimeout(() => {
            tagCard.style.transform = '';
        }, 150);
        
        // 更新股票列表
        this.updateStockList();
        
        // 显示提示信息
        this.showToast(isActive ? 
            `已取消选择标签: ${this.getTagName(tagId)}` : 
            `已选择标签: ${this.getTagName(tagId)}`
        );
    }
    
    /**
     * 获取标签名称
     */
    getTagName(tagId) {
        for (const group of Object.values(this.tagData)) {
            const tag = group.find(t => t.id === tagId);
            if (tag) return tag.name;
        }
        return tagId;
    }
    
    /**
     * 更新股票列表
     */
    updateStockList() {
        if (this.selectedTags.size === 0) {
            this.hideStockList();
            return;
        }
        
        this.showStockList();
        this.loadStockData();
    }
    
    /**
     * 显示股票列表区域
     */
    showStockList() {
        const stockSection = document.getElementById('stock-list-section');
        stockSection.classList.remove('hidden');
        stockSection.classList.add('slide-in-up');
        
        // 更新标题
        const title = document.getElementById('stock-list-title');
        const selectedTagNames = Array.from(this.selectedTags).map(id => this.getTagName(id));
        title.textContent = `符合标签的股票 (${selectedTagNames.join(', ')})`;
    }
    
    /**
     * 隐藏股票列表区域
     */
    hideStockList() {
        const stockSection = document.getElementById('stock-list-section');
        stockSection.classList.add('hidden');
    }
    
    /**
     * 加载股票数据
     */
    async loadStockData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            // 尝试从API获取股票数据
            const tags = Array.from(this.selectedTags).join(',');
            const sortParam = `${this.sortBy}-${this.sortOrder}`;
            const url = `${this.apiBaseUrl}/api/stocks?tags=${encodeURIComponent(tags)}&page=${this.currentPage}&limit=${this.itemsPerPage}&sort=${sortParam}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                this.stockData = result.data.stocks;
                this.totalPages = result.data.pagination.total;
                this.totalCount = result.data.pagination.count;
                this.filteredStocks = this.stockData;
                this.renderStockList();
                this.updatePagination();
                
                // 显示数据来源信息
                this.updateDataSourceIndicator(result.source, result.realTimeCount);
            } else {
                throw new Error(result.message || 'Failed to load stocks');
            }
            
        } catch (error) {
            console.warn('Failed to fetch stocks from API, using fallback data:', error);
            // 使用模拟数据作为备用
            this.stockData = this.generateMockStockData();
            this.filterStocks();
            this.renderStockList();
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * 生成模拟股票数据
     */
    generateMockStockData() {
        const companies = [
            'Apple Inc.', 'Microsoft Corp.', 'Amazon.com Inc.', 'Alphabet Inc.', 'Tesla Inc.',
            'Meta Platforms Inc.', 'NVIDIA Corp.', 'Berkshire Hathaway', 'Johnson & Johnson', 'JPMorgan Chase',
            'Visa Inc.', 'Procter & Gamble', 'UnitedHealth Group', 'Home Depot', 'Mastercard Inc.',
            'Bank of America', 'Pfizer Inc.', 'Coca-Cola Company', 'Walt Disney Company', 'Netflix Inc.',
            'Adobe Inc.', 'Salesforce Inc.', 'Intel Corp.', 'Cisco Systems', 'PepsiCo Inc.',
            'Abbott Laboratories', 'Thermo Fisher Scientific', 'Costco Wholesale', 'Accenture PLC', 'Broadcom Inc.'
        ];
        
        const tickers = [
            'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA',
            'META', 'NVDA', 'BRK.B', 'JNJ', 'JPM',
            'V', 'PG', 'UNH', 'HD', 'MA',
            'BAC', 'PFE', 'KO', 'DIS', 'NFLX',
            'ADBE', 'CRM', 'INTC', 'CSCO', 'PEP',
            'ABT', 'TMO', 'COST', 'ACN', 'AVGO'
        ];
        
        const stockCount = Math.min(companies.length, 15 + Math.floor(Math.random() * 15));
        const stocks = [];
        
        for (let i = 0; i < stockCount; i++) {
            const price = 50 + Math.random() * 500;
            const change = (Math.random() - 0.5) * 20;
            const changePercent = (change / price) * 100;
            
            stocks.push({
                id: `stock-${i}`,
                name: companies[i],
                ticker: tickers[i],
                price: price.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent.toFixed(2),
                volume: Math.floor(Math.random() * 10000000),
                marketCap: Math.floor(Math.random() * 1000000000000),
                tags: Array.from(this.selectedTags)
            });
        }
        
        return stocks;
    }
    
    /**
     * 筛选股票
     */
    filterStocks() {
        this.filteredStocks = this.stockData.filter(stock => {
            // 如果没有选择标签，显示所有股票
            if (this.selectedTags.size === 0) return true;
            
            // 检查股票是否包含所有选中的标签
            return Array.from(this.selectedTags).every(tagId => 
                stock.tags.includes(tagId)
            );
        });
        
        this.sortStocks();
        this.currentPage = 1;
    }
    
    /**
     * 排序股票
     */
    sortStocks() {
        this.filteredStocks.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'price':
                    aValue = parseFloat(a.price);
                    bValue = parseFloat(b.price);
                    break;
                case 'change':
                    aValue = parseFloat(a.changePercent);
                    bValue = parseFloat(b.changePercent);
                    break;
                case 'volume':
                    aValue = a.volume;
                    bValue = b.volume;
                    break;
                default:
                    return 0;
            }
            
            if (this.sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }
    
    /**
     * 渲染股票列表
     */
    renderStockList() {
        const stockList = document.getElementById('stock-list');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageStocks = this.filteredStocks.slice(startIndex, endIndex);
        
        if (pageStocks.length === 0) {
            stockList.innerHTML = `
                <div class="no-results">
                    <div class="error-icon">📊</div>
                    <div class="error-message">未找到符合条件的股票</div>
                    <p>请尝试选择其他标签组合</p>
                </div>
            `;
            this.hidePagination();
            return;
        }
        
        stockList.innerHTML = pageStocks.map(stock => this.createStockItem(stock)).join('');
        this.updatePagination();
        
        // 添加进入动画
        const stockItems = stockList.querySelectorAll('.stock-item');
        stockItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            setTimeout(() => {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
    
    /**
     * 创建股票项目
     */
    createStockItem(stock) {
        const changeClass = parseFloat(stock.changePercent) > 0 ? 'positive' : 
                           parseFloat(stock.changePercent) < 0 ? 'negative' : 'neutral';
        const changeSign = parseFloat(stock.changePercent) > 0 ? '+' : '';
        
        // 格式化更新时间
        const lastUpdated = stock.lastUpdated ? 
            new Date(stock.lastUpdated).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) : '未知';
        
        // 格式化成交量
        const formatVolume = (volume) => {
            if (volume >= 1000000) {
                return (volume / 1000000).toFixed(1) + 'M';
            } else if (volume >= 1000) {
                return (volume / 1000).toFixed(1) + 'K';
            }
            return volume.toString();
        };
        
        return `
            <div class="stock-item" data-stock-symbol="${stock.symbol}" onclick="window.open('https://stock-details-final-1e1vcxew3-simon-pans-projects.vercel.app/?symbol=${stock.symbol}', '_blank')" style="cursor: pointer;">
                <div class="stock-info">
                    <div class="stock-name">${stock.name}</div>
                    <div class="stock-ticker">${stock.symbol}</div>
                    <div class="stock-meta">
                        <span class="volume">成交量: ${formatVolume(stock.volume)}</span>
                        <span class="update-time">更新: ${lastUpdated}</span>
                    </div>
                </div>
                <div class="stock-price">
                    <div class="current-price">$${stock.price}</div>
                    <div class="change-percent ${changeClass}">
                        ${changeSign}${stock.changePercent}%
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 更新分页控件
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredStocks.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }
        
        pagination.classList.remove('hidden');
        pagination.innerHTML = `
            <button class="page-btn" data-action="prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                上一页
            </button>
            <span class="page-info">
                第 ${this.currentPage} 页，共 ${totalPages} 页 (${this.filteredStocks.length} 只股票)
            </span>
            <button class="page-btn" data-action="next" ${this.currentPage === totalPages ? 'disabled' : ''}>
                下一页
            </button>
        `;
    }
    
    /**
     * 隐藏分页控件
     */
    hidePagination() {
        const pagination = document.getElementById('pagination');
        pagination.classList.add('hidden');
    }
    
    /**
     * 上一页
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderStockList();
        }
    }
    
    /**
     * 下一页
     */
    nextPage() {
        const totalPages = Math.ceil(this.filteredStocks.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderStockList();
        }
    }
    
    /**
     * 清除所有选择
     */
    clearSelection() {
        // 移除所有活动状态
        document.querySelectorAll('.tag-card.active').forEach(card => {
            card.classList.remove('active');
        });
        
        // 清空选择集合
        this.selectedTags.clear();
        
        // 隐藏股票列表
        this.hideStockList();
        
        // 显示提示
        this.showToast('已清除所有标签选择');
    }
    
    /**
     * 显示加载状态
     */
    showLoadingState() {
        const stockList = document.getElementById('stock-list');
        stockList.innerHTML = `
            <div class="stock-list-loading">
                <div class="loading-spinner"></div>
                <div>正在加载股票数据...</div>
            </div>
        `;
        this.hidePagination();
    }
    
    /**
     * 显示错误状态
     */
    showErrorState(message) {
        const stockList = document.getElementById('stock-list');
        stockList.innerHTML = `
            <div class="error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">加载失败</div>
                <p>${message}</p>
                <button class="retry-btn">重试</button>
            </div>
        `;
        this.hidePagination();
    }
    
    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        // 移除现有的提示
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // 创建新提示
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span>${type === 'error' ? '❌' : '✅'}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => toast.classList.add('show'), 100);
        
        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        setTimeout(() => {
            this.showToast('欢迎使用股票标签探索器！点击标签开始探索股票。');
        }, 1000);
    }
    
    /**
     * 更新数据来源指示器
     */
    updateDataSourceIndicator(source, realTimeCount) {
        let indicator = document.querySelector('.data-source-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'data-source-indicator';
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(indicator, container.firstChild);
            }
        }
        
        let statusText = '';
        let statusClass = '';
        
        if (source === 'database_with_realtime') {
            statusText = `🟢 实时数据 (${realTimeCount || 0} 只股票已更新)`;
            statusClass = 'realtime';
        } else if (source === 'mock') {
            statusText = '🟡 模拟数据 (数据库连接失败)';
            statusClass = 'mock';
        } else {
            statusText = '🔵 数据库数据';
            statusClass = 'database';
        }
        
        indicator.innerHTML = `
            <span class="status ${statusClass}">${statusText}</span>
            <span class="timestamp">最后更新: ${new Date().toLocaleTimeString('zh-CN')}</span>
        `;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.stockTagExplorer = new StockTagExplorer();
});

// 导出类以供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockTagExplorer;
}