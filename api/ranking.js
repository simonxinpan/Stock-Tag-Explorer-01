// 文件: /api/ranking.js (最终宽容版)
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const sslConfig = { ssl: { rejectUnauthorized: false } };
const pools = {
  sp500: new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig }),
  chinese_stocks: new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig })
};

// 包含了所有14个榜单的、理想的SQL排序逻辑
const ORDER_BY_MAP = {
  top_market_cap: { sql: 'ORDER BY market_cap DESC NULLS LAST', required_columns: ['market_cap'] },
  top_gainers: { sql: 'ORDER BY change_percent DESC NULLS LAST', required_columns: ['change_percent'] },
  top_losers: { sql: 'ORDER BY change_percent ASC NULLS LAST', required_columns: ['change_percent'] },
  top_volume: { sql: 'ORDER BY volume DESC NULLS LAST', required_columns: ['volume'] },
  top_turnover: { sql: 'ORDER BY turnover DESC NULLS LAST', required_columns: ['turnover'] },
  new_highs: { sql: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST', required_columns: ['last_price', 'week_52_high'] },
  new_lows: { sql: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST', required_columns: ['last_price', 'week_52_low'] },
  top_volatility: { sql: 'ORDER BY ((high_price - low_price) / previous_close) DESC NULLS LAST', required_columns: ['high_price', 'low_price', 'previous_close'] },
  top_gap_up: { sql: 'ORDER BY ((open_price - previous_close) / previous_close) DESC NULLS LAST', required_columns: ['open_price', 'previous_close'] },
  unusual_activity: { sql: 'ORDER BY ABS(change_percent) DESC NULLS LAST', required_columns: ['change_percent'] },
  momentum_stocks: { sql: 'ORDER BY change_percent DESC NULLS LAST', required_columns: ['change_percent'] },
  institutional_focus: { sql: 'ORDER BY market_cap DESC NULLS LAST', required_columns: ['market_cap'] },
  retail_hot: { sql: 'ORDER BY turnover DESC NULLS LAST', required_columns: ['turnover'] },
  smart_money: { sql: 'ORDER BY turnover DESC NULLS LAST', required_columns: ['turnover'] },
  high_liquidity: { sql: 'ORDER BY volume DESC NULLS LAST', required_columns: ['volume'] },
  default: { sql: 'ORDER BY market_cap DESC NULLS LAST', required_columns: ['market_cap'] }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  const { type = 'default', market = 'sp500' } = req.query;
  const pool = pools[market];
  
  if (!pool) return res.status(400).json({ error: `Invalid market: ${market}` });

  try {
    // 关键的优雅降级逻辑
    let orderByConfig = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
    
    // 检查所需列的数据是否真的存在 (只检查第一行作为样本)
    const checkQuery = `SELECT ${orderByConfig.required_columns.join(', ')} FROM stocks WHERE ${orderByConfig.required_columns.map(c => `${c} IS NOT NULL`).join(' AND ')} LIMIT 1;`;
    const checkResult = await pool.query(checkQuery);

    let orderByClause;
    if (checkResult.rows.length > 0) {
        // 如果数据存在，使用理想的排序
        orderByClause = orderByConfig.sql;
    } else {
        // 如果数据不存在(全是NULL)，则安全地回退到市值排序
        console.warn(`[API Ranking] Data for '${type}' sort is missing in '${market}' DB. Falling back to market cap sort.`);
        orderByClause = ORDER_BY_MAP.default.sql;
    }

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