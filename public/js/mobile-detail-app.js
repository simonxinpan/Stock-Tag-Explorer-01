// 文件: /public/js/mobile-detail-app.js
// 版本: JS-Mobile-Detail-v1.0
// 专用于移动版二级页面 (mobile-ranking-detail.html)

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
  return urlParams.get('type') || urlParams.get('list');
}

/**
 * 获取当前页面类型
 * @returns {string} 'mobile' | 'mobile-ranking-detail'
 */
function getCurrentPageType() {
  if (window.location.pathname.includes('mobile-ranking-detail')) {
    return 'mobile-ranking-detail';
  }
  return 'mobile';
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
// == 股票列表项HTML生成（移动版适配） ==
// ================================================================

/**
 * 创建移动版股票列表项的HTML
 * @param {Object} stock - 股票数据对象
 * @param {string} type - 榜单类型
 * @param {number} rank - 排名
 * @param {string} marketType - 市场类型
 * @returns {string} HTML字符串
 */
function createMobileStockListItemHTML(stock, type, rank, marketType = 'sp500') {
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
  
  // 格式化涨跌幅
  const changePercent = parseFloat(change_percent) || 0;
  const formattedPercent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
  
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
  
  // 确定涨跌颜色类 - 使用新的颜色类名
  let colorClass = '';
  if (changePercent > 0) colorClass = 'text-green';
  else if (changePercent < 0) colorClass = 'text-red';
  
  // 根据榜单类型显示不同的主要数值
  let valueHTML = '';
  switch (type) {
    case 'top_market_cap':
      valueHTML = formattedMarketCap;
      break;
    case 'top_volume':
      valueHTML = formattedVolume;
      break;
    case 'top_turnover':
      valueHTML = formattedTurnover;
      break;
    default:
      valueHTML = formattedPrice; // 默认显示股价
  }

  // 新的移动版HTML结构 - 左右对齐布局
  return `
    <li class="stock-item-mobile">
      <a href="./mobile-stock-detail.html?symbol=${ticker}" class="stock-link-mobile">
        
        <!-- 左侧信息区 -->
        <div class="info-section">
          <div class="rank-circle">${rank}</div>
          <div class="name-section">
            <div class="name-zh">${displayName}</div>
            <div class="ticker">${ticker}</div>
          </div>
        </div>

        <!-- 右侧数值区 -->
        <div class="values-section">
          <div class="primary-value">${valueHTML}</div>
          <div class="secondary-value ${colorClass}">${formattedPercent}</div>
        </div>

      </a>
    </li>
  `;
}

// ================================================================
// == 核心业务逻辑：移动版二级页面专用 ==
// ================================================================

/**
 * 【移动版】加载并渲染指定的单个榜单
 * @param {string} market - 市场类型 'sp500' | 'chinese_stocks'
 * @param {string} listType - 榜单类型 e.g., 'top_gainers', 'top_market_cap'
 */
async function loadAndRenderMobileSingleList(market, listType) {
    console.log(`🔄 [Mobile-1/5] 开始加载移动版单个榜单: ${listType} (市场: ${market})`);
    const listContainer = document.getElementById('ranking-list'); // 移动版容器ID

    // DOM 检查: 确保我们的目标容器存在
    if (!listContainer) {
        console.error("❌ [Mobile-CRITICAL ERROR] 渲染失败: 未在HTML中找到 ID 为 'ranking-list' 的元素。");
        return;
    }
    console.log(`✅ [Mobile-1/5] 成功找到移动版容器元素 'ranking-list'`);
  
  try {
    listContainer.innerHTML = '<li class="mobile-loading-item">📊 正在加载数据...</li>'; // 显示加载状态
    
    const apiUrl = `/api/ranking?market=${market}&type=${listType}`;
    console.log(`🔄 [Mobile-2/5] 准备请求API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    console.log(`🔄 [Mobile-3/5] API 响应已收到，状态码: ${response.status}`);

    if (!response.ok) {
      throw new Error(`API请求失败，状态码: ${response.status}`);
    }

    const stocks = await response.json();
    console.log(`🔄 [Mobile-4/5] 成功解析JSON数据，获取到 ${stocks.length} 条股票记录。`);
    
    if (stocks.length === 0) {
      listContainer.innerHTML = '<li class="mobile-no-data-item">📊 暂无数据</li>';
      return;
    }

    // 更新移动版页面标题和UI
    updateMobileSingleListPageUI(listType, market);
    
    // 渲染股票列表
    console.log(`🔄 [Mobile-5/5] 准备渲染 ${stocks.length} 条股票到移动版页面...`);
    renderMobileSingleRankingList(stocks, listType, market);
    console.log("✅ [Mobile-SUCCESS] 移动版渲染流程调用完成。");
    
  } catch (error) {
    console.error(`❌ [Mobile-CRITICAL ERROR] 加载或渲染移动版榜单 ${listType} 时发生错误:`, error);
    if (listContainer) {
      listContainer.innerHTML = `<li class="mobile-error-item">❌ 加载${RANKING_CONFIG[listType]?.name || '榜单'}数据失败，请稍后重试</li>`;
    }
  }
}

/**
 * 更新移动版单榜单页面的UI元素
 * @param {string} listType - 榜单类型
 * @param {string} market - 市场类型
 */
function updateMobileSingleListPageUI(listType, market) {
  const config = RANKING_CONFIG[listType];
  if (!config) return;
  
  // 更新移动版页面标题
  const pageTitle = document.getElementById('mobile-page-title');
  const pageSubtitle = document.getElementById('mobile-page-subtitle');
  const breadcrumbCurrent = document.getElementById('mobile-breadcrumb-current');
  const rankingTitle = document.getElementById('mobile-ranking-title');
  const cardTitle = document.getElementById('mobile-card-title');
  const cardDescription = document.getElementById('mobile-card-description');
  
  if (pageTitle) pageTitle.textContent = config.name;
  if (pageSubtitle) pageSubtitle.textContent = config.description;
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = config.name;
  if (rankingTitle) rankingTitle.textContent = config.title;
  if (cardTitle) cardTitle.textContent = config.title;
  if (cardDescription) cardDescription.textContent = config.description;
  
  // 更新页面标题
  document.title = `${config.name} - ${market.toUpperCase()} | Stock Tag Explorer`;
  
  // 更新移动版市场切换按钮状态
  updateMobileMarketButtons(market);
}

/**
 * 更新移动版市场切换按钮的状态
 * @param {string} currentMarket - 当前市场
 */
function updateMobileMarketButtons(currentMarket) {
  const sp500Btn = document.getElementById('mobile-sp500-btn');
  const chineseBtn = document.getElementById('mobile-chinese-btn');
  
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
 * 【移动版】渲染单个榜单的股票列表
 */
function renderMobileSingleRankingList(stocks, listType, market) {
  console.log(`🎨 [Mobile-RENDER-1/4] 开始渲染移动版榜单，股票数量: ${stocks ? stocks.length : 0}`);
  
  const listContainer = document.getElementById('ranking-list');
  if (!listContainer) {
    console.error("❌ [Mobile-RENDER-ERROR] 渲染失败: 未在HTML中找到 ID 为 'ranking-list' 的元素。");
    return;
  }
  console.log(`🎨 [Mobile-RENDER-2/4] 找到移动版容器元素 'ranking-list'`);
  
  if (!stocks || stocks.length === 0) {
    console.log(`🎨 [Mobile-RENDER-3/4] 无数据，显示空状态`);
    listContainer.innerHTML = '<li class="mobile-no-data-item">📊 暂无数据</li>';
    return;
  }
  
  try {
    console.log(`🎨 [Mobile-RENDER-3/4] 开始生成 ${stocks.length} 条股票的移动版HTML`);
    // 生成股票列表HTML
    const stocksHTML = stocks.map((stock, index) => {
      const html = createMobileStockListItemHTML(stock, listType, index + 1, market);
      if (!html) {
        console.warn(`⚠️ 第 ${index + 1} 条股票移动版HTML生成失败:`, stock);
      }
      return html;
    }).join('');
    
    if (!stocksHTML) {
      console.error(`❌ [Mobile-RENDER-ERROR] 所有股票移动版HTML生成失败`);
      listContainer.innerHTML = '<li class="mobile-error-item">❌ 数据渲染失败</li>';
      return;
    }
    
    console.log(`🎨 [Mobile-RENDER-4/4] 移动版HTML生成成功，长度: ${stocksHTML.length} 字符，开始插入DOM`);
    listContainer.innerHTML = stocksHTML;
    console.log(`✅ [Mobile-RENDER-SUCCESS] 移动版榜单渲染完成，容器内元素数量: ${listContainer.children.length}`);
    
    // 更新移动版统计信息
    updateMobileRankingStats(stocks, listType);
    
  } catch (error) {
    console.error(`❌ [Mobile-RENDER-ERROR] 移动版渲染过程中发生错误:`, error);
    listContainer.innerHTML = '<li class="mobile-error-item">❌ 渲染失败，请刷新重试</li>';
  }
}

/**
 * 更新移动版榜单统计信息
 * @param {Array} stocks - 股票数据
 * @param {string} listType - 榜单类型
 */
function updateMobileRankingStats(stocks, listType) {
  const statsContainer = document.getElementById('mobile-ranking-stats');
  if (!statsContainer || !stocks.length) return;
  
  const totalCount = stocks.length;
  let statsHTML = `<span class="mobile-stat-item">共 ${totalCount} 只股票</span>`;
  
  statsContainer.innerHTML = statsHTML;
}

/**
 * 绑定移动版市场切换事件
 * @param {string} currentListType - 当前榜单类型
 */
function bindMobileMarketSwitchEvents(currentListType) {
  const sp500Btn = document.getElementById('mobile-sp500-btn');
  const chineseBtn = document.getElementById('mobile-chinese-btn');
  
  if (sp500Btn) {
    sp500Btn.addEventListener('click', () => {
      const newUrl = `${window.location.pathname}?market=sp500&type=${currentListType}`;
      window.location.href = newUrl;
    });
  }
  
  if (chineseBtn) {
    chineseBtn.addEventListener('click', () => {
      const newUrl = `${window.location.pathname}?market=chinese_stocks&type=${currentListType}`;
      window.location.href = newUrl;
    });
  }
}

// ================================================================
// == 主执行逻辑 ==
// ================================================================

/**
 * 移动版二级页面主执行函数
 */
async function main() {
    try {
        console.log("📱 移动版二级页面脚本开始执行...");

        const urlParams = new URLSearchParams(window.location.search);
        const market = urlParams.get('market') || getCurrentMarket();
        const listType = getCurrentListType();

        console.log(`🔍 移动版 - 市场: ${market}, 榜单类型: ${listType || 'N/A'}`);

        if (listType) {
            console.log(`📋 加载移动版二级榜单页面...`);
            // 直接 await 调用，确保我们能看到它的完整执行过程
            await loadAndRenderMobileSingleList(market, listType);
            
            // 绑定移动版市场切换事件
            bindMobileMarketSwitchEvents(listType);
        } else {
            console.error('❌ 移动版未找到榜单类型参数，无法加载页面');
        }

        console.log("✅ 移动版二级页面脚本执行完成");

    } catch (error) {
        console.error("❌ 移动版二级页面脚本主流程发生致命错误:", error);
    }
}

// 页面加载完成后执行主函数
main();