// public/js/trending.js

// 定义我们需要加载的所有榜单
const TRENDING_LISTS_CONFIG = [
  { id: 'top-gainers-list', type: 'top_gainers' },
  { id: 'new-highs-list', type: 'new_highs' },
  { id: 'top-turnover-list', type: 'top_turnover' },
  { id: 'top-volatility-list', type: 'top_volatility' },
  { id: 'top-gap-up-list', type: 'top_gap_up' },
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
  const changePercent = parseFloat(stock.change_percent) || 0;
  const price = parseFloat(stock.last_price) || 0;
  const colorClass = changePercent >= 0 ? 'text-green-500' : 'text-red-500';
  const sign = changePercent >= 0 ? '+' : '';
   
  // 构建指向正确详情页的链接
  const detailsPageUrl = `https://stock-details-final-1e1vcxew3-simon-pans-projects.vercel.app/?symbol=${stock.ticker}`;

  // 根据榜单类型决定显示哪个核心数据
  let mainMetricHTML = '';
  switch (type) {
    case 'top_turnover':
      // 成交额榜显示成交额
      const turnover = stock.turnover ? formatLargeNumber(stock.turnover) : 'N/A';
      mainMetricHTML = `<div class="price">${turnover}</div>`;
      break;
    case 'top_volatility':
      // 振幅榜显示振幅百分比
      const amplitude = stock.amplitude_percent ? `${Number(stock.amplitude_percent).toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${amplitude}</div>`;
      break;
    case 'top_gap_up':
      // 高开缺口榜显示缺口百分比
      const gapPercent = stock.gap_percent ? `${Number(stock.gap_percent).toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${gapPercent}</div>`;
      break;
    case 'top_losers':
      // 跌幅榜显示价格和跌幅
      mainMetricHTML = `<div class="price">$${price.toFixed(2)}</div>`;
      break;
    case 'new_lows':
      // 新低榜显示52周最低价
      const weekLow = stock.week_52_low ? `$${Number(stock.week_52_low).toFixed(2)}` : 'N/A';
      mainMetricHTML = `<div class="price">${weekLow}</div>`;
      break;
    case 'new_highs':
      // 新高榜显示52周最高价
      const weekHigh = stock.week_52_high ? `$${Number(stock.week_52_high).toFixed(2)}` : 'N/A';
      mainMetricHTML = `<div class="price">${weekHigh}</div>`;
      break;
    default: // 涨幅榜等默认显示价格和涨跌幅
      mainMetricHTML = `<div class="price">$${price.toFixed(2)}</div>`;
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
          <div class="change ${colorClass}">${sign}${changePercent.toFixed(2)}%</div>
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
 * 格式化大数字（用于成交量、成交额等）
 * @param {string|number} value - 需要格式化的数值
 * @returns {string} - 格式化后的字符串
 */
function formatLargeNumber(value) {
  if (!value || value === 0) return 'N/A';
  
  const num = parseFloat(value);
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  } else {
    return num.toFixed(0);
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
    let data = await response.json();

    // 检查是否是错误响应
    if (data.error) {
      throw new Error(data.message || data.error);
    }

    // 确保数据类型正确，进行类型转换
    let stocks = data.map(stock => ({
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
    listElement.innerHTML = `<li class="error">数据库连接失败<br><small>${error.message}</small></li>`;
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
            ${stocks.map((stock, index) => createStockListItemHTML(stock, type, index + 1)).join('')}
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

// 辅助函数：格式化大数字显示
function formatLargeNumber(value, isCurrency = false) {
  const num = parseFloat(value);
  if (isNaN(num)) return '--';
  const prefix = isCurrency ? '$' : '';
  if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(2)}万亿`; // 万亿
  if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(2)}B`;  // 十亿
  if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(1)}M`;  // 百万
  return `${prefix}${num.toLocaleString()}`; // 普通数字加千位分隔符
}

// 辅助函数：格式化成交额显示（保持向后兼容）
function formatTurnover(value) {
  return formatLargeNumber(value);
}

// 新函数：获取并渲染市场汇总数据
async function loadAndRenderSummaryData() {
  try {
    const response = await fetch('/api/market-summary');
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();

    // 更新 DOM 元素
    document.getElementById('summary-total-stocks').textContent = data.totalStocks;
    document.getElementById('summary-rising-stocks').textContent = data.risingStocks;
    document.getElementById('summary-falling-stocks').textContent = data.fallingStocks;
     
    // 注意：总市值需要进行单位换算，因为数据库存的是百万美元
    document.getElementById('summary-total-market-cap').textContent = formatLargeNumber(data.totalMarketCap * 1000000, true);

  } catch (error) {
    console.error('加载市场汇总数据失败:', error);
    // 可以选择在这里显示错误提示
  }
}

// 当整个页面加载完成后，开始执行我们的脚本
document.addEventListener('DOMContentLoaded', () => {
  console.log('📈 页面加载完成，开始获取所有趋势榜单数据...');
  
  // 并发地加载所有榜单和汇总数据
  loadAndRenderSummaryData(); // <-- 新增的调用
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