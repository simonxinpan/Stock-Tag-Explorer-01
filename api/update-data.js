// /api/update-data.js (最终的、最健壮的重构版)
import { Pool } from 'pg';

// 1. 统一使用正确的环境变量名
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

// 2. 辅助函数：使用内置 fetch 获取数据
async function fetchQuote(symbol, apiKey) {
    try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return null;
        const data = await response.json();
        return (data && typeof data.c === 'number') ? data : null;
    } catch (error) {
        console.warn(`Finnhub fetch failed for ${symbol}:`, error.message);
        return null;
    }
}

// 3. API 主处理函数，使用正确的 export default
export default async function handler(req, res) {
  // 安全校验
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 API call received: Starting full stock data update...');
  const client = await pool.connect();
  
  try {
    // 4. 简化逻辑：获取所有股票，进行全量更新
    const { rows: companies } = await client.query('SELECT ticker FROM stocks');
    console.log(`📊 Found ${companies.length} stocks to update in the database.`);
    
    let successCount = 0;
    
    for (const company of companies) {
      const symbol = company.ticker;
      const quoteData = await fetchQuote(symbol, process.env.FINNHub_API_KEY);
      
      if (quoteData) {
        // 5. 使用正确的数据库列名
        const result = await client.query(
          `UPDATE stocks SET 
            last_price = $1, 
            change_amount = $2, 
            change_percent = $3, 
            open_price = $4,
            high_price = $5,
            low_price = $6,
            last_updated = NOW()
           WHERE ticker = $7`,
          [
            quoteData.c,  // current price -> last_price
            quoteData.d,  // change amount
            quoteData.dp, // change percent
            quoteData.o,  // open price
            quoteData.h,  // high price
            quoteData.l,  // low price
            symbol
          ]
        );
        if (result.rowCount > 0) successCount++;
      } else {
        console.warn(`⚠️ Could not fetch data for ${symbol}. Skipping update.`);
      }
      
      // 添加延迟，严格遵守 Finnhub 频率限制 (每秒最多1次)
      await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1秒
    }
    
    console.log(`\n📈 Update complete: ${successCount} stocks successfully updated.`);
    res.status(200).json({ success: true, updated: successCount, total: companies.length });

  } catch (error) {
    console.error('💥 An error occurred during the update process:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (client) client.release();
  }
}