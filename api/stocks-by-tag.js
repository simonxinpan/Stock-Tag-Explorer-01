// api/stocks-by-tag.js (最终黄金版)

const { Pool } = require('pg');
const { URL } = require('url');

// 解析数据库URL
let dbConfig;
if (process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbConfig = {
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    host: dbUrl.hostname,
    port: dbUrl.port,
    database: dbUrl.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
  };
} else {
  dbConfig = {
     ssl: { rejectUnauthorized: false },
     connectionTimeoutMillis: 10000,
     idleTimeoutMillis: 30000,
     max: 20
   };
}

const pool = new Pool(dbConfig);

module.exports = async function handler(request, response) {
  // 设置CORS头
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { tagId, page = 1, limit = 20, sort = 'market_cap_desc' } = request.query;

  if (!tagId) {
    return response.status(400).json({ success: false, error: 'Tag ID is required' });
  }

  let query = '';
  let countQuery = '';
  let values = [];
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  
  // 构建排序逻辑
  let orderByClause = 'ORDER BY market_cap DESC'; // 默认
  if (sort === 'name_asc') orderByClause = 'ORDER BY name_zh ASC';
  if (sort === 'change_percent_desc') orderByClause = 'ORDER BY change_percent DESC';

  try {
    const client = await pool.connect();
    
    let stocks = [];
    let totalCount = 0;

    // --- 智能路由逻辑 ---
    if (tagId.startsWith('marketcap_')) {
        const type = tagId.split('_')[1];
        let whereClause = '';
        switch (type) {
            case '大盘股': whereClause = 'WHERE CAST(market_cap AS BIGINT) >= 200000'; break;
            case '中盘股': whereClause = 'WHERE CAST(market_cap AS BIGINT) >= 10000 AND CAST(market_cap AS BIGINT) < 200000'; break;
            case '小盘股': whereClause = 'WHERE CAST(market_cap AS BIGINT) < 10000 AND CAST(market_cap AS BIGINT) > 0'; break;
        }
        
        if (whereClause) {
            query = `SELECT * FROM stocks ${whereClause} ${orderByClause} LIMIT ${limit} OFFSET ${offset};`;
            countQuery = `SELECT COUNT(*) FROM stocks ${whereClause};`;
            const { rows: stockRows } = await client.query(query);
            stocks = stockRows;
            const { rows: countRows } = await client.query(countQuery);
            totalCount = parseInt(countRows[0].count, 10);
        }

    } else if (tagId.startsWith('rank_')) {
        let rankQuery = '';
        let rankCountQuery = '';
        switch (tagId) {
            case 'rank_roe_ttm_top10': // 高ROE
                rankQuery = `SELECT * FROM stocks WHERE roe_ttm IS NOT NULL AND roe_ttm > 0 ORDER BY roe_ttm DESC LIMIT 50 OFFSET ${offset}`;
                rankCountQuery = "SELECT COUNT(*) FROM stocks WHERE roe_ttm IS NOT NULL AND roe_ttm > 0";
                break;
            case 'rank_pe_ttm_low10': // 低PE
                rankQuery = `SELECT * FROM stocks WHERE pe_ttm IS NOT NULL AND pe_ttm > 0 ORDER BY pe_ttm ASC LIMIT 50 OFFSET ${offset}`;
                rankCountQuery = "SELECT COUNT(*) FROM stocks WHERE pe_ttm IS NOT NULL AND pe_ttm > 0";
                break;
            case 'rank_market_cap_top10': // 市值前10%
                rankQuery = `SELECT * FROM stocks WHERE CAST(market_cap AS BIGINT) IS NOT NULL AND CAST(market_cap AS BIGINT) > 0 ORDER BY CAST(market_cap AS BIGINT) DESC LIMIT 50 OFFSET ${offset}`;
                rankCountQuery = "SELECT COUNT(*) FROM stocks WHERE CAST(market_cap AS BIGINT) IS NOT NULL AND CAST(market_cap AS BIGINT) > 0";
                break;
        }
        
        if (rankQuery) {
            const { rows: stockRows } = await client.query(rankQuery);
            stocks = stockRows;
            const { rows: countRows } = await client.query(rankCountQuery);
            totalCount = parseInt(countRows[0].count, 10);
        }
        
    } else if (tagId.startsWith('sector_')) {
        const sectorName = tagId.split('_')[1];
        query = `SELECT * FROM stocks WHERE sector_zh = $1 ${orderByClause} LIMIT ${limit} OFFSET ${offset};`;
        countQuery = `SELECT COUNT(*) FROM stocks WHERE sector_zh = $1;`;
        values = [sectorName];
        
        const { rows: stockRows } = await client.query(query, values);
        stocks = stockRows;
        const { rows: countRows } = await client.query(countQuery, values);
        totalCount = parseInt(countRows[0].count, 10);

    } else {
        // 默认处理普通的、基于数字ID的静态标签
        const numericTagId = parseInt(tagId, 10);
        query = `SELECT s.* FROM stocks s JOIN stock_tags st ON s.ticker = st.stock_ticker WHERE st.tag_id = $1 ${orderByClause} LIMIT ${limit} OFFSET ${offset};`;
        countQuery = `SELECT COUNT(*) FROM stock_tags WHERE tag_id = $1;`;
        values = [numericTagId];

        const { rows: stockRows } = await client.query(query, values);
        stocks = stockRows;
        const { rows: countRows } = await client.query(countQuery, values);
        totalCount = parseInt(countRows[0].count, 10);
    }

    client.release();
    return response.status(200).json({ success: true, stocks, totalCount });

  } catch (error) {
    console.error(`Error fetching data for tagId "${tagId}":`, error);
    return response.status(500).json({ success: false, error: 'Database query failed.' });
  }
};