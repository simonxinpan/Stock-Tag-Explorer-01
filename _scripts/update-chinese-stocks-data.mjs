// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 6.0 - Final Diagnostic & Reporting
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const SCRIPT_NAME = "Chinese Stocks Final Coverage Test";
const DEBUG = process.env.DEBUG === 'true';
const DELAY_SECONDS = 1.1; // 我们可以用稍快一点的速度，因为写入操作被注释了

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchApiData(url, ticker, apiName) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) return { error: 'RATE_LIMIT' };
      return { error: `HTTP_${response.status}` };
    }
    const text = await response.text();
    if (!text || !text.startsWith('{')) return { error: 'INVALID_RESPONSE' };
    
    const data = JSON.parse(text);
    if (Object.keys(data).length === 0 || (data.c === 0 && data.pc === 0)) {
      return { error: 'ZERO_DATA' };
    }
    return { data }; // 成功时返回带data键的对象
  } catch (error) {
    return { error: 'FETCH_ERROR' };
  }
}

async function main() {
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} =====`);
  if (!DATABASE_URL || !FINNHUB_API_KEY) {
    console.error("❌ FATAL: Missing DATABASE_URL or FINNHUB_API_KEY env vars.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  let client;
  try {
    client = await pool.connect();
    console.log(`✅ [DB] Connected to Chinese Stocks database.`);
    
    const tickerRes = await client.query('SELECT ticker FROM stocks ORDER BY ticker;');
    const tickers = tickerRes.rows.map(r => r.ticker);
    console.log(`📋 Found ${tickers.length} stocks in the database to test.`);
    
    const results = {
      success: [],
      zero_data: [],
      invalid_response: [],
      rate_limit: [],
      http_error: [],
      fetch_error: []
    };

    for (const [index, ticker] of tickers.entries()) {
      console.log(`[${index + 1}/${tickers.length}] Testing ${ticker}...`);
      
      const quoteResult = await fetchApiData(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Quote');

      if (quoteResult.data) {
        console.log(`   -> ✅ SUCCESS: Found valid quote data for ${ticker}.`);
        results.success.push(ticker);
        
        // ================================================================
        // == 安全诊断模式：数据库更新操作已被注释掉 ==
        // ================================================================
        /*
        const quote = quoteResult.data;
        const sql = `UPDATE stocks SET last_price = $1, ... WHERE ticker = $2;`;
        const params = [quote.c, ..., ticker];
        await client.query(sql, params);
        */
        // ================================================================

      } else {
        console.log(`   -> ❌ FAILED: Reason - ${quoteResult.error}`);
        results[quoteResult.error.toLowerCase()]?.push(ticker);
      }
      await delay(DELAY_SECONDS * 1000);
    }
    
    // --- 生成最终报告 ---
    const total = tickers.length;
    const successCount = results.success.length;
    const successRate = total > 0 ? (successCount / total * 100).toFixed(2) : 0;

    console.log(`\n\n🎉🎉🎉 ===== FINAL COVERAGE REPORT ===== 🎉🎉🎉`);
    console.log(`\n- Total Stocks Tested: ${total}`);
    console.log(`- ✅ Successful Fetches: ${successCount}`);
    console.log(`- 📊 Final Success Rate: ${successRate}%`);
    console.log(`\n--- Failure Analysis ---`);
    console.log(`- ⚠️ Returned Zero Data (likely delisted/unsupported): ${results.zero_data.length} tickers`);
    if (results.zero_data.length > 0) console.log(`  (${results.zero_data.join(', ')})`);
    console.log(`- 📄 Invalid API Response (HTML page): ${results.invalid_response.length} tickers`);
    if (results.invalid_response.length > 0) console.log(`  (${results.invalid_response.join(', ')})`);
    console.log(`- ⏳ Rate Limit Hits (429): ${results.rate_limit.length} tickers`);
    console.log(`- 🌐 Other HTTP/Fetch Errors: ${results.http_error.length + results.fetch_error.length} tickers`);
    
    console.log(`\n--- Decision Support ---`);
    if (successRate >= 80) {
        console.log("DECISION: ✅ GO! The success rate is high. The list is viable.");
    } else {
        console.log("DECISION: ❌ NO-GO. The success rate is below 80%. The data source is not comprehensive enough for this list.");
        console.log("   Recommended Action: Pivot to a curated 'Top Chinese Stocks' list, or find an alternative data API.");
    }
    console.log(`\n🚪 ===== Test Finished: Database connection closed. =====`);

  } catch (error) {
    console.error("❌ JOB FAILED WITH UNEXPECTED ERROR:", error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) pool.end();
  }
}

main();