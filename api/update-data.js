// /api/update-data.js (最终高性能版 - 完全依赖 Polygon)
import { Pool } from 'pg';

// 使用统一的环境变量名
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- 辅助函数：从 Polygon 高效获取前一日市场快照 ---
async function getPreviousDaySnapshot(apiKey) {
    let date = new Date();
    // 尝试回溯最多7天，以确保能找到最近的一个有数据的交易日
    for (let i = 0; i < 7; i++) {
        const tradeDate = date.toISOString().split('T')[0];
        const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${tradeDate}?adjusted=true&apiKey=${apiKey}`;
        try {
            console.log(`[Polygon] Attempting to fetch snapshot for date: ${tradeDate}`);
            const response = await fetch(url, { signal: AbortSignal.timeout(15000) }); // 15秒超时
            if (response.ok) {
                const data = await response.json();
                if (data && data.resultsCount > 0) {
                    console.log(`[Polygon] Successfully found snapshot for date: ${tradeDate}`);
                    const quotesMap = new Map();
                    data.results.forEach(q => quotesMap.set(q.T, q));
                    return quotesMap;
                }
            } else {
                 console.warn(`[Polygon] API for ${tradeDate} returned status: ${response.status}`);
            }
        } catch (error) { console.error(`[Polygon] Fetch failed for ${tradeDate}:`, error.message); }
        date.setDate(date.getDate() - 1);
    }
    throw new Error("Could not fetch any snapshot data from Polygon after 7 attempts.");
}

// --- API 主处理函数 ---
export default async function handler(req, res) {
  // 安全校验
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
  if (!POLYGON_API_KEY) {
    return res.status(500).json({ error: 'Polygon API key is not configured.' });
  }

  console.log('🚀 API call received: Starting full stock data update using Polygon.io...');
  const client = await pool.connect();
  
  try {
    const { rows: companies } = await client.query('SELECT ticker FROM stocks');
    console.log(`📊 Found ${companies.length} stocks in database.`);
    
    const polygonSnapshot = await getPreviousDaySnapshot(POLYGON_API_KEY);
    
    let successCount = 0;
    
    await client.query('BEGIN');
    for (const company of companies) {
      const ticker = company.ticker;
      const marketData = polygonSnapshot.get(ticker);
      
      if (marketData) {
        // 使用 Polygon 的数据填充数据库
        const result = await client.query(
          `UPDATE stocks SET 
            last_price = $1, 
            change_amount = $2, 
            change_percent = $3, 
            open_price = $4,
            high_price = $5,
            low_price = $6,
            volume = $7,
            last_updated = NOW()
           WHERE ticker = $8`,
          [
            marketData.c,
            marketData.c - marketData.o,
            marketData.o > 0 ? ((marketData.c - marketData.o) / marketData.o) * 100 : 0,
            marketData.o,
            marketData.h,
            marketData.l,
            marketData.v,
            ticker
          ]
        );
        if (result.rowCount > 0) successCount++;
      }
    }
    await client.query('COMMIT');
    
    console.log(`\n📈 Update complete: ${successCount} stocks successfully updated with Polygon data.`);
    res.status(200).json({ success: true, updated: successCount, total: companies.length });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 An error occurred during the update process:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (client) client.release();
  }
}