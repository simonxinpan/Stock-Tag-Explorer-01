// 文件: /api/ranking.js
// 版本: Final Dynamic SQL Version
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// --- 数据库连接池 ---
const sslConfig = { ssl: { rejectUnauthorized: false } };
const pools = {
  sp500: new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig }),
  chinese_stocks: new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig })
};

// ================================================================
// == 关键的、完整的SQL排序逻辑映射 ==
// ================================================================
const ORDER_BY_MAP = {
  // 核心榜单 (已验证字段存在)
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // 交易活跃度榜单 (需要 volume 和 turnover 字段)
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY turnover DESC NULLS LAST',
  
  // 价格趋势榜单 (需要 week_52_high 和 week_52_low 字段)
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST', // 越接近1越高
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',   // 越接近1越低

  // 估值榜单 (需要 pe_ttm 字段)
  // pe_ratio: 'ORDER BY pe_ttm ASC NULLS LAST', // 市盈率通常看低的

  // 其他榜单的示例逻辑 (可以根据您的数据进行扩展)
  // top_volatility: 'ORDER BY ((high_price - low_price) / open_price) DESC NULLS LAST', // 振幅
  // top_gap_up: 'ORDER BY (open_price - previous_close) DESC NULLS LAST', // 高开缺口

  // 默认排序
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  
  const { type = 'default', market = 'sp500' } = req.query;
  
  const pool = pools[market];
  // 关键：从映射中获取SQL排序子句
  const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;

  if (!pool) {
    return res.status(400).json({ error: `Invalid market specified: ${market}` });
  }

  try {
    const query = `
      SELECT 
        ticker, name_zh, name_en, last_price, change_amount, 
        change_percent, market_cap, logo, sector_zh
      FROM stocks 
      WHERE last_price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL
      ${orderByClause}
      LIMIT 100; 
    `;
    
    const { rows } = await pool.query(query);
    res.status(200).json(rows);

  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    // 返回详细的SQL错误信息，方便调试
    res.status(500).json({ 
        error: 'Internal Server Error',
        details: error.message 
    });
  }
}