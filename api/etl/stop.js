const { Pool } = require('pg');

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

// 获取美东时间
function getEasternTime() {
  return new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
}

module.exports = async function handler(req, res) {
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

  try {
    console.log('🛑 Stopping ETL processes at', getEasternTime());
    
    const today = new Date().toISOString().split('T')[0];
    
    // 标记所有待处理和处理中的任务为已完成，停止进一步处理
    const stopQuery = `
      UPDATE etl_task_queue 
      SET status = 'completed',
          processed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_date = $1 AND status IN ('pending', 'processing')
    `;
    
    const result = await pool.query(stopQuery, [today]);
    const stoppedCount = result.rowCount;
    
    // 获取今日处理统计
    const statsQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_today,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_today,
        MAX(processed_at) as last_processed_time
      FROM etl_task_queue
      WHERE task_date = $1
    `;
    
    const statsResult = await pool.query(statsQuery, [today]);
    const stats = statsResult.rows[0];
    
    console.log(`✅ ETL processes stopped: ${stoppedCount} active tasks terminated`);
    
    return res.status(200).json({
      success: true,
      message: 'ETL processes stopped successfully',
      data: {
        stoppedCount,
        totalTasks: parseInt(stats.total_tasks),
        completedToday: parseInt(stats.completed_today),
        failedToday: parseInt(stats.failed_today),
        pendingToday: parseInt(stats.pending_today),
        lastProcessedTime: stats.last_processed_time,
        easternTime: getEasternTime(),
        status: 'Market closed - ETL processes terminated'
      }
    });
    
  } catch (error) {
    console.error('❌ ETL stop process failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: getEasternTime()
    });
  }
}