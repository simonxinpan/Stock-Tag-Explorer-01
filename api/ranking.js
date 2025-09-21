// 文件: /api/ranking.js (终极最小版，只为保证不崩溃)
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
  top_revenue: 'ORDER BY market_cap DESC NULLS LAST',
  top_net_income: 'ORDER BY market_cap DESC NULLS LAST',
  top_pe_ratio: 'ORDER BY market_cap DESC NULLS LAST',
  top_dividend_yield: 'ORDER BY market_cap DESC NULLS LAST',
  top_52w_high: 'ORDER BY market_cap DESC NULLS LAST',
  top_52w_low: 'ORDER BY market_cap DESC NULLS LAST',
  top_analyst_recommendations: 'ORDER BY market_cap DESC NULLS LAST',
  top_price_target: 'ORDER BY market_cap DESC NULLS LAST',
  top_insider_ownership: 'ORDER BY market_cap DESC NULLS LAST',
  top_institutional_ownership: 'ORDER BY market_cap DESC NULLS LAST',
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  const { type = 'default', market = 'sp500' } = req.query;
  const pool = pools[market];
  
  if (!pool) return res.status(400).json({ error: `Invalid market: ${market}` });

  try {
    const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
    const query = `
      SELECT ticker, name_zh, name_en, last_price, change_amount, change_percent, market_cap 
      FROM stocks 
      WHERE last_price IS NOT NULL AND market_cap IS NOT NULL 
      ${orderByClause} 
      LIMIT 100;`;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`[API Error]: type=${type}, market=${market}`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}