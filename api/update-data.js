import { Pool } from 'pg';
import axios from 'axios';

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// CORS中间件
function setCorsHeaders(res) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8000', 
    'https://stock-tag-explorer.vercel.app',
    'https://stock-tag-explorer-01.vercel.app'
  ];
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

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
      
      if (response.data && response.data.c) {
        const data = response.data;
        const currentPrice = data.c;
        const change = data.d || 0;
        const changePercent = data.dp || 0;
        
        stockData = {
          symbol,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          volume: 0, // Finnhub免费版不提供volume
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
        price = $2,
        change_amount = $3,
        change_percent = $4,
        volume = $5,
        last_updated = NOW()
      WHERE symbol = $1
    `;
    
    const result = await client.query(query, [
      stockData.symbol,
      stockData.price,
      stockData.change,
      stockData.changePercent,
      stockData.volume
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
      SELECT symbol FROM stocks 
      WHERE last_updated < NOW() - INTERVAL '1 hour'
      OR last_updated IS NULL
      ORDER BY symbol
      LIMIT 100
    `);
    
    return result.rows.map(row => row.symbol);
  } finally {
    client.release();
  }
}

// 主更新函数
async function updateStocks() {
  console.log('🚀 开始更新股票数据...');
  
  try {
    // 测试数据库连接
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ 数据库连接正常');
    
    // 获取需要更新的股票
    const symbols = await getStocksToUpdate();
    console.log(`📊 找到 ${symbols.length} 只股票需要更新`);
    
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
            console.warn(`⚠️ ${symbol}: 数据库更新失败`);
            errorCount++;
          }
        } else {
          console.warn(`⚠️ ${symbol}: 无法获取数据`);
          errorCount++;
        }
        
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`💥 ${symbol} 更新失败:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📈 更新完成: ${successCount} 成功, ${errorCount} 失败`);
    return { success: successCount, errors: errorCount, total: symbols.length };
    
  } catch (error) {
    console.error('💥 更新过程中发生错误:', error.message);
    throw error;
  }
}

// Vercel API处理函数
export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    console.log('🔄 API调用: 开始更新股票数据');
    const result = await updateStocks();
    
    res.status(200).json({
      success: true,
      message: '股票数据更新完成',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 导出函数供其他模块使用
export { updateStocks, fetchStockData, updateStockInDatabase };