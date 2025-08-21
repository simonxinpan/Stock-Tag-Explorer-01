// 趋势榜单动态数据管理
class TrendingDataManager {
  constructor() {
    this.apiBase = '/api/trending';
    this.rankingConfigs = [
      { id: 'top-gainers-list', type: 'top_gainers', title: '每日涨幅榜' },
      { id: 'high-volume-list', type: 'high_volume', title: '成交量榜' },
      { id: 'market-leaders-list', type: 'market_leaders', title: '市值领导者' },
      { id: 'risk-warning-list', type: 'risk_warning', title: '风险警示榜' },
      { id: 'high-volatility-list', type: 'high_volatility', title: '高波动榜' },
      { id: 'value-picks-list', type: 'value_picks', title: '特色价值榜' },
      { id: 'growth-stocks-list', type: 'growth_stocks', title: '成长股榜' }
    ];
    this.loadingStates = new Map();
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

  // 创建股票列表项
  createStockListItem(stock, rank, type) {
    const li = document.createElement('li');
    li.className = 'stock-item';
    
    // 确定涨跌样式
    const changeClass = stock.change > 0 ? 'positive' : stock.change < 0 ? 'negative' : 'neutral';
    const changeSymbol = stock.change > 0 ? '+' : '';
    
    // 构建详情页链接
    const detailUrl = `https://stock-details-final.vercel.app/?symbol=${stock.ticker}`;
    
    // 根据榜单类型显示不同的额外信息
    let extraInfo = '';
    switch (type) {
      case 'high_volume':
        extraInfo = `<span class="volume">成交量: ${this.formatVolume(stock.volume)}</span>`;
        break;
      case 'market_leaders':
        extraInfo = `<span class="market-cap">市值: ${stock.marketCap}</span>`;
        break;
      case 'value_picks':
        extraInfo = stock.pe_ratio ? `<span class="pe-ratio">PE: ${stock.pe_ratio.toFixed(2)}</span>` : '';
        break;
      case 'growth_stocks':
        extraInfo = stock.roe ? `<span class="roe">ROE: ${stock.roe.toFixed(2)}%</span>` : '';
        break;
      default:
        extraInfo = `<span class="market-cap">${stock.marketCap}</span>`;
    }
    
    li.innerHTML = `
      <a href="${detailUrl}" target="_blank" class="stock-link">
        <div class="rank-number">${rank}</div>
        <div class="stock-info">
          <div class="stock-header">
            <span class="stock-name">${stock.name}</span>
            <span class="stock-ticker">${stock.ticker}</span>
          </div>
          <div class="stock-details">
            <span class="stock-price">$${stock.price.toFixed(2)}</span>
            <span class="stock-change ${changeClass}">
              ${changeSymbol}${stock.change.toFixed(2)}%
            </span>
            ${extraInfo}
          </div>
        </div>
      </a>
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