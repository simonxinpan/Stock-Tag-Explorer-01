const { Pool } = require('pg');
require('dotenv').config();

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixTableStructure() {
  console.log('🔧 开始修复数据库表结构...');
  
  const client = await pool.connect();
  
  try {
    // 检查当前 stocks 表结构
    console.log('\n📊 检查当前 stocks 表结构:');
    const stocksColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'stocks' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (stocksColumns.rows.length === 0) {
      console.log('❌ stocks 表不存在，需要创建');
      return;
    }
    
    console.log('✅ 当前 stocks 表字段:');
    stocksColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // 检查是否有 category 字段
    const hasCategoryField = stocksColumns.rows.some(row => row.column_name === 'category');
    const hasSymbolField = stocksColumns.rows.some(row => row.column_name === 'symbol');
    const hasTickerField = stocksColumns.rows.some(row => row.column_name === 'ticker');
    
    console.log(`\n🔍 字段检查结果:`);
    console.log(`  - category 字段: ${hasCategoryField ? '存在' : '不存在'}`);
    console.log(`  - symbol 字段: ${hasSymbolField ? '存在' : '不存在'}`);
    console.log(`  - ticker 字段: ${hasTickerField ? '存在' : '不存在'}`);
    
    // 如果存在 category 字段，删除它（因为 stocks 表不应该有这个字段）
    if (hasCategoryField) {
      console.log('\n⚠️ 发现问题: stocks 表中存在不应该有的 category 字段');
      console.log('🔧 正在删除 category 字段...');
      
      await client.query('ALTER TABLE stocks DROP COLUMN IF EXISTS category');
      console.log('✅ 已删除 category 字段');
    }
    
    // 如果使用 ticker 而不是 symbol，需要统一
    if (hasTickerField && !hasSymbolField) {
      console.log('\n🔧 发现表结构使用 ticker 字段，正在添加 symbol 字段作为别名...');
      
      // 添加 symbol 字段作为 ticker 的别名
      await client.query('ALTER TABLE stocks ADD COLUMN IF NOT EXISTS symbol VARCHAR(10)');
      await client.query('UPDATE stocks SET symbol = ticker WHERE symbol IS NULL');
      await client.query('ALTER TABLE stocks ALTER COLUMN symbol SET NOT NULL');
      
      console.log('✅ 已添加 symbol 字段');
    }
    
    // 确保必要的字段存在
    const requiredFields = [
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'sector', type: 'VARCHAR(100)' },
      { name: 'industry', type: 'VARCHAR(100)' },
      { name: 'price', type: 'DECIMAL(12,4)' },
      { name: 'change_amount', type: 'DECIMAL(12,4)' },
      { name: 'change_percent', type: 'DECIMAL(8,4)' },
      { name: 'volume', type: 'BIGINT' },
      { name: 'market_cap', type: 'BIGINT' },
      { name: 'last_updated', type: 'TIMESTAMP' }
    ];
    
    console.log('\n🔧 检查并添加必要字段...');
    for (const field of requiredFields) {
      const hasField = stocksColumns.rows.some(row => row.column_name === field.name);
      if (!hasField) {
        console.log(`  - 添加字段: ${field.name}`);
        await client.query(`ALTER TABLE stocks ADD COLUMN IF NOT EXISTS ${field.name} ${field.type}`);
      }
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
    
    if (tagsColumns.rows.length > 0) {
      console.log('✅ tags 表字段:');
      tagsColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      
      // 确保 tags 表有 category 字段（这是正确的）
      const tagHasCategoryField = tagsColumns.rows.some(row => row.column_name === 'category');
      if (!tagHasCategoryField) {
        console.log('\n🔧 tags 表缺少 category 字段，正在添加...');
        await client.query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT \'other\'');
        console.log('✅ 已添加 category 字段到 tags 表');
      }
    }
    
    console.log('\n✅ 表结构修复完成!');
    
  } catch (error) {
    console.error('💥 修复表结构时发生错误:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  fixTableStructure()
    .then(() => {
      console.log('\n🎉 数据库表结构修复完成');
    })
    .catch((error) => {
      console.error('💥 修复失败:', error.message);
      process.exit(1);
    });
}

module.exports = { fixTableStructure };