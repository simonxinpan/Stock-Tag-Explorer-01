// ================================================================
// == 移动版股票榜单应用 - 基于桌面版trending.js的完美逻辑 ==
// ================================================================

// 获取当前市场类型
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500';
}

// 获取当前榜单类型
function getCurrentListType() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('list') || urlParams.get('type');
}

// 获取当前页面类型
function getCurrentPageType() {
  const path = window.location.pathname;
  if (path.includes('list-detail') || path.includes('mobile-ranking-detail')) {
    return 'list-detail';
  }
  return 'trending';
}

// 更新市场导航状态
function updateMarketNavigation() {
  const currentMarket = getCurrentMarket();
  
  // 更新市场切换按钮状态
  const marketButtons = document.querySelectorAll('.market-carousel-btn');
  marketButtons.forEach(btn => {
    const targetMarket = btn.getAttribute('data-market-target');
    btn.classList.toggle('active', targetMarket === currentMarket);
  });
  
  // 更新页面标题中的市场信息
  const marketTitle = document.getElementById('market-title');
  if (marketTitle) {
    marketTitle.textContent = currentMarket === 'chinese_stocks' ? '中概股' : '标普500';
  }
}

// 榜单配置
const TRENDING_LISTS_CONFIG = [
  { id: 'top-gainers-list', type: 'top_gainers' },
  { id: 'top-market-cap-list', type: 'top_market_cap' },
  { id: 'new-highs-list', type: 'new_highs' },
  { id: 'top-turnover-list', type: 'top_turnover' },
  { id: 'top-volatility-list', type: 'top_volatility' },
  { id: 'top-gap-up-list', type: 'top_gap_up' },
  { id: 'top-losers-list', type: 'top_losers' },
  { id: 'new-lows-list', type: 'new_lows' },
  { id: 'institutional-focus-list', type: 'institutional_focus' },
  { id: 'retail-hot-list', type: 'retail_hot' },
  { id: 'smart-money-list', type: 'smart_money' },
  { id: 'high-liquidity-list', type: 'high_liquidity' },
  { id: 'unusual-activity-list', type: 'unusual_activity' },
  { id: 'momentum-stocks-list', type: 'momentum_stocks' }
];

// 榜单详细配置
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
 * 创建股票列表项的HTML
 * @param {Object} stock - 股票数据
 * @param {string} type - 榜单类型
 * @param {number} rank - 排名
 * @param {string} marketType - 市场类型
 * @returns {string} HTML字符串
 */
function createStockListItemHTML(stock, type, rank, marketType = 'sp500') {
  if (!stock) return '';
  
  // 基础信息
  const symbol = stock.symbol || 'N/A';
  const name = stock.name || 'N/A';
  const price = stock.price ? parseFloat(stock.price).toFixed(2) : 'N/A';
  
  // 涨跌幅处理
  let changePercent = 'N/A';
  let changeClass = '';
  if (stock.change_percent !== null && stock.change_percent !== undefined) {
    const change = parseFloat(stock.change_percent);
    changePercent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeClass = change >= 0 ? 'positive' : 'negative';
  }
  
  // 根据榜单类型显示不同的指标
  let metricValue = 'N/A';
  let metricLabel = '';
  
  switch (type) {
    case 'top_gainers':
    case 'top_losers':
      metricValue = changePercent;
      metricLabel = '涨跌幅';
      break;
    case 'top_market_cap':
      if (stock.market_cap) {
        // 根据市场类型使用不同的格式化函数
        if (marketType === 'chinese_stocks') {
          metricValue = formatChineseStockMarketCap(stock.market_cap);
        } else {
          metricValue = formatSP500MarketCap(stock.market_cap);
        }
      }
      metricLabel = '市值';
      break;
    case 'top_turnover':
      metricValue = stock.turnover ? formatTurnover(stock.turnover) : 'N/A';
      metricLabel = '成交额';
      break;
    case 'top_volatility':
      metricValue = stock.volatility ? parseFloat(stock.volatility).toFixed(2) + '%' : 'N/A';
      metricLabel = '振幅';
      break;
    case 'top_gap_up':
      metricValue = stock.gap_up ? parseFloat(stock.gap_up).toFixed(2) + '%' : 'N/A';
      metricLabel = '高开幅度';
      break;
    case 'new_highs':
      metricValue = stock.high_52w ? '$' + parseFloat(stock.high_52w).toFixed(2) : 'N/A';
      metricLabel = '52周最高';
      break;
    case 'new_lows':
      metricValue = stock.low_52w ? '$' + parseFloat(stock.low_52w).toFixed(2) : 'N/A';
      metricLabel = '52周最低';
      break;
    case 'institutional_focus':
      metricValue = stock.institutional_score ? parseFloat(stock.institutional_score).toFixed(1) : 'N/A';
      metricLabel = '机构评分';
      break;
    case 'retail_hot':
      metricValue = stock.retail_score ? parseFloat(stock.retail_score).toFixed(1) : 'N/A';
      metricLabel = '散户热度';
      break;
    case 'smart_money':
      metricValue = stock.smart_money_score ? parseFloat(stock.smart_money_score).toFixed(1) : 'N/A';
      metricLabel = '主力评分';
      break;
    case 'high_liquidity':
      metricValue = stock.liquidity_score ? parseFloat(stock.liquidity_score).toFixed(1) : 'N/A';
      metricLabel = '流动性';
      break;
    case 'unusual_activity':
      metricValue = stock.activity_score ? parseFloat(stock.activity_score).toFixed(1) : 'N/A';
      metricLabel = '异动指数';
      break;
    case 'momentum_stocks':
      metricValue = stock.momentum_score ? parseFloat(stock.momentum_score).toFixed(1) : 'N/A';
      metricLabel = '动量评分';
      break;
    default:
      metricValue = changePercent;
      metricLabel = '涨跌幅';
  }
  
  return `
    <li class="stock-item">
      <div class="stock-rank">${rank}</div>
      <div class="stock-info">
        <div class="stock-symbol">${symbol}</div>
        <div class="stock-name">${name}</div>
      </div>
      <div class="stock-price">
        <div class="price">$${price}</div>
        <div class="change ${changeClass}">${changePercent}</div>
      </div>
      <div class="stock-metric">
        <div class="metric-value">${metricValue}</div>
        <div class="metric-label">${metricLabel}</div>
      </div>
    </li>
  `;
}

/**
 * 格式化市值（通用函数，已弃用，保留兼容性）
 */
function formatMarketCap(marketCapInUSD) {
  if (!marketCapInUSD || marketCapInUSD === 0) return 'N/A';
  
  const value = parseFloat(marketCapInUSD);
  if (value >= 1e12) {
    return (value / 1e12).toFixed(2) + 'T';
  } else if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else {
    return value.toFixed(2);
  }
}

/**
 * 格式化标普500市值（数据库存储单位：百万美元）
 */
function formatSP500MarketCap(marketCapInMillions) {
  if (!marketCapInMillions || marketCapInMillions === 0) return 'N/A';
  
  const valueInMillions = parseFloat(marketCapInMillions);
  if (valueInMillions >= 1000000) {
    return (valueInMillions / 1000000).toFixed(2) + 'T';
  } else if (valueInMillions >= 1000) {
    return (valueInMillions / 1000).toFixed(2) + 'B';
  } else {
    return valueInMillions.toFixed(2) + 'M';
  }
}

/**
 * 格式化中概股市值（数据库存储单位：美元）
 */
function formatChineseStockMarketCap(marketCapInUSD) {
  if (!marketCapInUSD || marketCapInUSD === 0) return 'N/A';
  
  const value = parseFloat(marketCapInUSD);
  if (value >= 1e12) {
    return (value / 1e12).toFixed(2) + 'T';
  } else if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else {
    return value.toFixed(2);
  }
}

/**
 * 格式化大数字
 */
function formatLargeNumber(value) {
  if (!value || value === 0) return 'N/A';
  
  const num = parseFloat(value);
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + 'T';
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  } else {
    return num.toFixed(2);
  }
}

/**
 * 加载并渲染榜单数据
 */
async function loadAndRenderList(listConfig) {
  const { id, type } = listConfig;
  const listElement = document.getElementById(id);
  
  if (!listElement) {
    console.warn(`榜单容器 ${id} 不存在`);
    return;
  }
  
  try {
    const currentMarket = getCurrentMarket();
    const response = await fetch(`/api/ranking?market=${currentMarket}&type=${type}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const stocks = await response.json();
    
    if (!stocks || stocks.length === 0) {
      listElement.innerHTML = '<li class="no-data">暂无数据</li>';
      return;
    }
    
    // 只显示前5条数据
    const topStocks = stocks.slice(0, 5);
    const stocksHTML = topStocks.map((stock, index) => 
      createStockListItemHTML(stock, type, index + 1, currentMarket)
    ).join('');
    
    listElement.innerHTML = stocksHTML;
    
  } catch (error) {
    console.error(`加载榜单 ${type} 失败:`, error);
    listElement.innerHTML = '<li class="error">加载失败</li>';
  }
}

/**
 * 处理"更多"按钮点击事件
 */
async function handleMoreButtonClick(type) {
  const currentMarket = getCurrentMarket();
  const pageType = getCurrentPageType();
  
  if (pageType === 'trending') {
    // 从一级页面跳转到二级页面
    window.location.href = `mobile-ranking-detail.html?type=${type}&market=${currentMarket}`;
  } else {
    // 在二级页面内切换榜单
    window.location.href = `mobile-ranking-detail.html?type=${type}&market=${currentMarket}`;
  }
}

/**
 * 获取榜单标题
 */
function getRankingTitle(type) {
  const config = RANKING_CONFIG[type];
  return config ? config.title : '未知榜单';
}

/**
 * 格式化大数字（带货币选项）
 */
function formatLargeNumber(value, isCurrency = false) {
  if (!value || value === 0) return 'N/A';
  
  const num = parseFloat(value);
  const prefix = isCurrency ? '$' : '';
  
  if (num >= 1e12) {
    return prefix + (num / 1e12).toFixed(2) + 'T';
  } else if (num >= 1e9) {
    return prefix + (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    return prefix + (num / 1e6).toFixed(2) + 'M';
  } else if (num >= 1e3) {
    return prefix + (num / 1e3).toFixed(2) + 'K';
  } else {
    return prefix + num.toFixed(2);
  }
}

/**
 * 格式化成交额
 */
function formatTurnover(value) {
  return formatLargeNumber(value, true);
}

/**
 * 加载并渲染市场汇总数据
 */
async function loadAndRenderSummaryData() {
  try {
    const currentMarket = getCurrentMarket();
    const response = await fetch(`/api/market-summary?market=${currentMarket}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 更新汇总数据显示
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
  if (!statsContainer || !stocks.length) return;
  
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
  if (!navigationContainer) return;

  const navigationHTML = TRENDING_LISTS_CONFIG.map(config => {
    const rankingConfig = RANKING_CONFIG[config.type];
    if (!rankingConfig) return '';
    
    const isActive = config.type === currentListType;
    const activeClass = isActive ? 'active' : '';
    
    // 提取emoji图标
    const titleParts = rankingConfig.title.split(' ');
    const icon = titleParts[0];
    const name = titleParts.slice(1).join(' ');
    
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
}

// ================================================================
// == 最终执行模式：将主逻辑封装为独立的、自执行的异步函数 ==
// ================================================================

// 1. 将所有主逻辑，都放入一个名为 main 的异步函数中
async function main() {
    try {
        console.log("📊 移动版趋势页面脚本开始执行...");

        const urlParams = new URLSearchParams(window.location.search);
        const pageType = getCurrentPageType();
        const market = urlParams.get('market') || getCurrentMarket();
        const listType = getCurrentListType(); // 使用getCurrentListType函数，它已经处理了list和type参数

        console.log(`🔍 页面类型: ${pageType}, 市场: ${market}, 榜单类型: ${listType || 'N/A'}`);

        if (pageType === 'list-detail' && listType) {
            console.log(`📋 加载二级榜单页面...`);
            // 直接 await 调用，确保我们能看到它的完整执行过程
            await loadAndRenderSingleList(market, listType);
            
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

        console.log("✅ 移动版趋势页面脚本执行完成");

    } catch (error) {
        console.error("❌ 移动版脚本主流程发生致命错误:", error);
    }
}

// 2. 在脚本的最后，直接调用这个 main 函数
main();

// 将函数暴露到全局作用域，供HTML中的onclick使用
window.navigateToRankingDetail = navigateToRankingDetail;