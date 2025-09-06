// 趋势榜单动态数据管理
class TrendingDataManager {
  constructor() {
    this.apiBase = '/api/trending';
    this.rankingConfigs = [
      { id: 'top-gainers-list', type: 'top_gainers', title: '涨幅榜' },
      { id: 'high-volume-list', type: 'high_volume', title: '成交额榜' },
      { id: 'new-highs-list', type: 'new_highs', title: '新高榜' },
      { id: 'top-losers-list', type: 'top_losers', title: '跌幅榜' },
      { id: 'risk-warning-list', type: 'risk_warning', title: '风险警示榜' },
      { id: 'new-lows-list', type: 'new_lows', title: '新低榜' },
      { id: 'value-picks-list', type: 'value_picks', title: '特色价值榜' }
    ];
    this.loadingStates = new Map();
    this.detailsPageBase = 'https://stock-details-final.vercel.app/?symbol=';
  }

  // 初始化标签页切换功能
  initTabSwitching() {
    const tabButtons = document.querySelectorAll('.ranking-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // 移除所有活跃状态
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // 添加活跃状态
        button.classList.add('active');
        const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // 初始化所有榜单数据
  async initializeAllRankings() {
    console.log('开始初始化所有趋势榜单数据...');
    
    // 并发获取所有榜单数据
    const promises = this.rankingConfigs.map(config => 
      this.loadRankingData(config.id, config.type, config.title)
    );
    
    try {
      await Promise.all(promises);
      console.log('所有趋势榜单数据加载完成');
    } catch (error) {
      console.error('加载趋势榜单数据时出错:', error);
    }
  }

  // 加载单个榜单数据
  async loadRankingData(listId, type, title) {
    const listElement = document.getElementById(listId);
    if (!listElement) {
      console.warn(`未找到榜单容器: ${listId}`);
      return;
    }

    // 设置加载状态
    this.setLoadingState(listId, true);
    this.showLoadingState(listElement, title);

    try {
      const response = await fetch(`${this.apiBase}?type=${type}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        this.renderRankingList(listElement, result.data, type);
        console.log(`${title} 数据加载成功，共 ${result.data.length} 条记录`);
      } else {
        throw new Error(result.message || '数据格式错误');
      }
    } catch (error) {
      console.error(`加载 ${title} 数据失败:`, error);
      this.showErrorState(listElement, title, error.message);
    } finally {
      this.setLoadingState(listId, false);
    }
  }

  // 渲染榜单列表
  renderRankingList(listElement, stocks, type) {
    // 清空现有内容
    listElement.innerHTML = '';

    if (!stocks || stocks.length === 0) {
      listElement.innerHTML = '<li class="no-data">暂无数据</li>';
      return;
    }

    // 生成股票列表项
    stocks.forEach((stock, index) => {
      const listItem = this.createStockListItem(stock, index + 1, type);
      listElement.appendChild(listItem);
    });
  }

  // 创建股票列表项HTML
  createStockListItem(stock, rank, type) {
    const changePercent = parseFloat(stock.change_percent) || 0;
    const price = parseFloat(stock.last_price) || 0;
    const volume = parseInt(stock.volume) || 0;
    const marketCap = stock.market_cap_formatted || 'N/A';
    
    // 确定涨跌颜色
    const changeClass = changePercent >= 0 ? 'positive' : 'negative';
    const changeSign = changePercent >= 0 ? '+' : '';
    
    // 构建详情页链接
    const detailsUrl = `${this.detailsPageBase}${stock.ticker}`;
    
    // 根据榜单类型显示不同的指标
    let metricDisplay = '';
    switch (type) {
      case 'high_volume':
        const turnover = stock.turnover ? this.formatVolume(stock.turnover) : this.formatVolume(volume * price);
        metricDisplay = `<div class="stock-volume">成交额: ${turnover}</div>`;
        break;
      case 'new_highs':
        const highRatio = stock.week_52_high ? ((price / stock.week_52_high) * 100).toFixed(1) : 'N/A';
        metricDisplay = `<div class="stock-high">距52周高点: ${highRatio}%</div>`;
        break;
      case 'new_lows':
        const lowRatio = stock.week_52_low ? ((price / stock.week_52_low) * 100).toFixed(1) : 'N/A';
        metricDisplay = `<div class="stock-low">距52周低点: ${lowRatio}%</div>`;
        break;
      case 'value_picks':
        const peRatio = stock.pe_ratio ? parseFloat(stock.pe_ratio).toFixed(2) : 'N/A';
        metricDisplay = `<div class="stock-pe">PE: ${peRatio}</div>`;
        break;
      default:
        metricDisplay = `<div class="stock-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</div>`;
    }
    
    const li = document.createElement('li');
    li.className = 'stock-item';
    li.innerHTML = `
      <div class="stock-rank">${rank}</div>
      <div class="stock-info">
        <a href="${detailsUrl}" target="_blank" class="stock-link">
          <div class="stock-symbol">${stock.ticker}</div>
          <div class="stock-name">${stock.name_zh || stock.ticker}</div>
        </a>
      </div>
      <div class="stock-price">
        <div class="current-price">$${price.toFixed(2)}</div>
        ${metricDisplay}
      </div>
    `;
    
    return li;
  }

  // 显示加载状态
  showLoadingState(listElement, title) {
    listElement.innerHTML = `
      <li class="loading-item">
        <div class="loading-spinner"></div>
        <span>正在加载${title}数据...</span>
      </li>
    `;
  }

  // 显示错误状态
  showErrorState(listElement, title, errorMessage) {
    listElement.innerHTML = `
      <li class="error-item">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <div class="error-title">${title}加载失败</div>
          <div class="error-message">${errorMessage}</div>
          <button class="retry-btn" onclick="trendingManager.retryLoad('${listElement.id}', '${title}')">重试</button>
        </div>
      </li>
    `;
  }

  // 重试加载
  async retryLoad(listId, title) {
    const config = this.rankingConfigs.find(c => c.id === listId);
    if (config) {
      await this.loadRankingData(config.id, config.type, config.title);
    }
  }

  // 设置加载状态
  setLoadingState(listId, isLoading) {
    this.loadingStates.set(listId, isLoading);
  }

  // 格式化成交量
  formatVolume(volume) {
    if (!volume || volume === 0) return 'N/A';
    
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    } else {
      return volume.toString();
    }
  }

  // 刷新所有数据
  async refreshAllData() {
    console.log('刷新所有趋势榜单数据...');
    await this.initializeAllRankings();
  }

  // 刷新单个榜单
  async refreshRanking(listId) {
    const config = this.rankingConfigs.find(c => c.id === listId);
    if (config) {
      await this.loadRankingData(config.id, config.type, config.title);
    }
  }
}

// 全局实例
let trendingManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('趋势榜单页面加载完成，开始初始化动态数据...');
  
  // 创建趋势数据管理器实例
  trendingManager = new TrendingDataManager();
  
  // 初始化标签页切换功能
  trendingManager.initTabSwitching();
  
  // 初始化所有榜单数据
  await trendingManager.initializeAllRankings();
  
  // 绑定刷新按钮事件（如果存在）
  const refreshBtn = document.getElementById('refresh-all-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      trendingManager.refreshAllData();
    });
  }
  
  console.log('趋势榜单动态数据初始化完成');
});

// 导出供外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrendingDataManager;
}