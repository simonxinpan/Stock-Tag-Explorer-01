// 文件: /_scripts/update-chinese-stocks-data.mjs
// 版本: 7.0 - Production Write-Enabled
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 配置区 ---
const DATABASE_URL = process.env.DATABASE_URL;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const SCRIPT_NAME = "Chinese Stocks Production Update";
const DEBUG = process.env.DEBUG === 'true';
const DELAY_SECONDS = 2.1;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchApiData(url, ticker, apiName) {
    // ... (此函数无需修改，与诊断版相同)
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429) { console.warn(`🔶 [${ticker}] ${apiName} Rate Limit Hit (429).`); }
            else { console.error(`❌ [${ticker}] ${apiName} HTTP Error: ${response.status}`); }
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
        
        const tickerRes = await client.query('SELECT ticker FROM stocks ORDER BY ticker;');
        const tickers = tickerRes.rows.map(r => r.ticker);
        console.log(`📋 Found ${tickers.length} high-quality stocks to update from the database.`);
        
        let updatedCount = 0;
        let failedCount = 0;

        for (const ticker of tickers) {
            if (DEBUG) console.log(`🔄 Processing ${ticker}...`);

            const quote = await fetchApiData(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`, ticker, 'Quote');

            if (quote && typeof quote.pc === 'number' && quote.pc > 0) {
                const change_amount = quote.c - quote.pc;
                const change_percent = (change_amount / quote.pc) * 100;
                
                // 关键变更：恢复数据库写入操作
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
                    }
                } catch (dbError) {
                    console.error(`   -> ❌ DB Error for ${ticker}: ${dbError.message}`);
                    failedCount++;
                }
            } else {
                console.warn(`⏭️ Skipping ${ticker} due to invalid or missing quote data.`);
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