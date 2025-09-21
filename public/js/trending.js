// 文件: /public/js/trending.js
// 版本: Final & Unbreakable

// --- 格式化函数 (保持我们已优化的版本) ---
function formatSP500MarketCap(cap) { /* ... */ }
function formatChineseStockMarketCap(cap) { /* ... */ }

// --- 核心渲染函数 ---
async function loadAndRenderSingleList(market, listType) {
  const container = document.getElementById('ranking-list-container');
  if (!container) {
    console.error("❌ FATAL: Cannot find DOM element with id 'ranking-list-container'.");
    return;
  }
  container.innerHTML = '正在加载...';
  try {
    const response = await fetch(`/api/ranking?market=${market}&type=${listType}`);
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const stocks = await response.json();
    // ... (调用您已有的、健壮的renderStockList函数来渲染数据到container中)
    renderStockList(container, stocks, market);
  } catch (error) {
    container.textContent = `加载失败: ${error.message}`;
  }
}

// --- 主入口 ---
function initializeApp() {
  console.log("📊 趋势页面脚本开始执行...");
  const urlParams = new URLSearchParams(window.location.search);
  const pageName = window.location.pathname.split('/').pop();
  const market = urlParams.get('market') || 'sp500';
  const listType = urlParams.get('list');

  console.log(`🔍 页面类型: ${pageName}, 市场: ${market}, 榜单类型: ${listType || 'N/A'}`);

  // 关键的健壮性检查
  if (pageName.includes('list-detail.html')) {
    if (listType) {
      console.log(`📋 加载二级榜单页面...`);
      loadAndRenderSingleList(market, listType);
    } else {
      // 如果是详情页但没有list参数，显示错误
      const container = document.getElementById('ranking-list-container');
      if (container) container.textContent = "错误：未指定榜单类型 (Missing 'list' parameter in URL)。";
      console.error("❌ Page Error: list-detail.html requires a 'list' URL parameter.");
    }
  } else if (pageName.includes('trending.html')) {
    console.log(`🏠 加载一级榜单页面...`);
    // loadAndRenderAllLists(market); // 调用加载一级页面的函数
  }
}

document.addEventListener('DOMContentLoaded', () => {
   setTimeout(initializeApp, 0);
});

// ... (您其他的辅助函数，如 renderStockList, bindEventListeners 等)