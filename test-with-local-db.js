const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// 创建本地测试数据库
async function createTestDatabase() {
    const dbPath = path.join(__dirname, 'test.db');
    
    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        console.log('创建本地测试数据库...');
        
        // 创建stocks表
        await db.exec(`
            CREATE TABLE IF NOT EXISTS stocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT UNIQUE,
                name_zh TEXT,
                name_en TEXT,
                sector_zh TEXT,
                sector_en TEXT,
                market_cap REAL,
                price REAL,
                change_percent REAL,
                volume INTEGER,
                pe_ratio REAL,
                roe REAL
            )
        `);
        
        // 插入测试数据
        const testStocks = [
            {
                symbol: 'AAPL',
                name_zh: '苹果公司',
                name_en: 'Apple Inc.',
                sector_zh: '信息技术',
                sector_en: 'Information Technology',
                market_cap: 3000000000000,
                price: 175.50,
                change_percent: 1.25,
                volume: 50000000,
                pe_ratio: 28.5,
                roe: 0.15
            },
            {
                symbol: 'MSFT',
                name_zh: '微软公司',
                name_en: 'Microsoft Corporation',
                sector_zh: '信息技术',
                sector_en: 'Information Technology',
                market_cap: 2800000000000,
                price: 380.25,
                change_percent: 0.85,
                volume: 25000000,
                pe_ratio: 32.1,
                roe: 0.18
            },
            {
                symbol: 'GOOGL',
                name_zh: '谷歌A类',
                name_en: 'Alphabet Inc. Class A',
                sector_zh: '信息技术',
                sector_en: 'Information Technology',
                market_cap: 1700000000000,
                price: 135.80,
                change_percent: -0.45,
                volume: 30000000,
                pe_ratio: 25.8,
                roe: 0.14
            },
            {
                symbol: 'NVDA',
                name_zh: '英伟达',
                name_en: 'NVIDIA Corporation',
                sector_zh: '信息技术',
                sector_en: 'Information Technology',
                market_cap: 1200000000000,
                price: 485.20,
                change_percent: 2.15,
                volume: 35000000,
                pe_ratio: 65.2,
                roe: 0.22
            },
            {
                symbol: 'META',
                name_zh: 'Meta平台',
                name_en: 'Meta Platforms Inc.',
                sector_zh: '信息技术',
                sector_en: 'Information Technology',
                market_cap: 800000000000,
                price: 312.89,
                change_percent: -1.33,
                volume: 18765432,
                pe_ratio: 24.7,
                roe: 0.22
            }
        ];
        
        // 清空现有数据
        await db.run('DELETE FROM stocks');
        
        // 插入测试数据
        for (const stock of testStocks) {
            await db.run(`
                INSERT INTO stocks (
                    symbol, name_zh, name_en, sector_zh, sector_en,
                    market_cap, price, change_percent, volume, pe_ratio, roe
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                stock.symbol, stock.name_zh, stock.name_en, stock.sector_zh, stock.sector_en,
                stock.market_cap, stock.price, stock.change_percent, stock.volume, stock.pe_ratio, stock.roe
            ]);
        }
        
        console.log('✅ 测试数据插入完成');
        
        // 验证数据
        const count = await db.get('SELECT COUNT(*) as count FROM stocks');
        console.log(`📊 总股票数: ${count.count}`);
        
        const sectorCount = await db.get(`
            SELECT COUNT(*) as count 
            FROM stocks 
            WHERE sector_zh = '信息技术'
        `);
        console.log(`💻 信息技术行业股票数: ${sectorCount.count}`);
        
        await db.close();
        console.log('✅ 本地测试数据库创建完成');
        
    } catch (error) {
        console.error('❌ 创建测试数据库失败:', error);
    }
}

createTestDatabase();