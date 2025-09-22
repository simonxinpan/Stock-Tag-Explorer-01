// 文件: /public/js/trending.js (最终完整版 - Overwrite)

// ====================================================================
// == 1. 格式化函数区 (两个独立的、精确的函数) ==
// ====================================================================
function formatSP500MarketCap(marketCapInMillions) {
    const numericMarketCap = parseFloat(marketCapInMillions);
    if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
    const TRILLION = 1000000;
    const BILLION = 1000;
    let value, unit;
    if (numericMarketCap >= TRILLION) {
        value = numericMarketCap / TRILLION;
        unit = '万亿';
    } else {
        value = numericMarketCap / BILLION;
        unit = '亿';
    }
    const formattedValue = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formattedValue}${unit}美元`;
}

function formatChineseStockMarketCap(marketCapInUSD) {
    const numericMarketCap = parseFloat(marketCapInUSD);
    if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
    const BILLION = 100000000;
    const marketCapInHundredMillions = numericMarketCap / BILLION;
    const formattedValue = marketCapInHundredMillions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formattedValue}亿美元`;
}

// ====================================================================
// == 2. 核心渲染与数据加载函数区 (终极健壮版) ==
// ====================================================================
function renderStockList(container, stocks, marketType, listType) {
    if (!container) {
        console.error(`❌ [RENDER ERROR] Fatal: Cannot find container element.`);
        return;
    }
    
    // --- 动态决定表头 ---
    const isMarketCapList = listType === 'top_market_cap';
    const headerHTML = `
        <tr>
            <th>#</th>
            <th>名称</th>
            <th>${isMarketCapList ? '市值' : '股价'}</th>
            <th>涨跌幅</th>
        </tr>
    `;

    // --- 健壮地循环渲染每一行 ---
    const rowsHTML = stocks.map((stock, index) => {
        const last_price = parseFloat(stock.last_price);
        const change_percent = parseFloat(stock.change_percent);
        const ticker = stock.ticker || 'N/A';
        const name = stock.name_zh || stock.name_en || '未知名称';
        const colorClass = !isNaN(change_percent) && change_percent < 0 ? 'text-red' : 'text-green';

        let valueHTML = '';
        if (isMarketCapList) {
            valueHTML = (marketType === 'chinese_stocks')
                ? formatChineseStockMarketCap(stock.market_cap)
                : formatSP500MarketCap(stock.market_cap);
        } else {
            valueHTML = !isNaN(last_price) ? `$${last_price.toFixed(2)}` : 'N/A';
        }

        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div>${name}</div>
                    <div class="ticker">${ticker}</div>
                </td>
                <td>${valueHTML}</td>
                <td class="${colorClass}">${!isNaN(change_percent) ? `${change_percent.toFixed(2)}%` : 'N/A'}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="stock-table">
            <thead>${headerHTML}</thead>
            <tbody>${rowsHTML}</tbody>
        </table>
    `;
    console.log(`✅ [RENDER SUCCESS] Successfully rendered ${stocks.length} stocks.`);
}

async function loadAndRenderSingleList(market, listType) {
    const container = document.getElementById('ranking-list-container');
    if (!container) {
        console.error("❌ 渲染失败: 未在HTML中找到ID为'ranking-list-container'的元素。");
        return;
    }
    try {
        container.innerHTML = '<div>正在加载...</div>';
        const response = await fetch(`/api/ranking?market=${market}&type=${listType}`);
        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
        const stocks = await response.json();
        renderStockList(container, stocks, market, listType);
    } catch (error) {
        if (container) container.innerHTML = `<div class="error-message">加载失败: ${error.message}</div>`;
    }
}

async function loadAndRenderAllLists(market) {
    const rankingTypes = ['top_market_cap', 'top_gainers', 'top_losers', 'top_turnover', 'new_highs', 'new_lows', 'top_volatility', 'top_gap_up', 'institutional_focus', 'retail_hot', 'smart_money', 'high_liquidity', 'unusual_activity', 'momentum_stocks'];
    rankingTypes.forEach(async (type) => {
        const container = document.getElementById(`${type}-list`);
        if (!container) return;
        try {
            const response = await fetch(`/api/ranking?market=${market}&type=${type}&limit=5`);
            const stocks = await response.json();
            renderStockList(container, stocks, market, type); 
        } catch (error) {
            // silent fail for preview lists
        }
    });
}

// ====================================================================
// == 3. 主程序入口 (最终版) ==
// ====================================================================
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageName = window.location.pathname.split('/').pop();
    const market = urlParams.get('market') || 'sp500';
    const listType = urlParams.get('list');

    if (pageName.includes('list-detail.html')) {
        if (listType) {
            loadAndRenderSingleList(market, listType);
        } else {
            const container = document.getElementById('ranking-list-container');
            if (container) container.textContent = "错误：未指定榜单类型。";
        }
    } else if (pageName.includes('trending.html')) {
        loadAndRenderAllLists(market);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);