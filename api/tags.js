// /api/tags.js (最终修复版 - 使用 import 语法)
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    // ... (handler 函数的内部逻辑和之前一样，无需改动)
    const { symbol, tag_name } = req.query;
    const client = await pool.connect();
    try {
        let data;
        if (symbol) {
            // ...
        } else if (tag_name) {
            // ...
        } else {
            // ** 使用 t.type，而不是 t.category **
            const { rows } = await client.query(
                `SELECT t.name, t.type, COUNT(...)::int as stock_count FROM tags t ... ORDER BY t.type, ...`
            );
            data = rows;
        }
        res.status(200).json(data);
    } catch (error) { /* ... */ } 
    finally { if (client) client.release(); }
}