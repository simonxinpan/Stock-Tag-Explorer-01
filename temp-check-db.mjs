import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const pool = new Pool({ 
  connectionString: process.env.CHINESE_STOCKS_DB_URL
});

async function checkDatabase() {
  try {
    console.log('=== 检查stocks表字段结构 ===');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'stocks' 
      ORDER BY ordinal_position;
    `);
    console.log('字段列表:', schemaResult.rows);
    
    console.log('\n=== 检查数据样本 ===');
    const sampleResult = await pool.query(`
      SELECT ticker, name_zh, name_en, last_price, change_amount, 
             change_percent, market_cap
      FROM stocks 
      WHERE ticker IS NOT NULL 
      LIMIT 5;
    `);
    console.log('数据样本:', sampleResult.rows);
    
    console.log('\n=== 检查关键字段NULL值情况 ===');
    const nullCheckResult = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(last_price) as has_last_price,
        COUNT(change_percent) as has_change_percent,
        COUNT(market_cap) as has_market_cap
      FROM stocks;
    `);
    console.log('字段完整性统计:', nullCheckResult.rows[0]);
    
  } catch (error) {
    console.error('数据库检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();