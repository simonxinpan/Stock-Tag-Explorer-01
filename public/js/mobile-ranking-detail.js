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
    const titleElement = document.querySelector('.page-title');
    if (titleElement) {
        titleElement.textContent = rankingInfo.title;
    }
    
    // 设置市场切换按钮状态
    updateMarketButtons(market);
    
    // 加载榜单数据
    loadRankingData(type, market);
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

// 加载榜单数据
async function loadRankingData(type, market) {
    showLoading();
    
    try {
        const response = await fetch(`/api/trending?type=${type}&market=${market}`);
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
    const positiveStocks = stocks.filter(stock => stock.change_percent > 0).length;
    const negativeStocks = stocks.filter(stock => stock.change_percent < 0).length;
    const avgChange = stocks.reduce((sum, stock) => sum + stock.change_percent, 0) / totalStocks;
    
    statsCard.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <div class="stat-label">股票总数</div>
                    <div class="stat-value">${totalStocks}</div>
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-icon positive">📈</div>
                <div class="stat-content">
                    <div class="stat-label">上涨股票</div>
                    <div class="stat-value positive">${positiveStocks}</div>
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-icon negative">📉</div>
                <div class="stat-content">
                    <div class="stat-label">下跌股票</div>
                    <div class="stat-value negative">${negativeStocks}</div>
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-icon ${avgChange >= 0 ? 'positive' : 'negative'}">📊</div>
                <div class="stat-content">
                    <div class="stat-label">平均涨跌幅</div>
                    <div class="stat-value ${avgChange >= 0 ? 'positive' : 'negative'}">${avgChange.toFixed(2)}%</div>
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