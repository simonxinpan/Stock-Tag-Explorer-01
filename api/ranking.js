import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import 'dotenv/config';

// 数据库连接管理
const databases = {};

// 初始化数据库连接
function initDatabase(name, path) {
  try {
    const db = new sqlite3.Database(path);
    db.all = promisify(db.all.bind(db));
    db.get = promisify(db.get.bind(db));
    databases[name] = db;
    console.log(`[INFO] ${name} database initialized`);
    return db;
  } catch (error) {
    console.error(`[ERROR] Failed to initialize ${name} database:`, error);
    return null;
  }
}

// 初始化标普500数据库
const sp500DbPath = process.env.NEON_DATABASE_URL?.replace('sqlite:', '') || './data/stock_explorer.db';
const sp500Db = initDatabase('sp500', sp500DbPath);

// 初始化中概股数据库
let chineseStocksDb = null;
if (process.env.CHINESE_STOCKS_DATABASE_URL && process.env.CHINESE_STOCKS_DATABASE_URL.startsWith('sqlite:')) {
  const chineseDbPath = process.env.CHINESE_STOCKS_DATABASE_URL.replace('sqlite:', '');
  try {
    chineseStocksDb = initDatabase('chinese_stocks', chineseDbPath);
  } catch (error) {
    console.warn('[WARNING] Failed to initialize Chinese stocks database:', error.message);
  }
} else {
  console.log('[INFO] Chinese stocks database not configured or not SQLite, will use SP500 database with filters');
}

// 完整的ORDER_BY_MAP包含所有14个榜单
const ORDER_BY_MAP = {
  // 基础榜单
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // 交易活跃度榜单
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY turnover DESC NULLS LAST',
  
  // 技术分析榜单
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST',
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',
  
  // 波动性榜单
  top_volatility: 'ORDER BY ((high_price - low_price) / previous_close) DESC NULLS LAST',
  top_gap_up: 'ORDER BY ((open_price - previous_close) / previous_close) DESC NULLS LAST',
  unusual_activity: 'ORDER BY ABS(change_percent) DESC NULLS LAST',
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST',

  // 资金流向榜单
  institutional_focus: 'ORDER BY market_cap DESC NULLS LAST',
  retail_hot: 'ORDER BY turnover DESC NULLS LAST',
  smart_money: 'ORDER BY turnover DESC NULLS LAST',
  high_liquidity: 'ORDER BY volume DESC NULLS LAST',

  // 默认排序
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { type = 'default', market = 'sp500' } = req.query;

  try {
    // 选择数据库和表名
    let db, tableName, selectColumns, whereConditions;
    
    if (market === 'chinese_stocks' && chineseStocksDb) {
      console.log('[INFO] Using Chinese stocks database');
      db = chineseStocksDb;
      tableName = 'chinese_stocks';
      selectColumns = 'ticker, company_name as name_zh, price as last_price, change_percent, market_cap, sector';
      whereConditions = 'price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL';
    } else {
      console.log('[INFO] Using SP500 database');
      db = sp500Db;
      tableName = 'sp500_stocks';
      selectColumns = 'ticker, name_zh, last_price, change_percent, market_cap, sector';
      whereConditions = 'last_price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL';
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
    
    // 构建查询
    const query = `
      SELECT
        ${selectColumns}
      FROM ${tableName}
      WHERE ${whereConditions}
      ${orderByClause}
      LIMIT 100;`;
    
    console.log(`[DEBUG] Query for ${market}: \n${query}`);
    let rows = await db.all(query);
    console.log(`[DEBUG] Found ${rows.length} records for ${market}`);
    
    // 如果是中概股市场且结果为空，fallback到标普500数据库
    if (market === 'chinese_stocks' && rows.length === 0 && tableName === 'chinese_stocks') {
      console.log('[FALLBACK] Chinese stocks database returned no results, trying SP500 database with filter');
      const fallbackQuery = `
        SELECT 
          ticker, name_zh, last_price, 
          change_percent, market_cap, sector
        FROM sp500_stocks 
        WHERE last_price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL
        AND (ticker LIKE '%.HK' OR ticker LIKE '%ADR' OR name_zh IS NOT NULL)
        ${orderByClause}
        LIMIT 100;`;
      
      rows = await sp500Db.all(fallbackQuery);
      console.log(`[FALLBACK] SP500 database returned ${rows.length} results`);
    }
    
    res.status(200).json(rows);
  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}