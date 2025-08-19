// /api/fill-sectors.js - 填充sector数据的API端点
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 股票基础信息映射
const stockInfo = {
  'AAPL': { name_zh: '苹果公司', sector_zh: '信息技术' },
  'MSFT': { name_zh: '微软公司', sector_zh: '信息技术' },
  'AMZN': { name_zh: '亚马逊', sector_zh: '非必需消费品' },
  'NVDA': { name_zh: '英伟达', sector_zh: '信息技术' },
  'GOOGL': { name_zh: '谷歌A类', sector_zh: '信息技术' },
  'GOOG': { name_zh: '谷歌C类', sector_zh: '信息技术' },
  'META': { name_zh: 'Meta平台', sector_zh: '信息技术' },
  'TSLA': { name_zh: '特斯拉', sector_zh: '非必需消费品' },
  'BRK.B': { name_zh: '伯克希尔哈撒韦B', sector_zh: '金融服务' },
  'UNH': { name_zh: '联合健康', sector_zh: '医疗保健' },
  'XOM': { name_zh: '埃克森美孚', sector_zh: '能源' },
  'JNJ': { name_zh: '强生公司', sector_zh: '医疗保健' },
  'JPM': { name_zh: '摩根大通', sector_zh: '金融服务' },
  'V': { name_zh: '维萨', sector_zh: '金融服务' },
  'PG': { name_zh: '宝洁公司', sector_zh: '日常消费品' },
  'HD': { name_zh: '家得宝', sector_zh: '非必需消费品' },
  'CVX': { name_zh: '雪佛龙', sector_zh: '能源' },
  'MA': { name_zh: '万事达', sector_zh: '金融服务' },
  'BAC': { name_zh: '美国银行', sector_zh: '金融服务' },
  'ABBV': { name_zh: '艾伯维', sector_zh: '医疗保健' },
  'PFE': { name_zh: '辉瑞', sector_zh: '医疗保健' },
  'AVGO': { name_zh: '博通', sector_zh: '信息技术' },
  'COST': { name_zh: '好市多', sector_zh: '日常消费品' },
  'DIS': { name_zh: '迪士尼', sector_zh: '通讯服务' },
  'KO': { name_zh: '可口可乐', sector_zh: '日常消费品' },
  'MRK': { name_zh: '默克公司', sector_zh: '医疗保健' },
  'PEP': { name_zh: '百事公司', sector_zh: '日常消费品' },
  'TMO': { name_zh: '赛默飞世尔', sector_zh: '医疗保健' },
  'WMT': { name_zh: '沃尔玛', sector_zh: '日常消费品' },
  'ABT': { name_zh: '雅培', sector_zh: '医疗保健' }
};

function handler(req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    fillSectors(req, res);
}

async function fillSectors(req, res) {
    const client = await pool.connect();
    
    try {
        console.log('🔄 开始填充sector数据...');
        
        await client.query('BEGIN');
        
        let updatedCount = 0;
        
        for (const [ticker, info] of Object.entries(stockInfo)) {
            const result = await client.query(`
                UPDATE stocks 
                SET name_zh = $2, sector_zh = $3, last_updated = CURRENT_TIMESTAMP
                WHERE ticker = $1
                RETURNING ticker
            `, [ticker, info.name_zh, info.sector_zh]);
            
            if (result.rows.length > 0) {
                updatedCount++;
                console.log(`✅ 更新 ${ticker}: ${info.name_zh} - ${info.sector_zh}`);
            }
        }
        
        await client.query('COMMIT');
        
        console.log(`✅ 成功更新 ${updatedCount} 只股票的sector数据`);
        
        res.status(200).json({
            success: true,
            message: `成功更新 ${updatedCount} 只股票的sector数据`,
            updated_count: updatedCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 填充sector数据失败:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to fill sector data',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        client.release();
    }
}

module.exports = handler;