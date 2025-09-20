// 文件: /api/ranking.js
// 版本: Final Sentry-Logged Version
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 全局日志函数 ---
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// --- 数据库连接池 ---
let pools = {};
try {
    log("Step 1: Initializing database pools...");
    const sslConfig = { ssl: { rejectUnauthorized: false } };
    
    if (process.env.NEON_DATABASE_URL) {
        pools.sp500 = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig });
        log("✅ S&P 500 pool configured.");
    } else {
        log("⚠️ S&P 500 database URL (NEON_DATABASE_URL) is missing!");
    }

    if (process.env.CHINESE_STOCKS_DB_URL) {
        pools.chinese_stocks = new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig });
        log("✅ Chinese Stocks pool configured.");
    } else {
        log("⚠️ Chinese Stocks database URL (CHINESE_STOCKS_DB_URL) is missing!");
    }
    log("Step 1 Complete.");
} catch (e) {
    log(`❌ CRITICAL ERROR during pool initialization: ${e.message}`);
    // 如果连接池初始化失败，让所有请求都失败
    pools = null;
}


// --- SQL排序逻辑 ---
const ORDER_BY_MAP = {
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  const { type = 'default', market = 'sp500' } = req.query;
  const requestId = Math.random().toString(36).substring(2, 9);
  
  log(`[${requestId}] ---> Request received: market=${market}, type=${type}`);

  try {
    log(`[${requestId}] Step 2: Selecting database pool for market: ${market}`);
    if (!pools) {
        throw new Error("Database pools were not initialized.");
    }

    const pool = pools[market];
    if (!pool) {
      throw new Error(`No database pool configured for market: '${market}'. Check environment variables.`);
    }
    log(`[${requestId}] Step 2 Complete. Pool selected.`);

    const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
    log(`[${requestId}] Step 3: Determined SQL ORDER BY clause: ${orderByClause}`);

    const query = `
      SELECT ticker, name_zh, last_price, change_percent, market_cap
      FROM stocks 
      WHERE last_price IS NOT NULL AND market_cap IS NOT NULL
      ${orderByClause}
      LIMIT 50; 
    `;
    log(`[${requestId}] Step 4: Ready to execute query.`);
    
    const { rows } = await pool.query(query);
    log(`[${requestId}] Step 5: Query executed successfully. Found ${rows.length} rows.`);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    log(`[${requestId}] <--- Sending 200 OK response with ${rows.length} stocks.`);
    res.status(200).json(rows);

  } catch (error) {
    log(`[${requestId}] ❌ CRITICAL ERROR in handler: ${error.message}`);
    log(`[${requestId}] Full error stack: ${error.stack}`);
    // 返回一个包含详细错误信息的500响应
    res.status(500).json({ 
        error: 'Internal Server Error',
        details: error.message,
        requestId: requestId
    });
  }
}