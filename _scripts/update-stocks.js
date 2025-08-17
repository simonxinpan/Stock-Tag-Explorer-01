const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 获取实时股票数据
async function fetchStockData(symbol) {
  let stockData = null;
  
  // 尝试Polygon API
  if (process.env.POLYGON_API_KEY && !stockData) {
    try {
      console.log(`Fetching ${symbol} from Polygon...`);
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`
      );
      
      if (response.data.results && response.data.results.length > 0) {
        const data = response.data.results[0];
        const currentPrice = data.c || 0;
        const previousClose = data.o || currentPrice;
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
        
        stockData = {
          symbol,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          volume: data.v || 0,
          source: 'polygon'
        };
      }
    } catch (error) {
      console.warn(`Polygon API error for ${symbol}:`, error.message);
    }
  }
  
  // 尝试Finnhub API
  if (process.env.FINNHUB_API_KEY && !stockData) {
    try {
      console.log(`Fetching ${symbol} from Finnhub...`);
      const response = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
      );
      
      if (response.data.c) {
        stockData = {
          symbol,
          price: response.data.c,
          change: response.data.d || 0,
          changePercent: response.data.dp || 0,
          volume: 0, // Finnhub免费版不提供
          source: 'finnhub'
        };
      }
    } catch (error) {
      console.warn(`Finnhub API error for ${symbol}:`, error.message);
    }
  }
  
  return stockData;
}

// 更新数据库中的股票数据
async function updateStockInDatabase(stockData) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE stocks 
      SET 
        last_price = $2,
        change_amount = $3,
        change_percent = $4,
        last_updated = NOW()
      WHERE ticker = $1
    `;
    
    const result = await client.query(query, [
      stockData.ticker || stockData.symbol, // 兼容新旧字段名
      stockData.price,
      stockData.change,
      stockData.changePercent
    ]);
    
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

// 获取需要更新的股票列表
async function getStocksToUpdate() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT ticker FROM stocks 
      WHERE last_updated < NOW() - INTERVAL '1 hour'
      OR last_updated IS NULL
      ORDER BY ticker
      LIMIT 100
    `);
    
    return result.rows.map(row => row.ticker);
  } finally {
    client.release();
  }
}

// 主更新函数
async function updateStocks() {
  console.log('🚀 开始更新股票数据...');
  
  try {
    // 检查数据库连接
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ 数据库连接正常');
    
    // 获取需要更新的股票
    const symbols = await getStocksToUpdate();
    console.log(`📊 需要更新 ${symbols.length} 只股票`);
    
    if (symbols.length === 0) {
      console.log('✨ 所有股票数据都是最新的');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // 批量更新股票数据
    for (const symbol of symbols) {
      try {
        const stockData = await fetchStockData(symbol);
        
        if (stockData) {
          const updated = await updateStockInDatabase(stockData);
          if (updated) {
            successCount++;
            console.log(`✅ ${symbol}: $${stockData.price} (${stockData.changePercent.toFixed(2)}%)`);
          } else {
            console.log(`⚠️  ${symbol}: 数据库更新失败`);
            errorCount++;
          }
        } else {
          console.log(`❌ ${symbol}: 无法获取数据`);
          errorCount++;
        }
        
        // 避免API限制，添加延迟
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ ${symbol}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📈 更新完成:`);
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失败: ${errorCount}`);
    console.log(`   📊 总计: ${symbols.length}`);
    
  } catch (error) {
    console.error('💥 更新过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行更新
if (require.main === module) {
  updateStocks().catch(error => {
    console.error('💥 更新失败:', error.message);
    process.exit(1);
  });
}

module.exports = { updateStocks, fetchStockData, updateStockInDatabase };