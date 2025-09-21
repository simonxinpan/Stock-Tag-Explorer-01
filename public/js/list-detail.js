// public/js/list-detail.js
// 专门为桌面版二级页面 (list-detail.html) 服务的独立JavaScript文件
// 版本: Dedicated List Detail Handler

// 获取当前市场类型
function getCurrentMarket() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('market') || 'sp500'; // 默认为标普500
}

// 获取当前榜单类型
function getCurrentListType() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('list') || null;
}

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

// 创建股票列表项HTML
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
        <div class="metric-label">涨跌幅</div>
      `;
      break;
    case 'top_market_cap':
      const marketCap = formatMarketCap(stock.market_cap, marketType);
      metricHTML = `
        <div class="metric-value">${marketCap}</div>
        <div class="metric-label">市值</div>
      `;
      break;
    case 'top_turnover':
      const turnover = formatTurnover(stock.turnover || stock.volume * stock.close);
      metricHTML = `
        <div class="metric-value">${turnover}</div>
        <div class="metric-label">成交额</div>
      `;
      break;
    case 'top_volatility':
      const volatility = stock.volatility || ((stock.high - stock.low) / stock.close * 100);
      metricHTML = `
        <div class="metric-value">${volatility.toFixed(2)}%</div>
        <div class="metric-label">振幅</div>
      `;
      break;
    case 'new_highs':
    case 'new_lows':
      metricHTML = `
        <div class="metric-value">$${parseFloat(stock.close || 0).toFixed(2)}</div>
        <div class="metric-label">当前价</div>
      `;
      break;
    default:
      metricHTML = `
        <div class="metric-value ${changeClass}">
          ${changeSymbol}${changePercent.toFixed(2)}%
        </div>
        <div class="metric-label">涨跌幅</div>
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

// 加载并渲染单个榜单数据
async function loadAndRenderSingleList(market, listType) {
  try {
    showLoadingSpinner();
    
    const response = await fetch(`/api/trending?market=${market}&type=${listType}&limit=50`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      renderSingleRankingList(data.data, listType, market);
      updateRankingStats(data.data, listType);
    } else {
      showErrorMessage('暂无数据');
    }
  } catch (error) {
    console.error('Error loading ranking data:', error);
    showErrorMessage('数据加载失败，请稍后重试');
  } finally {
    hideLoadingSpinner();
  }
}

// 渲染单个榜单列表
function renderSingleRankingList(stocks, listType, market) {
  const container = document.getElementById('ranking-list');
  if (!container) return;

  const stocksHTML = stocks.map((stock, index) => 
    createStockListItemHTML(stock, listType, index + 1, market)
  ).join('');

  container.innerHTML = stocksHTML;
}

// 更新榜单统计信息
function updateRankingStats(stocks, listType) {
  const statsContainer = document.querySelector('.ranking-stats');
  if (!statsContainer || !stocks.length) return;

  const totalStocks = stocks.length;
  const avgChange = stocks.reduce((sum, stock) => sum + parseFloat(stock.change_percent || 0), 0) / totalStocks;
  
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">股票数量:</span>
      <span class="stat-value">${totalStocks}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">平均涨跌幅:</span>
      <span class="stat-value ${avgChange >= 0 ? 'positive' : 'negative'}">
        ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%
      </span>
    </div>
  `;
}

// 更新页面UI
function updateSingleListPageUI(listType, market) {
  const config = RANKING_CONFIG[listType];
  if (!config) return;

  // 更新页面标题
  const titleElement = document.querySelector('.ranking-title');
  if (titleElement) {
    titleElement.textContent = config.title;
  }

  // 更新页面描述
  const descElement = document.querySelector('.ranking-description');
  if (descElement) {
    descElement.textContent = config.description;
  }

  // 更新市场标签
  const marketLabel = market === 'chinese_stocks' ? '中概股' : '标普500';
  const marketElement = document.querySelector('.market-label');
  if (marketElement) {
    marketElement.textContent = marketLabel;
  }

  // 更新浏览器标题
  document.title = `${config.name} - ${marketLabel} | 股票榜单`;
}

// 更新市场切换按钮
function updateMarketButtons(currentMarket) {
  const marketButtons = document.querySelectorAll('.market-btn');
  marketButtons.forEach(btn => {
    const btnMarket = btn.getAttribute('data-market');
    if (btnMarket === currentMarket) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// 绑定市场切换事件
function bindMarketSwitchEvents(currentListType) {
  const marketButtons = document.querySelectorAll('.market-btn');
  marketButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const newMarket = btn.getAttribute('data-market');
      const newUrl = `list-detail.html?list=${currentListType}&market=${newMarket}`;
      window.location.href = newUrl;
    });
  });
}

// 显示加载动画
function showLoadingSpinner() {
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) {
    spinner.style.display = 'block';
  }
}

// 隐藏加载动画
function hideLoadingSpinner() {
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) {
    spinner.style.display = 'none';
  }
}

// 显示错误信息
function showErrorMessage(message) {
  const container = document.getElementById('ranking-list');
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
      </div>
    `;
  }
}

// 主函数
async function main() {
  const currentMarket = getCurrentMarket();
  const currentListType = getCurrentListType();

  if (!currentListType) {
    showErrorMessage('缺少榜单类型参数');
    return;
  }

  // 更新页面UI
  updateSingleListPageUI(currentListType, currentMarket);
  updateMarketButtons(currentMarket);
  
  // 绑定事件
  bindMarketSwitchEvents(currentListType);
  
  // 加载数据
  await loadAndRenderSingleList(currentMarket, currentListType);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', main);