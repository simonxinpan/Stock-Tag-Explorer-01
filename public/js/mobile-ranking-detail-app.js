// 文件: /public/js/mobile-ranking-detail-app.js (全新且独立)

// --- 格式化函数区 (两个独立的函数) ---
function formatSP500MarketCap(cap) {
    const num = parseFloat(cap);
    if (isNaN(num) || num === 0) return 'N/A';
    const formatted = (num / 1000000).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `$${formatted}万亿`;
}

function formatChineseStockMarketCap(cap) {
    const num = parseFloat(cap);
    if (isNaN(num) || num === 0) return 'N/A';
    const formatted = (num / 100000000).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `$${formatted}亿美元`;
}

// --- 榜单类型配置 ---
const RANKING_CONFIG = {
    top_gainers: { title: '涨幅榜', icon: '📈' },
    top_losers: { title: '跌幅榜', icon: '📉' },
    top_market_cap: { title: '市值榜', icon: '💰' },
    top_volume: { title: '成交量榜', icon: '📊' },
    top_revenue: { title: '营收榜', icon: '💵' },
    top_net_income: { title: '净利润榜', icon: '💎' },
    top_pe_ratio: { title: 'PE榜', icon: '📋' },
    top_dividend_yield: { title: '股息率榜', icon: '🎯' },
    top_52w_high: { title: '创年内新高榜', icon: '🚀' },
    top_52w_low: { title: '创年内新低榜', icon: '⬇️' },
    top_analyst_recommendations: { title: '机构关注榜', icon: '👥' },
    top_price_target: { title: '目标价榜', icon: '🎯' },
    top_insider_ownership: { title: '内部持股榜', icon: '🏢' },
    top_institutional_ownership: { title: '机构持股榜', icon: '🏛️' }
};

// --- 渲染函数 ---
function renderList(stocks, market) {
    const container = document.getElementById('ranking-list-container');
    if (!container) return;

    if (!stocks || stocks.length === 0) {
        container.innerHTML = '<p>暂无数据</p>';
        return;
    }

    let tableHTML = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>排名</th>
                    <th>股票</th>
                    <th>价格</th>
                    <th>涨跌幅</th>
                    <th>市值</th>
                </tr>
            </thead>
            <tbody>
    `;

    stocks.forEach((stock, index) => {
        const rank = index + 1;
        const symbol = stock.symbol || 'N/A';
        const name = stock.name || stock.company_name || 'N/A';
        const price = stock.current_price ? `$${parseFloat(stock.current_price).toFixed(2)}` : 'N/A';
        
        // 涨跌幅处理
        let changePercent = 'N/A';
        let changeClass = '';
        if (stock.change_percent !== null && stock.change_percent !== undefined) {
            const change = parseFloat(stock.change_percent);
            changePercent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeClass = change >= 0 ? 'positive' : 'negative';
        }

        // 市值格式化 - 关键的双币种处理
        let marketCapHTML = 'N/A';
        if (stock.market_cap) {
            marketCapHTML = (market === 'chinese_stocks') 
                ? formatChineseStockMarketCap(stock.market_cap)
                : formatSP500MarketCap(stock.market_cap);
        }

        tableHTML += `
            <tr>
                <td>${rank}</td>
                <td>
                    <div class="stock-info">
                        <strong>${symbol}</strong>
                        <small>${name}</small>
                    </div>
                </td>
                <td>${price}</td>
                <td class="${changeClass}">${changePercent}</td>
                <td>${marketCapHTML}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// --- 主入口函数 ---
async function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const market = urlParams.get('market');
    const listType = urlParams.get('type') || urlParams.get('list'); // 兼容两种参数名

    // 更新页面标题
    const titleElement = document.getElementById('list-title');
    if (titleElement && listType && RANKING_CONFIG[listType]) {
        const marketName = market === 'chinese_stocks' ? '中概股' : '标普500';
        titleElement.textContent = `${marketName} - ${RANKING_CONFIG[listType].title}`;
    }

    // 加载数据
    if (market && listType) {
        try {
            console.log(`正在加载数据: market=${market}, type=${listType}`);
            const response = await fetch(`/api/ranking?market=${market}&type=${listType}`);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            const stocks = await response.json();
            console.log(`成功获取 ${stocks.length} 条数据`);
            
            renderList(stocks, market);
        } catch (error) {
            console.error('数据加载失败:', error);
            document.getElementById('ranking-list-container').innerHTML = 
                `<p style="color: red;">加载失败: ${error.message}</p>`;
        }
    } else {
        document.getElementById('ranking-list-container').innerHTML = 
            '<p>缺少必要参数 (market 和 type)</p>';
    }
}

// --- 页面加载完成后执行 ---
document.addEventListener('DOMContentLoaded', initialize);