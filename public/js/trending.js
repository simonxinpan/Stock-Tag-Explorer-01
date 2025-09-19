// public/js/trending.js
// 版本: SPA & Multi-page Routing Enabled

// 获取当前市场类型
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500'; // 默认为标普500
}

// 获取当前榜单类型（仅在二级页面使用）
function getCurrentListType() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('list') || null;
}

// 检测当前页面类型
function getCurrentPageType() {
  const pathname = window.location.pathname;
  if (pathname.includes('list-detail.html')) {
    return 'list-detail';
  }
  return 'overview';
}

// 更新次级导航栏的激活状态
function updateMarketNavigation() {
  const currentMarket = getCurrentMarket();
  const marketTabs = document.querySelectorAll('.market-tab');
  
  // 添加空值检查，确保在mobile.html上安全运行
  if (marketTabs.length > 0) {
    marketTabs.forEach(tab => {
      const tabMarket = tab.getAttribute('data-market');
      if (tabMarket === currentMarket) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }
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

// 榜单类型映射配置
const RANKING_CONFIG = {
  'top_gainers': {
    title: '🚀 涨幅榜',
    description: '按当日涨跌幅排序，反映市场热点和资金偏好，适合捕捉短期强势股和题材炒作机会。',
    name: '涨幅榜'
  },
  'top_market_cap': {
    title: '💰 市值榜',
    description: '按市值排序，展示市场巨头和蓝筹股，适合稳健投资和长期价值投资策略。',
    name: '市值榜'
  },
  'new_highs': {
    title: '⬆️ 创年内新高',
    description: '突破52周最高价的股票，显示强劲上升趋势，适合趋势跟踪和动量投资策略。',
    name: '创年内新高榜'
  },
  'top_turnover': {
    title: '💰 成交额榜',
    description: '按成交金额排序，反映市场关注度和流动性，大资金进出的重要参考指标。',
    name: '成交额榜'
  },
  'top_volatility': {
    title: '📊 振幅榜',
    description: '按日内最高最低价差计算，反映股价波动程度，适合短线交易和波段操作。',
    name: '振幅榜'
  },
  'top_gap_up': {
    title: '🌅 高开缺口榜',
    description: '开盘价相对前收盘价的涨幅，反映隔夜消息面影响和市场预期变化。',
    name: '高开缺口榜'
  },
  'top_losers': {
    title: '📉 跌幅榜',
    description: '按当日跌幅排序，识别市场风险和避险情绪，适合风险控制和逆向投资参考。',
    name: '跌幅榜'
  },
  'new_lows': {
    title: '⬇️ 创年内新低',
    description: '跌破52周最低价的股票，显示弱势趋势，需谨慎关注基本面变化和止损风险。',
    name: '创年内新低榜'
  },
  'institutional_focus': {
    title: '🏛️ 机构关注榜',
    description: '基于大额交易和VWAP偏离度，追踪机构资金动向，适合跟随聪明钱投资策略。',
    name: '机构关注榜'
  },
  'retail_hot': {
    title: '👥 散户热门榜',
    description: '基于散户持股比例和交易活跃度，反映散户投资偏好和市场情绪。',
    name: '散户热门榜'
  },
  'smart_money': {
    title: '🏛️ 主力动向榜',
    description: '基于机构持股变化和大额交易，追踪主力资金动向和投资逻辑。',
    name: '主力动向榜'
  },
  'high_liquidity': {
    title: '💧 高流动性榜',
    description: '基于成交量和买卖价差，评估股票流动性，适合大额交易和快速进出。',
    name: '高流动性榜'
  },
  'unusual_activity': {
    title: '⚡ 异动榜',
    description: '交易量异常放大的股票，可能有重大消息或资金异动，需及时关注基本面变化。',
    name: '异动榜'
  },
  'momentum_stocks': {
    title: '🚀 动量榜',
    description: '综合价格、成交量、技术指标的动量评分，识别强势上涨趋势，适合趋势跟踪策略。',
    name: '动量榜'
  }
};

/**
 * 根据榜单类型和数据，生成单支股票的 HTML 字符串
 * @param {object} stock - 股票数据对象
 * @param {string} type - 榜单类型
 * @param {number} rank - 排名
 * @param {string} marketType - 市场类型 ('chinese_stocks' 或 'sp500')
 * @returns {string} - 代表一个 <li> 元素的 HTML 字符串
 */
function createStockListItemHTML(stock, type, rank, marketType = 'sp500') {
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
      // 市值榜显示市值和价格，根据市场类型调用不同的格式化函数
      let marketCapFormatted = 'N/A';
      if (stock.market_cap) {
        if (marketType === 'chinese_stocks') {
          // 中概股：调用中概股专属函数（输入为美元）
          marketCapFormatted = formatChineseStockMarketCap(stock.market_cap);
        } else {
          // 标普500：调用标普500专属函数（输入为百万美元）
          marketCapFormatted = formatSP500MarketCap(stock.market_cap);
        }
      }
      mainMetricHTML = `<div class="price">${marketCapFormatted}</div><div class="metric-small">$${price.toFixed(2)}</div>`;
      break;
    default: // 涨幅榜等默认显示价格和涨跌幅
      mainMetricHTML = `<div class="price">$${price.toFixed(2)}</div>`;
      break;
  }

  return `
    <li class="stock-item">
      <a href="${detailsPageUrl}" target="_blank" class="stock-link">
        <div class="stock-header">
          <div class="rank-circle">${rank}</div>
          <div class="stock-basic">
            <div class="name">${stock.name_zh || stock.name || 'N/A'}</div>
            <div class="ticker">${stock.ticker}</div>
          </div>
        </div>
        <div class="stock-metrics">
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
 * 【标普500专用函数】
 * 将一个以【百万美元】为单位的数字，格式化为"X.XX万亿美元"的格式。
 */
function formatSP500MarketCap(marketCapInMillions) {
  const numericMarketCap = parseFloat(marketCapInMillions);
  if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
  
  const TRILLION = 1_000_000; // 1万亿 = 1,000,000个百万
  
  const marketCapInTrillions = numericMarketCap / TRILLION;
  
  const formattedValue = marketCapInTrillions.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formattedValue}万亿`;
}

/**
 * 【中概股专用函数】
 * 将一个以【美元】为单位的数字，格式化为"X,XXX.X亿美元"的格式。
 */
function formatChineseStockMarketCap(marketCapInUSD) {
  const numericMarketCap = parseFloat(marketCapInUSD);
  if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
  
  const BILLION = 100_000_000; // 1亿 = 100,000,000
  
  const marketCapInHundredMillions = numericMarketCap / BILLION;
  
  const formattedValue = marketCapInHundredMillions.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formattedValue}亿`;
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
      // 移动端显示前4条数据，桌面端显示前5条数据
      const isMobile = window.innerWidth <= 768;
      const displayCount = isMobile ? 4 : 5;
      const topStocks = stocks.slice(0, displayCount);
      const topHTML = topStocks.map((stock, index) => createStockListItemHTML(stock, listConfig.type, index + 1, currentMarket)).join('');
      listElement.innerHTML = topHTML;
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
            ${stocks.map((stock, index) => createStockListItemHTML(stock, type, index + 1, currentMarket)).join('')}
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

    // 更新 DOM 元素 - 兼容trending.html和mobile.html的不同ID
    const totalStocksEl = document.getElementById('summary-total-stocks') || document.getElementById('total-stocks');
    const risingStocksEl = document.getElementById('summary-rising-stocks') || document.getElementById('rising-stocks');
    const fallingStocksEl = document.getElementById('summary-falling-stocks') || document.getElementById('falling-stocks');
    const totalMarketCapEl = document.getElementById('summary-total-market-cap') || document.getElementById('total-market-cap');
    
    if (totalStocksEl) totalStocksEl.textContent = data.totalStocks;
    if (risingStocksEl) risingStocksEl.textContent = data.risingStocks;
    if (fallingStocksEl) fallingStocksEl.textContent = data.fallingStocks;
     
    // 根据市场类型使用不同的格式化函数显示总市值
    let totalMarketCapFormatted = 'N/A';
    if (data.totalMarketCap) {
      if (currentMarket === 'chinese_stocks') {
        // 中概股：数据库存储的是美元，直接使用中概股格式化函数
        totalMarketCapFormatted = formatChineseStockMarketCap(data.totalMarketCap);
      } else {
        // 标普500：数据库存储的是百万美元，使用标普500格式化函数
        totalMarketCapFormatted = formatSP500MarketCap(data.totalMarketCap);
      }
    }
    if (totalMarketCapEl) totalMarketCapEl.textContent = totalMarketCapFormatted;

  } catch (error) {
    console.error('加载市场汇总数据失败:', error);
    // 可以选择在这里显示错误提示
  }
}

/**
 * 【新的核心函数】加载并渲染指定的单个榜单（用于二级页面）
 * @param {string} market - 市场类型 'sp500' | 'chinese_stocks'
 * @param {string} listType - 榜单类型 e.g., 'top_gainers', 'top_market_cap'
 */
async function loadAndRenderSingleList(market, listType) {
  try {
    console.log(`🔄 开始加载单个榜单: ${listType} (${market})`);
    
    // 显示加载状态
    showLoadingSpinner();
    
    // 构建正确的API请求URL
    const apiUrl = `/api/ranking?market=${market}&type=${listType}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const stocks = await response.json();
    console.log(`✅ 榜单 ${listType} 数据加载成功:`, stocks);
    
    // 更新页面标题和UI
    updateSingleListPageUI(listType, market);
    
    // 渲染股票列表
    renderSingleRankingList(stocks, listType, market);
    
  } catch (error) {
    console.error(`❌ 加载榜单 ${listType} 失败:`, error);
    showErrorMessage(`加载${RANKING_CONFIG[listType]?.name || '榜单'}数据失败，请稍后重试`);
  } finally {
    hideLoadingSpinner();
  }
}

/**
 * 更新单榜单页面的UI元素
 * @param {string} listType - 榜单类型
 * @param {string} market - 市场类型
 */
function updateSingleListPageUI(listType, market) {
  const config = RANKING_CONFIG[listType];
  if (!config) return;
  
  // 更新页面标题
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  const rankingTitle = document.getElementById('ranking-title');
  const cardTitle = document.getElementById('card-title');
  const cardDescription = document.getElementById('card-description');
  
  if (pageTitle) pageTitle.textContent = config.name;
  if (pageSubtitle) pageSubtitle.textContent = config.description;
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = config.name;
  if (rankingTitle) rankingTitle.textContent = config.title;
  if (cardTitle) cardTitle.textContent = config.title;
  if (cardDescription) cardDescription.textContent = config.description;
  
  // 更新页面标题
  document.title = `${config.name} - ${market.toUpperCase()} | Stock Tag Explorer`;
  
  // 更新市场按钮状态
  updateMarketButtons(market);
}

/**
 * 更新市场切换按钮状态
 * @param {string} currentMarket - 当前市场
 */
function updateMarketButtons(currentMarket) {
  const sp500Btn = document.getElementById('sp500-btn');
  const chineseBtn = document.getElementById('chinese-btn');
  
  if (sp500Btn && chineseBtn) {
    sp500Btn.classList.toggle('active', currentMarket === 'sp500');
    chineseBtn.classList.toggle('active', currentMarket === 'chinese_stocks');
  }
}

/**
 * 渲染单个榜单的股票列表
 * @param {Array} stocks - 股票数据数组
 * @param {string} listType - 榜单类型
 * @param {string} market - 市场类型
 */
function renderSingleRankingList(stocks, listType, market) {
  const listContainer = document.getElementById('ranking-list');
  if (!listContainer) return;
  
  if (!stocks || stocks.length === 0) {
    listContainer.innerHTML = '<li class="no-data-item">📊 暂无数据</li>';
    return;
  }
  
  // 生成股票列表HTML
  const stocksHTML = stocks.map((stock, index) => 
    createStockListItemHTML(stock, listType, index + 1, market)
  ).join('');
  
  listContainer.innerHTML = stocksHTML;
  
  // 更新统计信息
  updateRankingStats(stocks, listType);
}

/**
 * 更新榜单统计信息
 * @param {Array} stocks - 股票数据
 * @param {string} listType - 榜单类型
 */
function updateRankingStats(stocks, listType) {
  const statsContainer = document.getElementById('ranking-stats');
  if (!statsContainer || !stocks.length) return;
  
  const totalCount = stocks.length;
  let statsHTML = `<span class="stat-item">共 ${totalCount} 只股票</span>`;
  
  // 根据榜单类型添加特定统计
  if (listType === 'top_gainers' || listType === 'top_losers') {
    const avgChange = (stocks.reduce((sum, stock) => sum + (stock.change_percent || 0), 0) / totalCount).toFixed(2);
    statsHTML += `<span class="stat-item">平均涨跌幅: ${avgChange}%</span>`;
  }
  
  statsContainer.innerHTML = statsHTML;
}

/**
 * 显示加载状态
 */
function showLoadingSpinner() {
  const listContainer = document.getElementById('ranking-list');
  if (listContainer) {
    listContainer.innerHTML = '<li class="loading-item">📊 正在加载数据...</li>';
  }
}

/**
 * 隐藏加载状态
 */
function hideLoadingSpinner() {
  // 加载状态会被实际数据替换，这里可以添加额外的UI清理逻辑
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showErrorMessage(message) {
  const listContainer = document.getElementById('ranking-list');
  if (listContainer) {
    listContainer.innerHTML = `<li class="error-item">❌ ${message}</li>`;
  }
}

// 跳转到榜单详情页面
function navigateToRankingDetail(type) {
  const currentMarket = getCurrentMarket();
  const detailUrl = `mobile-ranking-detail.html?type=${type}&market=${currentMarket}`;
  window.location.href = detailUrl;
}

/**
 * 绑定市场切换事件（用于二级页面）
 * @param {string} currentListType - 当前榜单类型
 */
function bindMarketSwitchEvents(currentListType) {
  const sp500Btn = document.getElementById('sp500-btn');
  const chineseBtn = document.getElementById('chinese-btn');
  
  if (sp500Btn) {
    sp500Btn.addEventListener('click', () => {
      const newUrl = `${window.location.pathname}?market=sp500&list=${currentListType}`;
      window.location.href = newUrl;
    });
  }
  
  if (chineseBtn) {
    chineseBtn.addEventListener('click', () => {
      const newUrl = `${window.location.pathname}?market=chinese_stocks&list=${currentListType}`;
      window.location.href = newUrl;
    });
  }
}

// 当整个页面加载完成后，开始执行我们的脚本
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 趋势页面脚本开始执行...');
  
  // --- 智能路由核心 ---
  const pageType = getCurrentPageType();
  const urlParams = new URLSearchParams(window.location.search);
  const market = urlParams.get('market') || getCurrentMarket();
  const listType = urlParams.get('list');
  
  console.log(`🔍 页面类型: ${pageType}, 市场: ${market}, 榜单类型: ${listType}`);
  
  if (pageType === 'list-detail' && listType) {
     // 二级榜单页面逻辑
     console.log('📋 加载二级榜单页面...');
     loadAndRenderSingleList(market, listType);
     
     // 绑定市场切换事件（如果存在）
     bindMarketSwitchEvents(listType);
     
   } else {
     // 一级趋势页面逻辑（原有逻辑）
     console.log('📊 加载一级趋势页面...');
    
    // 更新市场导航状态
    updateMarketNavigation();
    
    // 并发地加载所有榜单和汇总数据
    loadAndRenderSummaryData(); // <-- 新增的调用
    TRENDING_LISTS_CONFIG.forEach(loadAndRenderList);
    
    // 为榜单导航按钮添加点击事件
    const rankingNavBtns = document.querySelectorAll('.ranking-nav-btn');
    rankingNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const rankingType = btn.getAttribute('data-ranking');
        if (rankingType) {
          navigateToRankingDetail(rankingType);
        }
      });
    });
    
    // 为所有"更多"按钮添加事件监听
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('more-btn') || e.target.classList.contains('more-btn-small')) {
        const type = e.target.getAttribute('data-type');
        if (type) {
          handleMoreButtonClick(type);
        }
      }
      
      // 处理顶部导航的市场切换按钮
      if (e.target.classList.contains('market-carousel-btn')) {
        const targetMarket = e.target.getAttribute('data-market-target');
        if (targetMarket) {
          // 跳转到对应市场的榜单首页
          const currentUrl = new URL(window.location);
          currentUrl.searchParams.set('market', targetMarket);
          window.location.href = currentUrl.toString();
        }
      }
      
      // 处理榜单右侧的市场切换按钮
      if (e.target.classList.contains('market-toggle-btn')) {
        const targetMarket = e.target.getAttribute('data-market-target');
        if (targetMarket) {
          // 跳转到对应市场的榜单首页
          const currentUrl = new URL(window.location);
          currentUrl.searchParams.set('market', targetMarket);
          window.location.href = currentUrl.toString();
        }
      }
      
      // 处理榜单卡片内的市场切换链接
      if (e.target.classList.contains('market-link')) {
        e.preventDefault();
        const targetMarket = e.target.getAttribute('data-market');
        if (targetMarket) {
          // 跳转到对应市场的榜单首页
          const currentUrl = new URL(window.location);
          currentUrl.searchParams.set('market', targetMarket);
          window.location.href = currentUrl.toString();
        }
      }
      
      // 处理榜单卡片内的"查看更多"链接
      if (e.target.classList.contains('more-btn-link')) {
        e.preventDefault();
        const type = e.target.getAttribute('data-type');
        if (type) {
          handleMoreButtonClick(type);
        }
      }
    });
  }
  
  console.log('✅ 趋势页面脚本执行完成');
});

// 将函数暴露到全局作用域，供HTML中的onclick使用
window.navigateToRankingDetail = navigateToRankingDetail;