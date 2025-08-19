const { Pool } = require('pg');
require('dotenv').config();

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabaseStructure() {
  console.log('🔍 检查数据库表结构...');
  
  const client = await pool.connect();
  
  try {
    // 检查 stocks 表结构
    console.log('\n📊 检查 stocks 表结构:');
    const stocksColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'stocks' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (stocksColumns.rows.length === 0) {
      console.log('❌ stocks 表不存在');
    } else {
      console.log('✅ stocks 表存在，字段如下:');
      stocksColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // 检查 tags 表结构
    console.log('\n🏷️ 检查 tags 表结构:');
    const tagsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tags' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (tagsColumns.rows.length === 0) {
      console.log('❌ tags 表不存在');
    } else {
      console.log('✅ tags 表存在，字段如下:');
      tagsColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // 检查 stock_tags 表结构
    console.log('\n🔗 检查 stock_tags 表结构:');
    const stockTagsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'stock_tags' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (stockTagsColumns.rows.length === 0) {
      console.log('❌ stock_tags 表不存在');
    } else {
      console.log('✅ stock_tags 表存在，字段如下:');
      stockTagsColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // 测试一个简单的查询
    console.log('\n🧪 测试基本查询:');
    try {
      const testQuery = await client.query('SELECT COUNT(*) as count FROM stocks');
      console.log(`✅ stocks 表包含 ${testQuery.rows[0].count} 条记录`);
    } catch (error) {
      console.log(`❌ 查询 stocks 表失败: ${error.message}`);
    }
    
    try {
      const testQuery = await client.query('SELECT COUNT(*) as count FROM tags');
      console.log(`✅ tags 表包含 ${testQuery.rows[0].count} 条记录`);
    } catch (error) {
      console.log(`❌ 查询 tags 表失败: ${error.message}`);
    }
    
    // 检查是否有 category 字段在 stocks 表中
    console.log('\n🔍 检查 stocks 表是否有 category 字段:');
    const categoryCheck = stocksColumns.rows.find(row => row.column_name === 'category');
    if (categoryCheck) {
      console.log('⚠️ 发现问题: stocks 表中存在 category 字段，这可能是问题的根源!');
    } else {
      console.log('✅ stocks 表中没有 category 字段，这是正确的');
    }
    
  } catch (error) {
    console.error('💥 检查数据库结构时发生错误:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  checkDatabaseStructure()
    .then(() => {
      console.log('\n✅ 数据库结构检查完成');
    })
    .catch((error) => {
      console.error('💥 检查失败:', error.message);
      process.exit(1);
    });
}

module.exports = { checkDatabaseStructure };