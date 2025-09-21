// 文件: /api/ranking.js (SQLite版本)
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite数据库连接
const databases = {
  sp500: new Database(path.join(__dirname, '..', 'data', 'sp500_stocks.db')),
  chinese_stocks: new Database(path.join(__dirname, '..', 'data', 'chinese_stocks.db'))
};

// SP500市场的排序逻辑映射
const SP500_ORDER_BY_MAP = {
  top_market_cap: 'ORDER BY market_cap DESC',
  top_gainers: 'ORDER BY change_percent DESC',
  top_losers: 'ORDER BY change_percent ASC',
  top_volume: 'ORDER BY volume DESC',
  top_turnover: 'ORDER BY (volume * last_price) DESC',
  new_highs: 'ORDER BY (last_price / high_52_week) DESC',
  new_lows: 'ORDER BY (last_price / low_52_week) ASC',
  top_volatility: 'ORDER BY ((high_price - low_price) / previous_close) DESC',
  top_gap_up: 'ORDER BY ((open_price - previous_close) / previous_close) DESC',
  institutional_focus: 'ORDER BY market_cap DESC',
  retail_hot: 'ORDER BY (volume * last_price) DESC',
  smart_money: 'ORDER BY (volume * last_price) DESC',
  high_liquidity: 'ORDER BY volume DESC',
  unusual_activity: 'ORDER BY ABS(change_percent) DESC',
  momentum_stocks: 'ORDER BY change_percent DESC',
  default: 'ORDER BY market_cap DESC'
};

// 中概股市场的排序逻辑映射
const CHINESE_STOCKS_ORDER_BY_MAP = {
  top_market_cap: 'ORDER BY market_cap DESC',
  top_gainers: 'ORDER BY change_percent DESC',
  top_losers: 'ORDER BY change_percent ASC',
  top_volume: 'ORDER BY volume DESC',
  top_turnover: 'ORDER BY (volume * last_price) DESC',
  new_highs: 'ORDER BY (last_price / high_52_week) DESC',
  new_lows: 'ORDER BY (last_price / low_52_week) ASC',
  top_volatility: 'ORDER BY ((high_price - low_price) / previous_close) DESC',
  top_gap_up: 'ORDER BY ((open_price - previous_close) / previous_close) DESC',
  institutional_focus: 'ORDER BY market_cap DESC',
  retail_hot: 'ORDER BY (volume * last_price) DESC',
  smart_money: 'ORDER BY (volume * last_price) DESC',
  high_liquidity: 'ORDER BY volume DESC',
  unusual_activity: 'ORDER BY ABS(change_percent) DESC',
  momentum_stocks: 'ORDER BY change_percent DESC',
  default: 'ORDER BY market_cap DESC'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  const { type = 'default', market = 'sp500' } = req.query;
  const db = databases[market];
  
  // 根据市场选择对应的ORDER_BY_MAP
  const orderByMap = market === 'chinese_stocks' ? CHINESE_STOCKS_ORDER_BY_MAP : SP500_ORDER_BY_MAP;
  const orderByClause = orderByMap[type] || orderByMap.default;

  if (!db) return res.status(400).json({ error: `Invalid market: ${market}` });

  try {
    const query = `
      SELECT 
        ticker, name_zh, name_en, last_price, change_amount, 
        change_percent, market_cap
      FROM stocks 
      WHERE last_price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL
      ${orderByClause}
      LIMIT 100`;
    const rows = db.prepare(query).all();
    res.status(200).json(rows);
  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}