// 文件: _scripts/verify-sp500-updates.mjs
// 版本: S&P 500 Data Update Verification Script
// 功能: 验证S&P 500数据更新的完整性和质量

import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// === 配置区 ===
const DATABASE_URL = process.env.DATABASE_URL;
const DEBUG = process.env.DEBUG === 'true';

// === Neon数据库字段验证配置 ===
const REQUIRED_FIELDS = [
  'ticker', 'name_en', 'last_price', 'change_amount', 
  'change_percent', 'last_updated'
];

const OPTIONAL_FIELDS = [
  'name_zh', 'sector_en', 'sector_zh', 'market_cap', 
  'pe_ttm', 'roe_ttm', 'dividend_yield', 'week_52_high', 
  'week_52_low', 'logo'
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// === 验证函数 ===
async function verifyDatabaseConnection(pool) {
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接验证成功');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

async function verifyTableStructure(pool) {
  try {
    const client = await pool.connect();
    
    // 检查stocks表是否存在
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stocks'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ stocks表不存在');
      client.release();
      return false;
    }
    
    // 检查字段结构
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stocks'
      ORDER BY ordinal_position;
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    const missingRequired = REQUIRED_FIELDS.filter(field => !existingColumns.includes(field));
    const missingOptional = OPTIONAL_FIELDS.filter(field => !existingColumns.includes(field));
    
    console.log('📋 表结构验证:');
    console.log(`   ✅ 表存在: stocks`);
    console.log(`   📊 总字段数: ${existingColumns.length}`);
    
    if (missingRequired.length > 0) {
      console.error(`   ❌ 缺少必需字段: ${missingRequired.join(', ')}`);
      client.release();
      return false;
    } else {
      console.log(`   ✅ 所有必需字段存在`);
    }
    
    if (missingOptional.length > 0) {
      console.warn(`   ⚠️ 缺少可选字段: ${missingOptional.join(', ')}`);
    } else {
      console.log(`   ✅ 所有可选字段存在`);
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ 表结构验证失败:', error.message);
    return false;
  }
}

async function verifyDataQuality(pool) {
  try {
    const client = await pool.connect();
    
    // 基础数据统计
    const totalCountResult = await client.query('SELECT COUNT(*) as total FROM stocks');
    const totalCount = parseInt(totalCountResult.rows[0].total);
    
    console.log('\n📊 数据质量验证:');
    console.log(`   📈 总股票数: ${totalCount}`);
    
    if (totalCount === 0) {
      console.error('   ❌ 数据库中没有股票数据');
      client.release();
      return false;
    }
    
    // 检查最近更新的数据
    const recentUpdateResult = await client.query(`
      SELECT COUNT(*) as recent_count
      FROM stocks 
      WHERE last_updated > NOW() - INTERVAL '1 hour'
    `);
    const recentCount = parseInt(recentUpdateResult.rows[0].recent_count);
    
    console.log(`   🕐 最近1小时更新: ${recentCount} 只股票`);
    
    // 检查必需字段的完整性
    for (const field of REQUIRED_FIELDS) {
      const nullCountResult = await client.query(`
        SELECT COUNT(*) as null_count
        FROM stocks 
        WHERE ${field} IS NULL OR ${field} = ''
      `);
      const nullCount = parseInt(nullCountResult.rows[0].null_count);
      const completeness = ((totalCount - nullCount) / totalCount * 100).toFixed(1);
      
      if (nullCount > 0) {
        console.warn(`   ⚠️ ${field}: ${completeness}% 完整 (${nullCount} 个空值)`);
      } else {
        console.log(`   ✅ ${field}: 100% 完整`);
      }
    }
    
    // 检查价格数据的合理性
    const priceCheckResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN last_price > 0 THEN 1 END) as valid_price,
        COUNT(CASE WHEN last_price > 1000 THEN 1 END) as high_price,
        AVG(last_price) as avg_price,
        MIN(last_price) as min_price,
        MAX(last_price) as max_price
      FROM stocks 
      WHERE last_price IS NOT NULL
    `);
    
    const priceStats = priceCheckResult.rows[0];
    console.log('\n💰 价格数据分析:');
    console.log(`   📊 有价格数据: ${priceStats.valid_price}/${priceStats.total}`);
    console.log(`   💵 平均价格: $${parseFloat(priceStats.avg_price).toFixed(2)}`);
    console.log(`   📉 最低价格: $${parseFloat(priceStats.min_price).toFixed(2)}`);
    console.log(`   📈 最高价格: $${parseFloat(priceStats.max_price).toFixed(2)}`);
    
    if (parseInt(priceStats.high_price) > 0) {
      console.log(`   💎 高价股票 (>$1000): ${priceStats.high_price} 只`);
    }
    
    // 检查变动数据
    const changeCheckResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN change_percent > 10 THEN 1 END) as big_gainers,
        COUNT(CASE WHEN change_percent < -10 THEN 1 END) as big_losers,
        AVG(change_percent) as avg_change,
        COUNT(CASE WHEN change_percent IS NOT NULL THEN 1 END) as has_change_data
      FROM stocks
    `);
    
    const changeStats = changeCheckResult.rows[0];
    console.log('\n📈 变动数据分析:');
    console.log(`   📊 有变动数据: ${changeStats.has_change_data}/${totalCount}`);
    console.log(`   📈 平均变动: ${parseFloat(changeStats.avg_change).toFixed(2)}%`);
    console.log(`   🚀 大涨股票 (>10%): ${changeStats.big_gainers} 只`);
    console.log(`   📉 大跌股票 (<-10%): ${changeStats.big_losers} 只`);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ 数据质量验证失败:', error.message);
    return false;
  }
}

async function verifyRecentUpdates(pool) {
  try {
    const client = await pool.connect();
    
    console.log('\n🕐 最近更新验证:');
    
    // 检查最近更新的股票样本
    const recentSampleResult = await client.query(`
      SELECT ticker, name_en, last_price, change_percent, last_updated
      FROM stocks 
      WHERE last_updated > NOW() - INTERVAL '2 hours'
      ORDER BY last_updated DESC
      LIMIT 10
    `);
    
    if (recentSampleResult.rows.length > 0) {
      console.log('   📋 最近更新的股票样本:');
      recentSampleResult.rows.forEach(row => {
        const updateTime = new Date(row.last_updated).toLocaleString();
        console.log(`   📊 ${row.ticker}: $${row.last_price} (${row.change_percent?.toFixed(2)}%) - ${updateTime}`);
      });
    } else {
      console.warn('   ⚠️ 最近2小时内没有更新记录');
    }
    
    // 检查更新时间分布
    const updateDistributionResult = await client.query(`
      SELECT 
        DATE_TRUNC('hour', last_updated) as update_hour,
        COUNT(*) as update_count
      FROM stocks 
      WHERE last_updated > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', last_updated)
      ORDER BY update_hour DESC
      LIMIT 5
    `);
    
    if (updateDistributionResult.rows.length > 0) {
      console.log('\n   📅 最近24小时更新分布:');
      updateDistributionResult.rows.forEach(row => {
        const hour = new Date(row.update_hour).toLocaleString();
        console.log(`   🕐 ${hour}: ${row.update_count} 只股票`);
      });
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ 最近更新验证失败:', error.message);
    return false;
  }
}

async function generateHealthReport(pool) {
  try {
    const client = await pool.connect();
    
    console.log('\n🏥 系统健康报告:');
    
    // 数据新鲜度检查
    const freshnessResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN last_updated > NOW() - INTERVAL '1 hour' THEN 1 END) as very_fresh,
        COUNT(CASE WHEN last_updated > NOW() - INTERVAL '6 hours' THEN 1 END) as fresh,
        COUNT(CASE WHEN last_updated > NOW() - INTERVAL '24 hours' THEN 1 END) as recent,
        COUNT(*) as total
      FROM stocks
    `);
    
    const freshness = freshnessResult.rows[0];
    console.log(`   🟢 极新数据 (<1小时): ${freshness.very_fresh}/${freshness.total} (${(freshness.very_fresh/freshness.total*100).toFixed(1)}%)`);
    console.log(`   🟡 新鲜数据 (<6小时): ${freshness.fresh}/${freshness.total} (${(freshness.fresh/freshness.total*100).toFixed(1)}%)`);
    console.log(`   🟠 较新数据 (<24小时): ${freshness.recent}/${freshness.total} (${(freshness.recent/freshness.total*100).toFixed(1)}%)`);
    
    // 数据完整性评分
    let completenessScore = 0;
    for (const field of REQUIRED_FIELDS) {
      const nullCountResult = await client.query(`
        SELECT COUNT(*) as null_count FROM stocks WHERE ${field} IS NULL OR ${field} = ''
      `);
      const nullCount = parseInt(nullCountResult.rows[0].null_count);
      const fieldCompleteness = (freshness.total - nullCount) / freshness.total;
      completenessScore += fieldCompleteness;
    }
    completenessScore = (completenessScore / REQUIRED_FIELDS.length * 100).toFixed(1);
    
    console.log(`   📊 数据完整性评分: ${completenessScore}%`);
    
    // 系统状态评估
    let systemStatus = '🟢 优秀';
    if (completenessScore < 95 || freshness.very_fresh / freshness.total < 0.8) {
      systemStatus = '🟡 良好';
    }
    if (completenessScore < 90 || freshness.very_fresh / freshness.total < 0.5) {
      systemStatus = '🟠 需要关注';
    }
    if (completenessScore < 80 || freshness.very_fresh / freshness.total < 0.2) {
      systemStatus = '🔴 需要修复';
    }
    
    console.log(`   🎯 系统状态: ${systemStatus}`);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ 健康报告生成失败:', error.message);
    return false;
  }
}

// === 主函数 ===
async function main() {
  console.log('🔍 ===== S&P 500 数据更新验证开始 =====');
  
  if (!DATABASE_URL) {
    console.error('❌ 致命错误: 缺少 DATABASE_URL 环境变量');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // 执行各项验证
    const dbConnected = await verifyDatabaseConnection(pool);
    if (!dbConnected) {
      process.exit(1);
    }
    
    const structureValid = await verifyTableStructure(pool);
    if (!structureValid) {
      process.exit(1);
    }
    
    const dataQualityGood = await verifyDataQuality(pool);
    const recentUpdatesGood = await verifyRecentUpdates(pool);
    const healthReportGenerated = await generateHealthReport(pool);
    
    console.log('\n✅ ===== 验证完成 =====');
    
    if (dataQualityGood && recentUpdatesGood && healthReportGenerated) {
      console.log('🎉 所有验证通过，S&P 500数据状态良好');
      process.exit(0);
    } else {
      console.log('⚠️ 部分验证未通过，请检查上述报告');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 启动验证
main();