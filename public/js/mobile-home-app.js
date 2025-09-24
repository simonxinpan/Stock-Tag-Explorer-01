/**
 * 移动版首页应用 - 最终数据直连版
 * Project Mobile Grid - API直连 + CSS网格布局
 * 实现真实的API调用、健壮的渲染和完整的逻辑
 */

// 全局状态管理
const AppState = {
    currentMarket: 'sp500', // 当前选中的市场
    isLoading: false,
    lastUpdateTime: null,
    cache: new Map(), // 数据缓存
    retryCount: 0,
    maxRetries: 3
};

// API配置
const API_CONFIG = {
    baseUrl: '/api',
    timeout: 10000,
    endpoints: {
        ranking: '/api/ranking-mock',
        marketSummary: '/api/market-summary-mock'
    }
};

// 榜单类型配置
const RANKING_TYPES = [
    'top_gainers',
    'top_market_cap', 
    'new_highs',
    'top_turnover',
    'top_losers',
    'new_lows',
    'top_volatility',
    'momentum_stocks',
    'smart_money',
    'institutional_focus',
    'retail_hot',
    'unusual_activity',
    'high_liquidity',
    'top_gap_up'
];

// 榜单显示配置
const RANKING_CONFIG = {
    top_gainers: { title: '🚀 涨幅榜', description: '按当日涨跌幅排序，反映市场热点和资金偏好' },
    top_market_cap: { title: '💰 市值榜', description: '按市值排序，展示市场巨头和蓝筹股' },
    new_highs: { title: '⬆️ 创年内新高', description: '突破52周最高价的股票，显示强劲上升趋势' },
    top_turnover: { title: '💰 成交额榜', description: '按成交金额排序，反映市场关注度和流动性' },
    top_losers: { title: '📉 跌幅榜', description: '按当日跌幅排序，识别市场调整和机会' },
    new_lows: { title: '⬇️ 创年内新低', description: '跌破52周最低价的股票，需要谨慎关注' },
    top_volatility: { title: '⚡ 波动榜', description: '按波动率排序，适合短线交易者关注' },
    momentum_stocks: { title: '🎯 动量股', description: '具有强劲上升动量的股票，技术面强势' },
    smart_money: { title: '🧠 聪明钱', description: '机构资金青睐的股票，资金流向明确' },
    institutional_focus: { title: '🏛️ 机构重仓', description: '机构持仓集中的股票，长期价值显著' },
    retail_hot: { title: '🔥 散户热门', description: '散户关注度高的股票，情绪驱动明显' },
    unusual_activity: { title: '🚨 异动股', description: '交易量异常放大的股票，可能有重大消息' },
    high_liquidity: { title: '💧 高流动性', description: '流动性充足的股票，适合大额交易' },
    top_gap_up: { title: '📈 跳空高开', description: '开盘大幅高开的股票，市场情绪积极' }
};

// 工具函数
const Utils = {
    // 格式化数字
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return 'N/A';
        return Number(num).toFixed(decimals);
    },

    // 格式化百分比
    formatPercentage(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return 'N/A';
        const formatted = Number(num).toFixed(decimals);
        return `${formatted}%`;
    },

    // 格式化市值
    formatMarketCap(value) {
        if (!value || isNaN(value)) return 'N/A';
        
        const num = Number(value);
        if (num >= 1e12) {
            return `$${(num / 1e12).toFixed(2)}万亿`;
        } else if (num >= 1e9) {
            return `$${(num / 1e9).toFixed(2)}B`;
        } else if (num >= 1e6) {
            return `$${(num / 1e6).toFixed(2)}M`;
        } else if (num >= 1e3) {
            return `$${(num / 1e3).toFixed(2)}K`;
        }
        return `$${num.toFixed(2)}`;
    },

    // 格式化标普500市值
    formatSP500MarketCap(value) {
        if (!value || isNaN(value)) return 'N/A';
        
        const num = Number(value);
        if (num >= 1e12) {
            return `$${(num / 1e12).toFixed(2)}万亿`;
        } else if (num >= 1e9) {
            return `$${(num / 1e9).toFixed(2)}B`;
        } else if (num >= 1e6) {
            return `$${(num / 1e6).toFixed(2)}M`;
        }
        return `$${num.toFixed(2)}`;
    },

    // 格式化中概股市值
    formatChineseStockMarketCap(value) {
        if (!value || isNaN(value)) return 'N/A';
        
        const num = Number(value);
        if (num >= 1e9) {
            return `$${(num / 1e9).toFixed(2)}B`;
        } else if (num >= 1e6) {
            return `$${(num / 1e6).toFixed(2)}M`;
        } else if (num >= 1e3) {
            return `$${(num / 1e3).toFixed(2)}K`;
        }
        return `$${num.toFixed(2)}`;
    },

    // 获取涨跌幅样式类
    getChangeClass(change) {
        if (!change || isNaN(change)) return '';
        return Number(change) >= 0 ? 'positive' : 'negative';
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 显示错误消息
    showError(message, container) {
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>⚠️ ${message}</p>
                    <button onclick="location.reload()" class="retry-btn">重试</button>
                </div>
            `;
        }
        console.error('移动版首页错误:', message);
    },

    // 显示加载状态
    showLoading(container) {
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>加载中...</p>
                </div>
            `;
        }
    }
};



// API调用模块
const API = {
    // 通用API调用
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            throw error;
        }
    },

    // 获取榜单数据
    async getRankingData(rankingType, market = 'sp500') {
        const cacheKey = `${rankingType}_${market}`;
        
        // 检查缓存
        if (AppState.cache.has(cacheKey)) {
            const cached = AppState.cache.get(cacheKey);
            const now = Date.now();
            if (now - cached.timestamp < 60000) { // 1分钟缓存
                return cached.data;
            }
        }

        const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.ranking}?type=${rankingType}&market=${market}&limit=3`;
        const data = await this.request(url);
        
        // 缓存数据
        AppState.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    },

    // 获取市场概览数据
    async getMarketSummary(market = 'sp500') {
        const cacheKey = `market_summary_${market}`;
        
        // 检查缓存
        if (AppState.cache.has(cacheKey)) {
            const cached = AppState.cache.get(cacheKey);
            const now = Date.now();
            if (now - cached.timestamp < 30000) { // 30秒缓存
                return cached.data;
            }
        }

        const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.marketSummary}?market=${market}`;
        const data = await this.request(url);
        
        // 缓存数据
        AppState.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }
};

// 渲染模块
const Renderer = {
    // 渲染股票列表项
    renderStockItem(stock, index) {
        if (!stock) return '';

        const symbol = stock.symbol || stock.ticker || 'N/A';
        const name = stock.name || stock.company_name || 'N/A';
        const price = stock.price || stock.current_price || 0;
        const change = stock.change_percent || stock.percent_change || 0;
        const marketCap = stock.market_cap || 0;

        // 根据当前市场选择合适的市值格式化函数
        const formatMarketCap = AppState.currentMarket === 'sp500' 
            ? Utils.formatSP500MarketCap 
            : Utils.formatChineseStockMarketCap;

        return `
            <div class="stock-item" data-symbol="${symbol}">
                <div class="stock-rank">${index + 1}</div>
                <div class="stock-info">
                    <div class="stock-symbol">${symbol}</div>
                    <div class="stock-name">${name}</div>
                </div>
                <div class="stock-metrics">
                    <div class="stock-price">$${Utils.formatNumber(price)}</div>
                    <div class="stock-change ${Utils.getChangeClass(change)}">
                        ${Utils.formatPercentage(change)}
                    </div>
                    <div class="stock-market-cap">${formatMarketCap(marketCap)}</div>
                </div>
            </div>
        `;
    },

    // 渲染榜单预览
    renderRankingPreview(container, stocks, rankingType) {
        if (!container) return;

        if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>暂无数据</p>
                </div>
            `;
            return;
        }

        // 只显示前3名
        const topStocks = stocks.slice(0, 3);
        const stocksHtml = topStocks.map((stock, index) => 
            this.renderStockItem(stock, index)
        ).join('');

        container.innerHTML = `
            <div class="stock-list">
                ${stocksHtml}
            </div>
        `;
    },

    // 渲染市场概览
    renderMarketOverview(data) {
        if (!data) return;

        const elements = {
            totalStocks: document.getElementById('total-stocks'),
            risingStocks: document.getElementById('rising-stocks'),
            fallingStocks: document.getElementById('falling-stocks'),
            totalMarketCap: document.getElementById('total-market-cap')
        };

        // 安全更新元素内容
        if (elements.totalStocks) {
            elements.totalStocks.textContent = data.total_stocks || 'N/A';
        }
        if (elements.risingStocks) {
            elements.risingStocks.textContent = data.rising_stocks || 'N/A';
        }
        if (elements.fallingStocks) {
            elements.fallingStocks.textContent = data.falling_stocks || 'N/A';
        }
        if (elements.totalMarketCap) {
            const formatMarketCap = AppState.currentMarket === 'sp500' 
                ? Utils.formatSP500MarketCap 
                : Utils.formatChineseStockMarketCap;
            elements.totalMarketCap.textContent = formatMarketCap(data.total_market_cap);
        }
    }
};

// 榜单加载模块
const RankingLoader = {
    // 加载单个榜单预览
    async loadRankingPreview(rankingType) {
        const container = document.getElementById(`${rankingType}-mobile-list`);
        if (!container) {
            console.warn(`容器不存在: ${rankingType}-mobile-list`);
            return;
        }

        try {
            Utils.showLoading(container);
            
            const data = await API.getRankingData(rankingType, AppState.currentMarket);
            
            if (data && data.success && data.data) {
                Renderer.renderRankingPreview(container, data.data, rankingType);
            } else {
                throw new Error(data?.message || '数据格式错误');
            }
        } catch (error) {
            console.error(`加载榜单预览失败 (${rankingType}):`, error);
            Utils.showError('加载失败', container);
        }
    },

    // 加载所有榜单预览
    async loadAllRankingPreviews() {
        if (AppState.isLoading) return;
        
        AppState.isLoading = true;
        AppState.retryCount = 0;

        try {
            // 并发加载所有榜单
            const loadPromises = RANKING_TYPES.map(rankingType => 
                this.loadRankingPreview(rankingType)
            );

            await Promise.allSettled(loadPromises);
            AppState.lastUpdateTime = Date.now();
            
        } catch (error) {
            console.error('加载榜单预览失败:', error);
        } finally {
            AppState.isLoading = false;
        }
    },

    // 重试加载
    async retryLoad() {
        if (AppState.retryCount >= AppState.maxRetries) {
            console.error('达到最大重试次数，停止重试');
            return;
        }

        AppState.retryCount++;
        console.log(`重试加载 (${AppState.retryCount}/${AppState.maxRetries})`);
        
        // 清除缓存
        AppState.cache.clear();
        
        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, 1000 * AppState.retryCount));
        
        await this.loadAllRankingPreviews();
    }
};

// 市场切换模块
const MarketSwitcher = {
    // 初始化市场切换按钮
    init() {
        const buttons = document.querySelectorAll('.market-toggle-btn');
        buttons.forEach(button => {
            button.addEventListener('click', this.handleMarketSwitch.bind(this));
        });
    },

    // 处理市场切换
    async handleMarketSwitch(event) {
        const button = event.target;
        const market = button.dataset.marketTarget;
        
        if (!market || market === AppState.currentMarket) return;

        // 更新状态
        AppState.currentMarket = market;
        
        // 更新按钮状态
        this.updateButtonStates(market);
        
        // 重新加载数据
        await this.switchMarket(market);
    },

    // 更新按钮状态
    updateButtonStates(activeMarket) {
        const buttons = document.querySelectorAll('.market-toggle-btn');
        buttons.forEach(button => {
            const market = button.dataset.marketTarget;
            if (market === activeMarket) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    },

    // 切换市场
    async switchMarket(market) {
        try {
            // 清除相关缓存
            AppState.cache.forEach((value, key) => {
                if (key.includes('_sp500') || key.includes('_chinese_stocks')) {
                    AppState.cache.delete(key);
                }
            });

            // 加载市场概览
            await this.loadMarketOverview(market);
            
            // 重新加载所有榜单
            await RankingLoader.loadAllRankingPreviews();
            
        } catch (error) {
            console.error('切换市场失败:', error);
            Utils.showError('切换市场失败，请重试');
        }
    },

    // 加载市场概览
    async loadMarketOverview(market) {
        try {
            const data = await API.getMarketSummary(market);
            if (data && data.success) {
                Renderer.renderMarketOverview(data.data);
            }
        } catch (error) {
            console.error('加载市场概览失败:', error);
        }
    }
};

// 导航模块
const Navigation = {
    // 导航到榜单详情页
    navigateToRankingDetail(rankingType) {
        if (!rankingType) return;
        
        const market = AppState.currentMarket;
        const url = `/mobile-${market}-${rankingType.replace(/_/g, '-')}.html`;
        
        // 添加页面转场效果
        document.body.style.opacity = '0.8';
        setTimeout(() => {
            window.location.href = url;
        }, 150);
    }
};

// 应用初始化
const App = {
    // 初始化应用
    async init() {
        console.log('移动版首页应用初始化开始...');
        
        try {
            // 初始化市场切换器
            MarketSwitcher.init();
            
            // 设置全局导航函数
            window.navigateToRankingDetail = Navigation.navigateToRankingDetail;
            
            // 加载初始数据
            await this.loadInitialData();
            
            // 设置定时刷新
            this.setupAutoRefresh();
            
            // 设置错误处理
            this.setupErrorHandling();
            
            console.log('移动版首页应用初始化完成');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.handleInitError(error);
        }
    },

    // 加载初始数据
    async loadInitialData() {
        // 加载市场概览
        await MarketSwitcher.loadMarketOverview(AppState.currentMarket);
        
        // 加载所有榜单预览
        await RankingLoader.loadAllRankingPreviews();
    },

    // 设置自动刷新
    setupAutoRefresh() {
        // 每5分钟刷新一次数据
        setInterval(async () => {
            if (!AppState.isLoading) {
                console.log('自动刷新数据...');
                await this.loadInitialData();
            }
        }, 5 * 60 * 1000);
    },

    // 设置错误处理
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
        });
    },

    // 处理初始化错误
    handleInitError(error) {
        const errorContainer = document.getElementById('error-trending');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ 应用初始化失败</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="retry-btn">重新加载</button>
                </div>
            `;
        }
    }
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 导出模块供其他脚本使用
window.MobileHomeApp = {
    AppState,
    API,
    Utils,
    Renderer,
    RankingLoader,
    MarketSwitcher,
    Navigation,
    App
};