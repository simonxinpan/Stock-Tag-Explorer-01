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
// == 2. 渲染与数据加载函数区 ==
// ====================================================================
function renderStockList(container, stocks, marketType) {
  if (!container) return;
  let tableBody = container.querySelector('tbody');
  if (!tableBody) {
    const table = document.createElement('table');
    table.className = 'stock-table';
    table.innerHTML = '<thead><tr><th>#</th><th>名称</th><th>市值</th><th>价格</th><th>涨跌幅</th></tr></thead>';
    tableBody = table.createTBody();
    container.innerHTML = '';
    container.appendChild(table);
  }
  tableBody.innerHTML = '';

  stocks.forEach((stock, index) => {
    const row = tableBody.insertRow();
    row.insertCell().textContent = index + 1;
    const nameCell = row.insertCell();
    nameCell.innerHTML = `<div>${stock.name_zh || stock.name_en}</div><div class="ticker">${stock.ticker}</div>`;
    const marketCapCell = row.insertCell();
    if (marketType === 'chinese_stocks') {
      marketCapCell.textContent = formatChineseStockMarketCap(stock.market_cap);
    } else {
      marketCapCell.textContent = formatSP500MarketCap(stock.market_cap);
    }
    const priceCell = row.insertCell();
    priceCell.textContent = stock.last_price ? `$${parseFloat(stock.last_price).toFixed(2)}` : 'N/A';
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

async function loadAndRenderSingleList(market, listType) {
  const container = document.getElementById('ranking-list-container');
  if (!container) {
    console.error("❌ 渲染失败: 未在HTML中找到ID为'ranking-list-container'的元素。");
    return;
  }
  try {
    container.innerHTML = '<div>正在加载榜单数据...</div>';
    const apiUrl = `/api/ranking?market=${market}&type=${listType}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API请求失败，状态码: ${response.status}`);
    const stocks = await response.json();
    renderListToContainer(container, stocks, market);
  } catch (error) {
    console.error(`❌ 加载或渲染榜单 ${listType} 时发生错误:`, error);
    if (container) container.innerHTML = `<div class="error-message">加载数据失败，请稍后重试。</div>`;
  }
}

async function loadAndRenderAllLists(market) {
  const rankingTypes = ['top_market_cap', 'top_gainers', 'top_losers', 'top_turnover', 'new_highs', 'new_lows', 'top_volatility', 'top_gap_up', 'institutional_focus', 'retail_hot', 'smart_money', 'high_liquidity', 'unusual_activity', 'momentum_stocks'];
  rankingTypes.forEach(async (type) => {
    const container = document.getElementById(`${type}-list`);
    if (!container) return;
    try {
      const response = await fetch(`/api/ranking?market=${market}&type=${type}&limit=5`); // 预览只加载5条
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