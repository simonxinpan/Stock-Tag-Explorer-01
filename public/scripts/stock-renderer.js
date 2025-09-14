/**
 * 通用股票列表渲染器
 * 提供统一的股票列表渲染、格式化和导航功能
 */

class StockRenderer {
    constructor() {
        this.stockDetailBaseUrl = 'https://stock-details-final.vercel.app/';
    }

    /**
     * 渲染股票列表
     * @param {Array} stocks - 股票数据数组
     * @param {string} containerId - 容器元素ID
     */
    renderStockList(stocks, containerId = 'stock-list') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            return;
        }

        container.innerHTML = '';

        if (!stocks || stocks.length === 0) {
            container.innerHTML = '<div class="text-center">暂无数据</div>';
            return;
        }

        stocks.forEach(stock => {
            const stockElement = this.createStockItem(stock);
            container.appendChild(stockElement);
        });
    }

    /**
     * 创建股票项元素
     * @param {Object} stock - 股票数据对象
     * @returns {HTMLElement} 股票项DOM元素
     */
    createStockItem(stock) {
        const item = document.createElement('div');
        item.className = 'stock-item';
        
        // 处理数据格式兼容性
        const symbol = stock.symbol || stock.ticker;
        const name = stock.name_zh || stock.name || stock.company_name || symbol;
        const price = stock.price || stock.last_price || 0;
        const change = stock.change || stock.price_change || 0;
        const changePercent = stock.changePercent || stock.change_percent || 0;
        const volume = stock.volume || stock.trading_volume || 0;
        const marketCap = stock.marketCap || stock.market_cap || 0;
        const lastUpdated = stock.lastUpdated || stock.last_updated || new Date().toISOString();
        
        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeSymbol = change > 0 ? '+' : '';
        
        // 创建可点击的链接包装器
        const linkWrapper = document.createElement('a');
        linkWrapper.href = `${this.stockDetailBaseUrl}?symbol=${symbol}`;
        linkWrapper.target = '_blank';
        linkWrapper.style.textDecoration = 'none';
        linkWrapper.style.color = 'inherit';
        
        item.innerHTML = `
            <div class="stock-header">
                <div class="stock-info">
                    <div class="stock-name">${name}</div>
                    <div class="stock-symbol">${symbol}</div>
                </div>
                <div class="stock-price">
                    <div class="current-price">$${price.toFixed(2)}</div>
                    <div class="price-change ${changeClass}">
                        ${changeSymbol}${change.toFixed(2)} (${changeSymbol}${changePercent.toFixed(2)}%)
                    </div>
                </div>
            </div>
            <div class="stock-details">
                <div class="detail-item">
                    <div class="detail-label">成交量</div>
                    <div class="detail-value">${this.formatVolume(volume)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">市值</div>
                    <div class="detail-value">${this.formatMarketCap(marketCap)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">更新时间</div>
                    <div class="detail-value">${this.formatTime(lastUpdated)}</div>
                </div>
            </div>
        `;
        
        // 将股票项包装在链接中
        linkWrapper.appendChild(item);
        
        // 添加悬停效果
        item.style.cursor = 'pointer';
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-2px)';
            item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
            item.style.boxShadow = '';
        });

        return linkWrapper;
    }

    /**
     * 渲染分页控件
     * @param {Object} pagination - 分页信息对象
     * @param {Function} onPageChange - 页码变化回调函数
     * @param {string} containerId - 分页容器ID
     */
    renderPagination(pagination, onPageChange, containerId = 'pagination') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Pagination container with ID '${containerId}' not found`);
            return;
        }

        const { currentPage, totalPages } = pagination;

        if (totalPages <= 1) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = '';

        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1 && onPageChange) {
                onPageChange(currentPage - 1);
            }
        });
        container.appendChild(prevBtn);

        // 页码信息
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
        container.appendChild(pageInfo);

        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages && onPageChange) {
                onPageChange(currentPage + 1);
            }
        });
        container.appendChild(nextBtn);
    }

    /**
     * 显示加载状态
     * @param {string} loadingId - 加载元素ID
     * @param {string} contentId - 内容元素ID
     * @param {string} errorId - 错误元素ID
     */
    showLoading(loadingId = 'loading', contentId = 'stock-list', errorId = 'error') {
        const loading = document.getElementById(loadingId);
        const content = document.getElementById(contentId);
        const error = document.getElementById(errorId);
        
        if (loading) loading.classList.remove('hidden');
        if (error) error.classList.add('hidden');
        if (content) content.style.display = 'none';
    }

    /**
     * 隐藏加载状态
     * @param {string} loadingId - 加载元素ID
     * @param {string} contentId - 内容元素ID
     */
    hideLoading(loadingId = 'loading', contentId = 'stock-list') {
        const loading = document.getElementById(loadingId);
        const content = document.getElementById(contentId);
        
        if (loading) loading.classList.add('hidden');
        if (content) content.style.display = 'block';
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     * @param {string} loadingId - 加载元素ID
     * @param {string} contentId - 内容元素ID
     * @param {string} errorId - 错误元素ID
     */
    showError(message, loadingId = 'loading', contentId = 'stock-list', errorId = 'error') {
        const loading = document.getElementById(loadingId);
        const content = document.getElementById(contentId);
        const error = document.getElementById(errorId);
        const errorMessage = document.getElementById('error-message');
        
        if (loading) loading.classList.add('hidden');
        if (content) content.style.display = 'none';
        if (error) error.classList.remove('hidden');
        if (errorMessage) errorMessage.textContent = message;
    }

    /**
     * 格式化成交量
     * @param {number} volume - 成交量
     * @returns {string} 格式化后的成交量
     */
    formatVolume(volume) {
        if (!volume || volume === 0) return '0';
        
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
     * @param {number} marketCap - 市值
     * @returns {string} 格式化后的市值
     */
    formatMarketCap(marketCap) {
        if (!marketCap || marketCap === 0) return '未知';
        
        // 输入的marketCap是百万美元，需要转换为亿美元
        // 1亿美元 = 100百万美元
        const cap = parseFloat(marketCap);
        const capInYi = cap / 100; // 转换为亿美元
        
        if (capInYi >= 10000) {
            return `$${(capInYi / 10000).toFixed(1)}万亿`;
        } else if (capInYi >= 100) {
            return `$${capInYi.toFixed(0)}亿`;
        } else if (capInYi >= 10) {
            return `$${capInYi.toFixed(1)}亿`;
        } else {
            return `$${capInYi.toFixed(2)}亿`;
        }
    }

    /**
     * 格式化时间
     * @param {string} timestamp - 时间戳
     * @returns {string} 格式化后的时间
     */
    formatTime(timestamp) {
        if (!timestamp) return '未知';
        
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
     * 显示Toast消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, warning, info)
     * @param {number} duration - 显示时长(毫秒)
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        // 自动隐藏
        setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }
}

// 创建全局实例
window.stockRenderer = new StockRenderer();

// 导出类以供模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockRenderer;
}