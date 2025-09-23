// 文件: /api/ranking.js (终极健壮连接版)
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 辅助日志函数 ---
function log(message) { console.log(`[API Ranking] ${message}`); }

// ================================================================
// == 关键的、健壮的数据库连接配置函数 ==
// ================================================================
function createDbPoolFromUrl(connectionString) {
  if (!connectionString) return null;
  try {
    const url = new URL(connectionString);
    const config = {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    };
    return new Pool(config);
  } catch (error) {
    log(`❌ CRITICAL ERROR parsing database URL: ${error.message}`);
    return null;
  }
}

// --- 数据库连接池 ---
let pools = {};
try {
    log("Step 1: Initializing database pools...");
    pools.sp500 = createDbPoolFromUrl(process.env.NEON_DATABASE_URL);
    if (pools.sp500) log("✅ S&P 500 pool configured.");
    else log("⚠️ S&P 500 DB URL missing!");

    pools.chinese_stocks = createDbPoolFromUrl(process.env.CHINESE_STOCKS_DB_URL);
    if (pools.chinese_stocks) log("✅ Chinese Stocks pool configured.");
    else log("⚠️ Chinese Stocks DB URL missing!");

    log("Step 1 Complete.");
} catch (e) {
    log(`❌ CRITICAL ERROR during pool initialization: ${e.message}`);
}

// --- SQL排序逻辑 (全功能版) ---
const ORDER_BY_MAP = {
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY turnover DESC NULLS LAST',
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST',
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  const { type = 'default', market = 'sp500' } = req.query;
  log(`---> Request for market='${market}', type='${type}'`);

  try {
    const pool = pools[market];
    if (!pool) throw new Error(`Database pool for '${market}' is not available.`);

    log(`Step 2: Connecting to '${market}' database...`);
    const client = await pool.connect();
    log("✅ Step 2 Complete: DB client connected.");
    
    try {
      const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
      const query = `SELECT ticker, name_zh, market_cap, last_price, change_percent FROM stocks WHERE market_cap IS NOT NULL ${orderByClause} LIMIT 100;`;
      log(`Step 3: Executing SQL query...`);
      
      const { rows } = await client.query(query);
      log(`✅ Step 3 Complete: Query successful, found ${rows.length} rows.`);

      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      log(`<--- Sending 200 OK.`);
      res.status(200).json(rows);