// 文件: /api/ranking.js
// 版本: SQLite Support Version
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import 'dotenv/config';

// --- SQLite数据库连接 ---
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

// 数据库文件路径
const dbPaths = {
  sp500: path.join(dataDir, 'stock_explorer.db'),
  chinese_stocks: path.join(dataDir, 'chinese_stocks.db')
};

// 创建数据库连接
async function getDatabase(market) {
  const dbPath = dbPaths[market] || dbPaths.sp500;
  return await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// ================================================================
// == 关键的、完整的SQL排序逻辑映射 (所有14个榜单类型) ==
// ================================================================

// SP500市场的ORDER_BY_MAP (有完整字段)
const SP500_ORDER_BY_MAP = {
  // 核心榜单 (已验证字段存在)
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // 交易活跃度榜单 (需要 volume 和 turnover 字段)
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY (volume * last_price) DESC NULLS LAST', // 用成交金额替代turnover
  
  // 价格趋势榜单 (需要 week_52_high 和 week_52_low 字段)
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST', // 越接近1越高
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',   // 越接近1越低

  // 波动性榜单 (基于价格波动计算)
  top_volatility: 'ORDER BY ABS(change_percent) DESC NULLS LAST', // 振幅榜，按涨跌幅绝对值排序
  top_gap_up: 'ORDER BY change_percent DESC NULLS LAST', // 高开缺口榜，暂用涨幅替代
  
  // 机构和资金流向榜单 (基于现有字段的近似计算)
  institutional_focus: 'ORDER BY (volume * last_price) DESC NULLS LAST', // 机构关注榜，按成交金额排序
  retail_hot: 'ORDER BY volume DESC NULLS LAST', // 散户热门榜，按成交量排序
  smart_money: 'ORDER BY market_cap DESC NULLS LAST', // 聪明钱榜，按市值排序
  
  // 流动性和异动榜单
  high_liquidity: 'ORDER BY volume DESC NULLS LAST', // 高流动性榜，按成交量排序
  unusual_activity: 'ORDER BY ABS(change_percent) DESC NULLS LAST', // 异动榜，按涨跌幅绝对值排序
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST', // 动量榜，按涨幅排序

  // 默认排序
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

// 中概股市场的ORDER_BY_MAP (字段有限，使用替代方案)
const CHINESE_STOCKS_ORDER_BY_MAP = {
  // 核心榜单 (基于现有字段)
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // 交易活跃度榜单 (基于现有字段)
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY (volume * price) DESC NULLS LAST', // 用成交金额替代
  
  // 价格趋势榜单 (使用替代方案)
  new_highs: 'ORDER BY price DESC NULLS LAST', // 用价格替代52周新高
  new_lows: 'ORDER BY price ASC NULLS LAST',   // 用价格替代52周新低

  // 波动性榜单 (基于价格波动计算)
  top_volatility: 'ORDER BY ABS(change_percent) DESC NULLS LAST', // 振幅榜
  top_gap_up: 'ORDER BY change_percent DESC NULLS LAST', // 高开缺口榜
  
  // 机构和资金流向榜单 (基于现有字段的近似计算)
  institutional_focus: 'ORDER BY (volume * price) DESC NULLS LAST', // 机构关注榜
  retail_hot: 'ORDER BY volume DESC NULLS LAST', // 散户热门榜
  smart_money: 'ORDER BY market_cap DESC NULLS LAST', // 聪明钱榜
  
  // 流动性和异动榜单
  high_liquidity: 'ORDER BY volume DESC NULLS LAST', // 高流动性榜
  unusual_activity: 'ORDER BY ABS(change_percent) DESC NULLS LAST', // 异动榜
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST', // 动量榜

  // 默认排序
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  
  const { type = 'default', market = 'sp500' } = req.query;
  
  // 关键：根据市场选择正确的ORDER_BY_MAP
  const orderByMap = market === 'chinese_stocks' ? CHINESE_STOCKS_ORDER_BY_MAP : SP500_ORDER_BY_MAP;
  const orderByClause = orderByMap[type] || orderByMap.default;

  try {
    const db = await getDatabase(market);
    
    // 根据市场类型选择正确的表名和字段
    let tableName, query;
    
    if (market === 'chinese_stocks') {
       tableName = 'chinese_stocks';
       query = `
         SELECT 
           ticker, 
           company_name as name_zh, 
           price as last_price, 
           change_percent, 
           market_cap, 
           sector,
           volume
         FROM ${tableName} 
         ${orderByClause}
         LIMIT 100
       `;
     } else {
       tableName = 'sp500_stocks';
       query = `
         SELECT 
           ticker, 
           name_zh, 
           last_price, 
           change_percent, 
           market_cap, 
           sector,
           volume,
           week_52_high,
           week_52_low
         FROM ${tableName} 
         WHERE last_price IS NOT NULL AND market_cap IS NOT NULL AND change_percent IS NOT NULL
         ${orderByClause}
         LIMIT 100
       `;
     }
    
    const rows = await db.all(query);
    await db.close();
    
    res.status(200).json(rows);

  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    // 返回详细的SQL错误信息，方便调试
    res.status(500).json({ 
      error: 'Database query failed', 
      details: error.message,
      type,
      market
    });
  }
}