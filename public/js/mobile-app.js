// 文件: public/js/mobile-app.js
// 版本: SPA Interaction Model

document.addEventListener('DOMContentLoaded', () => {
    // 页面加载时的总入口
    initializeApp();
    
    // 监听浏览器的前进/后退事件，以便在用户点击浏览器按钮时也能刷新
    window.addEventListener('popstate', initializeApp);
});

// 统一的初始化/刷新函数
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const market = urlParams.get('market') || 'chinese_stocks'; // 默认市场为中概股

    console.log(`🚀 Initializing page for market: ${market}`);

    // 更新UI状态（例如按钮高亮）
    updateActiveMarketButtons(market);
    
    // 绑定所有事件监听器（如果尚未绑定）
    bindEventListeners();
    
    // 加载并渲染所有榜单数据
    loadAllRankings(market);
}

// 统一的数据加载和渲染函数
async function loadAllRankings(market) {
    const rankingTypes = [ // 定义所有需要加载的榜单类型
        'top_gainers', 'top_market_cap', 'new_highs',
        'top_volume', 'top_turnover', 'gap_up', 
        'top_losers', 'new_lows', 'institutional_focus',
        'retail_hot', 'smart_money', 'high_liquidity',
        'unusual_activity', 'momentum_stocks'
    ];
    
    showLoadingSpinners(); // 显示所有榜单的加载动画

    try {
        // 使用 Promise.all 并行获取所有榜单的数据
        const promises = rankingTypes.map(type =>
            fetch(`/api/ranking?type=${type}&market=${market}`).then(res => res.json())
        );
        const results = await Promise.all(promises);

        // 数据全部返回后，逐一渲染
        rankingTypes.forEach((type, index) => {
            const data = results[index];
            const listElement = document.querySelector(`[data-ranking="${type}"] .stock-list-preview`);
            if (listElement && data && Array.isArray(data)) {
                renderIndividualStockList(listElement, data, market);
            }
        });

    } catch (error) {
        console.error(`❌ Failed to load rankings for ${market}:`, error);
        // 显示统一的错误信息
        showErrorMessage('数据加载失败，请稍后重试');
    } finally {
        hideLoadingSpinners(); // 隐藏所有加载动画
    }
}

// 统一的事件绑定函数（确保只绑定一次）
let hasBoundEvents = false;
function bindEventListeners() {
    if (hasBoundEvents) return; // 防止重复绑定

    // --- 关键修正：所有市场切换按钮都只更新URL并重新初始化 ---
    document.querySelectorAll('[data-market-target]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetMarket = button.dataset.marketTarget;
            
            // 构造新的URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('market', targetMarket);
            
            // 使用 History API 来改变URL而不刷新整个页面
            window.history.pushState({ market: targetMarket }, '', newUrl);
            
            // 手动调用初始化函数，以使用新的URL参数重新加载数据
            initializeApp();
        });
    });
    
    hasBoundEvents = true;
}

// 辅助函数：更新按钮的激活状态
function updateActiveMarketButtons(activeMarket) {
    document.querySelectorAll('[data-market-target]').forEach(button => {
        if (button.dataset.marketTarget === activeMarket) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// 显示加载动画
function showLoadingSpinners() {
    document.querySelectorAll('.stock-list-preview').forEach(list => {
        list.innerHTML = '<div class="loading-spinner">加载中...</div>';
    });
}

// 隐藏加载动画
function hideLoadingSpinners() {
    document.querySelectorAll('.loading-spinner').forEach(spinner => {
        spinner.remove();
    });
}

// 显示错误信息
function showErrorMessage(message) {
    document.querySelectorAll('.stock-list-preview').forEach(list => {
        list.innerHTML = `<div class="error-message">${message}</div>`;
    });
}

// 渲染单个榜单列表
function renderIndividualStockList(element, stocks, marketType) {
    if (!element || !stocks || stocks.length === 0) {
        element.innerHTML = '<div class="no-data">暂无数据</div>';
        return;
    }

    const stocksHtml = stocks.slice(0, 5).map((stock, index) => {
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = stock.change >= 0 ? '+' : '';
        
        return `
            <div class="stock-item">
                <div class="stock-rank">${index + 1}</div>
                <div class="stock-info">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name}</div>
                </div>
                <div class="stock-metrics">
                    <div class="stock-price">$${stock.price.toFixed(2)}</div>
                    <div class="stock-change ${changeClass}">
                        ${changeSymbol}${stock.change.toFixed(2)} (${changeSymbol}${stock.change_percent.toFixed(2)}%)
                    </div>
                </div>
            </div>
        `;
    }).join('');

    element.innerHTML = stocksHtml;
}

// 导航到移动版榜单详情页面
function navigateToRankingDetail(listType) {
    const urlParams = new URLSearchParams(window.location.search);
    const currentMarket = urlParams.get('market') || 'chinese_stocks';
    
    // 构造移动版详情页面URL
    const marketPrefix = currentMarket === 'sp500' ? 'sp500' : 'chinese-stocks';
    const detailUrl = `/mobile-${marketPrefix}-${listType.replace(/_/g, '-')}.html`;
    window.location.href = detailUrl;
}