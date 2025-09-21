// public/js/trending.js
// 专门为桌面版一级页面 (trending.html) 服务的独立JavaScript文件
// 版本: Desktop Overview Page Only

// 获取当前市场类型
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500'; // 默认为标普500
}

// 更新次级导航栏的激活状态
function updateMarketNavigation() {
  const currentMarket = getCurrentMarket();
  const marketTabs = document.querySelectorAll('.market-tab');
  
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

// 定义我们需要加载的所有榜单（一级页面预览）
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

// 标普500市值格式化函数（输入单位：百万美元）
function formatSP500MarketCap(marketCapInMillions) {
  if (!marketCapInMillions || marketCapInMillions === 0) return 'N/A';
  
  const billions = marketCapInMillions / 1000;
  if (billions >= 1) {
    return `$${billions.toFixed(1)}B`;
  } else {
    return `$${marketCapInMillions.toFixed(0)}M`;
  }
}

// 中概股市值格式化函数（输入单位：美元）
function formatChineseStockMarketCap(marketCapInUSD) {
  if (!marketCapInUSD || marketCapInUSD === 0) return 'N/A';
  
  const billions = marketCapInUSD / 1000000000;
  if (billions >= 1) {
    return `$${billions.toFixed(1)}B`;
  } else {
    const millions = marketCapInUSD / 1000000;
    return `$${millions.toFixed(0)}M`;
  }
}

// 通用市值格式化函数
function formatMarketCap(marketCapValue, marketType = 'sp500') {
  if (marketType === 'chinese_stocks') {
    return formatChineseStockMarketCap(marketCapValue);
  } else {
    return formatSP500MarketCap(marketCapValue);
  }
}

// 格式化大数字
function formatLargeNumber(value, isCurrency = false) {
  if (!value || value === 0) return 'N/A';
  
  const absValue = Math.abs(value);
  const prefix = isCurrency ? '$' : '';
  
  if (absValue >= 1000000000) {
    return `${prefix}${(value / 1000000000).toFixed(1)}B`;
  } else if (absValue >= 1000000) {
    return `${prefix}${(value / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `${prefix}${(value / 1000).toFixed(1)}K`;
  } else {
    return `${prefix}${value.toFixed(2)}`;
  }
}

// 格式化成交额
function formatTurnover(value) {
  return formatLargeNumber(value, true);
}

// 创建股票列表项HTML（一级页面预览样式）
function createStockListItemHTML(stock, type, rank, marketType = 'sp500') {
  const changePercent = parseFloat(stock.change_percent || 0);
  const changeClass = changePercent >= 0 ? 'positive' : 'negative';
  const changeSymbol = changePercent >= 0 ? '+' : '';
  
  // 根据榜单类型显示不同的指标
  let metricHTML = '';
  switch (type) {
    case 'top_gainers':
    case 'top_losers':
      metricHTML = `
        <div class="metric-value ${changeClass}">
          ${changeSymbol}${changePercent.toFixed(2)}%
        </div>
      `;
      break;
    case 'top_market_cap':
      const marketCap = formatMarketCap(stock.market_cap, marketType);
      metricHTML = `
        <div class="metric-value">${marketCap}</div>
      `;
      break;
    case 'top_turnover':
      const turnover = formatTurnover(stock.turnover || stock.volume * stock.close);
      metricHTML = `
        <div class="metric-value">${turnover}</div>
      `;
      break;
    case 'top_volatility':
      const volatility = stock.volatility || ((stock.high - stock.low) / stock.close * 100);
      metricHTML = `
        <div class="metric-value">${volatility.toFixed(2)}%</div>
      `;
      break;
    default:
      metricHTML = `
        <div class="metric-value ${changeClass}">
          ${changeSymbol}${changePercent.toFixed(2)}%
        </div>
      `;
  }

  return `
    <div class="stock-item" data-symbol="${stock.symbol}">
      <div class="stock-rank">${rank}</div>
      <div class="stock-info">
        <div class="stock-symbol">${stock.symbol}</div>
        <div class="stock-name">${stock.name || stock.symbol}</div>
      </div>
      <div class="stock-price">
        <div class="current-price">$${parseFloat(stock.close || 0).toFixed(2)}</div>
        <div class="price-change ${changeClass}">
          ${changeSymbol}${changePercent.toFixed(2)}%
        </div>
      </div>
      <div class="stock-metric">
        ${metricHTML}
      </div>
    </div>
  `;
}

// 加载并渲染单个榜单预览（一级页面）
async function loadAndRenderList(listConfig) {
  const { id, type } = listConfig;
  const market = getCurrentMarket();
  
  try {
    const response = await fetch(`/api/trending?market=${market}&type=${type}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      renderListPreview(data.data, type, id, market);
    } else {
      showListError(id, '暂无数据');
    }
  } catch (error) {
    console.error(`Error loading ${type} data:`, error);
    showListError(id, '数据加载失败');
  }
}

// 渲染榜单预览
function renderListPreview(stocks, listType, containerId, market) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const stocksHTML = stocks.map((stock, index) => 
    createStockListItemHTML(stock, listType, index + 1, market)
  ).join('');

  container.innerHTML = stocksHTML;
}

// 显示榜单错误信息
function showListError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
      </div>
    `;
  }
}

// 处理"更多"按钮点击事件
async function handleMoreButtonClick(type) {
  const currentMarket = getCurrentMarket();
  const detailUrl = `list-detail.html?list=${type}&market=${currentMarket}`;
  window.location.href = detailUrl;
}

// 获取榜单标题
function getRankingTitle(type) {
  const config = RANKING_CONFIG[type];
  return config ? config.title : '未知榜单';
}

// 加载并渲染汇总数据
async function loadAndRenderSummaryData() {
  const market = getCurrentMarket();
  
  try {
    const response = await fetch(`/api/market-summary?market=${market}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      renderSummaryData(data.data);
    }
  } catch (error) {
    console.error('Error loading summary data:', error);
  }
}

// 渲染汇总数据
function renderSummaryData(summaryData) {
  const summaryContainer = document.querySelector('.market-summary') || document.querySelector('.summary-container');
  if (!summaryContainer) return;

  const { total_stocks, avg_change, market_cap_total, volume_total } = summaryData;
  
  summaryContainer.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">总股票数:</span>
      <span class="summary-value">${total_stocks || 'N/A'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">平均涨跌幅:</span>
      <span class="summary-value ${avg_change >= 0 ? 'positive' : 'negative'}">
        ${avg_change >= 0 ? '+' : ''}${(avg_change || 0).toFixed(2)}%
      </span>
    </div>
    <div class="summary-item">
      <span class="summary-label">总市值:</span>
      <span class="summary-value">${formatLargeNumber(market_cap_total, true)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">总成交量:</span>
      <span class="summary-value">${formatLargeNumber(volume_total)}</span>
    </div>
  `;
}

// 导航到榜单详情页
function navigateToRankingDetail(type) {
  const currentMarket = getCurrentMarket();
  const detailUrl = `list-detail.html?list=${type}&market=${currentMarket}`;
  window.location.href = detailUrl;
}

// 主函数（只处理一级页面逻辑）
async function main() {
  try {
    console.log("📊 桌面版一级页面脚本开始执行...");

    // 更新市场导航状态
    updateMarketNavigation();
    
    // 并发地加载所有榜单和汇总数据
    loadAndRenderSummaryData();
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

    console.log("✅ 桌面版一级页面脚本执行完成");

  } catch (error) {
    console.error("❌ 脚本主流程发生致命错误:", error);
  }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', main);

// 将函数暴露到全局作用域，供HTML中的onclick使用
window.navigateToRankingDetail = navigateToRankingDetail;