// public/js/trending.js

// 定义我们需要加载的所有榜单
const TRENDING_LISTS_CONFIG = [
  { id: 'top-gainers-list', type: 'top_gainers' },
  { id: 'top-losers-list', type: 'top_losers' },
  { id: 'high-volume-list', type: 'high_volume' },
  { id: 'new-highs-list', type: 'new_highs' },
  { id: 'new-lows-list', type: 'new_lows' },
  { id: 'risk-warning-list', type: 'risk_warning' },
  { id: 'value-picks-list', type: 'value_picks' }
];

/**
 * 根据榜单类型和数据，生成单支股票的 HTML 字符串 (任务2)
 * @param {object} stock - 股票数据对象
 * @returns {string} - 代表一个 <li> 元素的 HTML 字符串
 */
function createStockListItemHTML(stock) {
  const changePercent = stock.change_percent || 0;
  const price = stock.last_price || 'N/A';
  const colorClass = changePercent >= 0 ? 'text-green-500' : 'text-red-500';
  const sign = changePercent >= 0 ? '+' : '';
   
  // 任务2的核心：构建指向正确详情页的链接
  const detailsPageUrl = `https://stock-details-final-1e1vcxew3-simon-pans-projects.vercel.app/?symbol=${stock.ticker}`;

  return `
    <li class="stock-item">
      <a href="${detailsPageUrl}" target="_blank" class="stock-link">
        <div class="stock-info">
          <span class="ticker">${stock.ticker}</span>
          <span class="name">${stock.name_zh}</span>
        </div>
        <div class="stock-performance">
          <span class="price">$${Number(price).toFixed(2)}</span>
          <span class="change ${colorClass}">${sign}${changePercent.toFixed(2)}%</span>
        </div>
      </a>
    </li>
  `;
}

/**
 * 获取单个榜单的数据并渲染到页面 (任务1)
 * @param {object} listConfig - 单个榜单的配置对象
 */
async function loadAndRenderList(listConfig) {
  const listElement = document.getElementById(listConfig.id);
  if (!listElement) {
    console.error(`错误：在HTML中找不到ID为 "${listConfig.id}" 的元素`);
    return;
  }
   
  listElement.innerHTML = '<li class="loading">正在加载数据...</li>';

  try {
    const response = await fetch(`/api/trending?type=${listConfig.type}`);
    if (!response.ok) throw new Error(`API 请求失败，状态码: ${response.status}`);
    const stocks = await response.json();

    if (stocks.length === 0) {
      listElement.innerHTML = '<li class="no-data">暂无符合条件的股票</li>';
    } else {
      listElement.innerHTML = stocks.map(stock => createStockListItemHTML(stock)).join('');
    }
  } catch (error) {
    console.error(`加载榜单 "${listConfig.title}" 失败:`, error);
    listElement.innerHTML = '<li class="error">数据加载失败</li>';
  }
}

// 当整个页面加载完成后，开始执行我们的脚本
document.addEventListener('DOMContentLoaded', () => {
  console.log('📈 页面加载完成，开始获取所有趋势榜单数据...');
  TRENDING_LISTS_CONFIG.forEach(loadAndRenderList);
});