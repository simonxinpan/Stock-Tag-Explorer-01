// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 3.0 - Ultimate Data Fetching
import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const STOCK_LIST_FILE = './china_stocks.json';
const SCRIPT_NAME = "Chinese Stocks Ultimate Update";
const DEBUG = process.env.DEBUG === 'true';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- 统一的API请求函数 ---
async function fetchApiData(url, ticker, apiName) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [${ticker}] ${apiName} HTTP Error: ${response.status}`);
      return null;
    }
    const text = await response.text();
    if (!text || !text.startsWith('{')) {
      console.error(`❌ [${ticker}] ${apiName} Invalid Response. Received: ${text.substring(0, 100)}...`);
      return null;
    }
    const data = JSON.parse(text);
    if (Object.keys(data).length === 0 || (data.c === 0 && data.pc === 0)) {
        console.warn(`⚠️ [${ticker}] ${apiName} returned empty or zero data.`);
        return null;
    }
    return data;
  } catch (error) {
    console.error(`❌ [${ticker}] ${apiName} Fetch/Parse Error:`, error.message);
    return null;
  }
}

// --- 主函数 ---
async function main() {
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} Job =====`);
  if (!DATABASE_URL || !FINNHUB_API_KEY) {
    console.error("❌ FATAL: Missing DATABASE_URL or FINNHUB_API_KEY env vars.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  let client;
  try {
    client = await pool.connect();
    console.log(`✅ [DB] Connected to Chinese Stocks database.`);
    const tickers = JSON.parse(await fs.readFile(STOCK_LIST_FILE, 'utf-8'));
    console.log(`📋 Found ${tickers.length} stocks to update.`);
    
    let updatedCount = 0;
    let failedCount = 0;

    for (const ticker of tickers) {
      if (DEBUG) console.log(`🔄 Processing ${ticker}...`);

      // 并行获取三种API数据
      const quotePromise = fetchApiData(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Quote');
      const profilePromise = fetchApiData(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Profile');
      const metricsPromise = fetchApiData(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`, ticker, 'Metrics');
      
      const [quote, profile, metrics] = await Promise.all([quotePromise, profilePromise, metricsPromise]);

      // 核心数据检查：必须有有效的报价数据才能继续
      if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
        const change_amount = quote.c - quote.pc;
        const change_percent = (change_amount / quote.pc) * 100;
        const volume = quote.v;
        const turnover = volume ? volume * quote.c : null;
        
        // 安全地从其他API响应中提取数据
        const market_cap = profile ? profile.marketCapitalization : null;
        const logo = profile ? profile.logo : null;
        const week_52_high = metrics && metrics.metric ? metrics.metric['52WeekHigh'] : null;
        const week_52_low = metrics && metrics.metric ? metrics.metric['52WeekLow'] : null;
        const pe_ttm = metrics && metrics.metric ? metrics.metric.peRatioTTM : null;
        const dividend_yield = metrics && metrics.metric ? metrics.metric.dividendYieldIndicatedAnnual : null;

        const sql = `
          UPDATE stocks SET 
            last_price = $1, change_amount = $2, change_percent = $3, 
            high_price = $4, low_price = $5, open_price = $6, 
            previous_close = $7, volume = $8, turnover = $9, 
            market_cap = COALESCE($10, market_cap),
            logo = COALESCE($11, logo),
            week_52_high = COALESCE($12, week_52_high),
            week_52_low = COALESCE($13, week_52_low),
            pe_ttm = COALESCE($14, pe_ttm),
            dividend_yield = COALESCE($15, dividend_yield),
            last_updated = NOW() 
          WHERE ticker = $16;
        `;
        const params = [
            quote.c, change_amount, change_percent, 
            quote.h, quote.l, quote.o, quote.pc,
            volume, turnover, market_cap, logo,
            week_52_high, week_52_low, pe_ttm, dividend_yield,
            ticker
        ];
        
        try {
          const result = await client.query(sql, params);
          if (result.rowCount > 0) {
            updatedCount++;
            if (DEBUG) console.log(`   -> ✅ Updated ${ticker} with full data.`);
          } else {
            console.warn(`   -> ⚠️ No rows updated for ${ticker}.`);
          }
        } catch (dbError) {
          console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`);
          failedCount++;
        }
      } else {
        console.warn(`⏭️ Skipping ${ticker} due to invalid or missing quote data.`);
        failedCount++;
      }

      await delay(1100); 
    }
    
    console.log(`🎉 ===== Job Finished =====`);
    console.log(`   - Successfully updated: ${updatedCount} stocks`);
    console.log(`   - Failed or skipped: ${failedCount} stocks`);

  } catch (error) {
    console.error("❌ JOB FAILED WITH UNEXPECTED ERROR:", error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
    console.log("🚪 Database connection closed.");
  }
}
main();