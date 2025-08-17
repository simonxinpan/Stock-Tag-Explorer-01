const axios = require('axios');
require('dotenv').config();

// 测试API密钥
function testApiKeys() {
  console.log('=== API密钥检查 ===');
  console.log('POLYGON_API_KEY:', process.env.POLYGON_API_KEY ? '✅ 已设置' : '❌ 未设置');
  console.log('FINNHUB_API_KEY:', process.env.FINNHUB_API_KEY ? '✅ 已设置' : '❌ 未设置');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ 已设置' : '❌ 未设置');
  console.log('');
}

// 测试Polygon API
async function testPolygonAPI() {
  if (!process.env.POLYGON_API_KEY) {
    console.log('⚠️  跳过Polygon API测试 - 未设置API密钥');
    return;
  }
  
  console.log('=== 测试Polygon API ===');
  try {
    const symbol = 'AAPL';
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`
    );
    
    if (response.data.results && response.data.results.length > 0) {
      const data = response.data.results[0];
      console.log(`✅ Polygon API正常 - ${symbol}: $${data.c}`);
    } else {
      console.log('❌ Polygon API返回空数据');
    }
  } catch (error) {
    console.log('❌ Polygon API错误:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试Finnhub API
async function testFinnhubAPI() {
  if (!process.env.FINNHUB_API_KEY) {
    console.log('⚠️  跳过Finnhub API测试 - 未设置API密钥');
    return;
  }
  
  console.log('=== 测试Finnhub API ===');
  try {
    const symbol = 'AAPL';
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
    );
    
    if (response.data.c) {
      console.log(`✅ Finnhub API正常 - ${symbol}: $${response.data.c}`);
    } else {
      console.log('❌ Finnhub API返回空数据');
    }
  } catch (error) {
    console.log('❌ Finnhub API错误:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试数据库连接
async function testDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  跳过数据库测试 - 未设置DATABASE_URL');
    return;
  }
  
  console.log('=== 测试数据库连接 ===');
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ 数据库连接正常:', result.rows[0].now);
    
    // 检查表是否存在
    const client2 = await pool.connect();
    const tableCheck = await client2.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('stocks', 'tags', 'stock_tags')
    `);
    client2.release();
    
    const tables = tableCheck.rows.map(row => row.table_name);
    console.log('📊 数据库表:', tables.length > 0 ? tables.join(', ') : '无表');
    
    await pool.end();
  } catch (error) {
    console.log('❌ 数据库连接错误:', error.message);
  }
  console.log('');
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始API和数据库测试\n');
  
  testApiKeys();
  await testPolygonAPI();
  await testFinnhubAPI();
  await testDatabase();
  
  console.log('✨ 测试完成');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testApiKeys, testPolygonAPI, testFinnhubAPI, testDatabase };