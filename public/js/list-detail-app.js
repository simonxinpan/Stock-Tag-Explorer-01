// 文件: /public/js/list-detail-app.js (全新独立的二级页面控制器)

// --- 榜单类型配置 ---
const RANKING_TYPES = {
    top_market_cap: { title: '市值榜', description: '按市值排序的股票榜单' },
    top_gainers: { title: '涨幅榜', description: '今日涨幅最大的股票' },
    top_losers: { title: '跌幅榜', description: '今日跌幅最大的股票' },
    top_volume: { title: '成交量榜', description: '成交量最大的股票' },
    top_turnover: { title: '成交额榜', description: '成交额最大的股票' },
    new_highs: { title: '新高榜', description: '接近52周新高的股票' },
    new_lows: { title: '新低榜', description: '接近52周新低的股票' },
    top_volatility: { title: '波动榜', description: '价格波动最大的股票' },
    top_gap_up: { title: '跳空高开榜', description: '开盘价相对昨收盘价跳空最高的股票' },
    institutional_focus: { title: '机构关注榜', description: '机构重点关注的股票' },
    retail_hot: { title: '散户热门榜', description: '散户交易活跃的股票' },
    smart_money: { title: '聪明钱榜', description: '聪明资金流入的股票' },
    high_liquidity: { title: '高流动性榜', description: '流动性最好的股票' },
    unusual_activity: { title: '异动榜', description: '交易异常活跃的股票' },
    momentum_stocks: { title: '动量榜', description: '具有强劲上涨动量的股票' }
};

// --- 格式化函数区 ---
function formatSP500MarketCap(cap) {
    const num = parseFloat(cap);
    if (isNaN(num) || num === 0) return 'N/A';
    
    if (num >= 1e12) {
        return `$${(num / 1e12).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}T`;
    } else if (num >= 1e9) {
        return `$${(num / 1e9).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}B`;
    } else if (num >= 1e6) {
        return `$${(num / 1e6).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}M`;
    } else {
        return `$${num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
}

function formatChineseStockMarketCap(cap) {
    const num = parseFloat(cap);
    if (isNaN(num) || num === 0) return 'N/A';
    return `$${(num / 100000000).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}亿美元`;
}

function formatPrice(price) {
    const num = parseFloat(price);
    if (isNaN(num)) return 'N/A';
    return `$${num.toFixed(2)}`;
}

function formatPercentage(percent) {
    const num = parseFloat(percent);
    if (isNaN(num)) return 'N/A';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
}

function formatVolume(volume) {
    const num = parseFloat(volume);
    if (isNaN(num) || num === 0) return 'N/A';
    
    if (num >= 1e9) {
        return `${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
        return `${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
        return `${(num / 1e3).toFixed(2)}K`;
    } else {
        return num.toLocaleString();
    }
}

// --- 渲染函数 ---
function renderList(stocks, market, listType) {
    const container = document.getElementById('ranking-list-container');
    
    if (!stocks || stocks.length === 0) {
        container.innerHTML = '<div class="error">暂无数据</div>';
        return;
    }
    
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">排名</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">股票代码</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">公司名称</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #495057;">最新价</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #495057;">涨跌幅</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #495057;">市值</th>
                </tr>
            </thead>
            <tbody>`;
    
    stocks.forEach((stock, index) => {
        const rank = index + 1;
        const ticker = stock.ticker || 'N/A';
        const name = stock.name_zh || stock.name_en || 'N/A';
        const price = formatPrice(stock.last_price);
        const changePercent = formatPercentage(stock.change_percent);
        
        let marketCapHTML = '';
        if (market === 'chinese_stocks') {
            marketCapHTML = formatChineseStockMarketCap(stock.market_cap);
        } else {
            marketCapHTML = formatSP500MarketCap(stock.market_cap);
        }
        
        // 根据涨跌幅设置颜色
        const changeColor = parseFloat(stock.change_percent) >= 0 ? '#28a745' : '#dc3545';
        
        tableHTML += `
            <tr style="border-bottom: 1px solid #dee2e6; transition: background-color 0.2s;">
                <td style="padding: 12px; font-weight: 600; color: #6c757d;">${rank}</td>
                <td style="padding: 12px; font-weight: 600; color: #007bff;">${ticker}</td>
                <td style="padding: 12px; color: #495057; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #495057;">${price}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: ${changeColor};">${changePercent}</td>
                <td style="padding: 12px; text-align: right; color: #6c757d;">${marketCapHTML}</td>
            </tr>`;
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
    
    // 添加鼠标悬停效果
    const rows = container.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f8f9fa';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });
    });
}

// --- 主入口函数 ---
async function initializeDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const market = urlParams.get('market') || 'sp500';
    const listType = urlParams.get('list') || 'top_market_cap';
    
    // 更新页面标题
    const rankingInfo = RANKING_TYPES[listType] || RANKING_TYPES.top_market_cap;
    const marketName = market === 'chinese_stocks' ? '中概股' : '标普500';
    document.getElementById('list-title').textContent = `${marketName} - ${rankingInfo.title}`;
    document.title = `${marketName} ${rankingInfo.title} - Stock Tag Explorer`;
    
    if (market && listType) {
        try {
            const container = document.getElementById('ranking-list-container');
            container.innerHTML = '<div class="loading">正在加载榜单数据...</div>';
            
            const response = await fetch(`/api/ranking?market=${market}&type=${listType}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const stocks = await response.json();
            
            if (Array.isArray(stocks) && stocks.length > 0) {
                renderList(stocks, market, listType);
            } else {
                container.innerHTML = '<div class="error">暂无数据或数据格式错误</div>';
            }
            
        } catch (error) {
            console.error('加载榜单数据失败:', error);
            document.getElementById('ranking-list-container').innerHTML = 
                `<div class="error">加载失败: ${error.message}</div>`;
        }
    } else {
        document.getElementById('ranking-list-container').innerHTML = 
            '<div class="error">缺少必要的URL参数 (market 和 list)</div>';
    }
}

// --- 页面加载完成后初始化 ---
document.addEventListener('DOMContentLoaded', initializeDetailPage);