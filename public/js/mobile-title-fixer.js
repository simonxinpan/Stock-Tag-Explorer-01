// 文件: /public/js/mobile-title-fixer.js
// 职责: 专门修复 mobile-ranking-detail.html 页面的标题，独立运行，无副作用。

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 [Title Fixer] Script started.");
    
    // 1. 定义榜单类型到中文名称的映射表
    const RANKING_NAME_MAP = {
        'top_market_cap': '市值榜',
        'top_gainers': '涨幅榜',
        'top_losers': '跌幅榜',
        'new_highs': '创年内新高',
        'new_lows': '创年内新低',
        'top_turnover': '成交额榜',
        'top_volume': '成交量榜',
        'top_volatility': '振幅榜',
        'top_gap_up': '高开缺口榜',
        'institutional_focus': '机构关注榜',
        'retail_hot': '散户热门榜',
        'smart_money': '主力动向榜',
        'high_liquidity': '高流动性榜',
        'unusual_activity': '异动榜',
        'momentum_stocks': '动量榜'
    };

    // 2. 从URL中获取当前的榜单类型
    const urlParams = new URLSearchParams(window.location.search);
    const listType = urlParams.get('list') || urlParams.get('type');
    
    // 3. 找到页面上需要被更新的标题元素
    // 先尝试多个可能的标题元素ID
    const possibleTitleSelectors = [
        '#list-title',
        '#page-title', 
        '#ranking-title',
        '.page-title',
        '.ranking-title',
        '.list-title'
    ];
    
    let titleElement = null;
    for (const selector of possibleTitleSelectors) {
        titleElement = document.querySelector(selector);
        if (titleElement) {
            console.log(`📍 [Title Fixer] Found title element with selector: ${selector}`);
            break;
        }
    }

    if (titleElement && listType && RANKING_NAME_MAP[listType]) {
        // 4. 从映射表中查找并设置标题
        titleElement.textContent = RANKING_NAME_MAP[listType];
        console.log(`✅ [Title Fixer] Title updated to: ${RANKING_NAME_MAP[listType]}`);
    } else {
        console.warn(`⚠️ [Title Fixer] Could not update title. Element found: ${!!titleElement}, ListType found: ${listType}`);
        
        // 调试信息：显示当前页面的所有可能标题元素
        console.log("🔍 [Title Fixer] Debug - Available elements:");
        possibleTitleSelectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                console.log(`  - ${selector}: "${el.textContent.trim()}"`);
            }
        });
    }
});