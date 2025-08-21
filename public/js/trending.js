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
  const price = stock.last_price || 0;
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
          <span class="price">$${price.toFixed(2)}</span>
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
    let stocks = await response.json();

    // 确保数据类型正确，进行类型转换
    stocks = stocks.map(stock => ({
      ...stock,
      last_price: Number(stock.last_price) || 0,
      change_percent: Number(stock.change_percent) || 0,
      market_cap: Number(stock.market_cap) || 0
    }));

    if (stocks.length === 0) {
      listElement.innerHTML = '<li class="no-data">暂无符合条件的股票</li>';
    } else {
      // 只显示前5条数据
      const top5Stocks = stocks.slice(0, 5);
      const top5HTML = top5Stocks.map(stock => createStockListItemHTML(stock)).join('');
      listElement.innerHTML = top5HTML;
    }
  } catch (error) {
    console.error(`加载榜单 "${listConfig.title}" 失败:`, error);
    listElement.innerHTML = '<li class="error">数据加载失败</li>';
  }
}

/**
 * 处理"更多"按钮点击事件
 * @param {string} type - 榜单类型
 */
async function handleMoreButtonClick(type) {
  try {
    const response = await fetch(`/api/trending?type=${type}`);
    if (!response.ok) throw new Error(`API 请求失败，状态码: ${response.status}`);
    let stocks = await response.json();

    // 确保数据类型正确
    stocks = stocks.map(stock => ({
      ...stock,
      last_price: Number(stock.last_price) || 0,
      change_percent: Number(stock.change_percent) || 0,
      market_cap: Number(stock.market_cap) || 0
    }));

    // 创建模态框显示完整榜单
    const modal = document.createElement('div');
    modal.className = 'ranking-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${getRankingTitle(type)}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <ul class="ranking-list-full">
            ${stocks.map(stock => createStockListItemHTML(stock)).join('')}
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 添加关闭事件
    const closeBtn = modal.querySelector('.modal-close');
    const modalContent = modal.querySelector('.modal-content');
    
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

  } catch (error) {
    console.error('加载完整榜单失败:', error);
    alert('加载数据失败，请稍后重试');
  }
}

/**
 * 获取榜单标题
 * @param {string} type - 榜单类型
 * @returns {string} - 榜单标题
 */
function getRankingTitle(type) {
  const titles = {
    'top_gainers': '🚀 涨幅榜 - 完整榜单',
    'top_losers': '📉 跌幅榜 - 完整榜单',
    'high_volume': '💰 成交额榜 - 完整榜单',
    'new_highs': '🎯 创年内新高 - 完整榜单',
    'new_lows': '⬇️ 创年内新低 - 完整榜单',
    'risk_warning': '⚠️ 风险警示 - 完整榜单',
    'value_picks': '💎 特色价值 - 完整榜单'
  };
  return titles[type] || '榜单详情';
}

// 当整个页面加载完成后，开始执行我们的脚本
document.addEventListener('DOMContentLoaded', () => {
  console.log('📈 页面加载完成，开始获取所有趋势榜单数据...');
  TRENDING_LISTS_CONFIG.forEach(loadAndRenderList);
  
  // 为所有"更多"按钮添加事件监听
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('more-btn') || e.target.classList.contains('more-btn-small')) {
      const type = e.target.getAttribute('data-type');
      if (type) {
        handleMoreButtonClick(type);
      }
    }
  });
});