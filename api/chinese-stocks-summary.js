import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.CHINESE_STOCKS_DB_URL });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  try {
    const { rows } = await pool.query(`
      SELECT ticker, name_zh, last_price, change_amount, change_percent, market_cap
      FROM stocks
      WHERE last_price IS NOT NULL AND market_cap IS NOT NULL
      ORDER BY market_cap DESC;
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error('[API Error - chinese-stocks-summary]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}