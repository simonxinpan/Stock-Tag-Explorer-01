// 趋势榜单API - 支持多种榜单类型查询
const { Pool } = require('pg');

// 根据市场类型获取数据库连接字符串
function getDatabaseUrl(market) {
  switch (market) {
    case 'chinese_stocks':
      return process.env.CHINESE_STOCKS_DATABASE_URL;
    case 'sp500':
    default:
      return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  }
}

// 创建数据库连接池
function createPool(market) {
  return new Pool({
    connectionString: getDatabaseUrl(market),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

module.exports = async function handler(req, res) {
  // CORS已在server.js中处理

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, market = 'sp500' } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'type parameter is required' });
  }

  // 根据市场类型创建对应的数据库连接池
  const pool = createPool(market);
  
  let client;
  try {
    client = await pool.connect();
    let query = '';
    let queryParams = [];
    const limit = 25; // 前5%约25名

    switch (type) {
      case 'top_gainers': // 涨幅榜 - 取change_percent前5%（约25名）
        query = `
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'top_losers': // 跌幅榜 - 取change_percent最后5%（约25名）
        query = `
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap
          FROM stocks 
          WHERE change_percent IS NOT NULL AND last_price IS NOT NULL
          ORDER BY change_percent ASC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'top_market_cap': // 市值榜 - 按市值排序
        query = `
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap
          FROM stocks 
          WHERE market_cap IS NOT NULL AND market_cap > 0
          ORDER BY market_cap DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;

      case 'top_turnover': // 成交额榜 - 取turnover前25名
        query = `
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap, volume, turnover
          FROM stocks 
          WHERE turnover IS NOT NULL AND turnover > 0
          ORDER BY turnover DESC 
          LIMIT 25
        `;
        queryParams = [];
        break;
        
      case 'top_volatility': // 振幅榜 - 计算日内振幅
        query = `
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap, 
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
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap, 
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
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap, week_52_high
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
          SELECT ticker, name_zh as name, last_price, change_percent, market_cap, week_52_low
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
    // 根据市场类型使用不同的格式化函数
    // 如果是中概股市场且查询结果为空，使用模拟数据
    if (market === 'chinese_stocks' && result.rows.length === 0) {
      console.log('🔄 中概股数据库查询结果为空，使用模拟数据...');
      return getMockChineseStocksData(req, res, type);
    }
    
    // 格式化市值数据
    // 根据市场类型使用不同的格式化函数
    const formattedStocks = result.rows.map(stock => ({
      ...stock,
      market_cap_formatted: market === 'chinese_stocks' 
        ? formatChineseStockMarketCap(stock.market_cap)
        : formatMarketCap(stock.market_cap)
    }));

    res.status(200).json(formattedStocks);

  } catch (error) {
    console.error('趋势榜单API错误:', error);
    console.log('🔍 调试信息 - market:', market, 'error.message:', error.message);
    
    // 如果是中概股市场且数据库连接失败，使用模拟数据
    if (market === 'chinese_stocks' && (error.message.includes('password authentication') || error.message.includes('ECONNREFUSED') || error.message.includes('client password must be a string'))) {
      console.log('🔄 中概股数据库连接失败，使用模拟数据...');
      return getMockChineseStocksData(req, res, type);
    }
    
    // 如果是标普500市场且数据库连接失败，使用模拟数据
    if (market === 'sp500' && (error.message.includes('password authentication') || error.message.includes('ECONNREFUSED') || error.message.includes('SSL'))) {
      console.log('🔄 标普500数据库连接失败，使用模拟数据...');
      return getMockSP500Data(req, res, type);
    }
    
    // 其他情况返回错误信息
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

// 格式化市值显示（标普500专用 - 输入单位为百万美元）
function formatMarketCap(marketCap) {
  if (!marketCap || marketCap === 0) return '未知';
  
  // 输入的marketCap是百万美元单位，需要转换为美元
  const capInUSD = parseFloat(marketCap) * 1000000; // 百万美元转美元
  
  if (capInUSD >= 1000000000000) { // 1万亿美元以上
    return `$${(capInUSD / 1000000000000).toFixed(1)}万亿美元`;
  } else if (capInUSD >= 10000000000) { // 100亿美元以上
    return `$${(capInUSD / 100000000).toFixed(0)}亿美元`;
  } else if (capInUSD >= 1000000000) { // 10亿美元以上
    return `$${(capInUSD / 100000000).toFixed(1)}亿美元`;
  } else {
    return `$${(capInUSD / 100000000).toFixed(2)}亿美元`;
  }
}

/**
 * 【中概股专用】
 * 将一个以【美元】为单位的巨大数字，格式化为符合中文习惯的、带单位的字符串。
 * @param {number | null | undefined} marketCapInUSD - 从API获取的、以【美元】为单位的原始市值。
 * @returns {string} - 格式化后的字符串，例如 "$3,507.95亿美元"。
 */
function formatChineseStockMarketCap(marketCapInUSD) {
  if (typeof marketCapInUSD !== 'number' || isNaN(marketCapInUSD) || marketCapInUSD === 0) {
    return 'N/A';
  }

  const BILLION = 1_000_000_000; // 十亿

  // 将美元市值转换为"亿美元"为单位
  const marketCapInBillionUSD = marketCapInUSD / BILLION;

  // 格式化数字，保留两位小数，并添加千位分隔符
  const formattedValue = marketCapInBillionUSD.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `$${formattedValue}亿美元`;
}

// 中概股模拟数据函数
function getMockChineseStocksData(req, res, type) {
  const mockStocks = [
    {
      symbol: 'BABA',
      name: 'Alibaba Group Holding Limited',
      name_zh: '阿里巴巴',
      current_price: 155.06,
      change_percent: -0.24,
      market_cap: 3507.945, // 亿美元单位
      volume: 12500000,
      market_cap_formatted: '$3507.9亿美元'
    },
    {
      symbol: 'PDD',
      name: 'PDD Holdings Inc',
      name_zh: '拼多多',
      current_price: 125.44,
      change_percent: -0.22,
      market_cap: 1745.962, // 亿美元单位
      volume: 5400000,
      market_cap_formatted: '$1746.0亿美元'
    },
    {
      symbol: 'NTES',
      name: 'NetEase Inc',
      name_zh: '网易',
      current_price: 152.80,
      change_percent: 1.80,
      market_cap: 906.37, // 亿美元单位
      volume: 6700000,
      market_cap_formatted: '$906.4亿美元'
    },
    {
      symbol: 'TCOM',
      name: 'Trip.com Group Limited',
      name_zh: '携程',
      current_price: 73.87,
      change_percent: -1.28,
      market_cap: 484.365, // 亿美元单位
      volume: 4200000,
      market_cap_formatted: '$484.4亿美元'
    },
    {
      symbol: 'NIO',
      name: 'NIO Inc',
      name_zh: '蔚来汽车',
      current_price: 8.92,
      change_percent: 3.96,
      market_cap: 158.0, // 亿美元单位
      volume: 15600000,
      market_cap_formatted: '$158.0亿美元'
    },
    {
      symbol: 'JD',
      name: 'JD.com Inc',
      name_zh: '京东集团',
      current_price: 32.18,
      change_percent: -2.63,
      market_cap: 482.0, // 亿美元单位
      volume: 8900000,
      market_cap_formatted: '$482.0亿美元'
    },
    {
      symbol: 'BILI',
      name: 'Bilibili Inc',
      name_zh: '哔哩哔哩',
      current_price: 23.45,
      change_percent: 5.01,
      market_cap: 89.0, // 亿美元单位
      volume: 8700000,
      market_cap_formatted: '$89.0亿美元'
    }
  ];

  // 根据榜单类型排序
  let sortedStocks = [...mockStocks];
  switch (type) {
    case 'top_gainers':
      sortedStocks.sort((a, b) => b.change_percent - a.change_percent);
      break;
    case 'top_losers':
      sortedStocks.sort((a, b) => a.change_percent - b.change_percent);
      break;
    case 'top_turnover':
    case 'top_volume':
      sortedStocks.sort((a, b) => b.volume - a.volume);
      break;
    case 'top_market_cap':
    case 'market_cap':
    default:
      sortedStocks.sort((a, b) => b.market_cap - a.market_cap);
      break;
  }

  // 返回前25名
  const result = sortedStocks.slice(0, 25);
  
  console.log(`📊 返回中概股模拟数据 (${type}): ${result.length} 条记录`);
  
  // 返回标准格式的响应
  res.status(200).json({
    success: true,
    type: type,
    data: result,
    count: result.length,
    timestamp: new Date().toISOString(),
    note: "🧪 使用模拟数据展示中概股功能"
  });
}

// 标普500模拟数据函数
function getMockSP500Data(req, res, type) {
  const mockStocks = [
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      name_zh: '英伟达',
      current_price: 177.17,
      change_percent: 0.47,
      market_cap: 4315000000000, // 美元单位
      volume: 52100000
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      name_zh: '微软公司',
      current_price: 501.01,
      change_percent: 0.13,
      market_cap: 3766000000000, // 美元单位
      volume: 28100000
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      name_zh: '苹果公司',
      current_price: 230.03,
      change_percent: 1.43,
      market_cap: 3364000000000, // 美元单位
      volume: 45200000
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      name_zh: '谷歌C类',
      current_price: 240.78,
      change_percent: 0.51,
      market_cap: 2915000000000, // 美元单位
      volume: 32500000
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      name_zh: '亚马逊',
      current_price: 185.50,
      change_percent: 2.15,
      market_cap: 1980000000000, // 美元单位
      volume: 41800000
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      name_zh: '特斯拉',
      current_price: 248.50,
      change_percent: -4.72,
      market_cap: 790000000000, // 美元单位
      volume: 67300000
    },
    {
      symbol: 'META',
      name: 'Meta Platforms Inc.',
      name_zh: 'Meta平台',
      current_price: 484.20,
      change_percent: 3.35,
      market_cap: 1230000000000, // 美元单位
      volume: 19400000
    },
    {
      symbol: 'BRK.B',
      name: 'Berkshire Hathaway Inc.',
      name_zh: '伯克希尔哈撒韦',
      current_price: 548.32,
      change_percent: 2.15,
      market_cap: 890000000000, // 美元单位
      volume: 3200000
    },
    {
      symbol: 'JPM',
      name: 'JPMorgan Chase & Co.',
      name_zh: '摩根大通',
      current_price: 165.42,
      change_percent: 1.87,
      market_cap: 480000000000, // 美元单位
      volume: 12500000
    },
    {
      symbol: 'JNJ',
      name: 'Johnson & Johnson',
      name_zh: '强生公司',
      current_price: 159.73,
      change_percent: 1.42,
      market_cap: 420000000000, // 美元单位
      volume: 8700000
    }
  ];

  // 根据榜单类型排序
  let sortedStocks = [...mockStocks];
  switch (type) {
    case 'top_gainers':
      sortedStocks.sort((a, b) => b.change_percent - a.change_percent);
      break;
    case 'top_losers':
      sortedStocks.sort((a, b) => a.change_percent - b.change_percent);
      break;
    case 'top_turnover':
    case 'top_volume':
      sortedStocks.sort((a, b) => b.volume - a.volume);
      break;
    case 'market_cap':
    default:
      sortedStocks.sort((a, b) => b.market_cap - a.market_cap);
      break;
  }

  // 返回前25名
  const result = sortedStocks.slice(0, 25);
  
  console.log(`📊 返回标普500模拟数据 (${type}): ${result.length} 条记录`);
  res.status(200).json(result);
}