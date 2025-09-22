// 文件: /public/js/trending.js (最终完整版 - Overwrite)

// ====================================================================
// == 1. 格式化函数区 (两个独立的、精确的函数) ==
// ====================================================================
function formatSP500MarketCap(marketCapInMillions) {
    const numericMarketCap = parseFloat(marketCapInMillions);
    if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
    const TRILLION = 1000000; // 1万亿 = 1,000,000个百万
    let value, unit;
    if (numericMarketCap >= TRILLION) {
      value = numericMarketCap / TRILLION;
      unit = '万亿';
    } else {
      value = numericMarketCap / 1000; // 10亿
      unit = '亿';
    }
    const formattedValue = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formattedValue}${unit}美元`;
}

function formatChineseStockMarketCap(marketCapInUSD) {
    const numericMarketCap = parseFloat(marketCapInUSD);
    if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
    const BILLION = 100000000; // 1亿
    const marketCapInHundredMillions = numericMarketCap / BILLION;
    const formattedValue = marketCapInHundredMillions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formattedValue}亿美元`;
}

// ====================================================================
// == 2. 核心渲染与数据加载函数区 (终极健壮版) ==
// ====================================================================
function renderStockList(containerId, stocks, marketType, listType) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ [RENDER ERROR] Fatal: Cannot find container element with id '${containerId}'.`);
        return;
    }

    let headerHTML = '';
    if (listType === 'top_market_cap') {
        headerHTML = '<tr><th>#</th><th>名称</th><th>市值</th><th>涨跌幅</th></tr>';
    } else {
        headerHTML = '<tr><th>#</th><th>名称</th><th>股价</th><th>涨跌幅</th></tr>';
    }

    let rowsHTML = stocks.map((stock, index) => {
        const last_price = parseFloat(stock.last_price);
        const change_percent = parseFloat(stock.change_percent);
        const colorClass = !isNaN(change_percent) && change_percent < 0 ? 'text-red' : 'text-green';

        let valueHTML = '';
        if (listType === 'top_market_cap') {
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
                    <div>${stock.name_zh || stock.name_en}</div>
                    <div class="ticker">${stock.ticker}</div>
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
    console.log(`✅ [RENDER SUCCESS] Successfully rendered ${stocks.length} stocks into #${containerId}.`);
}

async function loadAndRenderSingleList(market, listType) {
    // ... (这个函数逻辑不变，它调用 renderStockList)
}

async function loadAndRenderAllLists(market) {
    // ... (这个函数逻辑不变，它调用 renderStockList)
}

// ====================================================================
// == 3. 主程序入口 (最终版) ==
// ====================================================================
function initializeApp() {
    // ... (我们之前最终确定的、健壮的入口逻辑)
    // 它会根据页面类型，正确地调用 loadAndRenderSingleList 或 loadAndRenderAllLists
}

document.addEventListener('DOMContentLoaded', initializeApp);
```*(**Trae AI 注意:** 请将 `V22.7` 的 `trending.js` 文件，按照上述**三个区域**的逻辑进行**智能合并**。核心是**覆盖`renderStockList`函数**，并确保其他函数（如`loadAndRenderSingleList`）在调用它时，传递了正确的容器ID。)*

**任务成功标准：**
1.  提交并创建PR后，在Vercel的预览链接中：
2.  访问**任何一个**桌面版的二级榜单URL（包括标普和中概股）。
3.  **所有14个榜单**都**成功加载**，并且榜单的表格中**清晰地显示了所有数据**，包括正确的列（市值/股价）和正确的颜色（涨绿跌红）。
4.  所有`N/A`和页面空白的问题被彻底根治。