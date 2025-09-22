// 文件: /public/js/mobile-detail-app.js (全新且独立)

// --- 格式化函数区 (两个独立的函数，自给自足) ---
function formatSP500MarketCap(cap) {
    const num = parseFloat(cap);
    if(isNaN(num) || num === 0) return 'N/A';
    const formatted = (num / 1000000).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
    return `$${formatted}万亿`;
}

function formatChineseStockMarketCap(cap) {
    const num = parseFloat(cap);
    if(isNaN(num) || num === 0) return 'N/A';
    const formatted = (num / 100000000).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
    return `$${formatted}亿美元`;
}

// --- 渲染函数 ---
function renderList(stocks, market) {
    const container = document.getElementById('ranking-list-container');
    if (!container) return;
    
    let listHTML = '<ul>'; // 使用UL/LI结构
    stocks.forEach((stock, index) => {
        let marketCapHTML = (market === 'chinese_stocks')
            ? formatChineseStockMarketCap(stock.market_cap)
            : formatSP500MarketCap(stock.market_cap);
        
        const changePercent = parseFloat(stock.change_percent);
        const colorClass = !isNaN(changePercent) && changePercent < 0 ? 'text-red' : 'text-green';

        listHTML += `
            <li class="stock-item">
                <a href="https://stock-details-final.vercel.app/mobile.html?symbol=${stock.ticker}">
                    <div class="info">
                        <span class="rank">${index + 1}</span>
                        <span class="name">${stock.name_zh || stock.name_en}</span>
                        <span class="ticker">${stock.ticker}</span>
                    </div>
                    <div class="values">
                        <span class="market-cap">${marketCapHTML}</span>
                        <span class="change ${colorClass}">${changePercent.toFixed(2)}%</span>
                    </div>
                </a>
            </li>
        `;
    });
    listHTML += '</ul>';
    container.innerHTML = listHTML;
}

// --- 主入口 ---
async function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const market = urlParams.get('market');
    const listType = urlParams.get('type') || urlParams.get('list');
    const titleElement = document.getElementById('list-title');
    
    // 根据 listType 更新页面标题
    const titleMap = {
        'top_market_cap': '市值榜',
        'top_gainers': '涨幅榜',
        'top_losers': '跌幅榜',
        'most_active': '成交量榜',
        'institutional_focus': '机构关注榜',
        'high_dividend_yield': '高股息榜',
        'low_pe_ratio': '低市盈率榜'
    };
    
    if (titleElement && titleMap[listType]) {
        const marketName = market === 'chinese_stocks' ? '中概股' : '标普500';
        titleElement.textContent = `${marketName} - ${titleMap[listType]}`;
    }

    if (market && listType) {
        try {
            const response = await fetch(`/api/ranking?market=${market}&type=${listType}`);
            if (!response.ok) throw new Error('API request failed');
            const stocks = await response.json();
            renderList(stocks, market);
        } catch (error) {
            const container = document.getElementById('ranking-list-container');
            if (container) container.textContent = `加载失败: ${error.message}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', initialize);