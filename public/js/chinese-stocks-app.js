// 文件: /public/js/chinese-stocks-app.js
// 中概股专用应用 - 完全独立的系统
// 版本: v1.0 - 彻底隔离版本

// ==================== 中概股专用格式化函数 ====================

/**
 * 格式化中概股市值 - 支持人民币单位
 */
function formatChineseStockMarketCap(cap) {
    if (!cap || cap === 'N/A' || isNaN(cap)) return 'N/A';
    
    const numCap = parseFloat(cap);
    
    if (numCap >= 1e12) {
        return `¥${(numCap / 1e12).toFixed(2)}万亿`;
    } else if (numCap >= 1e8) {
        return `¥${(numCap / 1e8).toFixed(2)}亿`;
    } else if (numCap >= 1e4) {
        return `¥${(numCap / 1e4).toFixed(2)}万`;
    } else {
        return `¥${numCap.toFixed(2)}`;
    }
}

/**
 * 格式化中概股价格
 */
function formatChineseStockPrice(price) {
    if (!price || price === 'N/A' || isNaN(price)) return 'N/A';
    return `¥${parseFloat(price).toFixed(2)}`;
}

/**
 * 格式化中概股成交量
 */
function formatChineseStockVolume(volume) {
    if (!volume || volume === 'N/A' || isNaN(volume)) return 'N/A';
    
    const numVolume = parseFloat(volume);
    if (numVolume >= 1e8) {
        return `${(numVolume / 1e8).toFixed(2)}亿`;
    } else if (numVolume >= 1e4) {
        return `${(numVolume / 1e4).toFixed(2)}万`;
    } else {
        return numVolume.toLocaleString();
    }
}

/**
 * 格式化百分比变化
 */
function formatPercentageChange(change) {
    if (!change || change === 'N/A' || isNaN(change)) return 'N/A';
    const numChange = parseFloat(change);
    const sign = numChange >= 0 ? '+' : '';
    return `${sign}${numChange.toFixed(2)}%`;
}

// ==================== 中概股专用渲染函数 ====================

/**
 * 渲染中概股股票项目
 */
function renderChineseStockItem(stock, index) {
    const changeClass = parseFloat(stock.change_percent) >= 0 ? 'positive' : 'negative';
    
    return `
        <div class="stock-item" data-symbol="${stock.symbol}">
            <div class="stock-rank">${index + 1}</div>
            <div class="stock-info">
                <div class="stock-name-row">
                    <span class="stock-name">${stock.name || stock.symbol}</span>
                    <span class="stock-symbol">${stock.symbol}</span>
                </div>
                <div class="stock-details">
                    <span class="stock-price">${formatChineseStockPrice(stock.current_price)}</span>
                    <span class="stock-change ${changeClass}">
                        ${formatPercentageChange(stock.change_percent)}
                    </span>
                </div>
                <div class="stock-meta">
                    <span class="market-cap">市值: ${formatChineseStockMarketCap(stock.market_cap)}</span>
                    <span class="volume">成交量: ${formatChineseStockVolume(stock.volume)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染中概股榜单预览（用于概览页面）
 */
function renderChineseStockListPreview(containerId, stocks, listTitle) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`中概股容器未找到: ${containerId}`);
        return;
    }

    if (!stocks || stocks.length === 0) {
        container.innerHTML = `
            <div class="list-header">
                <h3>${listTitle}</h3>
            </div>
            <div class="no-data">暂无数据</div>
        `;
        return;
    }

    // 只显示前5个股票作为预览
    const previewStocks = stocks.slice(0, 5);
    
    const stocksHtml = previewStocks.map((stock, index) => 
        renderChineseStockItem(stock, index)
    ).join('');

    container.innerHTML = `
        <div class="list-header">
            <h3>${listTitle}</h3>
            <button class="view-more-btn" onclick="navigateToChineseStockDetail('${containerId.replace('-list', '')}')">
                查看更多
            </button>
        </div>
        <div class="stocks-list">
            ${stocksHtml}
        </div>
    `;
}

/**
 * 渲染完整的中概股榜单（用于详情页面）
 */
function renderChineseStockFullList(stocks, listTitle) {
    const container = document.getElementById('ranking-list');
    if (!container) {
        console.error('中概股详情页面容器未找到: ranking-list');
        return;
    }

    if (!stocks || stocks.length === 0) {
        container.innerHTML = `
            <div class="list-header">
                <h2>${listTitle}</h2>
            </div>
            <div class="no-data">暂无数据</div>
        `;
        return;
    }

    const stocksHtml = stocks.map((stock, index) => 
        renderChineseStockItem(stock, index)
    ).join('');

    container.innerHTML = `
        <div class="list-header">
            <h2>${listTitle}</h2>
            <div class="list-meta">共 ${stocks.length} 只股票</div>
        </div>
        <div class="stocks-list">
            ${stocksHtml}
        </div>
    `;
}

// ==================== 中概股专用数据加载函数 ====================

/**
 * 加载并渲染单个中概股榜单（详情页面使用）
 */
async function loadAndRenderChineseSingleList(market, listType) {
    try {
        console.log(`加载中概股单个榜单: ${market} - ${listType}`);
        
        const response = await fetch(`/api/ranking?market=${market}&list=${listType}&limit=50`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('中概股单个榜单数据:', data);
        
        if (data.success && data.data && data.data.length > 0) {
            const listTitle = getChineseStockListTitle(listType);
            renderChineseStockFullList(data.data, listTitle);
        } else {
            renderChineseStockFullList([], getChineseStockListTitle(listType));
        }
    } catch (error) {
        console.error('加载中概股单个榜单失败:', error);
        renderChineseStockFullList([], getChineseStockListTitle(listType));
    }
}

/**
 * 加载并渲染所有中概股榜单（概览页面使用）
 */
async function loadAndRenderChineseAllLists(market) {
    try {
        console.log(`加载中概股所有榜单: ${market}`);
        
        // 中概股榜单配置
        const chineseStockLists = [
            { id: 'top_market_cap', title: '市值榜', containerId: 'top_market_cap-list' },
            { id: 'top_gainers', title: '涨幅榜', containerId: 'top_gainers-list' },
            { id: 'top_losers', title: '跌幅榜', containerId: 'top_losers-list' },
            { id: 'most_active', title: '成交量榜', containerId: 'most_active-list' },
            { id: 'top_gap_up', title: '跳空高开榜', containerId: 'top_gap_up-list' },
            { id: 'top_gap_down', title: '跳空低开榜', containerId: 'top_gap_down-list' }
        ];

        // 并行加载所有榜单
        const promises = chineseStockLists.map(async (listConfig) => {
            try {
                const response = await fetch(`/api/ranking?market=${market}&list=${listConfig.id}&limit=5`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                if (data.success && data.data) {
                    renderChineseStockListPreview(listConfig.containerId, data.data, listConfig.title);
                } else {
                    renderChineseStockListPreview(listConfig.containerId, [], listConfig.title);
                }
            } catch (error) {
                console.error(`加载中概股榜单失败 ${listConfig.id}:`, error);
                renderChineseStockListPreview(listConfig.containerId, [], listConfig.title);
            }
        });

        await Promise.all(promises);
        console.log('所有中概股榜单加载完成');
        
    } catch (error) {
        console.error('加载中概股所有榜单失败:', error);
    }
}

// ==================== 中概股专用工具函数 ====================

/**
 * 获取中概股榜单标题
 */
function getChineseStockListTitle(listType) {
    const titles = {
        'top_market_cap': '市值榜',
        'top_gainers': '涨幅榜',
        'top_losers': '跌幅榜',
        'most_active': '成交量榜',
        'top_gap_up': '跳空高开榜',
        'top_gap_down': '跳空低开榜',
        'momentum_stocks': '动量榜',
        'high_volume': '高成交量榜',
        'price_near_high': '接近高点榜',
        'price_near_low': '接近低点榜',
        'unusual_volume': '异常成交量榜',
        'top_dividend_yield': '高股息榜',
        'low_pe_ratio': '低市盈率榜',
        'high_pe_ratio': '高市盈率榜'
    };
    return titles[listType] || '未知榜单';
}

/**
 * 导航到中概股详情页面
 */
function navigateToChineseStockDetail(listType) {
    const url = `/list-detail-cn.html?list=${listType}&market=chinese_stocks`;
    window.location.href = url;
}

// ==================== 中概股专用主入口函数 ====================

/**
 * 中概股应用主函数
 */
function initChineseStocksApp() {
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    console.log('初始化中概股应用:', currentPath);
    
    // 判断是中概股的哪个页面
    if (currentPath.includes('trending-cn.html')) {
        // 中概股概览页面
        console.log('加载中概股概览页面');
        loadAndRenderChineseAllLists('chinese_stocks');
        
    } else if (currentPath.includes('list-detail-cn.html')) {
        // 中概股详情页面
        const listType = urlParams.get('list');
        const market = urlParams.get('market') || 'chinese_stocks';
        
        console.log('加载中概股详情页面:', listType, market);
        
        if (listType) {
            loadAndRenderChineseSingleList(market, listType);
            
            // 更新页面标题
            const listTitle = getChineseStockListTitle(listType);
            document.title = `${listTitle} - 中概股数据`;
            
            // 更新页面标题显示
            const titleElement = document.querySelector('.page-title');
            if (titleElement) {
                titleElement.textContent = listTitle;
            }
        } else {
            console.error('中概股详情页面缺少list参数');
        }
    }
}

// ==================== 全局函数导出 ====================

// 将导航函数暴露到全局作用域，供HTML调用
window.navigateToChineseStockDetail = navigateToChineseStockDetail;

// ==================== 应用启动 ====================

// 当DOM加载完成时启动中概股应用
document.addEventListener('DOMContentLoaded', initChineseStocksApp);

console.log('中概股独立应用系统已加载 v1.0');