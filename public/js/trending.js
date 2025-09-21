// 文件: /public/js/trending.js
// 版本: Final Unified & Robust Version

// ====================================================================
// == 1. 辅助与格式化函数区 ==
// ====================================================================

/**
 * 【标普500专用函数】
 * 将一个以【百万美元】为单位的数字，格式化为“X.XX万亿”或“X,XXX.XX亿”的格式。
 */
function formatSP500MarketCap(marketCapInMillions) {
  const numericMarketCap = parseFloat(marketCapInMillions);
  if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
  
  const TRILLION = 1000000; // 1万亿 = 1,000,000个百万
  const BILLION = 1000;    // 10亿 = 1,000个百万

  let value;
  let unit;

  if (numericMarketCap >= TRILLION) {
      value = numericMarketCap / TRILLION;
      unit = '万亿';
  } else {
      value = numericMarketCap / BILLION;
      unit = '亿';
  }

  const formattedValue = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formattedValue}${unit}美元`;
}

/**
 * 【中概股专用函数】
 * 将一个以【美元】为单位的数字，格式化为“X,XXX.XX亿”的格式。
 */
function formatChineseStockMarketCap(marketCapInUSD) {
  const numericMarketCap = parseFloat(marketCapInUSD);
  if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
  
  const BILLION = 100000000; // 1亿
  
  const marketCapInHundredMillions = numericMarketCap / BILLION;
  
  const formattedValue = marketCapInHundredMillions.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formattedValue}亿美元`;
}


// ====================================================================
// == 2. 核心渲染函数区 ==
// ====================================================================

/**
 * 渲染单个榜单的核心函数
 * @param {HTMLElement} container - 要填充数据的DOM元素
 * @param {Array} stocks - 从API获取的股票数据数组
 * @param {'sp500' | 'chinese_stocks'} marketType - 市场类型
 */
function renderListToContainer(container, stocks, marketType) {
    if (!container) return; // 安全检查

    // 清空旧内容，准备渲染
    let tableBody = container.querySelector('tbody');
    if (!tableBody) {
        // 如果没有tbody，创建一个
        const table = document.createElement('table');
        table.className = 'stock-table'; // 假设的class
        table.innerHTML = '<thead><tr><th>#</th><th>名称</th><th>市值</th><th>价格</th><th>涨跌幅</th></tr></thead>';
        tableBody = table.createTBody();
        tableBody.id = `list-body-${container.id}`;
        container.innerHTML = '';
        container.appendChild(table);
    }
    tableBody.innerHTML = '';

    stocks.forEach((stock, index) => {
        const row = tableBody.insertRow();
        
        // 排名
        row.insertCell().textContent = index + 1;

        // 名称
        const nameCell = row.insertCell();
        nameCell.innerHTML = `<div>${stock.name_zh || stock.name_en}</div><div class="ticker">${stock.ticker}</div>`;
        
        // 市值 (使用分支逻辑)
        const marketCapCell = row.insertCell();
        if (marketType === 'chinese_stocks') {
            marketCapCell.textContent = formatChineseStockMarketCap(stock.market_cap);
        } else {
            marketCapCell.textContent = formatSP500MarketCap(stock.market_cap);
        }
        
        // 价格
        const priceCell = row.insertCell();
        priceCell.textContent = stock.last_price ? `$${parseFloat(stock.last_price).toFixed(2)}` : 'N/A';

        // 涨跌幅 (带颜色)
        const changeCell = row.insertCell();
        const changePercent = parseFloat(stock.change_percent);
        if (!isNaN(changePercent)) {
            changeCell.textContent = `${changePercent.toFixed(2)}%`;
            changeCell.className = changePercent < 0 ? 'text-red' : 'text-green';
        } else {
            changeCell.textContent = 'N/A';
        }
    });
}


/**
 * 加载并渲染单个二级榜单的核心函数
 */
async function loadAndRenderSingleList(market, listType) {
  console.log(`🔄 [1/5] 开始加载单个榜单: ${listType} (市场: ${market})`);
  const container = document.getElementById('ranking-list-container'); 

  if (!container) {
    console.error("❌ [CRITICAL] 渲染失败: 未在HTML中找到ID为'ranking-list-container'的元素。");
    return;
  }
  
  try {
    container.innerHTML = '<div>正在加载榜单数据...</div>';
    
    const apiUrl = `/api/ranking?market=${market}&type=${listType}`;
    console.log(`🔄 [2/5] 准备请求API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    console.log(`🔄 [3/5] API响应已收到，状态码: ${response.status}`);
    if (!response.ok) throw new Error(`API请求失败，状态码: ${response.status}`);

    const stocks = await response.json();
    console.log(`🔄 [4/5] 成功解析JSON，获取到 ${stocks.length} 条记录。`);
    
    if (stocks.length === 0) {
        container.innerHTML = '<div>暂无符合条件的股票数据。</div>';
        return;
    }
    
    console.log(`🔄 [5/5] 准备渲染 ${stocks.length} 条股票...`);
    renderListToContainer(container, stocks, market); // 调用统一的渲染函数
    console.log("✅ [SUCCESS] 渲染流程调用完成。");

  } catch (error) {
    console.error(`❌ [CRITICAL] 加载或渲染榜单 ${listType} 时发生错误:`, error);
    if (container) container.innerHTML = `<div class="error-message">加载数据失败，请稍后重试。</div>`;
  }
}

/**
 * 加载并渲染一级页面所有14个榜单预览的核心函数
 */
async function loadAndRenderAllLists(market) {
    const rankingTypes = [
        'top_market_cap', 'top_gainers', 'top_losers', 'top_turnover', 
        'new_highs', 'new_lows', 'top_volatility', 'top_gap_up',
        'institutional_focus', 'retail_hot', 'smart_money', 
        'high_liquidity', 'unusual_activity', 'momentum_stocks'
    ];

    rankingTypes.forEach(async (type) => {
        const container = document.getElementById(`${type}-list`);
        if (!container) {
            console.warn(`⚠️ 容器元素 '${type}-list' 未找到，跳过此榜单。`);
            return;
        }
        try {
            const response = await fetch(`/api/ranking?market=${market}&type=${type}&limit=3`); // 预览只加载3条
            const stocks = await response.json();
            renderListToContainer(container, stocks, market);
        } catch (error) {
            console.error(`❌ 加载预览榜单 ${type} 失败:`, error);
        }
    });
}


// ====================================================================
// == 3. 主程序入口 ==
// ====================================================================

function initializeApp() {
    console.log("📊 趋势页面脚本开始执行...");
    const urlParams = new URLSearchParams(window.location.search);
    const pageName = window.location.pathname.split('/').pop();
    const market = urlParams.get('market') || 'sp500'; // 默认sp500
    const listType = urlParams.get('list');

    console.log(`🔍 页面类型: ${pageName}, 市场: ${market}, 榜单类型: ${listType || 'N/A'}`);

    // 根据页面类型，执行不同的主逻辑
    if (pageName.includes('list-detail.html')) {
        if (listType) {
            console.log(`📋 加载二级榜单页面...`);
            loadAndRenderSingleList(market, listType);
        } else {
            const container = document.getElementById('ranking-list-container');
            if (container) container.textContent = "错误：未指定榜单类型。";
            console.error("❌ 页面错误: list-detail.html需要一个'list'URL参数。");
        }
    } else if (pageName.includes('trending.html')) {
        console.log(`🏠 加载一级榜单页面...`);
        loadAndRenderAllLists(market);
    }
}

document.addEventListener('DOMContentLoaded', () => {
   // 使用微小的延迟确保所有DOM都已准备就绪
   setTimeout(initializeApp, 0);
});