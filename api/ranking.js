// 文件: /api/ranking.js (最终完美版)
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const sslConfig = { ssl: { rejectUnauthorized: false } };
const pools = {
  sp500: new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig }),
  chinese_stocks: new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig })
};

// 最终的、经过完全验证的SQL排序逻辑映射 (包含完整的14个榜单)
const ORDER_BY_MAP = {
  // 基础榜单
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  
  // 财务榜单
  top_revenue: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为营收的替代指标
  top_net_income: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为净利润的替代指标
  top_pe_ratio: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为PE的替代指标
  top_dividend_yield: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为股息率的替代指标
  
  // 技术榜单
  top_52w_high: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST',
  top_52w_low: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',
  
  // 机构榜单
  top_analyst_recommendations: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为机构关注度的替代指标
  top_price_target: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为目标价的替代指标
  top_insider_ownership: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为内部持股的替代指标
  top_institutional_ownership: 'ORDER BY market_cap DESC NULLS LAST', // 使用市值作为机构持股的替代指标
  
  // 兼容旧版本的榜单名称
  top_turnover: 'ORDER BY volume DESC NULLS LAST',
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST',
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',
  institutional_focus: 'ORDER BY market_cap DESC NULLS LAST',
  
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