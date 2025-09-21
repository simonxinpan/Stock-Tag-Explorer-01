// 文件: /public/js/mobile-ranking-detail.js
// 专为 mobile-ranking-detail.html 页面设计

// --- 格式化函数 (我们只需要标普500的) ---
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

// --- 渲染函数 ---
function renderList(stocks, marketType) {
  const listContainer = document.getElementById('ranking-list');
  if (!listContainer) return;
  listContainer.innerHTML = ''; // 清空

  stocks.forEach((stock, index) => {
    const changePercent = parseFloat(stock.change_percent);
    const colorClass = !isNaN(changePercent) && changePercent < 0 ? 'text-red' : 'text-green';
    
    const listItem = document.createElement('li');
    listItem.className = 'stock-item'; // 假设的class
    listItem.innerHTML = `
        <a href="https://stock-details-final.vercel.app/mobile.html?symbol=${stock.ticker}" class="stock-link">
            <div class="rank">${index + 1}</div>
            <div class="name-info">
                <div class="name-zh">${stock.name_zh || stock.name_en}</div>
                <div class="ticker">${stock.ticker}</div>
            </div>
            <div class="value-info">
                <div class="market-cap">${formatSP500MarketCap(stock.market_cap)}</div>
                <div class="change-percent ${colorClass}">${changePercent.toFixed(2)}%</div>
            </div>
        </a>
    `;
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