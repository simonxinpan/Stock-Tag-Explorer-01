// 文件: /public/js/mobile-ranking-detail.js
// 专为 mobile-ranking-detail.html 页面设计

// --- 格式化函数 ---
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

function formatChineseMarketCap(marketCapInYi) {
  const numericMarketCap = parseFloat(marketCapInYi);
  if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
  const formattedValue = numericMarketCap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formattedValue}亿美元`;
}

// --- 渲染函数 - 与首页保持一致的HTML结构 ---
function renderList(stocks, marketType) {
  const listContainer = document.getElementById('ranking-list');
  if (!listContainer) return;
  listContainer.innerHTML = ''; // 清空

  stocks.forEach((stock, index) => {
    const changePercent = parseFloat(stock.change_percent);
    let changeClass = 'neutral';
    if (!isNaN(changePercent)) {
      changeClass = changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral';
    }
    
    // 格式化市值
    let marketCapDisplay = 'N/A';
    if (marketType === 'sp500') {
      marketCapDisplay = formatSP500MarketCap(stock.market_cap);
    } else if (marketType === 'chinese_stocks') {
      marketCapDisplay = formatChineseMarketCap(stock.market_cap);
    }
    
    const listItem = document.createElement('div');
    listItem.className = 'stock-item';
    listItem.innerHTML = `
        <div class="stock-rank">${index + 1}</div>
        <div class="stock-info">
            <div class="stock-name">${stock.name_zh || stock.name_en}</div>
            <div class="stock-symbol">${stock.ticker}</div>
        </div>
        <div class="stock-price">
            <div class="stock-current-price">${stock.current_price ? '$' + parseFloat(stock.current_price).toFixed(2) : 'N/A'}</div>
            <div class="stock-change ${changeClass}">
                ${!isNaN(changePercent) ? (changePercent > 0 ? '+' : '') + changePercent.toFixed(2) + '%' : 'N/A'}
            </div>
        </div>
    `;
    
    // 添加点击事件
    listItem.addEventListener('click', () => {
        window.open(`https://stock-details-final.vercel.app/mobile.html?symbol=${stock.ticker}`, '_blank');
    });
    
    listContainer.appendChild(listItem);
  });
}

// --- 主程序入口 ---
async function initializePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const market = urlParams.get('market');
  const listType = urlParams.get('type');

  const loadingElement = document.getElementById('loading-ranking');
  const errorElement = document.getElementById('error-ranking');
  const listElement = document.getElementById('ranking-full-list');

  if (!market || !listType) {
    if (errorElement) {
      errorElement.classList.remove('hidden');
      errorElement.querySelector('p').textContent = '错误: 缺少市场或榜单类型参数。';
    }
    return;
  }
  
  if (loadingElement) loadingElement.classList.remove('hidden');

  try {
    const response = await fetch(`/api/ranking?market=${market}&type=${listType}`);
    if (!response.ok) throw new Error(`API 请求失败，状态码: ${response.status}`);
    
    const stocks = await response.json();
    renderList(stocks, market);
    if (listElement) listElement.classList.remove('hidden');

  } catch (error) {
    console.error("加载榜单数据失败:", error);
    if (errorElement) {
      errorElement.classList.remove('hidden');
      errorElement.querySelector('p').textContent = `加载失败: ${error.message}`;
    }
  } finally {
    if (loadingElement) loadingElement.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', initializePage);