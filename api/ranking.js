// 文件: /api/ranking.js
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// 根据market参数选择数据库连接池
const pools = {
  sp500: new Pool({ connectionString: process.env.NEON_DATABASE_URL }),
  chinese_stocks: new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL })
};

// 定义不同榜单类型的SQL排序逻辑
const ORDER_BY_MAP = {
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY turnover DESC NULLS LAST',
  new_highs: 'ORDER BY week_52_high / last_price DESC NULLS LAST',
  new_lows: 'ORDER BY last_price / week_52_low ASC NULLS LAST',
  smart_money: 'ORDER BY market_cap DESC NULLS LAST', // 智能资金榜单
  momentum: 'ORDER BY change_percent DESC NULLS LAST', // 动量榜单
  value: 'ORDER BY market_cap DESC NULLS LAST', // 价值榜单
  growth: 'ORDER BY change_percent DESC NULLS LAST', // 成长榜单
  dividend: 'ORDER BY market_cap DESC NULLS LAST', // 股息榜单
  volatility: 'ORDER BY change_percent DESC NULLS LAST', // 波动率榜单
  insider_trading: 'ORDER BY market_cap DESC NULLS LAST', // 内部交易榜单
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

// 字段名映射函数 - 将标普500字段名映射到中概股字段名
function mapFieldsForChineseStocks(orderByClause) {
  return orderByClause
    .replace(/last_price/g, 'price')
    .replace(/week_52_high/g, 'price') // 中概股数据库可能没有52周高点，暂用price替代
    .replace(/week_52_low/g, 'price'); // 中概股数据库可能没有52周低点，暂用price替代
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { type = 'default', market = 'sp500' } = req.query;
  
  const pool = pools[market] || pools.sp500;
  const orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;

  if (!pool) {
    return res.status(400).json({ error: 'Invalid market specified' });
  }

  try {
    // 根据市场类型选择不同的字段名和表名
    let query;
    if (market === 'chinese_stocks') {
      // 中概股数据库使用不同的字段名
      const mappedOrderBy = mapFieldsForChineseStocks(orderByClause);
      query = `
        SELECT 
          ticker, company_name as name_zh, price as last_price, change_percent, market_cap, volume
        FROM chinese_stocks 
        WHERE price IS NOT NULL AND market_cap IS NOT NULL
        ${mappedOrderBy}
        LIMIT 50;
      `;
    } else {
      // 标普500数据库
      query = `
        SELECT 
          ticker, name_zh, last_price, change_percent, market_cap, volume
        FROM stocks 
        WHERE last_price IS NOT NULL AND market_cap IS NOT NULL
        ${orderByClause}
        LIMIT 50;
      `;
    }
    
    console.log(`[API - ranking]: type=${type}, market=${market}, query=${query}`);
    
    const { rows } = await pool.query(query);
    
    // 格式化数据，确保数值类型正确
    const formattedRows = rows.map(row => ({
      ...row,
      last_price: parseFloat(row.last_price) || 0,
      change_percent: parseFloat(row.change_percent) || 0,
      market_cap: parseFloat(row.market_cap) || 0,
      volume: parseFloat(row.volume) || 0
    }));
    
    res.status(200).json(formattedRows);
  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}