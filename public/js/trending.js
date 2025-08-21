// public/js/trending.js

// 定义我们需要加载的所有榜单
const TRENDING_LISTS_CONFIG = [
  { id: 'top-gainers-list', type: 'top_gainers' },
  { id: 'high-volume-list', type: 'high_volume' },
  { id: 'top-losers-list', type: 'top_losers' },
  { id: 'new-lows-list', type: 'new_lows' }
];

/**
 * 根据榜单类型和数据，生成单支股票的 HTML 字符串
 * @param {object} stock - 股票数据对象
 * @param {string} type - 榜单类型
 * @param {number} rank - 排名
 * @returns {string} - 代表一个 <li> 元素的 HTML 字符串
 */
function createStockListItemHTML(stock, type, rank) {
  const changePercent = stock.change_percent || 0;
  const price = stock.last_price || 0;
  const colorClass = changePercent >= 0 ? 'text-green-500' : 'text-red-500';
  const sign = changePercent >= 0 ? '+' : '';
   
  // 构建指向正确详情页的链接
  const detailsPageUrl = `https://stock-details-final-1e1vcxew3-simon-pans-projects.vercel.app/?symbol=${stock.ticker}`;

  // 根据榜单类型决定显示哪个核心数据
  let mainMetricHTML = '';
  switch (type) {
    case 'high_volume':
      // 成交额榜显示成交额
      const turnover = stock.turnover ? formatTurnover(stock.turnover) : 'N/A';
      mainMetricHTML = `
        <div class="price">${turnover}</div>
        <div class="change ${colorClass}">${sign}${changePercent.toFixed(2)}%</div>
      `;
      break;
    case 'top_losers':
      // 跌幅榜显示价格和跌幅
      mainMetricHTML = `
        <div class="price">$${Number(price).toFixed(2)}</div>
        <div class="change ${colorClass}">${changePercent.toFixed(2)}%</div>
      `;
      break;
    case 'new_lows':
      // 新低榜显示52周最低价
      const weekLow = stock.week_52_low ? `$${Number(stock.week_52_low).toFixed(2)}` : 'N/A';
      mainMetricHTML = `
        <div class="price">${weekLow}</div>
        <div class="change ${colorClass}">${sign}${changePercent.toFixed(2)}%</div>
      `;
      break;
    default: // 涨幅榜等默认显示价格和涨跌幅
      mainMetricHTML = `
        <div class="price">$${Number(price).toFixed(2)}</div>
        <div class="change ${colorClass}">${sign}${changePercent.toFixed(2)}%</div>
      `;
      break;
  }

  return `
    <li class="stock-item">
      <a href="${detailsPageUrl}" target="_blank" class="stock-link">
        <div class="rank-circle">${rank}</div>
        <div class="stock-info">
          <div class="ticker">${stock.ticker}</div>
          <div class="name">${stock.name_zh || stock.name || 'N/A'}</div>
        </div>
        <div class="stock-performance">
          ${mainMetricHTML}
        </div>
      </a>
    </li>
  `;
}

/**
 * 格式化市值显示
 * @param {string|number} marketCap - 市值
 * @returns {string} - 格式化后的市值字符串
 */
function formatMarketCap(marketCap) {
  if (!marketCap || marketCap === 0) return 'N/A';
  
  const cap = parseFloat(marketCap);
  if (cap >= 1000000000000) {
    return `$${(cap / 1000000000000).toFixed(2)}T`;
  } else if (cap >= 1000000000) {
    return `$${(cap / 1000000000).toFixed(2)}B`;
  } else if (cap >= 1000000) {
    return `$${(cap / 1000000).toFixed(2)}M`;
  } else {
    return `$${cap.toFixed(0)}`;
  }
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
      const top5HTML = top5Stocks.map((stock, index) => createStockListItemHTML(stock, listConfig.type, index + 1)).join('');
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
            ${stocks.map(stock => createStockListItemHTML(stock, type)).join('')}
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
    'new_lows': '⬇️ 创年内新低 - 完整榜单',
  };
  return titles[type] || '榜单';
}

// 辅助函数：格式化成交额显示
function formatTurnover(value) {
  if (!value || value === 0) return 'N/A';
  const num = parseFloat(value);
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`; // 万亿
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;  // 十亿
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;  // 百万
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;  // 千
  return `$${num.toFixed(0)}`;
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