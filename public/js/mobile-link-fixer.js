// 文件: /public/js/mobile-link-fixer.js
// 目的: 专门修复 mobile.html 上的跳转链接，独立运行，无副作用。

/**
 * 这个脚本会在页面所有内容都加载完毕后执行，
 * 找到所有的"查看更多"链接，并为它们赋予正确的URL。
 */
function fixMobileRankingLinks() {
  console.log("🔗 [Link Fixer] Script started.");
  
  // 1. 获取当前页面的市场类型
  const currentMarket = new URLSearchParams(window.location.search).get('market') || 'sp500';
  console.log(`🔗 [Link Fixer] Current market detected: ${currentMarket}`);

  // 2. 选中所有待修复的链接/按钮
  // 根据实际HTML结构，查找所有"查看更多"按钮
  const moreButtons = document.querySelectorAll('.more-btn');
  
  if (moreButtons.length === 0) {
    console.warn("🔗 [Link Fixer] Warning: No more buttons found to fix.");
    return;
  }

  console.log(`🔗 [Link Fixer] Found ${moreButtons.length} more buttons to process.`);

  // 3. 循环并修复每一个链接
  moreButtons.forEach(button => {
    const listType = button.dataset.list; // 从 data-list="top_gainers" 获取
    
    if (listType) {
      const correctUrl = `./mobile-ranking-detail.html?market=${currentMarket}&list=${listType}`;
      
      // 移除原有的onclick事件，改为直接跳转
      button.removeAttribute('onclick');
      button.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = correctUrl;
      });
      
      console.log(`   -> ✅ Fixed link for '${listType}' to: ${correctUrl}`);
    }
  });

  console.log("🔗 [Link Fixer] All links have been updated.");
}

// 确保在整个页面（包括图片等）都加载完毕后才执行，以防万一
window.addEventListener('load', fixMobileRankingLinks);