// /api/tags.js (最终版，使用 DATABASE_URL)
import { Pool } from 'pg';

// *** 核心修复：使用统一的环境变量名 DATABASE_URL ***
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Vercel 自动处理 CORS 预检请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { symbol, tag_name } = req.query;
  const client = await pool.connect();

  try {
    let data;
    if (symbol) {
      // 场景1: 查询某只股票的所有标签
      const { rows } = await client.query(
        `SELECT t.name, t.type FROM tags t
         JOIN stock_tags st ON t.id = st.tag_id
         WHERE st.stock_ticker = $1 ORDER BY t.type, t.name`, 
        [symbol.toUpperCase()]
      );
      data = rows;
    } else if (tag_name) {
      // 场景2: 查询拥有某个标签的所有股票
      const { rows } = await client.query(
        `SELECT s.ticker, s.name_zh, s.change_percent FROM stocks s
         JOIN stock_tags st ON s.ticker = st.stock_ticker
         JOIN tags t ON st.tag_id = t.id
         WHERE t.name = $1 ORDER BY s.market_cap DESC NULLS LAST`, 
        [tag_name]
      );
      data = rows;
    } else {
      // 场景3: 获取所有标签及其股票数量
      const { rows } = await client.query(
        `SELECT t.name, t.type, COUNT(st.stock_ticker)::int as stock_count FROM tags t
         LEFT JOIN stock_tags st ON t.id = st.tag_id
         GROUP BY t.id
         HAVING COUNT(st.stock_ticker) > 0
         ORDER BY t.type, stock_count DESC, t.name`
      );
      data = rows;
    }
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    console.error(`API /tags Error:`, error);
    res.status(500).json({ error: 'Database query failed.' });
  } finally {
    if (client) client.release();
  }
}