/**
 * 移动版首页专用应用 (mobile-home-app.js)
 * 
 * 这是一个完全独立的、自包含的JavaScript文件，专门为移动版首页 (mobile.html) 设计
 * 与桌面版的 trending.js 完全隔离，实现零冲突的物理文件分离架构
 * 
 * 功能包括：
 * - 支持标普500和中概股两个市场的数据加载和显示
 * - 完整的榜单预览渲染逻辑
 * - 正确的页面跳转和导航功能
 * - 生产环境硬编码链接支持
 */

// ==================== 全局配置 ====================
const CONFIG = {
    // API端点配置
    API_BASE: '/api',
    
    // 榜单类型配置 (与HTML中的data-ranking属性保持一致)
    RANKING_TYPES: [
        'top_market_cap',
        'top_gainers', 
        'top_losers',
        'top_turnover',
        'top_gap_up',
        'momentum_stocks',
        'new_highs',
        'new_lows',
        'high_liquidity',
        'top_volatility',
        'unusual_activity',
        'smart_money',
        'institutional_focus',
        'retail_hot'
    ],
    
    // 市场配置
    MARKETS: {
        SP500: 'sp500',
        CHINESE_STOCKS: 'chinese_stocks'
    },
    
    // 预览显示数量
    PREVIEW_LIMIT: 5,
    
    // 生产环境硬编码链接映射
    PRODUCTION_URLS: {
        'chinese_stocks': {
            'top_market_cap': 'https://stockinsight.ai/mobile-chinese-stocks-top-market-cap.html',
            'top_gainers': 'https://stockinsight.ai/mobile-chinese-stocks-top-gainers.html',
            'top_losers': 'https://stockinsight.ai/mobile-chinese-stocks-top-losers.html',
            'top_turnover': 'https://stockinsight.ai/mobile-chinese-stocks-top-turnover.html',
            'top_gap_up': 'https://stockinsight.ai/mobile-chinese-stocks-top-gap-up.html',
            'momentum_stocks': 'https://stockinsight.ai/mobile-chinese-stocks-momentum-stocks.html',
            'new_highs': 'https://stockinsight.ai/mobile-chinese-stocks-new-highs.html',
            'new_lows': 'https://stockinsight.ai/mobile-chinese-stocks-new-lows.html',
            'high_liquidity': 'https://stockinsight.ai/mobile-chinese-stocks-high-liquidity.html',
            'top_volatility': 'https://stockinsight.ai/mobile-chinese-stocks-top-volatility.html',
            'unusual_activity': 'https://stockinsight.ai/mobile-chinese-stocks-unusual-activity.html',
            'smart_money': 'https://stockinsight.ai/mobile-chinese-stocks-smart-money.html',
            'institutional_focus': 'https://stockinsight.ai/mobile-chinese-stocks-institutional-focus.html',
            'retail_hot': 'https://stockinsight.ai/mobile-chinese-stocks-retail-hot.html'
        },
        'sp500': {
            'top_market_cap': 'https://stockinsight.ai/mobile-sp500-top-market-cap.html',
            'top_gainers': 'https://stockinsight.ai/mobile-sp500-top-gainers.html',
            'top_losers': 'https://stockinsight.ai/mobile-sp500-top-losers.html',
            'top_turnover': 'https://stockinsight.ai/mobile-sp500-top-turnover.html',
            'top_gap_up': 'https://stockinsight.ai/mobile-sp500-top-gap-up.html',
            'momentum_stocks': 'https://stockinsight.ai/mobile-sp500-momentum-stocks.html',
            'new_highs': 'https://stockinsight.ai/mobile-sp500-new-highs.html',
            'new_lows': 'https://stockinsight.ai/mobile-sp500-new-lows.html',
            'high_liquidity': 'https://stockinsight.ai/mobile-sp500-high-liquidity.html',
            'top_volatility': 'https://stockinsight.ai/mobile-sp500-top-volatility.html',
            'unusual_activity': 'https://stockinsight.ai/mobile-sp500-unusual-activity.html',
            'smart_money': 'https://stockinsight.ai/mobile-sp500-smart-money.html',
            'institutional_focus': 'https://stockinsight.ai/mobile-sp500-institutional-focus.html',
            'retail_hot': 'https://stockinsight.ai/mobile-sp500-retail-hot.html'
        }
    }
};

// ==================== 工具函数 ====================

/**
 * 格式化标普500市值
 */
function formatSP500MarketCap(cap) {
    if (!cap || cap === 0) return 'N/A';
    
    const numCap = parseFloat(cap);
    if (isNaN(numCap)) return 'N/A';
    
    if (numCap >= 1e12) {
        return `$${(numCap / 1e12).toFixed(2)}T`;
    } else if (numCap >= 1e9) {
        return `$${(numCap / 1e9).toFixed(2)}B`;
    } else if (numCap >= 1e6) {
        return `$${(numCap / 1e6).toFixed(2)}M`;
    } else {
        return `$${numCap.toFixed(2)}`;
    }
}

/**
 * 格式化中概股市值
 */
function formatChineseStockMarketCap(cap) {
    if (!cap || cap === 0) return 'N/A';
    
    const numCap = parseFloat(cap);
    if (isNaN(numCap)) return 'N/A';
    
    if (numCap >= 1e12) {
        return `${(numCap / 1e12).toFixed(2)}万亿`;
    } else if (numCap >= 1e8) {
        return `${(numCap / 1e8).toFixed(2)}亿`;
    } else if (numCap >= 1e4) {
        return `${(numCap / 1e4).toFixed(2)}万`;
    } else {
        return `${numCap.toFixed(2)}`;
    }
}

/**
 * 格式化百分比变化
 */
function formatPercentageChange(change) {
    if (!change && change !== 0) return 'N/A';
    
    const numChange = parseFloat(change);
    if (isNaN(numChange)) return 'N/A';
    
    const sign = numChange >= 0 ? '+' : '';
    return `${sign}${numChange.toFixed(2)}%`;
}

/**
 * 获取当前市场
 */
function getCurrentMarket() {
    // 1. 优先从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);
    const marketParam = urlParams.get('market');
    if (marketParam) {
        console.log('从URL参数获取市场:', marketParam);
        return marketParam;
    }
    
    // 2. 从激活的市场按钮获取
    const activeMarketButton = document.querySelector('.market-nav-button.active');
    if (activeMarketButton) {
        const market = activeMarketButton.getAttribute('data-market-target');
        if (market) {
            console.log('从激活按钮获取市场:', market);
            return market;
        }
    }
    
    // 3. 检查页面上的激活状态
    const sp500Active = document.querySelector('.sp500-section.active, .sp500-content.active');
    const chineseActive = document.querySelector('.chinese-stocks-section.active, .chinese-content.active');
    
    if (sp500Active) {
        console.log('检测到标普500激活状态');
        return CONFIG.MARKETS.SP500;
    }
    
    if (chineseActive) {
        console.log('检测到中概股激活状态');
        return CONFIG.MARKETS.CHINESE_STOCKS;
    }
    
    // 4. 默认为标普500
    console.log('使用默认市场: sp500');
    return CONFIG.MARKETS.SP500;
}

/**
 * 检测是否为生产环境
 */
function isProductionEnvironment() {
    return window.location.hostname === 'stockinsight.ai' || 
           window.location.hostname === 'www.stockinsight.ai';
}

/**
 * 显示错误消息
 */
function showErrorMessage(container, message) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message" style="
            padding: 10px;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            margin: 10px 0;
            text-align: center;
        ">
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        </div>
    `;
}

/**
 * 显示加载状态
 */
function showLoadingState(container) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state" style="
            padding: 20px;
            text-align: center;
            color: #6c757d;
        ">
            <i class="fas fa-spinner fa-spin"></i>
            <span style="margin-left: 8px;">加载中...</span>
        </div>
    `;
}

// ==================== 渲染函数 ====================

/**
 * 渲染个股列表预览
 */
function renderPreviewList(container, stocks, market) {
    if (!container) {
        console.error('容器不存在');
        return;
    }
    
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
        showErrorMessage(container, '暂无数据');
        return;
    }
    
    const stocksHtml = stocks.slice(0, CONFIG.PREVIEW_LIMIT).map((stock, index) => {
        // 格式化市值
        let marketCapFormatted = 'N/A';
        if (stock.market_cap) {
            marketCapFormatted = market === CONFIG.MARKETS.CHINESE_STOCKS 
                ? formatChineseStockMarketCap(stock.market_cap)
                : formatSP500MarketCap(stock.market_cap);
        }
        
        // 格式化涨跌幅
        const changeFormatted = formatPercentageChange(stock.change_percent);
        const changeClass = stock.change_percent >= 0 ? 'positive' : 'negative';
        
        return `
            <div class="stock-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #eee;
            ">
                <div class="stock-info" style="flex: 1;">
                    <div class="stock-symbol" style="
                        font-weight: bold;
                        font-size: 16px;
                        color: #333;
                        margin-bottom: 4px;
                    ">${stock.symbol || 'N/A'}</div>
                    <div class="stock-name" style="
                        font-size: 12px;
                        color: #666;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        max-width: 150px;
                    ">${stock.name || 'N/A'}</div>
                </div>
                <div class="stock-metrics" style="
                    text-align: right;
                    min-width: 80px;
                ">
                    <div class="stock-change ${changeClass}" style="
                        font-weight: bold;
                        font-size: 14px;
                        margin-bottom: 4px;
                        color: ${stock.change_percent >= 0 ? '#28a745' : '#dc3545'};
                    ">${changeFormatted}</div>
                    <div class="stock-market-cap" style="
                        font-size: 12px;
                        color: #666;
                    ">${marketCapFormatted}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="preview-list" style="
            background: white;
            border-radius: 8px;
            padding: 16px;
            margin: 10px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
            ${stocksHtml}
        </div>
    `;
}

// ==================== 数据加载函数 ====================

/**
 * 加载单个榜单的预览数据
 */
async function loadRankingPreview(market, rankingType) {
    const container = document.getElementById(`${rankingType}-mobile-list`);
    if (!container) {
        console.warn(`容器不存在: ${rankingType}-mobile-list`);
        return;
    }
    
    showLoadingState(container);
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/ranking?market=${market}&type=${rankingType}&limit=${CONFIG.PREVIEW_LIMIT}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const stocks = await response.json();
        renderPreviewList(container, stocks, market);
        
        console.log(`✅ 成功加载 ${market} - ${rankingType} 预览数据:`, stocks.length, '条');
        
    } catch (error) {
        console.error(`❌ 加载 ${market} - ${rankingType} 预览数据失败:`, error);
        showErrorMessage(container, `加载失败: ${error.message}`);
    }
}

/**
 * 加载所有榜单的预览数据
 */
async function loadAllPreviews(market) {
    console.log(`🔄 开始加载所有榜单预览数据 - 市场: ${market}`);
    
    // 并发加载所有榜单数据
    const loadPromises = CONFIG.RANKING_TYPES.map(rankingType => 
        loadRankingPreview(market, rankingType)
    );
    
    try {
        await Promise.allSettled(loadPromises);
        console.log(`✅ 所有榜单预览数据加载完成 - 市场: ${market}`);
    } catch (error) {
        console.error(`❌ 加载榜单预览数据时发生错误:`, error);
    }
}

// ==================== 导航和跳转函数 ====================

/**
 * 导航到榜单详情页
 */
function navigateToRankingDetail(listType) {
    const currentMarket = getCurrentMarket();
    
    console.log(`🔗 导航到榜单详情页:`, {
        market: currentMarket,
        list: listType
    });
    
    // 检查是否为生产环境，如果是则使用硬编码链接
    if (isProductionEnvironment()) {
        const productionUrl = CONFIG.PRODUCTION_URLS[currentMarket]?.[listType];
        if (productionUrl) {
            console.log(`🌐 使用生产环境链接:`, productionUrl);
            window.location.href = productionUrl;
            return;
        }
    }
    
    // 开发环境或没有硬编码链接时，使用相对路径
    const url = `/mobile-ranking-detail.html?market=${currentMarket}&list=${listType}`;
    console.log(`🔗 跳转到:`, url);
    window.location.href = url;
}

/**
 * 处理"查看更多"按钮点击
 */
function handleMoreButtonClick(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const listType = button.getAttribute('data-ranking') || button.getAttribute('data-list-type');
    
    if (!listType) {
        console.error('❌ 无法获取榜单类型');
        return;
    }
    
    navigateToRankingDetail(listType);
}

/**
 * 处理顶部导航按钮点击
 */
function handleTopNavClick(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const listType = button.getAttribute('data-ranking') || button.getAttribute('data-list-type');
    
    if (!listType) {
        console.error('❌ 无法获取榜单类型');
        return;
    }
    
    navigateToRankingDetail(listType);
}

// ==================== 事件绑定函数 ====================

/**
 * 绑定所有事件监听器
 */
function bindEventListeners() {
    console.log('🔗 开始绑定事件监听器');
    
    // 绑定"查看更多"按钮
    const moreButtons = document.querySelectorAll('[data-ranking], [data-list-type]');
    moreButtons.forEach(button => {
        button.addEventListener('click', handleMoreButtonClick);
    });
    
    // 绑定顶部导航按钮
    const topNavButtons = document.querySelectorAll('.top-nav-button, .nav-button');
    topNavButtons.forEach(button => {
        button.addEventListener('click', handleTopNavClick);
    });
    
    // 绑定市场切换按钮
    const marketButtons = document.querySelectorAll('.market-nav-button');
    marketButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            
            const targetMarket = button.getAttribute('data-market-target');
            if (targetMarket) {
                // 更新URL参数
                const url = new URL(window.location);
                url.searchParams.set('market', targetMarket);
                window.history.pushState({}, '', url);
                
                // 重新加载数据
                loadAllPreviews(targetMarket);
                
                // 更新按钮状态
                updateActiveMarketButtons(targetMarket);
            }
        });
    });
    
    console.log(`✅ 事件监听器绑定完成 - 共绑定 ${moreButtons.length + topNavButtons.length + marketButtons.length} 个元素`);
}

/**
 * 更新激活的市场按钮状态
 */
function updateActiveMarketButtons(activeMarket) {
    const marketButtons = document.querySelectorAll('.market-nav-button');
    marketButtons.forEach(button => {
        const targetMarket = button.getAttribute('data-market-target');
        if (targetMarket === activeMarket) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // 更新内容区域的显示状态
    const contentSections = document.querySelectorAll('.market-content');
    contentSections.forEach(section => {
        const sectionMarket = section.getAttribute('data-market');
        if (sectionMarket === activeMarket) {
            section.classList.add('active');
            section.style.display = 'block';
        } else {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });
}

// ==================== 初始化函数 ====================

/**
 * 初始化移动版首页应用
 */
function initialize() {
    console.log('🚀 移动版首页应用开始初始化');
    
    // 获取当前市场
    const currentMarket = getCurrentMarket();
    console.log('📱 当前市场:', currentMarket);
    
    // 更新市场按钮状态
    updateActiveMarketButtons(currentMarket);
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载所有榜单预览数据
    loadAllPreviews(currentMarket);
    
    console.log('✅ 移动版首页应用初始化完成');
}

// ==================== 应用入口 ====================

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initialize);

// 导出函数供全局使用（如果需要）
window.MobileHomeApp = {
    initialize,
    getCurrentMarket,
    navigateToRankingDetail,
    loadAllPreviews,
    CONFIG
};

console.log('📱 移动版首页应用脚本已加载 (mobile-home-app.js)');