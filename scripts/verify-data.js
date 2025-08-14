const { Pool } = require('pg');
require('dotenv').config();

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 验证数据更新
async function verifyDataUpdate() {
  console.log('🔍 开始验证数据更新...');
  
  try {
    const client = await pool.connect();
    
    // 检查最近更新的股票数量
    const recentUpdates = await client.query(`
      SELECT COUNT(*) as count
      FROM stocks 
      WHERE updated_at > NOW() - INTERVAL '1 hour'
    `);
    
    // 检查总股票数量
    const totalStocks = await client.query(`
      SELECT COUNT(*) as count FROM stocks
    `);
    
    // 检查有价格数据的股票
    const stocksWithPrice = await client.query(`
      SELECT COUNT(*) as count 
      FROM stocks 
      WHERE price > 0
    `);
    
    // 检查数据源分布
    const dataSources = await client.query(`
      SELECT data_source, COUNT(*) as count
      FROM stocks 
      WHERE data_source IS NOT NULL
      GROUP BY data_source
      ORDER BY count DESC
    `);
    
    // 检查最新更新的股票示例
    const latestUpdates = await client.query(`
      SELECT ticker, price, change_percent, updated_at, data_source
      FROM stocks 
      WHERE updated_at IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    
    client.release();
    
    // 输出验证结果
    console.log('\n📊 数据验证结果:');
    console.log(`   📈 总股票数: ${totalStocks.rows[0].count}`);
    console.log(`   🔄 最近1小时更新: ${recentUpdates.rows[0].count}`);
    console.log(`   💰 有价格数据: ${stocksWithPrice.rows[0].count}`);
    
    console.log('\n📡 数据源分布:');
    dataSources.rows.forEach(row => {
      console.log(`   ${row.data_source || '未知'}: ${row.count}`);
    });
    
    console.log('\n🕒 最新更新示例:');
    latestUpdates.rows.forEach(row => {
      const updateTime = new Date(row.updated_at).toLocaleString('zh-CN');
      console.log(`   ${row.symbol}: $${row.price} (${row.change_percent?.toFixed(2) || 0}%) - ${updateTime} [${row.data_source || '未知'}]`);
    });
    
    // 验证是否有足够的更新
    const updateRate = (recentUpdates.rows[0].count / totalStocks.rows[0].count) * 100;
    console.log(`\n📈 更新率: ${updateRate.toFixed(1)}%`);
    
    if (updateRate > 50) {
      console.log('✅ 数据更新验证通过');
    } else if (updateRate > 10) {
      console.log('⚠️  数据更新部分成功');
    } else {
      console.log('❌ 数据更新可能存在问题');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 验证过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行验证
if (require.main === module) {
  verifyDataUpdate().catch(error => {
    console.error('💥 验证失败:', error.message);
    process.exit(1);
  });
}

module.exports = { verifyDataUpdate };