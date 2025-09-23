// 文件: /api/ranking.js
// 版本: API-v3.0
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const sslConfig = { ssl: { rejectUnauthorized: false } };
const pools = {
  sp500: new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig }),
  chinese_stocks: new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig })
};

const ORDER_BY_MAP = {
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY turnover DESC NULLS LAST',
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST',
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',
  top_volatility: 'ORDER BY ((high_price - low_price) / previous_close) DESC NULLS LAST',
  top_gap_up: 'ORDER BY ((open_price - previous_close) / previous_close) DESC NULLS LAST',
  institutional_focus: 'ORDER BY market_cap DESC NULLS LAST',
  retail_hot: 'ORDER BY turnover DESC NULLS LAST',
  smart_money: 'ORDER BY turnover DESC NULLS LAST',
  high_liquidity: 'ORDER BY volume DESC NULLS LAST',
  unusual_activity: 'ORDER BY ABS(change_percent) DESC NULLS LAST',
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST',
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  const { type = 'default', market = 'sp500' } = req.query;
  const pool = pools[market];
  const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;

  if (!pool) return res.status(400).json({ error: `Invalid market: ${market}` });

  try {
    const query = `
      SELECT 
        ticker, name_zh, name_en, last_price, change_amount,
        change_percent, market_cap
      FROM stocks
      WHERE last_price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL
      ${orderByClause}
      LIMIT 100;`;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}