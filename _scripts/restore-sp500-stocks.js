// 标普500股票数据恢复脚本
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 标普500主要股票代码列表（前100只，按市值排序）
const sp500Tickers = [
  // 科技股
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'GOOG', 'META', 'TSLA', 'AVGO', 'ORCL',
  'CRM', 'ADBE', 'NFLX', 'AMD', 'INTC', 'CSCO', 'ACN', 'TXN', 'QCOM', 'IBM',
  'INTU', 'MU', 'AMAT', 'ADI', 'LRCX', 'KLAC', 'MRVL', 'FTNT', 'SNPS', 'CDNS',
  
  // 金融股
  'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP',
  'SPGI', 'BLK', 'SCHW', 'CB', 'MMC', 'ICE', 'CME', 'AON', 'PGR', 'TFC',
  
  // 医疗保健
  'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'LLY',
  'MDT', 'AMGN', 'ISRG', 'GILD', 'CVS', 'CI', 'REGN', 'VRTX', 'ZTS', 'DXCM',
  
  // 消费品
  'HD', 'WMT', 'PG', 'KO', 'PEP', 'COST', 'MCD', 'NKE', 'SBUX', 'TGT',
  'LOW', 'TJX', 'EL', 'CL', 'KMB', 'GIS', 'K', 'HSY', 'CLX', 'SJM',
  
  // 工业股
  'CAT', 'BA', 'HON', 'UPS', 'RTX', 'LMT', 'DE', 'MMM', 'GE', 'FDX',
  'NOC', 'ETN', 'ITW', 'CSX', 'EMR', 'NSC', 'WM', 'RSG', 'CARR', 'OTIS',
  
  // 能源股
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'OXY', 'BKR',
  
  // 公用事业
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED',
  
  // 房地产
  'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'WELL', 'DLR', 'O', 'SBAC', 'EXR',
  
  // 原材料
  'LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PPG', 'IFF',
  
  // 通讯服务
  'DIS', 'CMCSA', 'VZ', 'T', 'CHTR', 'TMUS', 'NFLX', 'GOOGL', 'META', 'PARA'
];

// 股票基础信息映射
const stockInfo = {
  'AAPL': { name_zh: '苹果公司', sector_zh: '信息技术' },
  'MSFT': { name_zh: '微软公司', sector_zh: '信息技术' },
  'AMZN': { name_zh: '亚马逊', sector_zh: '非必需消费品' },
  'NVDA': { name_zh: '英伟达', sector_zh: '信息技术' },
  'GOOGL': { name_zh: '谷歌A类', sector_zh: '信息技术' },
  'GOOG': { name_zh: '谷歌C类', sector_zh: '信息技术' },
  'META': { name_zh: 'Meta平台', sector_zh: '信息技术' },
  'TSLA': { name_zh: '特斯拉', sector_zh: '非必需消费品' },
  'BRK.B': { name_zh: '伯克希尔哈撒韦B', sector_zh: '金融服务' },
  'UNH': { name_zh: '联合健康', sector_zh: '医疗保健' },
  'XOM': { name_zh: '埃克森美孚', sector_zh: '能源' },
  'JNJ': { name_zh: '强生公司', sector_zh: '医疗保健' },
  'JPM': { name_zh: '摩根大通', sector_zh: '金融服务' },
  'V': { name_zh: '维萨', sector_zh: '金融服务' },
  'PG': { name_zh: '宝洁公司', sector_zh: '日常消费品' },
  'HD': { name_zh: '家得宝', sector_zh: '非必需消费品' },
  'CVX': { name_zh: '雪佛龙', sector_zh: '能源' },
  'MA': { name_zh: '万事达', sector_zh: '金融服务' },
  'BAC': { name_zh: '美国银行', sector_zh: '金融服务' },
  'ABBV': { name_zh: '艾伯维', sector_zh: '医疗保健' },
  'PFE': { name_zh: '辉瑞', sector_zh: '医疗保健' },
  'AVGO': { name_zh: '博通', sector_zh: '信息技术' },
  'COST': { name_zh: '好市多', sector_zh: '日常消费品' },
  'DIS': { name_zh: '迪士尼', sector_zh: '通讯服务' },
  'KO': { name_zh: '可口可乐', sector_zh: '日常消费品' },
  'MRK': { name_zh: '默克公司', sector_zh: '医疗保健' },
  'PEP': { name_zh: '百事公司', sector_zh: '日常消费品' },
  'TMO': { name_zh: '赛默飞世尔', sector_zh: '医疗保健' },
  'WMT': { name_zh: '沃尔玛', sector_zh: '日常消费品' },
  'ABT': { name_zh: '雅培', sector_zh: '医疗保健' }
};

async function restoreStocks() {
  console.log('🔄 开始恢复标普500股票数据...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const ticker of sp500Tickers) {
      const info = stockInfo[ticker] || {
        name_zh: `${ticker}公司`,
        sector_zh: '待更新'
      };
      
      const result = await client.query(`
        INSERT INTO stocks (ticker, name_zh, sector_zh, last_updated) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (ticker) DO UPDATE SET
          name_zh = EXCLUDED.name_zh,
          sector_zh = EXCLUDED.sector_zh,
          last_updated = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `, [ticker, info.name_zh, info.sector_zh]);
      
      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
      
      // 每处理50只股票输出一次进度
      if ((insertedCount + updatedCount) % 50 === 0) {
        console.log(`📊 已处理 ${insertedCount + updatedCount} 只股票...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ 股票数据恢复完成!');
    console.log(`📈 新增股票: ${insertedCount} 只`);
    console.log(`🔄 更新股票: ${updatedCount} 只`);
    console.log(`📊 总计处理: ${sp500Tickers.length} 只股票`);
    
    // 验证恢复结果
    const countResult = await client.query('SELECT COUNT(*) as total FROM stocks');
    console.log(`\n📋 数据库中当前股票总数: ${countResult.rows[0].total}`);
    
    console.log('\n📝 下一步建议:');
    console.log('1. 运行 node _scripts/update-market-data.mjs 获取最新价格数据');
    console.log('2. 运行 node _scripts/update-all-financials-and-tags.mjs 获取财务数据和应用标签');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 恢复失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// 检查环境变量
if (!process.env.NEON_DATABASE_URL) {
  console.error('❌ 错误: 缺少 NEON_DATABASE_URL 环境变量');
  console.log('请设置数据库连接字符串后重试');
  process.exit(1);
}

// 运行恢复脚本
restoreStocks().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});