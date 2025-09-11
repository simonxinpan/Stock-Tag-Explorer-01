import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 验证授权
function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;
  
  if (!authHeader || !expectedToken) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === expectedToken;
}

// 检查是否为交易日（周一到周五）
function isTradingDay() {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return day >= 1 && day <= 5; // Monday to Friday
}

// 获取美东时间
function getEasternTime() {
  return new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
}

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  // 验证授权
  if (!verifyAuth(req)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized',
      message: 'Invalid or missing authorization token'
    });
  }

  // 检查是否为交易日
  if (!isTradingDay()) {
    return res.status(200).json({
      success: true,
      message: 'Non-trading day, ETL task queue reset skipped',
      data: {
        resetCount: 0,
        estimatedMinutes: 0,
        easternTime: getEasternTime(),
        reason: 'Weekend or holiday'
      }
    });
  }

  try {
    console.log('🔄 Starting ETL task queue reset at', getEasternTime());
    
    const today = new Date().toISOString().split('T')[0];
    
    // 确保ETL任务队列表存在
    await pool.query(`
      CREATE TABLE IF NOT EXISTS etl_task_queue (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10) NOT NULL,
        task_date DATE NOT NULL DEFAULT CURRENT_DATE,
        batch_number INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        error_message TEXT NULL,
        UNIQUE(ticker, task_date)
      )
    `);
    
    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_etl_task_queue_status_date 
      ON etl_task_queue(status, task_date)
    `);
    
    // 清理今日已存在的任务
    await pool.query(`
      DELETE FROM etl_task_queue WHERE task_date = $1
    `, [today]);
    
    // 获取所有股票并初始化任务队列
    const { rows: stocks } = await pool.query(`
      SELECT ticker FROM stocks ORDER BY ticker
    `);
    
    // 批量插入任务
    const batchSize = 50;
    let batchNumber = 1;
    let totalInserted = 0;
    
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      for (const stock of batch) {
        await pool.query(`
          INSERT INTO etl_task_queue (ticker, task_date, batch_number, status)
          VALUES ($1, $2, $3, $4)
        `, [stock.ticker, today, batchNumber, 'pending']);
        totalInserted++;
      }
      
      batchNumber++;
    }
    
    const resetCount = totalInserted;
    
    // 估算完成时间（假设每15分钟处理约50只股票）
    const estimatedMinutes = Math.ceil(resetCount / 50) * 15;
    
    console.log(`✅ ETL task queue reset completed: ${resetCount} stocks reset`);
    
    return res.status(200).json({
      success: true,
      message: 'ETL task queue reset successfully',
      data: {
        resetCount,
        estimatedMinutes,
        easternTime: getEasternTime(),
        nextBatchTime: '15 minutes'
      }
    });
    
  } catch (error) {
    console.error('❌ ETL task queue reset failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: getEasternTime()
    });
  }
}