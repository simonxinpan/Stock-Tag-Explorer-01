// public/js/trending.js
// 版本: SPA & Multi-page Routing Enabled

// 获取当前市场类型
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500'; // 默认为标普500
}

// 获取当前榜单类型（支持桌面版list参数和移动版type参数）
function getCurrentListType() {
  const urlParams = new URLSearchParams(window.location.search);
  // 优先使用list参数（桌面版），其次使用type参数（移动版）
  return urlParams.get('list') || urlParams.get('type') || null;
}

// 检测当前页面类型
function getCurrentPageType() {
  const pathname = window.location.pathname;
  if (pathname.includes('list-detail.html') || pathname.includes('mobile-ranking-detail.html')) {
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

// 更新市场导航按钮的激活状态
function updateMarketNavButtons() {
  const currentMarket = getCurrentMarket();
  const sp500Btn = document.getElementById('sp500-nav-btn');
  const chineseStocksBtn = document.getElementById('chinese-stocks-nav-btn');
  
  if (sp500Btn && chineseStocksBtn) {
    // 移除所有激活状态
    sp500Btn.classList.remove('active');
    chineseStocksBtn.classList.remove('active');
    
    // 根据当前市场添加激活状态
    if (currentMarket === 'chinese_stocks') {
      chineseStocksBtn.classList.add('active');
    } else {
      sp500Btn.classList.add('active');
    }
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
  // 🚀 Project Golden Render - 最终健壮版渲染逻辑
  // 使用空值合并操作符 (??) 和 || 确保所有字段都有安全回退
  
  const ticker = stock.ticker ?? 'N/A';
  const name = stock.name_zh || stock.name_en || stock.name || '未知名称';
  const last_price = parseFloat(stock.last_price);
  const change_percent = parseFloat(stock.change_percent);
  
  // 健壮的价格和涨跌幅处理
  const price = !isNaN(last_price) ? last_price : 0;
  const changePercent = !isNaN(change_percent) ? change_percent : 0;
  const colorClass = changePercent >= 0 ? 'positive' : 'negative';
  const sign = changePercent >= 0 ? '+' : '';
   
  // 构建指向正确详情页的链接
  const detailsPageUrl = `https://stock-details-final.vercel.app/?symbol=${ticker}`;

  // 根据榜单类型决定显示哪个核心数据
  let mainMetricHTML = '';
  switch (type) {
    case 'top_turnover':
      // 成交额榜显示成交额
      const turnover = stock.turnover && !isNaN(parseFloat(stock.turnover)) ? formatLargeNumber(stock.turnover) : 'N/A';
      mainMetricHTML = `<div class="price">${turnover}</div>`;
      break;
    case 'top_volatility':
      // 振幅榜显示振幅百分比
      const amplitude_val = parseFloat(stock.amplitude_percent);
      const amplitude = !isNaN(amplitude_val) ? `${amplitude_val.toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${amplitude}</div>`;
      break;
    case 'top_gap_up':
      // 高开缺口榜显示缺口百分比
      const gap_val = parseFloat(stock.gap_percent);
      const gapPercent = !isNaN(gap_val) ? `${gap_val.toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${gapPercent}</div>`;
      break;
    case 'top_losers':
      // 跌幅榜显示价格和跌幅
      const losersPrice = !isNaN(price) ? `$${price.toFixed(2)}` : 'N/A';
      mainMetricHTML = `<div class="price">${losersPrice}</div>`;
      break;
    case 'new_lows':
      // 新低榜显示52周最低价
      const week_low_val = parseFloat(stock.week_52_low);
      const weekLow = !isNaN(week_low_val) ? `$${week_low_val.toFixed(2)}` : 'N/A';
      mainMetricHTML = `<div class="price">${weekLow}</div>`;
      break;
    case 'new_highs':
      // 新高榜显示52周最高价
      const week_high_val = parseFloat(stock.week_52_high);
      const weekHigh = !isNaN(week_high_val) ? `$${week_high_val.toFixed(2)}` : 'N/A';
      mainMetricHTML = `<div class="price">${weekHigh}</div>`;
      break;
    // 🆕 基于Polygon API数据的新榜单
    case 'institutional_focus':
      // 机构关注榜显示成交额和VWAP偏离度
      const instTurnover = stock.turnover && !isNaN(parseFloat(stock.turnover)) ? formatLargeNumber(stock.turnover) : 'N/A';
      const vwap_val = parseFloat(stock.price_vs_vwap_percent);
      const vwapPercent = !isNaN(vwap_val) ? `${vwap_val.toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${instTurnover}</div><div class="metric-small">vs VWAP: ${vwapPercent}</div>`;
      break;
    case 'retail_hot':
      // 散户热门榜显示交易笔数和每百万股交易笔数
      const tradeCount = stock.trade_count && !isNaN(parseFloat(stock.trade_count)) ? formatLargeNumber(stock.trade_count) : 'N/A';
      const trades_per_mil_val = parseFloat(stock.trades_per_million_shares);
      const tradesPerMillion = !isNaN(trades_per_mil_val) ? trades_per_mil_val.toFixed(1) : 'N/A';
      mainMetricHTML = `<div class="price">${tradeCount}笔</div><div class="metric-small">${tradesPerMillion}/M股</div>`;
      break;
    case 'smart_money':
      // 主力动向榜显示VWAP偏离度和成交额
      const smart_vwap_val = parseFloat(stock.price_vs_vwap_percent);
      const smartVwapPercent = !isNaN(smart_vwap_val) ? `+${smart_vwap_val.toFixed(2)}%` : 'N/A';
      const smartTurnover = stock.turnover && !isNaN(parseFloat(stock.turnover)) ? formatLargeNumber(stock.turnover) : 'N/A';
      mainMetricHTML = `<div class="price">${smartVwapPercent}</div><div class="metric-small">${smartTurnover}</div>`;
      break;
    case 'high_liquidity':
      // 高流动性榜显示成交量和换手率
      const volume = stock.volume && !isNaN(parseFloat(stock.volume)) ? formatLargeNumber(stock.volume) : 'N/A';
      const turnover_rate_val = parseFloat(stock.turnover_rate_percent);
      const turnoverRate = !isNaN(turnover_rate_val) ? `${turnover_rate_val.toFixed(2)}%` : 'N/A';
      mainMetricHTML = `<div class="price">${volume}</div><div class="metric-small">换手率: ${turnoverRate}</div>`;
      break;
    case 'unusual_activity':
      // 异动榜显示交易笔数和异常指标
      const unusualTrades = stock.trade_count && !isNaN(parseFloat(stock.trade_count)) ? formatLargeNumber(stock.trade_count) : 'N/A';
      const unusual_ratio_val = parseFloat(stock.trades_per_million_shares);
      const unusualRatio = !isNaN(unusual_ratio_val) ? unusual_ratio_val.toFixed(1) : 'N/A';
      mainMetricHTML = `<div class="price">${unusualTrades}笔</div><div class="metric-small">异动指数: ${unusualRatio}</div>`;
      break;
    case 'momentum_stocks':
      // 动量榜显示动量评分和成交量
      const momentum_score_val = parseFloat(stock.momentum_score);
      const momentumScore = !isNaN(momentum_score_val) ? momentum_score_val.toFixed(2) : 'N/A';
      const momentumVolume = stock.volume && !isNaN(parseFloat(stock.volume)) ? formatLargeNumber(stock.volume) : 'N/A';
      mainMetricHTML = `<div class="price">评分: ${momentumScore}</div><div class="metric-small">${momentumVolume}</div>`;
      break;
    case 'top_market_cap':
      // 市值榜显示市值和价格，根据市场类型调用不同的格式化函数
      let marketCapFormatted = 'N/A';
      const market_cap_val = parseFloat(stock.market_cap);
      if (!isNaN(market_cap_val) && market_cap_val > 0) {
        if (marketType === 'chinese_stocks') {
          // 中概股：调用中概股专属函数（输入为美元）
          marketCapFormatted = formatChineseStockMarketCap(stock.market_cap);
        } else {
          // 标普500：调用标普500专属函数（输入为百万美元）
          marketCapFormatted = formatSP500MarketCap(stock.market_cap);
        }
      }
      const marketCapPrice = !isNaN(price) ? `$${price.toFixed(2)}` : 'N/A';
      mainMetricHTML = `<div class="price">${marketCapFormatted}</div><div class="metric-small">${marketCapPrice}</div>`;
      break;
    default: // 涨幅榜等默认显示价格和涨跌幅
      const defaultPrice = !isNaN(price) ? `$${price.toFixed(2)}` : 'N/A';
      mainMetricHTML = `<div class="price">${defaultPrice}</div>`;
      break;
  }

  // 健壮的涨跌幅显示
  const changeDisplay = !isNaN(changePercent) ? `${sign}${changePercent.toFixed(2)}%` : 'N/A';

  return `
    <li class="stock-item">
      <a href="${detailsPageUrl}" target="_blank" class="stock-link">
        <div class="stock-header">
          <div class="rank-circle">${rank}</div>
          <div class="stock-basic">
            <div class="name">${name}</div>
            <div class="ticker">${ticker}</div>
          </div>
        </div>
        <div class="stock-metrics">
          ${mainMetricHTML}
          <div class="change ${colorClass}">${changeDisplay}</div>
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
 * 【新增的中概股专用函数】
 * 将一个以【美元】为单位的巨大数字（可能是字符串），格式化为"X,XXX.XX亿美元"的格式。
 */
function formatChineseStockMarketCap(marketCapInUSD) {
  const numericMarketCap = parseFloat(marketCapInUSD);
  if (isNaN(numericMarketCap) || numericMarketCap === 0) return 'N/A';
  const BILLION = 100000000; // 一亿
  const marketCapInHundredMillions = numericMarketCap / BILLION;
  const formattedValue = marketCapInHundredMillions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    console.log(`🔗 跳转到榜单详情页: ${type}`);
    const currentMarket = getCurrentMarket();
    
    // 跳转到二级详情页面
    const detailUrl = `./list-detail.html?market=${currentMarket}&list=${type}`;
    window.location.href = detailUrl;
    
  } catch (error) {
    console.error('跳转榜单详情页失败:', error);
    alert('跳转失败，请稍后重试');
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
 * 【最终调试版】加载并渲染指定的单个榜单（用于二级页面）
 * @param {string} market - 市场类型 'sp500' | 'chinese_stocks'
 * @param {string} listType - 榜单类型 e.g., 'top_gainers', 'top_market_cap'
 */
async function loadAndRenderSingleList(market, listType) {
    console.log(`🔄 [1/5] 开始加载单个榜单: ${listType} (市场: ${market})`);
    const listContainer = document.getElementById('ranking-list'); // 确保这是正确的容器ID

    // DOM 检查: 确保我们的目标容器存在
    if (!listContainer) {
        console.error("❌ [CRITICAL ERROR] 渲染失败: 未在HTML中找到 ID 为 'ranking-list' 的元素。");
        return;
    }
    console.log(`✅ [1/5] 成功找到容器元素 'ranking-list'`);
  
  try {
    listContainer.innerHTML = '<li class="loading-item">📊 正在加载数据...</li>'; // 显示加载状态
    
    const apiUrl = `/api/ranking?market=${market}&type=${listType}`;
    console.log(`🔄 [2/5] 准备请求API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    console.log(`🔄 [3/5] API 响应已收到，状态码: ${response.status}`);

    if (!response.ok) {
      throw new Error(`API请求失败，状态码: ${response.status}`);
    }

    const stocks = await response.json();
    console.log(`🔄 [4/5] 成功解析JSON数据，获取到 ${stocks.length} 条股票记录。`);
    
    if (stocks.length === 0) {
      listContainer.innerHTML = '<li class="no-data-item">📊 暂无数据</li>';
      return;
    }

    // 更新页面标题和UI
    updateSingleListPageUI(listType, market);
    
    // 生成右侧导航按钮
    generateNavigationButtons(listType, market);
    
    // 渲染股票列表
    console.log(`🔄 [5/5] 准备渲染 ${stocks.length} 条股票到页面...`);
    renderSingleRankingList(stocks, listType, market);
    console.log("✅ [SUCCESS] 渲染流程调用完成。");
    
  } catch (error) {
    console.error(`❌ [CRITICAL ERROR] 加载或渲染榜单 ${listType} 时发生错误:`, error);
    if (listContainer) {
      listContainer.innerHTML = `<li class="error-item">❌ 加载${RANKING_CONFIG[listType]?.name || '榜单'}数据失败，请稍后重试</li>`;
    }
  }
}

/**
 * 更新单榜单页面的UI元素
 * @param {string} listType - 榜单类型
 * @param {string} market - 市场类型
 */
function updateSingleListPageUI(listType, market) {
  const config = RANKING_CONFIG[listType];
  if (!config) {
    console.warn(`⚠️ 未找到榜单类型 ${listType} 的配置`);
    return;
  }
  
  // 更新页面标题 - 增强DOM安全性
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  const rankingTitle = document.getElementById('ranking-title');
  const cardTitle = document.getElementById('card-title');
  const cardDescription = document.getElementById('card-description');
  
  // 安全地更新每个元素，避免null引用错误
  if (pageTitle) {
    pageTitle.textContent = config.name;
  } else {
    console.warn('⚠️ 未找到 page-title 元素');
  }
  
  if (pageSubtitle) {
    pageSubtitle.textContent = config.description;
  } else {
    console.warn('⚠️ 未找到 page-subtitle 元素');
  }
  
  if (breadcrumbCurrent) {
    breadcrumbCurrent.textContent = config.name;
  } else {
    console.warn('⚠️ 未找到 breadcrumb-current 元素');
  }
  
  if (rankingTitle) {
    rankingTitle.textContent = config.title;
  } else {
    console.warn('⚠️ 未找到 ranking-title 元素');
  }
  
  if (cardTitle) {
    cardTitle.textContent = config.title;
  } else {
    console.warn('⚠️ 未找到 card-title 元素');
  }
  
  if (cardDescription) {
    cardDescription.textContent = config.description;
  } else {
    console.warn('⚠️ 未找到 card-description 元素');
  }
  
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
  // 桌面版按钮
  const sp500Btn = document.getElementById('sp500-btn');
  const chineseBtn = document.getElementById('chinese-btn');
  
  // 移动版按钮
  const mobileSp500Btn = document.querySelector('[data-market-target="sp500"]');
  const mobileChineseBtn = document.querySelector('[data-market-target="chinese_stocks"]');
  
  // 获取当前榜单类型
  const currentListType = getCurrentListType();
  const currentPageType = getCurrentPageType();
  
  // 更新桌面版按钮
  if (sp500Btn && chineseBtn) {
    sp500Btn.classList.toggle('active', currentMarket === 'sp500');
    chineseBtn.classList.toggle('active', currentMarket === 'chinese_stocks');
    
    if (currentListType) {
      sp500Btn.onclick = () => {
        window.location.href = `list-detail.html?market=sp500&list=${currentListType}`;
      };
      
      chineseBtn.onclick = () => {
        window.location.href = `list-detail.html?market=chinese_stocks&list=${currentListType}`;
      };
      
      sp500Btn.style.pointerEvents = 'auto';
      chineseBtn.style.pointerEvents = 'auto';
      sp500Btn.style.opacity = '1';
      chineseBtn.style.opacity = '1';
    }
  }
  
  // 更新移动版按钮
  if (mobileSp500Btn && mobileChineseBtn) {
    mobileSp500Btn.classList.toggle('active', currentMarket === 'sp500');
    mobileChineseBtn.classList.toggle('active', currentMarket === 'chinese_stocks');
    
    if (currentListType) {
      mobileSp500Btn.onclick = () => {
        if (currentPageType === 'list-detail') {
          window.location.href = `mobile-ranking-detail.html?market=sp500&type=${currentListType}`;
        }
      };
      
      mobileChineseBtn.onclick = () => {
        if (currentPageType === 'list-detail') {
          window.location.href = `mobile-ranking-detail.html?market=chinese_stocks&type=${currentListType}`;
        }
      };
    }
  }
}

/**
 * 渲染单个榜单的股票列表
 * @param {Array} stocks - 股票数据数组
 * @param {string} listType - 榜单类型
 * @param {string} market - 市场类型
 */
/**
 * 【最终调试版】渲染单个榜单的股票列表
 */
function renderSingleRankingList(stocks, listType, market) {
  console.log(`🎨 [RENDER-1/4] 开始渲染榜单，股票数量: ${stocks ? stocks.length : 0}`);
  
  const listContainer = document.getElementById('ranking-list');
  if (!listContainer) {
    console.error("❌ [RENDER-ERROR] 渲染失败: 未在HTML中找到 ID 为 'ranking-list' 的元素。");
    return;
  }
  console.log(`🎨 [RENDER-2/4] 找到容器元素 'ranking-list'`);
  
  if (!stocks || stocks.length === 0) {
    console.log(`🎨 [RENDER-3/4] 无数据，显示空状态`);
    listContainer.innerHTML = '<li class="no-data-item">📊 暂无数据</li>';
    return;
  }
  
  try {
    console.log(`🎨 [RENDER-3/4] 开始生成 ${stocks.length} 条股票的HTML`);
    // 生成股票列表HTML
    const stocksHTML = stocks.map((stock, index) => {
      const html = createStockListItemHTML(stock, listType, index + 1, market);
      if (!html) {
        console.warn(`⚠️ 第 ${index + 1} 条股票HTML生成失败:`, stock);
      }
      return html;
    }).join('');
    
    if (!stocksHTML) {
      console.error(`❌ [RENDER-ERROR] 所有股票HTML生成失败`);
      listContainer.innerHTML = '<li class="error-item">❌ 数据渲染失败</li>';
      return;
    }
    
    console.log(`🎨 [RENDER-4/4] HTML生成成功，长度: ${stocksHTML.length} 字符，开始插入DOM`);
    listContainer.innerHTML = stocksHTML;
    console.log(`✅ [RENDER-SUCCESS] 榜单渲染完成，容器内元素数量: ${listContainer.children.length}`);
    
    // 更新统计信息
    updateRankingStats(stocks, listType);
    
  } catch (error) {
    console.error(`❌ [RENDER-ERROR] 渲染过程中发生错误:`, error);
    listContainer.innerHTML = '<li class="error-item">❌ 渲染失败，请刷新重试</li>';
  }
}

/**
 * 更新榜单统计信息
 * @param {Array} stocks - 股票数据
 * @param {string} listType - 榜单类型
 */
function updateRankingStats(stocks, listType) {
  const statsContainer = document.getElementById('ranking-stats');
  if (!statsContainer) {
    console.warn('⚠️ 未找到 ranking-stats 元素，跳过统计信息更新');
    return;
  }
  
  if (!stocks || !stocks.length) {
    console.warn('⚠️ 股票数据为空，跳过统计信息更新');
    return;
  }
  
  const totalCount = stocks.length;
  let statsHTML = `<span class="stat-item">共 ${totalCount} 只股票</span>`;
  
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

// 生成右侧榜单导航按钮
function generateNavigationButtons(currentListType, currentMarket) {
  const navigationContainer = document.getElementById('navigation-buttons');
  if (!navigationContainer) {
    console.warn('⚠️ 未找到 navigation-buttons 元素，跳过导航按钮生成');
    return;
  }

  if (!currentListType || !currentMarket) {
    console.warn('⚠️ 缺少必要参数，跳过导航按钮生成', { currentListType, currentMarket });
    return;
  }

  try {
    const navigationHTML = TRENDING_LISTS_CONFIG.map(config => {
      const rankingConfig = RANKING_CONFIG[config.type];
      if (!rankingConfig) {
        console.warn(`⚠️ 未找到榜单类型 ${config.type} 的配置`);
        return '';
      }
      
      const isActive = config.type === currentListType;
      const activeClass = isActive ? 'active' : '';
      
      // 提取emoji图标
      const titleParts = rankingConfig.title.split(' ');
      const icon = titleParts[0] || '📊';
      const name = titleParts.slice(1).join(' ') || rankingConfig.name;
      
      return `
        <a href="list-detail.html?market=${currentMarket}&list=${config.type}" 
           class="navigation-button ${activeClass}" 
           data-list-type="${config.type}">
          <span class="navigation-button-icon">${icon}</span>
          <span class="navigation-button-text">${name}</span>
        </a>
      `;
    }).join('');

    navigationContainer.innerHTML = navigationHTML;
    console.log(`✅ 成功生成 ${TRENDING_LISTS_CONFIG.length} 个导航按钮`);
  } catch (error) {
    console.error('❌ 生成导航按钮时发生错误:', error);
    navigationContainer.innerHTML = '<div class="error-message">导航按钮加载失败</div>';
  }
}

// ================================================================
// == 最终执行模式：将主逻辑封装为独立的、自执行的异步函数 ==
// ================================================================

// 【最终健壮版】主入口逻辑
// ================================================================
// == 最终执行模式：将主逻辑封装为独立的、自执行的异步函数 ==
// ================================================================

// 1. 将所有主逻辑，都放入一个名为 main 的异步函数中
async function main() {
  try {
    console.log("📊 趋势页面脚本开始执行...");

    const urlParams = new URLSearchParams(window.location.search);
    const pageName = window.location.pathname.split('/').pop();
    const market = urlParams.get('market') || 'sp500';
    const listType = urlParams.get('list') || urlParams.get('type'); // 支持两种参数名

    console.log(`🔍 页面类型: ${pageName}, 市场: ${market}, 榜单类型: ${listType || 'N/A'}`);

    // 确保事件监听器只绑定一次
    bindEventListenersIfNeeded();

    // 关键的、健壮的分支判断
    if (pageName.includes('list-detail.html') || pageName.includes('mobile-ranking-detail.html')) {
      // --- 这是二级详情页的专属逻辑 ---
      if (listType) {
        console.log(`📋 加载二级榜单页面...`);
        // 🔥 关键修复：直接 await 调用，确保我们能看到它的完整执行过程
        await loadAndRenderSingleList(market, listType);
      } else {
        // 如果是详情页但没有list参数，清晰地显示错误
        const container = document.getElementById('ranking-list') || document.getElementById('ranking-list-container');
        if (container) {
          container.innerHTML = `<li class="error-item">❌ 错误：URL中未指定榜单类型 (Missing 'list' or 'type' parameter)</li>`;
        }
        console.error("❌ 页面错误: 详情页需要一个 'list' 或 'type' URL参数。");
      }
    } else {
      // --- 这是一级概览页的专属逻辑 ---
      console.log(`🏠 加载一级榜单页面...`);
      
      // 更新市场导航状态
      updateMarketNavigation();
      
      // 更新市场导航按钮状态
      updateMarketNavButtons();
      
      // 并发地加载所有榜单和汇总数据
      loadAndRenderSummaryData();
      TRENDING_LISTS_CONFIG.forEach(loadAndRenderList);
    }

    console.log("✅ 趋势页面脚本执行完成");

  } catch (error) {
    console.error("❌ 脚本主流程发生致命错误:", error);
  }
}

// 事件监听器绑定函数（确保只绑定一次）
function bindEventListenersIfNeeded() {
  // 检查是否已经绑定过事件监听器
  if (window.trendingEventsBound) {
    return;
  }
  
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
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('market', targetMarket);
        window.location.href = currentUrl.toString();
      }
    }
    
    // 处理榜单右侧的市场切换按钮
    if (e.target.classList.contains('market-toggle-btn')) {
      const targetMarket = e.target.getAttribute('data-market-target');
      if (targetMarket) {
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
  
  // 标记事件监听器已绑定
  window.trendingEventsBound = true;
}

// 2. 在DOM加载完成后，直接调用这个 main 函数
document.addEventListener('DOMContentLoaded', main);

// 将函数暴露到全局作用域，供HTML中的onclick使用
window.navigateToRankingDetail = navigateToRankingDetail;