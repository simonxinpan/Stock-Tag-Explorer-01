// 文件: /public/js/desktop-detail-app.js
// 版本: JS-Desktop-Detail-v1.0
// 专用于桌面版二级页面 (list-detail.html)

// ================================================================
// == 工具函数：获取当前页面状态 ==
// ================================================================

/**
 * 获取当前市场类型
 * @returns {string} 'sp500' | 'chinese_stocks'
 */
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500';
}

/**
 * 获取当前榜单类型
 * @returns {string|null} 榜单类型，如 'top_gainers'
 */
function getCurrentListType() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('list') || urlParams.get('type');
}

/**
 * 获取当前页面类型
 * @returns {string} 'trending' | 'list-detail'
 */
function getCurrentPageType() {
  if (window.location.pathname.includes('list-detail')) {
    return 'list-detail';
  }
  return 'trending';
}

// ================================================================
// == 榜单配置数据 ==
// ================================================================

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

// ================================================================
// == 数据格式化函数 ==
// ================================================================

/**
 * 格式化市值（通用函数，自动判断市场类型）
 * @param {number} marketCapInUSD - 市值（美元）
 * @returns {string} 格式化后的市值字符串
 */
function formatMarketCap(marketCapInUSD) {
  if (!marketCapInUSD || marketCapInUSD <= 0) return 'N/A';
  
  const billion = 1000000000;
  const million = 1000000;
  
  if (marketCapInUSD >= billion) {
    return `$${(marketCapInUSD / billion).toFixed(1)}B`;
  } else if (marketCapInUSD >= million) {
    return `$${(marketCapInUSD / million).toFixed(0)}M`;
  } else {
    return `$${marketCapInUSD.toFixed(0)}`;
  }
}

/**
 * 格式化标普500市值（数据库存储的是百万美元）
 * @param {number} marketCapInMillions - 市值（百万美元）
 * @returns {string} 格式化后的市值字符串
 */
function formatSP500MarketCap(marketCapInMillions) {
  if (!marketCapInMillions || marketCapInMillions <= 0) return 'N/A';
  
  const marketCapInUSD = marketCapInMillions * 1000000; // 转换为美元
  return formatMarketCap(marketCapInUSD);
}

/**
 * 格式化中概股市值（数据库存储的是美元）
 * @param {number} marketCapInUSD - 市值（美元）
 * @returns {string} 格式化后的市值字符串
 */
function formatChineseStockMarketCap(marketCapInUSD) {
  if (!marketCapInUSD || marketCapInUSD <= 0) return 'N/A';
  return formatMarketCap(marketCapInUSD);
}

/**
 * 格式化大数字
 * @param {number} value - 数值
 * @returns {string} 格式化后的字符串
 */
function formatLargeNumber(value) {
  if (!value || value <= 0) return 'N/A';
  
  const billion = 1000000000;
  const million = 1000000;
  const thousand = 1000;
  
  if (value >= billion) {
    return `${(value / billion).toFixed(1)}B`;
  } else if (value >= million) {
    return `${(value / million).toFixed(1)}M`;
  } else if (value >= thousand) {
    return `${(value / thousand).toFixed(1)}K`;
  } else {
    return value.toFixed(0);
  }
}

/**
 * 格式化成交额
 * @param {number} value - 成交额
 * @returns {string} 格式化后的成交额
 */
function formatTurnover(value) {
  return formatLargeNumber(value, true);
}

// ================================================================
// == 股票列表项HTML生成 ==
// ================================================================

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
  
  const {
    ticker = 'N/A',
    name_zh = '',
    name_en = '',
    last_price = 0,
    change_amount = 0,
    change_percent = 0,
    market_cap = 0,
    volume = 0,
    turnover = 0
  } = stock;

  // 根据市场类型选择显示的名称 - 优先显示中文名称
  const displayName = name_zh || name_en || ticker;
  
  // 格式化价格
  const formattedPrice = last_price ? `$${parseFloat(last_price).toFixed(2)}` : 'N/A';
  
  // 格式化涨跌额
  const formattedChange = change_amount ? `${change_amount >= 0 ? '+' : ''}$${parseFloat(change_amount).toFixed(2)}` : 'N/A';
  
  // 格式化涨跌幅
  const formattedPercent = change_percent ? `${change_percent >= 0 ? '+' : ''}${parseFloat(change_percent).toFixed(2)}%` : 'N/A';
  
  // 格式化市值
  let formattedMarketCap = 'N/A';
  if (market_cap) {
    if (marketType === 'chinese_stocks') {
      formattedMarketCap = formatChineseStockMarketCap(market_cap);
    } else {
      formattedMarketCap = formatSP500MarketCap(market_cap);
    }
  }
  
  // 格式化成交量
  const formattedVolume = volume ? formatLargeNumber(volume) : 'N/A';
  
  // 格式化成交额
  const formattedTurnover = turnover ? formatTurnover(turnover) : 'N/A';
  
  // 确定涨跌颜色类
  let changeClass = 'neutral';
  if (change_percent > 0) changeClass = 'positive';
  else if (change_percent < 0) changeClass = 'negative';
  
  // 根据榜单类型显示不同的指标
  let metricHTML = '';
  switch (type) {
    case 'top_market_cap':
      metricHTML = `<span class="metric-value">${formattedMarketCap}</span>`;
      break;
    case 'top_volume':
      metricHTML = `<span class="metric-value">${formattedVolume}</span>`;
      break;
    case 'top_turnover':
      metricHTML = `<span class="metric-value">${formattedTurnover}</span>`;
      break;
    default:
      metricHTML = `<span class="metric-value">${formattedMarketCap}</span>`;
  }

  return `
    <li class="stock-item" data-ticker="${ticker}">
      <div class="stock-rank">${rank}</div>
      <div class="stock-info">
        <div class="stock-symbol">${ticker}</div>
        <div class="stock-name">${displayName}</div>
      </div>
      <div class="stock-price">
        <div class="current-price">${formattedPrice}</div>
        <div class="price-change ${changeClass}">
          <span class="change-amount">${formattedChange}</span>
          <span class="change-percent">${formattedPercent}</span>
        </div>
      </div>
      <div class="stock-metric">
        ${metricHTML}
      </div>
    </li>
  `;
}

// ================================================================
// == 核心业务逻辑：二级页面专用 ==
// ================================================================

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
  
  // 更新市场切换按钮状态
  updateMarketButtons(market);
}

/**
 * 更新市场切换按钮的状态
 * @param {string} currentMarket - 当前市场
 */
function updateMarketButtons(currentMarket) {
  const sp500Btn = document.getElementById('sp500-btn');
  const chineseBtn = document.getElementById('chinese-btn');
  
  if (sp500Btn && chineseBtn) {
    // 移除所有active类
    sp500Btn.classList.remove('active');
    chineseBtn.classList.remove('active');
    
    // 为当前市场添加active类
    if (currentMarket === 'sp500') {
      sp500Btn.classList.add('active');
    } else if (currentMarket === 'chinese_stocks') {
      chineseBtn.classList.add('active');
    }
  }
}

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
// == 主执行逻辑 ==
// ================================================================

/**
 * 桌面版二级页面主执行函数
 */
async function main() {
    try {
        console.log("📊 桌面版二级页面脚本开始执行...");

        const urlParams = new URLSearchParams(window.location.search);
        const market = urlParams.get('market') || getCurrentMarket();
        const listType = getCurrentListType();

        console.log(`🔍 市场: ${market}, 榜单类型: ${listType || 'N/A'}`);

        if (listType) {
            console.log(`📋 加载桌面版二级榜单页面...`);
            // 直接 await 调用，确保我们能看到它的完整执行过程
            await loadAndRenderSingleList(market, listType);
            
            // 绑定市场切换事件
            bindMarketSwitchEvents(listType);
        } else {
            console.error('❌ 未找到榜单类型参数，无法加载页面');
        }

        console.log("✅ 桌面版二级页面脚本执行完成");

    } catch (error) {
        console.error("❌ 桌面版二级页面脚本主流程发生致命错误:", error);
    }
}

// 页面加载完成后执行主函数
main();