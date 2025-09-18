// 文件: /_scripts/update-sp500-data.mjs (或 update-market-data-finnhub.mjs) 
// 版本: Final Synchronized Version 
import pg from 'pg'; 
const { Pool } = pg; 
import fs from 'fs/promises'; 
import 'dotenv/config'; 
 
// --- 配置区 --- 
const DATABASE_URL = process.env.DATABASE_URL; 
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY; 
const STOCK_LIST_FILE = './sp500_stocks.json'; // 明确指向标普500列表 
const SCRIPT_NAME = "S&P 500 Robust Update"; 
const DEBUG = process.env.DEBUG === 'true'; 
const DELAY_SECONDS = 1.1; // 标普500数量多，延迟可以稍短 
 
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchQuote(ticker) { 
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`; 
  try { 
    const response = await fetch(url); 
    if (!response.ok) { 
      console.error(`❌ [${ticker}] API HTTP Error: ${response.status}`); 
      return null; 
    } 
    const text = await response.text(); 
    if (!text.startsWith('{')) { 
      console.error(`❌ [${ticker}] Invalid API Response (not JSON). Received: ${text.substring(0, 100)}...`); 
      return null; 
    } 
    const data = JSON.parse(text); 
    if (data.c === 0 && data.pc === 0) { 
      console.warn(`⚠️ [${ticker}] Received zero data from API, likely an invalid ticker.`); 
      return null; 
    } 
    return data; 
  } catch (error) { 
    console.error(`❌ [${ticker}] Fetch or Parse Error:`, error.message); 
    return null; 
  } 
}

// 检查并刷新数据库连接
async function ensureConnection(client, pool) {
    try {
        // 发送一个简单的查询来测试连接
        await client.query('SELECT 1');
        return client;
    } catch (error) {
        console.warn(`⚠️ Database connection lost, reconnecting: ${error.message}`);
        try {
            client.release();
        } catch (releaseError) {
            console.warn(`⚠️ Error releasing old connection: ${releaseError.message}`);
        }
        return await connectWithRetry(pool);
    }
}

// 获取单只股票的数据（Finnhub API）
async function getSingleTickerDataFromFinnhub(ticker, apiKey) {
    try {
        // 获取实时报价
        const quoteResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
        
        if (!quoteResponse.ok) {
            throw new Error(`HTTP ${quoteResponse.status}: ${quoteResponse.statusText}`);
        }
        
        const quoteData = await quoteResponse.json();
        
        // 检查API错误
        if (quoteData.error) {
            throw new Error(`Finnhub API Error: ${quoteData.error}`);
        }
        
        if (quoteData.c && quoteData.c > 0) {
            // 🔍 调试：打印原始API响应中的volume数据
            console.log(`🔍 Raw API response for ${ticker} - volume (v):`, quoteData.v, `(type: ${typeof quoteData.v})`);
            
            return {
            c: quoteData.c || 0, // 当前价格（收盘价）
            o: quoteData.o || 0, // 开盘价
            h: quoteData.h || 0, // 最高价
            l: quoteData.l || 0, // 最低价
            pc: quoteData.pc || 0, // 昨日收盘价
            v: quoteData.v !== undefined && quoteData.v !== null ? quoteData.v : null  // 成交量：只有在有实际数据时才使用，否则为null
        };
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Error fetching data for ${ticker}:`, error.message);
        return null;
    }
}

// 获取所有股票的市场数据（逐一获取，带连接保活）
async function getFinnhubMarketData(tickers, apiKey, client = null, pool = null) {
    console.log(`🔄 Fetching market data for ${tickers.length} stocks from Finnhub...`);
    console.log('⚡ Using Finnhub API with rate limiting and connection keep-alive');
    
    const marketData = new Map();
    let successCount = 0;
    let failCount = 0;
    
    // Finnhub 免费版限制：每分钟60次请求，我们设置为每秒1次请求以保持安全边际
    const DELAY_MS = 1000; // 1秒延迟，比Polygon的12秒快很多
    const CONNECTION_CHECK_INTERVAL = 50; // 每50个请求检查一次数据库连接
    
    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        
        // 定期检查数据库连接（如果提供了连接参数）
        if (client && pool && i > 0 && i % CONNECTION_CHECK_INTERVAL === 0) {
            console.log(`🔄 [${i}/${tickers.length}] Checking database connection health...`);
            try {
                await client.query('SELECT 1');
                console.log(`✅ Database connection healthy at request ${i}`);
            } catch (connectionError) {
                console.warn(`⚠️ Database connection issue detected at request ${i}: ${connectionError.message}`);
                // 这里不重连，让主函数处理
            }
        }
        
        try {
            console.log(`📊 [${i + 1}/${tickers.length}] Fetching ${ticker}...`);
            
            const data = await getSingleTickerDataFromFinnhub(ticker, apiKey);
            
            if (data && data.c > 0) {
                marketData.set(ticker, data);
                successCount++;
                
                if (process.env.DEBUG) {
                    console.log(`✅ ${ticker}: price=${data.c}, open=${data.o}, high=${data.h}, low=${data.l}, prev_close=${data.pc}, volume=${data.v}`);
                }
            } else {
                failCount++;
                console.warn(`⚠️ No valid data for ${ticker}`);
            }
            
        } catch (error) {
            failCount++;
            console.error(`❌ Failed to fetch ${ticker}:`, error.message);
        }
        
        // 添加延迟（除了最后一次请求）
        if (i < tickers.length - 1) {
            if (i % 100 === 99) {
                console.log(`⏳ [${i + 1}/${tickers.length}] Waiting ${DELAY_MS/1000}s... (Progress: ${((i + 1) / tickers.length * 100).toFixed(1)}%)`);
            }
            await delay(DELAY_MS);
        }
    }
    
    console.log(`📊 Market data collection completed: ${successCount} success, ${failCount} failed`);
    return marketData;
}

// 连接重试函数
async function connectWithRetry(pool, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const client = await pool.connect();
            console.log(`✅ Database connected successfully`);
            return client;
        } catch (error) {
            console.warn(`⚠️ Connection attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
            if (i === maxRetries - 1) throw error;
            await delay(2000); // 等待2秒后重试
        }
    }
}

async function main() { 
  console.log(`🚀 ===== Starting ${SCRIPT_NAME} Job =====`); 
  if (!DATABASE_URL || !FINNHUB_API_KEY) { 
    console.error("❌ FATAL: Missing DATABASE_URL or FINNHUB_API_KEY env vars."); 
    process.exit(1); 
  } 
 
  const pool = new Pool({ connectionString: DATABASE_URL }); 
  let client; 
  try { 
    client = await connectWithRetry(pool); 
    console.log(`✅ [DB] Connected to S&P 500 database.`); 
     
    // 关键修正：不再从数据库读取，而是从JSON文件读取列表 
    const tickers = JSON.parse(await fs.readFile(STOCK_LIST_FILE, 'utf-8')); 
    console.log(`📋 Found ${tickers.length} stocks to update from ${STOCK_LIST_FILE}.`); 
     
    let updatedCount = 0; 
    let failedCount = 0; 
 
    for (const ticker of tickers) { 
      if (DEBUG) console.log(`🔄 Processing ${ticker}...`); 
       
      const quote = await fetchQuote(ticker); 
 
      if (quote && typeof quote.pc === 'number' && quote.pc > 0) { 
        const change_amount = quote.c - quote.pc; 
        const change_percent = (change_amount / quote.pc) * 100; 
 
        // 关键修正：使用与中概股脚本一致的、正确的SQL UPDATE语句 
        const sql = ` 
          UPDATE stocks SET  
            last_price = $1,  
            change_amount = $2, 
            change_percent = $3,  
            high_price = $4, 
            low_price = $5, 
            open_price = $6, 
            previous_close = $7, 
            last_updated = NOW()  
          WHERE ticker = $8; 
        `; 
        const params = [quote.c, change_amount, change_percent, quote.h, quote.l, quote.o, quote.pc, ticker]; 
         
        try { 
          const result = await client.query(sql, params); 
          if (result.rowCount > 0) { 
            updatedCount++; 
            if (DEBUG) console.log(`   -> ✅ Updated ${ticker}`); 
          } else { 
            console.warn(`   -> ⚠️ No rows updated for ${ticker}. Check if it exists in DB.`); 
          } 
        } catch (dbError) { 
          console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`); 
          failedCount++; 
        } 
      } else { 
        console.warn(`⏭️ Skipping ${ticker} due to invalid or missing API data.`); 
        failedCount++; 
      } 
 
      await delay(DELAY_SECONDS * 1000); 
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