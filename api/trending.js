// 趋势榜单API - 支持多种榜单类型查询
const { Pool } = require('pg');

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async function handler(req, res) {
  // CORS已在server.js中处理

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'type parameter is required' });
  }

  let client;
  try {
    client = await pool.connect();
    let query = '';
    let queryParams = [];
    const limit = 25; // 前5%约25名

    switch (type) {
      case 'top_gainers': // 涨幅榜 - 取change_percent前5%（约25名）
        query = `
          SELECT ticker as symbol, name, name_zh, last_price as current_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'top_losers': // 跌幅榜 - 取change_percent最后5%（约25名）
        query = `
          SELECT ticker as symbol, name, name_zh, last_price as current_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent ASC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'top_turnover': // 成交额榜 - 取turnover前25名
        query = `
          SELECT ticker as symbol, name, name_zh, last_price as current_price, change_percent, market_cap, volume, turnover
          FROM stocks 
          WHERE turnover IS NOT NULL AND turnover > 0
          ORDER BY turnover DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;
        
      case 'top_volatility': // 振幅榜 - 计算日内振幅
        query = `
          SELECT ticker as symbol, name, name_zh, last_price as current_price, change_percent, market_cap, 
                 high_price, low_price,
                 CASE 
                   WHEN low_price > 0 THEN ((high_price - low_price) / low_price) * 100
                   ELSE 0
                 END AS amplitude_percent
          FROM stocks 
          WHERE high_price IS NOT NULL AND low_price IS NOT NULL AND low_price > 0
          ORDER BY amplitude_percent DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;
        
      case 'top_gap_up': // 高开缺口榜 - 开盘价高于前收盘价
        query = `
          SELECT ticker as symbol, name, name_zh, last_price as current_price, change_percent, market_cap, 
                 open_price, previous_close,
                 CASE 
                   WHEN previous_close > 0 THEN ((open_price - previous_close) / previous_close) * 100
                   ELSE 0
                 END AS gap_percent
          FROM stocks 
          WHERE open_price IS NOT NULL AND previous_close IS NOT NULL 
                AND previous_close > 0 AND open_price > previous_close
          ORDER BY gap_percent DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'new_highs': // 创年内新高前15名
        query = `
          SELECT ticker as symbol, name, name_zh, last_price as current_price, change_percent, market_cap, week_52_high
          FROM stocks 
          WHERE last_price IS NOT NULL AND week_52_high IS NOT NULL 
                AND last_price >= week_52_high * 0.99
          ORDER BY (last_price / week_52_high) DESC 
          LIMIT 15
        `;
        queryParams = [];
        break;

      case 'new_lows': // 创年内新低前15名
        query = `
          SELECT ticker as symbol, name, name_zh, last_price as current_price, change_percent, market_cap, week_52_low
          FROM stocks 
          WHERE last_price IS NOT NULL AND week_52_low IS NOT NULL 
                AND last_price <= week_52_low * 1.01
          ORDER BY (last_price / week_52_low) ASC 
          LIMIT 15
        `;
        queryParams = [];
        break;

      case 'risk_warning': // 风险警示榜 - 大幅下跌股票前20名
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND change_percent < -5
          ORDER BY change_percent ASC 
          LIMIT 20
        `;
        queryParams = [];
        break;

      case 'value_picks': // 特色价值榜 - 低PE高股息前15名
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, pe_ttm as pe_ratio, dividend_yield
          FROM stocks 
          WHERE pe_ttm IS NOT NULL AND pe_ttm > 0 AND pe_ttm < 20
                AND market_cap IS NOT NULL AND CAST(market_cap AS BIGINT) > 10000
          ORDER BY pe_ttm ASC 
          LIMIT 15
        `;
        queryParams = [];
        break;

      // 🆕 基于Polygon API数据的新榜单
      case 'institutional_focus': // 机构关注榜 - 按VWAP排序，反映机构资金流向
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, 
                 vwap, turnover, trade_count,
                 CASE 
                   WHEN vwap > 0 THEN ((last_price - vwap) / vwap) * 100
                   ELSE 0
                 END AS price_vs_vwap_percent
          FROM stocks 
          WHERE vwap IS NOT NULL AND vwap > 0 AND turnover IS NOT NULL 
                AND turnover >= 100000000
          ORDER BY turnover DESC, vwap DESC
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'retail_hot': // 散户热门榜 - 按交易笔数排序
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, 
                 trade_count, volume, turnover,
                 CASE 
                   WHEN volume > 0 THEN trade_count::float / (volume / 1000000.0)
                   ELSE 0
                 END AS trades_per_million_shares
          FROM stocks 
          WHERE trade_count IS NOT NULL AND trade_count > 0
                AND volume IS NOT NULL AND volume > 0
          ORDER BY trade_count DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'smart_money': // 主力动向榜 - 价格高于VWAP且成交额大
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, 
                 vwap, turnover, volume,
                 CASE 
                   WHEN vwap > 0 THEN ((last_price - vwap) / vwap) * 100
                   ELSE 0
                 END AS price_vs_vwap_percent
          FROM stocks 
          WHERE vwap IS NOT NULL AND vwap > 0 AND last_price IS NOT NULL
                AND last_price > vwap AND turnover IS NOT NULL
                AND turnover >= 50000000
          ORDER BY price_vs_vwap_percent DESC, turnover DESC
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'high_liquidity': // 高流动性榜 - 按成交量排序
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, 
                 volume, turnover, trade_count,
                 CASE 
                   WHEN market_cap > 0 THEN (turnover::float / market_cap::float) * 100
                   ELSE 0
                 END AS turnover_rate_percent
          FROM stocks 
          WHERE volume IS NOT NULL AND volume > 0
          ORDER BY volume DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'unusual_activity': // 异动榜 - 交易笔数异常高的股票
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, 
                 trade_count, volume, turnover,
                 CASE 
                   WHEN volume > 0 THEN trade_count::float / (volume / 1000000.0)
                   ELSE 0
                 END AS trades_per_million_shares
          FROM stocks 
          WHERE trade_count IS NOT NULL AND volume IS NOT NULL 
                AND volume > 0 AND trade_count > 50000
          ORDER BY trades_per_million_shares DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'momentum_stocks': // 动量榜 - 价格、成交量、交易笔数综合排序
        query = `
          SELECT ticker, name_zh, last_price, change_percent, market_cap, 
                 volume, trade_count, turnover, vwap,
                 (COALESCE(change_percent, 0) * 0.4 + 
                  COALESCE(LOG(volume + 1) / 10, 0) * 0.3 + 
                  COALESCE(LOG(trade_count + 1) / 10, 0) * 0.3) AS momentum_score
          FROM stocks 
          WHERE last_price IS NOT NULL AND volume IS NOT NULL 
                AND trade_count IS NOT NULL
          ORDER BY momentum_score DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      default:
        return res.status(400).json({ error: `Unsupported ranking type: ${type}` });
    }

    const result = await client.query(query, queryParams);
    
    // 格式化市值数据
    const formattedStocks = result.rows.map(stock => ({
      ...stock,
      market_cap_formatted: formatMarketCap(stock.market_cap)
    }));

    res.status(200).json(formattedStocks);

  } catch (error) {
    console.error('趋势榜单API错误:', error);
    
    // 不使用模拟数据，直接返回错误信息
    res.status(500).json({ 
      error: 'Database connection failed', 
      message: '数据库连接失败，请检查数据库配置',
      details: error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// 格式化市值显示
function formatMarketCap(marketCap) {
  if (!marketCap || marketCap === 0) return 'N/A';
  
  const cap = parseFloat(marketCap);
  if (cap >= 1000000) {
    return (cap / 1000000).toFixed(1) + 'T';
  } else if (cap >= 1000) {
    return (cap / 1000).toFixed(1) + 'B';
  } else {
    return cap.toFixed(1) + 'M';
  }
}

// 模拟数据功能已移除 - 确保只连接真实数据库