// 文件: /api/ranking.js (最终全功能版)
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const sslConfig = { ssl: { rejectUnauthorized: false } };
const pools = {
  sp500: new Pool({ connectionString: process.env.NEON_DATABASE_URL, ...sslConfig }),
  chinese_stocks: new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL, ...sslConfig })
};

// ================================================================
// == 关键的、包含了所有14个榜单真实排序逻辑的映射 ==
// ================================================================
const ORDER_BY_MAP = {
  // === 核心榜单 (已验证) ===
  top_market_cap: 'ORDER BY market_cap DESC NULLS LAST',
  top_gainers: 'ORDER BY change_percent DESC NULLS LAST',
  top_losers: 'ORDER BY change_percent ASC NULLS LAST',
  
  // === 交易活跃度榜单 (需要 volume, turnover 字段) ===
  top_volume: 'ORDER BY volume DESC NULLS LAST',
  top_turnover: 'ORDER BY turnover DESC NULLS LAST',
  
  // === 价格趋势榜单 (需要 52周高/低价字段) ===
  new_highs: 'ORDER BY (last_price / week_52_high) DESC NULLS LAST',
  new_lows: 'ORDER BY (last_price / week_52_low) ASC NULLS LAST',
  
  // === 技术指标榜单 (基于现有数据计算) ===
  top_volatility: 'ORDER BY ((high_price - low_price) / previous_close) DESC NULLS LAST', // 振幅榜
  top_gap_up: 'ORDER BY ((open_price - previous_close) / previous_close) DESC NULLS LAST', // 高开缺口榜
  unusual_activity: 'ORDER BY ABS(change_percent) DESC NULLS LAST', // 异动榜 (按绝对涨跌幅排序)
  momentum_stocks: 'ORDER BY change_percent DESC NULLS LAST', // 动量榜 (等同于涨幅榜)

  // === 情绪/关注度榜单 (使用合理替代逻辑) ===
  // 解释: 真实的机构/散户数据需要专门的数据源。在这里，我们使用最能反映“关注度”的指标作为替代。
  institutional_focus: 'ORDER BY market_cap DESC NULLS LAST', // 机构关注榜 (用“市值”替代)
  retail_hot: 'ORDER BY turnover DESC NULLS LAST', // 散户热门榜 (用“成交额”替代)
  smart_money: 'ORDER BY turnover DESC NULLS LAST', // 主力动向榜 (用“成交额”替代)
  high_liquidity: 'ORDER BY volume DESC NULLS LAST', // 高流动性榜 (用“成交量”替代)

  // 默认排序
  default: 'ORDER BY market_cap DESC NULLS LAST'
};

// ... (后续的 handler 函数) ...