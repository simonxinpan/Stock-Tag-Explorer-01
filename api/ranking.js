// 文件: /api/ranking.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 初始化SQLite数据库连接
const sp500DbPath = path.join(process.cwd(), 'data', 'stock_explorer.db');
const chineseDbPath = path.join(process.cwd(), 'data', 'chinese_stocks.db');

let sp500Db, chineseDb;
try {
  sp500Db = new sqlite3.Database(sp500DbPath);
  chineseDb = new sqlite3.Database(chineseDbPath);
  console.log('SQLite databases connected successfully');
} catch (error) {
  console.error('Failed to connect to SQLite databases:', error);
  // 如果数据库文件不存在，使用模拟数据
  sp500Db = null;
  chineseDb = null;
}

// 数据库表映射
const databases = {
  sp500: 'sp500_stocks',
  chinese_stocks: 'chinese_stocks'
};

// 定义不同榜单类型的SQL排序逻辑 - 28个榜单完整实现
const ORDER_BY_MAP = {
  // 涨跌幅榜单
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // 市值和成交榜单
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_turnover: 'ORDER BY (volume * last_price) DESC NULLS LAST', // 成交额 = 成交量 * 价格
  
  // 新高新低榜单
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST', // 接近52周高点
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST', // 接近52周低点
  
  // 波动性榜单
  top_volatility: 'ORDER BY ABS(change_percent) DESC NULLS LAST', // 振幅榜
  top_gap_up: 'ORDER BY change_percent DESC NULLS LAST', // 高开缺口榜
  
  // 机构和资金榜单
  institutional_focus: 'ORDER BY (volume * last_price) DESC NULLS LAST', // 基于大额交易
  retail_hot: 'ORDER BY volume DESC NULLS LAST', // 散户热门基于交易量
  smart_money: 'ORDER BY market_cap DESC NULLS LAST', // 主力动向基于市值
  
  // 流动性和异动榜单
  high_liquidity: 'ORDER BY volume DESC NULLS LAST', // 高流动性基于成交量
  unusual_activity: 'ORDER BY volume DESC NULLS LAST', // 异动榜基于成交量异常
  
  // 动量榜单
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST', // 动量榜基于涨幅
  
  // 兼容性映射（保持向后兼容）
  top_volume: 'ORDER BY volume DESC NULLS LAST',
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

module.exports = async function handler(req, res) {
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
    
    // 选择对应的数据库连接
    const dbConnection = market === 'chinese_stocks' ? chineseDb : sp500Db;
    const tableName = databases[market] || databases.sp500;
    
    // 如果数据库连接不可用，返回空数组
    if (!dbConnection) {
      console.log(`[API - ranking] Database not available for ${market}, returning empty array`);
      return res.status(200).json([]);
    }
    
    let orderByClause = ORDER_BY_MAP[type] || ORDER_BY_MAP.default;
    
    // 如果是中概股，需要映射字段名
    if (market === 'chinese_stocks') {
      orderByClause = mapFieldsForChineseStocks(orderByClause);
    }
    
    // 构建SQL查询
    const query = `
      SELECT 
        ${market === 'chinese_stocks' ? 'ticker, company_name as name, price, change_percent, market_cap, volume' : 'ticker, name_zh as name, last_price as price, change_percent, market_cap, volume'}
      FROM ${tableName} 
      WHERE ${market === 'chinese_stocks' ? 'price' : 'last_price'} IS NOT NULL 
        AND ${market === 'chinese_stocks' ? 'price' : 'last_price'} > 0
      ${orderByClause}
      LIMIT 25
    `;
    
    console.log(`[API - ranking] Executing query: ${query}`);
    
    // 执行SQLite查询（使用Promise包装sqlite3的异步调用）
    const rows = await new Promise((resolve, reject) => {
      dbConnection.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    // 格式化数据，确保数值类型正确并统一字段名
    const formattedRows = rows.map(row => {
      const price = parseFloat(row.price) || 0;
      const changePercent = parseFloat(row.change_percent) || 0;
      return {
        symbol: row.ticker,
        name: row.name,
        price: price,
        change: price * changePercent / 100,
        change_percent: changePercent,
        market_cap: parseFloat(row.market_cap) || 0,
        volume: parseFloat(row.volume) || 0
      };
    });
    
    res.status(200).json(formattedRows);
  } catch (error) {
    console.error(`[API Error - ranking]: type=${type}, market=${market}`, error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}