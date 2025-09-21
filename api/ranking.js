// 文件: /api/ranking.js (终极健壮连接版)
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 辅助日志函数 ---
function log(message) { console.log(`[API Ranking] ${message}`); }

// ================================================================
// == 关键的、健壮的数据库连接配置函数 ==
// ================================================================
function createDbConfigFromUrl(connectionString) {
  if (!connectionString) return null;
  try {
    const url = new URL(connectionString);
    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1), // 移除开头的'/'
      ssl: {
        rejectUnauthorized: false
      }
    };
  } catch (error) {
    log(`❌ CRITICAL ERROR parsing database URL: ${error.message}`);
    return null;
  }
}

// --- 数据库连接池 ---
let pools = {};
try {
    log("Step 1: Initializing database pools...");
    const sp500Config = createDbConfigFromUrl(process.env.NEON_DATABASE_URL);
    if (sp500Config) {
        pools.sp500 = new Pool(sp500Config);
        log("✅ S&P 500 pool configured successfully using parsed config.");
    } else {
        log("⚠️ S&P 500 database URL (NEON_DATABASE_URL) is missing or invalid!");
    }

    const chineseStocksConfig = createDbConfigFromUrl(process.env.CHINESE_STOCKS_DB_URL);
    if (chineseStocksConfig) {
        pools.chinese_stocks = new Pool(chineseStocksConfig);
        log("✅ Chinese Stocks pool configured successfully using parsed config.");
    } else {
        log("⚠️ Chinese Stocks database URL (CHINESE_STOCKS_DB_URL) is missing or invalid!");
    }
    log("Step 1 Complete.");
} catch (e) {
    log(`❌ CRITICAL ERROR during pool initialization: ${e.message}`);
    pools = null;
}

// --- SQL排序逻辑 ---
const ORDER_BY_MAP = {
  // ... (我们之前确认过的完整排序逻辑) ...
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  const { type = 'default', market = 'sp500' } = req.query;
  log(`---> Request received: market=${market}, type=${type}`);

  try {
    if (!pools) throw new Error("Database pools were not initialized.");
    const pool = pools[market];
    if (!pool) throw new Error(`No pool for market: '${market}'.`);

    log(`Step 2: Attempting to get a client from the pool for market: ${market}`);
    const client = await pool.connect();
    log("✅ Step 2 Complete: Database client acquired.");
    
    try {
      const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
      const query = `SELECT ticker, name_zh, market_cap, last_price, change_percent FROM stocks WHERE market_cap IS NOT NULL ${orderByClause} LIMIT 50;`;
      log(`Step 3: Executing SQL query...`);
      
      const { rows } = await client.query(query);
      log(`✅ Step 3 Complete: Query successful, found ${rows.length} rows.`);

      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      log(`<--- Sending 200 OK with ${rows.length} stocks.`);
      res.status(200).json(rows);

    } finally {
      client.release();
      log("Step 4: Database client released.");
    }

  } catch (error) {
    log(`❌ CRITICAL HANDLER ERROR for market '${market}': ${error.message}`);
    log(error.stack);
    res.status(500).json({ 
        error: 'Internal Server Error',
        details: error.message,
        market: market
    });
  }
}