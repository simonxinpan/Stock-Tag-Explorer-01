// 榜单详情页面JavaScript逻辑
// 基于trending.js，适配详情页面展示完整榜单数据

// 榜单类型映射
const RANKING_TYPES = {
    'top_gainers': { title: '涨幅榜', icon: '📈' },
    'top_losers': { title: '跌幅榜', icon: '📉' },
    'top_market_cap': { title: '市值榜', icon: '💰' },
    'top_turnover': { title: '成交额榜', icon: '💹' },
    'top_volatility': { title: '波动榜', icon: '⚡' },
    'new_highs': { title: '新高榜', icon: '🚀' },
    'new_lows': { title: '新低榜', icon: '📊' },
    'top_gap_up': { title: '跳空高开榜', icon: '⬆️' },
    'institutional_focus': { title: '机构关注榜', icon: '🏛️' },
    'retail_hot': { title: '散户热门榜', icon: '🔥' },
    'smart_money': { title: '聪明钱榜', icon: '🧠' },
    'high_liquidity': { title: '高流动性榜', icon: '💧' },
    'unusual_activity': { title: '异动榜', icon: '⚠️' },
    'momentum_stocks': { title: '动量榜', icon: '🎯' }
};

// 获取URL参数
function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        type: urlParams.get('type') || 'top_gainers',
        market: urlParams.get('market') || 'sp500'
    };
}

// 初始化页面
function initializePage() {
    const { type, market } = getUrlParams();
    const rankingInfo = RANKING_TYPES[type];
    
    if (!rankingInfo) {
        showError('未知的榜单类型');
        return;
    }
    
    // 设置页面标题
    updatePageTitle(type);
    
    // 设置市场切换按钮状态
    updateMarketButtons(market);
    
    // 设置榜单导航按钮状态
    updateRankingNavButtons(type);
    
    // 加载榜单数据
    loadRankingData(type, market);
}

// 更新页面标题
function updatePageTitle(type) {
    const rankingInfo = RANKING_TYPES[type];
    if (!rankingInfo) return;
    
    const titleElement = document.getElementById('ranking-title');
    const subtitleElement = document.getElementById('ranking-subtitle');
    
    if (titleElement) {
        titleElement.textContent = `${rankingInfo.icon} ${rankingInfo.title}`;
    }
    
    if (subtitleElement) {
        // 根据榜单类型设置不同的描述
        const descriptions = {
            'top_gainers': '按当日涨跌幅排序，反映市场热点和资金偏好',
            'top_losers': '按当日跌幅排序，识别市场调整和风险信号',
            'top_market_cap': '按市值排序，展示市场巨头和蓝筹股',
            'new_highs': '创年内新高的股票，反映强势上涨趋势',
            'new_lows': '创年内新低的股票，需关注基本面变化',
            'top_turnover': '按成交额排序，反映资金活跃度',
            'top_volatility': '按波动率排序，适合短线交易机会',
            'top_gap_up': '跳空高开的股票，可能有重大利好消息',
            'institutional_focus': '机构重点关注的股票，具有投资价值',
            'retail_hot': '散户热门股票，反映市场情绪',
            'smart_money': '聪明钱关注的股票，跟随主力资金',
            'high_liquidity': '高流动性股票，适合大额交易',
            'unusual_activity': '交易异动股票，需及时关注',
            'momentum_stocks': '动量强劲股票，适合趋势跟踪'
        };
        subtitleElement.textContent = descriptions[type] || '榜单数据实时更新';
    }
}

// 更新市场切换按钮状态
function updateMarketButtons(currentMarket) {
    const marketButtons = document.querySelectorAll('.market-btn');
    marketButtons.forEach(btn => {
        const btnMarket = btn.getAttribute('data-market');
        if (btnMarket === currentMarket) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 更新榜单导航按钮状态
function updateRankingNavButtons(currentType) {
    const navButtons = document.querySelectorAll('.ranking-nav-btn');
    navButtons.forEach(btn => {
        const type = btn.dataset.type;
        if (type === currentType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 加载榜单数据
async function loadRankingData(type, market) {
    showLoading();
    
    try {
        const response = await fetch(`/api/ranking?type=${type}&market=${market}`);
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        let data = await response.json();
        
        // 检查错误响应
        if (data.error) {
            throw new Error(data.message || data.error);
        }
        
        // 处理数据格式
        let stocksArray = data;
        if (data.success && Array.isArray(data.data)) {
            stocksArray = data.data;
        } else if (!Array.isArray(data)) {
            throw new Error('数据格式错误');
        }
        
        // 数据类型转换
        const stocks = stocksArray.map(stock => ({
            ...stock,
            ticker: stock.ticker || stock.symbol || 'N/A',
            last_price: Number(stock.last_price) || 0,
            change_percent: Number(stock.change_percent) || 0,
            market_cap: Number(stock.market_cap) || 0,
            volume: Number(stock.volume) || 0
        }));
        
        if (stocks.length === 0) {
            showEmptyState();
        } else {
            renderRankingData(stocks, type, market);
        }
        
    } catch (error) {
        console.error('加载榜单数据失败:', error);
        showError(error.message);
    }
}

// 渲染榜单数据
function renderRankingData(stocks, type, market) {
    hideLoading();
    hideError();
    
    // 渲染统计信息
    renderStatsCard(stocks);
    
    // 渲染股票列表
    renderStockList(stocks, type, market);
}

// 渲染统计卡片
function renderStatsCard(stocks) {
    const statsCard = document.querySelector('.ranking-stats-card');
    if (!statsCard) return;
    
    const totalStocks = stocks.length;
    
    statsCard.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <div class="stat-label">股票总数</div>
                    <div class="stat-value">${totalStocks}</div>
                </div>
            </div>
        </div>
    `;
}

// 渲染股票列表
function renderStockList(stocks, type, market) {
    const stockList = document.querySelector('.stock-list');
    if (!stockList) return;
    
    const stockItems = stocks.map((stock, index) => {
        const changeClass = stock.change_percent > 0 ? 'positive' : 
                           stock.change_percent < 0 ? 'negative' : 'neutral';
        const changeSign = stock.change_percent > 0 ? '+' : '';
        
        return `
            <div class="stock-item">
                <div class="stock-rank">${index + 1}</div>
                <div class="stock-info">
                    <div class="stock-name">${stock.name || stock.ticker}</div>
                    <div class="stock-symbol">${stock.ticker}</div>
                </div>
                <div class="stock-price-section">
                    <div class="stock-price">$${stock.last_price.toFixed(2)}</div>
                    <div class="stock-change ${changeClass}">
                        ${changeSign}${stock.change_percent.toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    stockList.innerHTML = stockItems;
}

// 显示加载状态
function showLoading() {
    const loadingState = document.querySelector('.loading-state');
    const errorState = document.querySelector('.error-state');
    const statsCard = document.querySelector('.ranking-stats-card');
    const stockList = document.querySelector('.stock-list');
    
    if (loadingState) loadingState.style.display = 'flex';
    if (errorState) errorState.style.display = 'none';
    if (statsCard) statsCard.style.display = 'none';
    if (stockList) stockList.style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    const loadingState = document.querySelector('.loading-state');
    const statsCard = document.querySelector('.ranking-stats-card');
    const stockList = document.querySelector('.stock-list');
    
    if (loadingState) loadingState.style.display = 'none';
    if (statsCard) statsCard.style.display = 'block';
    if (stockList) stockList.style.display = 'block';
}

// 显示错误状态
function showError(message) {
    const errorState = document.querySelector('.error-state');
    const loadingState = document.querySelector('.loading-state');
    const statsCard = document.querySelector('.ranking-stats-card');
    const stockList = document.querySelector('.stock-list');
    
    if (errorState) {
        errorState.style.display = 'flex';
        const errorMessage = errorState.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }
    
    if (loadingState) loadingState.style.display = 'none';
    if (statsCard) statsCard.style.display = 'none';
    if (stockList) stockList.style.display = 'none';
}

// 隐藏错误状态
function hideError() {
    const errorState = document.querySelector('.error-state');
    if (errorState) errorState.style.display = 'none';
}

// 显示空状态
function showEmptyState() {
    const statsCard = document.querySelector('.ranking-stats-card');
    const stockList = document.querySelector('.stock-list');
    
    hideLoading();
    hideError();
    
    if (statsCard) {
        statsCard.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                <div>暂无数据</div>
            </div>
        `;
    }
    
    if (stockList) stockList.style.display = 'none';
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 初始化页面
    initializePage();
    
    // 返回按钮事件
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const { market } = getUrlParams();
            window.location.href = `mobile.html?market=${market}`;
        });
    }
    
    // 市场切换按钮事件
    const marketButtons = document.querySelectorAll('.market-btn');
    marketButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newMarket = btn.getAttribute('data-market');
            const { type } = getUrlParams();
            
            // 更新URL并重新加载数据
            const newUrl = `${window.location.pathname}?type=${type}&market=${newMarket}`;
            window.history.pushState({}, '', newUrl);
            
            // 更新按钮状态并重新加载数据
            updateMarketButtons(newMarket);
            loadRankingData(type, newMarket);
        });
    });
    
    // 榜单导航按钮事件
    const rankingNavButtons = document.querySelectorAll('.ranking-nav-btn');
    rankingNavButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newType = btn.getAttribute('data-type');
            const { market } = getUrlParams();
            
            // 更新URL并重新加载数据
            const newUrl = `${window.location.pathname}?type=${newType}&market=${market}`;
            window.history.pushState({}, '', newUrl);
            
            // 更新页面标题和按钮状态
            updatePageTitle(newType);
            updateRankingNavButtons(newType);
            
            // 重新加载数据
            loadRankingData(newType, market);
        });
    });
    
    // 重试按钮事件
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('retry-btn')) {
            const { type, market } = getUrlParams();
            loadRankingData(type, market);
        }
    });
});

// 导出函数供其他模块使用
window.RankingDetail = {
    getUrlParams,
    loadRankingData,
    RANKING_TYPES
};