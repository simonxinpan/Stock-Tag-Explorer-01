// public/js/trending.js

// 获取当前市场类型
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500'; // 默认为标普500
}

// 更新次级导航栏的激活状态
function updateMarketNavigation() {
  const currentMarket = getCurrentMarket();
  const marketTabs = document.querySelectorAll('.market-tab');
  
  marketTabs.forEach(tab => {
    const tabMarket = tab.getAttribute('data-market');
    if (tabMarket === currentMarket) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// 定义我们需要加载的所有榜单
const TRENDING_LISTS_CONFIG = [
  { id: 'top-gainers-list', type: 'top_gainers' },
  { id: 'top-market-cap-list', type: 'top_market_cap' },
  { id: 'new-highs-list', type: 'new_highs' },
  { id: 'top-turnover-list', type: 'top_turnover' },
  { id: 'top-volatility-list', type: 'top_volatility' },
  { id: 'top-gap-up-list', type: 'top_gap_up' },
  { id: 'top-losers-list', type: 'top_losers' },
  { id: 'new-lows-list', type: 'new_lows' },
  // 🆕 基于Polygon API数据的新榜单
  { id: 'institutional-focus-list', type: 'institutional_focus' },
  { id: 'retail-hot-list', type: 'retail_hot' },
  { id: 'smart-money-list', type: 'smart_money' },
  { id: 'high-liquidity-list', type: 'high_liquidity' },
  { id: 'unusual-activity-list', type: 'unusual_activity' },
  { id: 'momentum-stocks-list', type: 'momentum_stocks' }
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
  const detailsPageUrl = `https://stock-details-final.vercel.app/?symbol=${stock.ticker}`;

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
    // 🆕 基于Polygon API数据的新榜单
    case 'institutional_focus':
      // 机构关注榜显示成交额和VWAP偏离度
      const instTurnover = stock.turnover ? formatLargeNumber(stock.turnover) : 'N/A';
      const vwapPercent = stock.price_vs_vwap_percent ? `${Number(stock.price_vs_vwap_percent).toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${instTurnover}</div><div class="metric-small">vs VWAP: ${vwapPercent}</div>`;
      break;
    case 'retail_hot':
      // 散户热门榜显示交易笔数和每百万股交易笔数
      const tradeCount = stock.trade_count ? formatLargeNumber(stock.trade_count) : 'N/A';
      const tradesPerMillion = stock.trades_per_million_shares ? Number(stock.trades_per_million_shares).toFixed(1) : 'N/A';
      mainMetricHTML = `<div class="price">${tradeCount}笔</div><div class="metric-small">${tradesPerMillion}/M股</div>`;
      break;
    case 'smart_money':
      // 主力动向榜显示VWAP偏离度和成交额
      const smartVwapPercent = stock.price_vs_vwap_percent ? `+${Number(stock.price_vs_vwap_percent).toFixed(2)}%` : 'N/A';
      const smartTurnover = stock.turnover ? formatLargeNumber(stock.turnover) : 'N/A';
      mainMetricHTML = `<div class="price">${smartVwapPercent}</div><div class="metric-small">${smartTurnover}</div>`;
      break;
    case 'high_liquidity':
      // 高流动性榜显示成交量和换手率
      const volume = stock.volume ? formatLargeNumber(stock.volume) : 'N/A';
      const turnoverRate = stock.turnover_rate_percent ? `${Number(stock.turnover_rate_percent).toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${volume}</div><div class="metric-small">换手率: ${turnoverRate}</div>`;
      break;
    case 'unusual_activity':
      // 异动榜显示交易笔数和异常指标
      const unusualTrades = stock.trade_count ? formatLargeNumber(stock.trade_count) : 'N/A';
      const unusualRatio = stock.trades_per_million_shares ? Number(stock.trades_per_million_shares).toFixed(1) : 'N/A';
      mainMetricHTML = `<div class="price">${unusualTrades}笔</div><div class="metric-small">异动指数: ${unusualRatio}</div>`;
      break;
    case 'momentum_stocks':
      // 动量榜显示动量评分和成交量
      const momentumScore = stock.momentum_score ? Number(stock.momentum_score).toFixed(2) : 'N/A';
      const momentumVolume = stock.volume ? formatLargeNumber(stock.volume) : 'N/A';
      mainMetricHTML = `<div class="price">评分: ${momentumScore}</div><div class="metric-small">${momentumVolume}</div>`;
      break;
    case 'top_market_cap':
      // 市值榜显示市值和价格
      const marketCapFormatted = stock.market_cap ? formatMarketCap(stock.market_cap) : 'N/A';
      mainMetricHTML = `<div class="price">${marketCapFormatted}</div><div class="metric-small">$${price.toFixed(2)}</div>`;
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
          <div class="name">${stock.name_zh || stock.name || 'N/A'}</div>
          <div class="ticker">${stock.ticker}</div>
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
/**
 * 将一个以美元为单位的巨大数字，格式化为符合中文习惯的、带单位的字符串。
 * @param {number} marketCapInUSD - 从API获取的、以美元为单位的原始市值。
 * @returns {string} - 格式化后的字符串，例如 "$1,234.56亿美元"。
 */
function formatMarketCap(marketCapInUSD) {
  if (typeof marketCapInUSD !== 'number' || isNaN(marketCapInUSD)) {
    return 'N/A'; // 或返回 '未知'
  }

  const B = 1_000_000_000; // 十亿
  const M = 1_000_000;     // 百万

  // 我们统一使用"亿美元"作为单位，以获得最佳的可读性和可比性
  const marketCapInBillion = marketCapInUSD / B;

  // 使用 toFixed(2) 来保留两位小数，确保精度
  // 使用 toLocaleString() 来添加千位分隔符，例如 1,234.56
  const formattedValue = marketCapInBillion.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `$${formattedValue}亿美元`;
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
    const currentMarket = getCurrentMarket();
    const response = await fetch(`/api/trending?type=${listConfig.type}&market=${currentMarket}`);
    if (!response.ok) throw new Error(`API 请求失败，状态码: ${response.status}`);
    let data = await response.json();

    // 检查是否是错误响应
    if (data.error) {
      throw new Error(data.message || data.error);
    }

    // 处理包装格式的响应 {success: true, data: []}
    let stocksArray = data;
    if (data.success && Array.isArray(data.data)) {
      stocksArray = data.data;
    } else if (!Array.isArray(data)) {
      throw new Error('API返回的数据格式不正确');
    }

    // 确保数据类型正确，进行类型转换
    let stocks = stocksArray.map(stock => ({
      ...stock,
      ticker: stock.ticker || stock.symbol || 'N/A', // 确保ticker字段存在
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
    const currentMarket = getCurrentMarket();
    const response = await fetch(`/api/trending?type=${type}&market=${currentMarket}`);
    if (!response.ok) throw new Error(`API 请求失败，状态码: ${response.status}`);
    let data = await response.json();

    // 检查是否是错误响应
    if (data.error) {
      throw new Error(data.message || data.error);
    }

    // 处理包装格式的响应 {success: true, data: []}
    let stocksArray = data;
    if (data.success && Array.isArray(data.data)) {
      stocksArray = data.data;
    } else if (!Array.isArray(data)) {
      throw new Error('API返回的数据格式不正确');
    }

    // 确保数据类型正确，进行类型转换
    let stocks = stocksArray.map(stock => ({
      ...stock,
      ticker: stock.ticker || stock.symbol || 'N/A', // 确保ticker字段存在
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
    'top_market_cap': '💰 市值榜 - 完整榜单',
    'top_losers': '📉 跌幅榜 - 完整榜单',
    'high_volume': '💰 成交额榜 - 完整榜单',
    'new_highs': '🎯 创年内新高 - 完整榜单',
    'new_lows': '⬇️ 创年内新低 - 完整榜单',
    'risk_warning': '⚠️ 风险警示 - 完整榜单',
    'value_picks': '💎 特色价值 - 完整榜单',
    // 🆕 基于Polygon API数据的新榜单
    'institutional_focus': '🏛️ 机构关注榜 - 完整榜单',
    'retail_hot': '👥 散户热门榜 - 完整榜单',
    'smart_money': '🎯 主力动向榜 - 完整榜单',
    'high_liquidity': '💧 高流动性榜 - 完整榜单',
    'unusual_activity': '⚡ 异动榜 - 完整榜单',
    'momentum_stocks': '🚀 动量榜 - 完整榜单'
  };
  return titles[type] || '榜单详情';
}

// 辅助函数：格式化大数字显示
function formatLargeNumber(value, isCurrency = false) {
  const num = parseFloat(value);
  if (isNaN(num)) return '--';
  
  // 根据当前市场类型决定格式
  const currentMarket = getCurrentMarket();
  const prefix = isCurrency ? (currentMarket === 'chinese_stocks' ? '¥' : '$') : '';
  
  if (currentMarket === 'chinese_stocks') {
    // 中概股使用中文数字格式
    if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(2)}万亿`; // 万亿
    if (num >= 1e8) return `${prefix}${(num / 1e8).toFixed(2)}亿`;   // 亿
    if (num >= 1e4) return `${prefix}${(num / 1e4).toFixed(1)}万`;   // 万
    return `${prefix}${num.toLocaleString('zh-CN')}`; // 中文千位分隔符
  } else {
    // 标普500使用英文数字格式
    if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(2)}T`; // 万亿
    if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(2)}B`;  // 十亿
    if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(1)}M`;  // 百万
    return `${prefix}${num.toLocaleString('en-US')}`; // 英文千位分隔符
  }
}

// 辅助函数：格式化成交额显示（保持向后兼容）
function formatTurnover(value) {
  return formatLargeNumber(value);
}

// 新函数：获取并渲染市场汇总数据
async function loadAndRenderSummaryData() {
  try {
    const currentMarket = getCurrentMarket();
    const response = await fetch(`/api/market-summary?market=${currentMarket}`);
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
  
  // 更新市场导航状态
  updateMarketNavigation();
  
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