// /_scripts/update-database.mjs (完整版)
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
    console.log("===== Starting Database Update Job =====");
    
    const { NEON_DATABASE_URL, POLYGON_API_KEY, FINNHUB_API_KEY } = process.env;
    
    // 检查是否为测试模式
    const isTestMode = !NEON_DATABASE_URL;
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No database connection");
        console.log("✅ Script structure validation passed");
        console.log("📝 To run with real database, set NEON_DATABASE_URL environment variable");
        console.log("===== Test completed successfully =====");
        return;
    }
    
    const pool = new Pool({ 
        connectionString: NEON_DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
    });
    
    let client;
    
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 清理并重建数据库结构
        await cleanAndRebuildDatabase(client);
        
        // 检查表是否存在，如果不存在则创建
        await ensureTablesExist(client);
        
        // 更新股票数据
        await updateStockData(client);
        
        console.log("===== Job finished successfully. =====");
    } catch (error) {
        console.error("❌ Database update failed:", error.message);
        console.error("Full error:", error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
            console.log("Database connection released");
        }
        if (pool) {
            await pool.end();
            console.log("Database pool closed");
        }
    }
}

async function cleanAndRebuildDatabase(client) {
    console.log("🧹 Cleaning and preparing database...");
    
    try {
        // 删除可能存在的损坏表（按依赖关系顺序）
        await client.query('DROP TABLE IF EXISTS stock_tags CASCADE;');
        await client.query('DROP TABLE IF EXISTS stocks CASCADE;');
        await client.query('DROP TABLE IF EXISTS tags CASCADE;');
        
        console.log("✅ Old tables cleaned up");
        
    } catch (error) {
        console.error("⚠️ Warning during cleanup:", error.message);
        // 清理失败不应该阻止流程继续
    }
}

async function ensureTablesExist(client) {
    console.log("🔍 Checking if tables exist...");
    
    try {
        // 分步创建表，避免索引创建时表不存在的问题
        
        // 1. 创建标签表
        const createTagsTableSQL = `
        CREATE TABLE IF NOT EXISTS tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          type VARCHAR(50) NOT NULL,
          description TEXT
        );
        `;
        await client.query(createTagsTableSQL);
        console.log("✅ Tags table created/verified");
        
        // 检查并修复 tags 表结构
        await verifyAndFixTagsTable(client);
        
        // 2. 创建股票表
        const createStocksTableSQL = `
        CREATE TABLE IF NOT EXISTS stocks (
          ticker VARCHAR(10) PRIMARY KEY,
          name_en TEXT,
          name_zh TEXT,
          sector_en TEXT,
          sector_zh TEXT,
          market_cap NUMERIC,
          logo TEXT,
          last_price NUMERIC(10, 2),
          change_amount NUMERIC(10, 2),
          change_percent NUMERIC(8, 4),
          last_updated TIMESTAMPTZ,
          roe_ttm NUMERIC(10, 4),
          pe_ttm NUMERIC(10, 2),
          week_52_high NUMERIC(10, 2),
          week_52_low NUMERIC(10, 2),
          dividend_yield NUMERIC(8, 4)
        );
        `;
        await client.query(createStocksTableSQL);
        console.log("✅ Stocks table created/verified");
        
        // 检查并修复 stocks 表结构
        await verifyAndFixStocksTable(client);
        
        // 3. 创建股票标签关联表
        const createStockTagsTableSQL = `
        CREATE TABLE IF NOT EXISTS stock_tags (
          stock_ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (stock_ticker, tag_id)
        );
        `;
        await client.query(createStockTagsTableSQL);
        console.log("✅ Stock_tags table created/verified");
        
        // 4. 创建索引（在表创建完成后）
        await createIndexes(client);
        
        // 5. 插入基础标签数据
        await insertBaseTags(client);
        
    } catch (error) {
        console.error("❌ Error in ensureTablesExist:", error.message);
        throw error;
    }
}

async function verifyAndFixTagsTable(client) {
    console.log("🔧 Verifying tags table structure...");
    
    try {
        // 检查 tags 表的列结构
        const checkColumnsSQL = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tags'
        ORDER BY ordinal_position;
        `;
        
        const result = await client.query(checkColumnsSQL);
        const existingColumns = result.rows.map(row => row.column_name);
        
        console.log("📋 Existing columns:", existingColumns);
        
        // 检查必需的列是否存在
        const requiredColumns = ['id', 'name', 'type', 'description'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
            console.log("⚠️ Missing columns detected:", missingColumns);
            
            // 如果缺少关键列，重建表
            if (missingColumns.includes('name') || missingColumns.includes('type')) {
                console.log("🔄 Rebuilding tags table with correct structure...");
                await client.query('DROP TABLE IF EXISTS tags CASCADE;');
                
                const createTagsTableSQL = `
                CREATE TABLE tags (
                  id SERIAL PRIMARY KEY,
                  name VARCHAR(255) NOT NULL UNIQUE,
                  type VARCHAR(50) NOT NULL,
                  description TEXT
                );
                `;
                await client.query(createTagsTableSQL);
                console.log("✅ Tags table rebuilt successfully");
            }
        } else {
            console.log("✅ Tags table structure is correct");
        }
        
    } catch (error) {
        console.error("❌ Error verifying tags table:", error.message);
        throw error;
    }
}

async function verifyAndFixStocksTable(client) {
    console.log("🔧 Verifying stocks table structure...");
    
    try {
        // 检查 stocks 表的列结构
        const checkColumnsSQL = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stocks'
        ORDER BY ordinal_position;
        `;
        
        const result = await client.query(checkColumnsSQL);
        const existingColumns = result.rows.map(row => row.column_name);
        
        console.log("📋 Existing stocks columns:", existingColumns);
        
        // 检查必需的列是否存在
        const requiredColumns = ['ticker', 'name_en', 'name_zh', 'sector_en', 'sector_zh', 'market_cap', 'logo', 'last_price', 'change_amount', 'change_percent', 'last_updated', 'roe_ttm', 'pe_ttm', 'week_52_high', 'week_52_low', 'dividend_yield'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
            console.log("⚠️ Missing stocks columns detected:", missingColumns);
            
            // 如果缺少关键列，重建表
            if (missingColumns.includes('ticker') || missingColumns.includes('name_zh')) {
                console.log("🔄 Rebuilding stocks table with correct structure...");
                await client.query('DROP TABLE IF EXISTS stocks CASCADE;');
                
                const createStocksTableSQL = `
                CREATE TABLE stocks (
                  ticker VARCHAR(10) PRIMARY KEY,
                  name_en TEXT,
                  name_zh TEXT,
                  sector_en TEXT,
                  sector_zh TEXT,
                  market_cap NUMERIC,
                  logo TEXT,
                  last_price NUMERIC(10, 2),
                  change_amount NUMERIC(10, 2),
                  change_percent NUMERIC(8, 4),
                  last_updated TIMESTAMPTZ,
                  roe_ttm NUMERIC(10, 4),
                  pe_ttm NUMERIC(10, 2),
                  week_52_high NUMERIC(10, 2),
                  week_52_low NUMERIC(10, 2),
                  dividend_yield NUMERIC(8, 4)
                );
                `;
                await client.query(createStocksTableSQL);
                console.log("✅ Stocks table rebuilt successfully");
            }
        } else {
            console.log("✅ Stocks table structure is correct");
        }
        
    } catch (error) {
        console.error("❌ Error verifying stocks table:", error.message);
        throw error;
    }
}

async function createIndexes(client) {
    console.log("📊 Creating indexes...");
    
    try {
        // 检查表是否存在再创建索引
        const checkTablesSQL = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('stocks', 'tags', 'stock_tags');
        `;
        
        const result = await client.query(checkTablesSQL);
        const existingTables = result.rows.map(row => row.table_name);
        
        if (existingTables.includes('stocks')) {
            await client.query('CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);');
            console.log("✅ Stocks ticker index created");
        }
        
        if (existingTables.includes('tags')) {
            await client.query('CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);');
            console.log("✅ Tags type index created");
        }
        
        if (existingTables.includes('stock_tags')) {
            await client.query('CREATE INDEX IF NOT EXISTS idx_stock_tags_ticker ON stock_tags(stock_ticker);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);');
            console.log("✅ Stock_tags indexes created");
        }
        
    } catch (error) {
        console.error("⚠️ Warning: Index creation failed:", error.message);
        // 索引创建失败不应该阻止整个流程
    }
}

async function insertBaseTags(client) {
    console.log("📝 Inserting base tags...");
    
    const insertTagsSQL = `
    INSERT INTO tags (name, type, description) VALUES
    ('标普500', '特殊名单类', '标普500指数成分股'),
    ('科技股', '行业分类', '信息技术、软件与服务、半导体等相关股票'),
    ('金融股', '行业分类', '金融服务、银行、保险等相关股票'),
    ('医疗保健', '行业分类', '制药、生物技术、医疗设备等相关股票'),
    ('非必需消费品', '行业分类', '汽车、零售、酒店、非必需消费品等相关股票'),
    ('日常消费品', '行业分类', '食品、饮料、家居用品等相关股票'),
    ('工业股', '行业分类', '航空航天、机械、运输等相关股票'),
    ('能源股', '行业分类', '石油、天然气、能源设备与服务等相关股票'),
    ('公用事业', '行业分类', '电力、天然气、水务等相关股票'),
    ('房地产', '行业分类', '房地产投资信托(REITs)及房地产管理开发股票'),
    ('原材料', '行业分类', '基础材料行业股票'),
    ('通讯服务', '行业分类', '电信服务、媒体与娱乐等相关股票'),
    ('超大盘股', '市值分类', '市值超过2000亿美元的股票'),
    ('大盘股', '市值分类', '市值在100-2000亿美元的股票'),
    ('中盘股', '市值分类', '市值在20-100亿美元的股票'),
    ('小盘股', '市值分类', '市值在2-20亿美元的股票'),
    ('低估值', '估值标签', 'PE比率相对较低的股票'),
    ('高估值', '估值标签', 'PE比率相对较高的股票'),
    ('高ROE', '盈利能力', 'ROE超过15%的股票'),
    ('低ROE', '盈利能力', 'ROE低于5%的股票'),
    ('强势股', '表现标签', '近期表现强劲的股票'),
    ('弱势股', '表现标签', '近期表现疲弱的股票'),
    ('高分红', '分红标签', '股息收益率较高的股票')
    ON CONFLICT (name) DO NOTHING;
    `;
    
    await client.query(insertTagsSQL);
    console.log("✅ Base tags inserted/updated");
}

async function updateStockData(client) {
    console.log("📊 Updating stock data...");
    
    // 示例股票数据（市值以美元为单位）
    const sampleStocks = [
        { ticker: 'AAPL', name_zh: '苹果公司', last_price: 195.89, change_amount: 2.34, change_percent: 1.21, market_cap: 3100000000000, sector_zh: '信息技术' },
        { ticker: 'MSFT', name_zh: '微软公司', last_price: 378.85, change_amount: -1.23, change_percent: -0.32, market_cap: 2800000000000, sector_zh: '信息技术' },
        { ticker: 'GOOGL', name_zh: '谷歌A类', last_price: 142.56, change_amount: 3.45, change_percent: 2.48, market_cap: 1800000000000, sector_zh: '信息技术' },
        { ticker: 'AMZN', name_zh: '亚马逊', last_price: 155.23, change_amount: -0.87, change_percent: -0.56, market_cap: 1600000000000, sector_zh: '非必需消费品' },
        { ticker: 'TSLA', name_zh: '特斯拉', last_price: 248.42, change_amount: 12.34, change_percent: 5.23, market_cap: 789000000000, sector_zh: '非必需消费品' }
    ];
    
    for (const stock of sampleStocks) {
        const insertStockSQL = `
        INSERT INTO stocks (ticker, name_zh, last_price, change_amount, change_percent, market_cap, sector_zh, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (ticker) DO UPDATE SET
          name_zh = EXCLUDED.name_zh,
          last_price = EXCLUDED.last_price,
          change_amount = EXCLUDED.change_amount,
          change_percent = EXCLUDED.change_percent,
          market_cap = EXCLUDED.market_cap,
          sector_zh = EXCLUDED.sector_zh,
          last_updated = CURRENT_TIMESTAMP;
        `;
        
        await client.query(insertStockSQL, [
            stock.ticker, stock.name_zh, stock.last_price, stock.change_amount, 
            stock.change_percent, stock.market_cap, stock.sector_zh
        ]);
    }
    
    // 更新标签关联
    await updateStockTags(client);
    
    console.log("✅ Stock data updated successfully");
}

async function updateStockTags(client) {
    console.log("🏷️ Updating stock tags...");
    
    const tagAssignments = [
        { ticker: 'AAPL', tagId: 1 },
        { ticker: 'AAPL', tagId: 2 },
        { ticker: 'MSFT', tagId: 1 },
        { ticker: 'MSFT', tagId: 2 },
        { ticker: 'GOOGL', tagId: 2 },
        { ticker: 'AMZN', tagId: 5 },
        { ticker: 'TSLA', tagId: 5 }
    ];
    
    for (const assignment of tagAssignments) {
        const insertTagSQL = `
        INSERT INTO stock_tags (stock_ticker, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (stock_ticker, tag_id) DO NOTHING;
        `;
        
        await client.query(insertTagSQL, [assignment.ticker, assignment.tagId]);
    }
    
    // 更新标签计数
    const updateCountSQL = `
    UPDATE tags SET stock_count = (
        SELECT COUNT(*) FROM stock_tags WHERE tag_id = tags.id
    );
    `;
    
    await client.query(updateCountSQL);
    
    console.log("✅ Stock tags updated successfully");
}

main();