const { Pool } = require('pg');
require('dotenv').config();

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 添加财务数据字段的SQL语句
const addFinancialFieldsSQL = `
-- 添加新的财务数据字段到stocks表
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS market_cap_numeric BIGINT,
ADD COLUMN IF NOT EXISTS roe_ttm DECIMAL(8,4),
ADD COLUMN IF NOT EXISTS pe_ttm DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS dividend_yield DECIMAL(6,4),
ADD COLUMN IF NOT EXISTS eps_ttm DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS revenue_ttm BIGINT,
ADD COLUMN IF NOT EXISTS open_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS high_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS low_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap_numeric);
CREATE INDEX IF NOT EXISTS idx_stocks_roe ON stocks(roe_ttm);
CREATE INDEX IF NOT EXISTS idx_stocks_pe ON stocks(pe_ttm);
CREATE INDEX IF NOT EXISTS idx_stocks_updated_at ON stocks(updated_at);

-- 为stocks表创建更新时间触发器
DROP TRIGGER IF EXISTS update_stocks_updated_at ON stocks;
CREATE TRIGGER update_stocks_updated_at
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 更新现有数据，将market_cap字符串转换为数值
UPDATE stocks 
SET market_cap_numeric = CASE 
    WHEN market_cap LIKE '%T' THEN 
        CAST(REPLACE(market_cap, 'T', '') AS DECIMAL) * 1000000000000
    WHEN market_cap LIKE '%B' THEN 
        CAST(REPLACE(market_cap, 'B', '') AS DECIMAL) * 1000000000
    WHEN market_cap LIKE '%M' THEN 
        CAST(REPLACE(market_cap, 'M', '') AS DECIMAL) * 1000000
    ELSE 
        NULL
END
WHERE market_cap IS NOT NULL AND market_cap_numeric IS NULL;
`;

async function addFinancialFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 开始添加财务数据字段...');
    
    await client.query(addFinancialFieldsSQL);
    
    console.log('✅ 财务数据字段添加成功！');
    console.log('📊 新增字段包括：');
    console.log('   - market_cap_numeric: 数值型市值');
    console.log('   - roe_ttm: 过去12个月ROE');
    console.log('   - pe_ttm: 过去12个月PE比率');
    console.log('   - dividend_yield: 股息收益率');
    console.log('   - eps_ttm: 过去12个月每股收益');
    console.log('   - revenue_ttm: 过去12个月营收');
    console.log('   - open_price: 开盘价');
    console.log('   - high_price: 最高价');
    console.log('   - low_price: 最低价');
    console.log('   - last_price: 最新价格');
    console.log('   - updated_at: 更新时间');
    
    // 验证字段是否添加成功
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stocks' 
      AND column_name IN ('market_cap_numeric', 'roe_ttm', 'pe_ttm', 'dividend_yield', 'eps_ttm', 'revenue_ttm', 'open_price', 'high_price', 'low_price', 'last_price', 'updated_at')
      ORDER BY column_name
    `);
    
    console.log('\n🔍 验证新增字段：');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ 添加财务数据字段失败:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addFinancialFields()
    .then(() => {
      console.log('\n🎉 数据库迁移完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 数据库迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { addFinancialFields };