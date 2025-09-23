// public/js/trending.js
// 版本: Desktop-Overview-Only-v1.0 (精简版，仅服务于trending.html一级页面)

// 获取当前市场类型
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500'; // 默认为标普500
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
  const colorClass = changePercent >= 0 ? 'positive' : 'negative';
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
    const unchangedStocksEl = document.getElementById('summary-unchanged-stocks') || document.getElementById('unchanged-stocks');

    if (totalStocksEl) totalStocksEl.textContent = data.total_stocks || '--';
    if (risingStocksEl) risingStocksEl.textContent = data.rising_stocks || '--';
    if (fallingStocksEl) fallingStocksEl.textContent = data.falling_stocks || '--';
    if (unchangedStocksEl) unchangedStocksEl.textContent = data.unchanged_stocks || '--';

  } catch (error) {
    console.error('加载市场汇总数据失败:', error);
    // 如果加载失败，显示默认值
    const totalStocksEl = document.getElementById('summary-total-stocks') || document.getElementById('total-stocks');
    const risingStocksEl = document.getElementById('summary-rising-stocks') || document.getElementById('rising-stocks');
    const fallingStocksEl = document.getElementById('summary-falling-stocks') || document.getElementById('falling-stocks');
    const unchangedStocksEl = document.getElementById('summary-unchanged-stocks') || document.getElementById('unchanged-stocks');

    if (totalStocksEl) totalStocksEl.textContent = '--';
    if (risingStocksEl) risingStocksEl.textContent = '--';
    if (fallingStocksEl) fallingStocksEl.textContent = '--';
    if (unchangedStocksEl) unchangedStocksEl.textContent = '--';
  }
}

// 主函数：初始化页面
async function main() {
  console.log('🚀 trending.js 初始化开始 (Desktop-Overview-Only-v1.0)');
  
  // 更新市场导航状态
  updateMarketNavigation();
  
  // 加载市场汇总数据
  await loadAndRenderSummaryData();
  
  // 并行加载所有榜单数据
  const loadPromises = TRENDING_LISTS_CONFIG.map(listConfig => loadAndRenderList(listConfig));
  await Promise.all(loadPromises);
  
  // 绑定所有"查看更多"按钮的点击事件
  const moreButtons = document.querySelectorAll('.more-btn-link');
  moreButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault(); // 阻止默认的链接跳转
      const type = button.getAttribute('data-type');
      if (type) {
        handleMoreButtonClick(type);
      }
    });
  });
  
  console.log('✅ 所有榜单数据加载完成，事件监听器已绑定');
}

// 页面加载完成后执行主函数
document.addEventListener('DOMContentLoaded', main);

// 导出全局函数供HTML调用
window.handleMoreButtonClick = handleMoreButtonClick;