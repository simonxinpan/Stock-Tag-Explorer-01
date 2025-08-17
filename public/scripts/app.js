/**
 * Stock Tag Explorer - 主应用程序
 * 智能标签浏览器，用于发现投资机会
 */

class StockTagExplorer {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.selectedTag = null;
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
            this.tagData = data.data || [];
            this.renderTagPlaza();
            
        } catch (error) {
            console.error('加载标签失败:', error);
            // 使用备用数据
            this.tagData = this.getFallbackTagData();
            this.renderTagPlaza();
            this.showToast('使用离线数据，部分功能可能受限', 'warning');
        }
    }

    /**
     * 获取备用标签数据
     */
    getFallbackTagData() {
        return [
            {
                id: 'market-performance',
                name: '市场表现',
                tags: [
                    { id: 'high-growth', name: '高成长股', description: '营收和利润快速增长的公司', stock_count: 45 },
                    { id: 'dividend-stocks', name: '分红股', description: '稳定分红的优质公司', stock_count: 32 },
                    { id: 'value-stocks', name: '价值股', description: '被低估的优质公司', stock_count: 28 }
                ]
            },
            {
                id: 'industry',
                name: '行业分类',
                tags: [
                    { id: 'technology', name: '科技股', description: '科技创新领域的公司', stock_count: 67 },
                    { id: 'healthcare', name: '医疗健康', description: '医疗保健行业公司', stock_count: 41 },
                    { id: 'finance', name: '金融服务', description: '银行、保险等金融机构', stock_count: 38 }
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
        card.dataset.tagId = tag.id;
        card.innerHTML = `
            <div class="tag-name">${tag.name}</div>
            <div class="tag-description">${tag.description}</div>
            <div class="tag-stats">
                <span class="stock-count">${tag.stock_count} 只股票</span>
                <span class="last-updated">实时更新</span>
            </div>
        `;

        card.addEventListener('click', () => this.handleTagClick(tag));
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
        // 更新选中状态
        document.querySelectorAll('.tag-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const clickedCard = document.querySelector(`[data-tag-id="${tag.id}"]`);
        if (clickedCard) {
            clickedCard.classList.add('selected');
        }

        this.selectedTag = tag;
        this.currentPage = 1;
        
        // 显示股票列表区域
        this.showStockList();
        
        // 更新标题
        const title = document.getElementById('stock-list-title');
        if (title) {
            title.textContent = `${tag.name} - ${tag.stock_count} 只股票`;
        }

        // 加载股票数据
        await this.loadStockData();
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
     * 清除选择
     */
    clearSelection() {
        document.querySelectorAll('.tag-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.selectedTag = null;
        this.hideStockList();
    }

    /**
     * 加载股票数据
     */
    async loadStockData() {
        if (!this.selectedTag) return;

        try {
            const params = new URLSearchParams({
                tag: this.selectedTag.id,
                page: this.currentPage,
                limit: this.pageSize,
                sort: this.currentSort
            });

            const response = await fetch(`${this.apiBaseUrl}/api/stocks?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.stockData = data.stocks || [];
            this.totalPages = data.totalPages || 1;
            this.totalCount = data.totalCount || 0;
            
            this.renderStockList();
            this.renderPagination();
            
        } catch (error) {
            console.error('加载股票数据失败:', error);
            // 使用模拟数据
            const mockData = this.generateMockStockData();
            this.stockData = mockData.stocks;
            this.totalPages = mockData.totalPages;
            this.totalCount = mockData.totalCount;
            
            this.renderStockList();
            this.renderPagination();
            this.showToast('使用模拟数据，请检查网络连接', 'warning');
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