// 文件: /api/ranking.js
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// ================================================================
// == 关键修正：为两个连接池明确添加SSL配置 ==
// ================================================================

// 根据market参数选择数据库连接池
const pools = {
  sp500: process.env.NEON_DATABASE_URL ? new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: false  // 先尝试不使用SSL
  }) : null,
  chinese_stocks: process.env.CHINESE_STOCKS_DB_URL ? new Pool({
    connectionString: process.env.CHINESE_STOCKS_DB_URL,
    ssl: false  // 先尝试不使用SSL
  }) : null
};

// 动态创建带SSL的连接池（如果需要的话）
const sslPools = {
  sp500: process.env.NEON_DATABASE_URL ? new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  }) : null,
  chinese_stocks: process.env.CHINESE_STOCKS_DB_URL ? new Pool({
    connectionString: process.env.CHINESE_STOCKS_DB_URL,
    ssl: {
      rejectUnauthorized: false
    }
  }) : null
};

// 尝试连接的函数，先尝试SSL，失败则使用非SSL
async function executeQuery(market, query) {
  // 首先尝试SSL连接
  if (sslPools[market]) {
    try {
      const result = await sslPools[market].query(query);
      console.log(`[Success] SSL connection worked for ${market}`);
      return result;
    } catch (sslError) {
      console.warn(`[Warning] SSL connection failed for ${market}, trying without SSL:`, sslError.message);
    }
  }
  
  // 如果SSL失败或不可用，尝试非SSL连接
  if (pools[market]) {
    try {
      const result = await pools[market].query(query);
      console.log(`[Success] Non-SSL connection worked for ${market}`);
      return result;
    } catch (nonSslError) {
      console.error(`[Error] Both SSL and non-SSL connections failed for ${market}:`, nonSslError.message);
      throw nonSslError;
    }
  }
  
  throw new Error(`No database pool available for ${market}`);
}
// ================================================================

// 数据库表映射
const databases = {
  sp500: 'sp500_stocks',
  chinese_stocks: 'chinese_stocks'
};

// 定义不同榜单类型的SQL排序逻辑 - 安全版本（只使用确定存在的列）
const ORDER_BY_MAP = {
  // 涨跌幅榜单 - 使用确定存在的列
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // 市值榜单 - 使用确定存在的列
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  
  // 暂时注释掉可能不存在的列，避免SQL错误
  // top_turnover: 'ORDER BY (volume * last_price) DESC NULLS LAST', // 需要volume和last_price列
  // new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST', // 需要last_price和week_52_high列
  // new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST', // 需要last_price和week_52_low列
  // top_volume: 'ORDER BY volume DESC NULLS LAST', // 需要volume列
  
  // 波动性榜单 - 使用确定存在的列
  top_volatility: 'ORDER BY ABS(change_percent) DESC NULLS LAST',
  top_gap_up: 'ORDER BY change_percent DESC NULLS LAST',
  
  // 机构和资金榜单 - 暂时使用市值替代
  institutional_focus: 'ORDER BY market_cap DESC NULLS LAST', // 暂用市值替代
  // retail_hot: 'ORDER BY volume DESC NULLS LAST', // 需要volume列
  smart_money: 'ORDER BY market_cap DESC NULLS LAST',
  
  // 流动性和异动榜单 - 暂时使用市值替代
  // high_liquidity: 'ORDER BY volume DESC NULLS LAST', // 需要volume列
  // unusual_activity: 'ORDER BY volume DESC NULLS LAST', // 需要volume列
  
  // 动量榜单 - 使用确定存在的列
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST',
  
  // 兼容性映射（保持向后兼容） - 只保留安全的排序
  gap_up: 'ORDER BY change_percent DESC NULLS LAST',
  momentum: 'ORDER BY change_percent DESC NULLS LAST',
  value: 'ORDER BY market_cap DESC NULLS LAST',
  growth: 'ORDER BY change_percent DESC NULLS LAST',
  dividend: 'ORDER BY market_cap DESC NULLS LAST',
  volatility: 'ORDER BY ABS(change_percent) DESC NULLS LAST',
  insider_trading: 'ORDER BY market_cap DESC NULLS LAST',
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

// 字段名映射函数 - 将标普500字段名映射到中概股字段名
function mapFieldsForChineseStocks(orderByClause) {
  return orderByClause
    .replace(/last_price/g, 'price')
    .replace(/week_52_high/g, 'week_52_high') // 保持52周高点字段名
    .replace(/week_52_low/g, 'week_52_low') // 保持52周低点字段名
    .replace(/\(volume \* last_price\)/g, '(volume * price)') // 成交额计算
    .replace(/\(last_price \/ week_52_high\)/g, '(price / week_52_high)') // 新高比例
    .replace(/\(last_price \/ week_52_low\)/g, '(price / week_52_low)'); // 新低比例
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
  
  // 验证市场参数
  if (!['sp500', 'chinese_stocks'].includes(market)) {
    return res.status(400).json({ error: 'Invalid market specified' });
  }

  try {
    console.log(`[API - ranking]: type=${type}, market=${market}`);
    
    const tableName = databases[market] || databases.sp500;
    
    // 检查是否有可用的连接池
    if (!pools[market] && !sslPools[market]) {
      console.log(`[API - ranking] No database pool available for ${market}, returning empty array`);
      return res.status(200).json([]);
    }
    
    let orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
    
    // 如果是中概股，需要映射字段名
    if (market === 'chinese_stocks') {
      orderByClause = mapFieldsForChineseStocks(orderByClause);
    }
    
    // 构建SQL查询 - 只使用确定存在的列
    const query = `
      SELECT 
        ticker, 
        ${market === 'chinese_stocks' ? 'company_name as name' : 'name_zh as name'}, 
        change_percent, 
        market_cap
      FROM ${tableName} 
      WHERE change_percent IS NOT NULL 
        AND market_cap IS NOT NULL
        AND market_cap > 0
      ${orderByClause}
      LIMIT 25
    `;
    
    console.log(`[API - ranking] Executing query: ${query}`);
    
    // 使用新的executeQuery函数执行查询
    const result = await executeQuery(market, query);
    const rows = result.rows || [];
    
    // 格式化数据，确保数值类型正确并统一字段名
    const formattedRows = rows.map(row => {
      const changePercent = parseFloat(row.change_percent) || 0;
      const marketCap = parseFloat(row.market_cap) || 0;
      return {
        symbol: row.ticker,
        name: row.name,
        price: 0, // 暂时设为0，因为price列可能不存在
        change: 0, // 暂时设为0，因为无法计算
        change_percent: changePercent,
        market_cap: marketCap,
        volume: 0 // 暂时设为0，因为volume列可能不存在
      };
    });
    
    res.status(200).json(formattedRows);
  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}