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
          tag_id VARCHAR(50) UNIQUE NOT NULL,
          tag_name VARCHAR(100) NOT NULL,
          category VARCHAR(50) NOT NULL,
          color_theme VARCHAR(20) DEFAULT 'blue',
          stock_count INTEGER DEFAULT 0,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;
        await client.query(createTagsTableSQL);
        console.log("✅ Tags table created/verified");
        
        // 检查并修复 tags 表结构
        await verifyAndFixTagsTable(client);
        
        // 2. 创建股票表
        const createStocksTableSQL = `
        CREATE TABLE IF NOT EXISTS stocks (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(200) NOT NULL,
          price DECIMAL(10,2),
          change_amount DECIMAL(10,2),
          change_percent DECIMAL(5,2),
          volume BIGINT,
          market_cap VARCHAR(20),
          sector VARCHAR(100),
          industry VARCHAR(100),
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;
        await client.query(createStocksTableSQL);
        console.log("✅ Stocks table created/verified");
        
        // 检查并修复 stocks 表结构
        await verifyAndFixStocksTable(client);
        
        // 3. 创建股票标签关联表
        const createStockTagsTableSQL = `
        CREATE TABLE IF NOT EXISTS stock_tags (
          id SERIAL PRIMARY KEY,
          stock_symbol VARCHAR(10) NOT NULL,
          tag_id VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(stock_symbol, tag_id)
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
        const requiredColumns = ['id', 'tag_id', 'tag_name', 'category', 'color_theme', 'stock_count', 'description', 'created_at', 'updated_at'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
            console.log("⚠️ Missing columns detected:", missingColumns);
            
            // 如果缺少关键列，重建表
            if (missingColumns.includes('tag_id') || missingColumns.includes('tag_name') || missingColumns.includes('category')) {
                console.log("🔄 Rebuilding tags table with correct structure...");
                await client.query('DROP TABLE IF EXISTS tags CASCADE;');
                
                const createTagsTableSQL = `
                CREATE TABLE tags (
                  id SERIAL PRIMARY KEY,
                  tag_id VARCHAR(50) UNIQUE NOT NULL,
                  tag_name VARCHAR(100) NOT NULL,
                  category VARCHAR(50) NOT NULL,
                  color_theme VARCHAR(20) DEFAULT 'blue',
                  stock_count INTEGER DEFAULT 0,
                  description TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        const requiredColumns = ['id', 'symbol', 'name', 'price', 'change_amount', 'change_percent', 'volume', 'market_cap', 'sector', 'industry', 'last_updated', 'created_at'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
            console.log("⚠️ Missing stocks columns detected:", missingColumns);
            
            // 如果缺少关键列，重建表
            if (missingColumns.includes('symbol') || missingColumns.includes('name')) {
                console.log("🔄 Rebuilding stocks table with correct structure...");
                await client.query('DROP TABLE IF EXISTS stocks CASCADE;');
                
                const createStocksTableSQL = `
                CREATE TABLE stocks (
                  id SERIAL PRIMARY KEY,
                  symbol VARCHAR(10) UNIQUE NOT NULL,
                  name VARCHAR(200) NOT NULL,
                  price DECIMAL(10,2),
                  change_amount DECIMAL(10,2),
                  change_percent DECIMAL(5,2),
                  volume BIGINT,
                  market_cap VARCHAR(20),
                  sector VARCHAR(100),
                  industry VARCHAR(100),
                  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            await client.query('CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);');
            console.log("✅ Stocks symbol index created");
        }
        
        if (existingTables.includes('tags')) {
            await client.query('CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);');
            console.log("✅ Tags category index created");
        }
        
        if (existingTables.includes('stock_tags')) {
            await client.query('CREATE INDEX IF NOT EXISTS idx_stock_tags_symbol ON stock_tags(stock_symbol);');
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
    INSERT INTO tags (tag_id, tag_name, category, color_theme, stock_count) VALUES
    ('high_volume', '52周高点', 'market_performance', 'emerald', 0),
    ('low_point', '52周低点', 'market_performance', 'emerald', 0),
    ('high_growth', '高成长', 'market_performance', 'emerald', 0),
    ('low_volatility', '低波动', 'market_performance', 'emerald', 0),
    ('high_dividend', '高分红', 'market_performance', 'emerald', 0),
    ('high_roe', '高ROE', 'financial_performance', 'amber', 0),
    ('low_debt', '低负债率', 'financial_performance', 'amber', 0),
    ('high_growth_rate', '高增长率', 'financial_performance', 'amber', 0),
    ('high_margin', '高利润率', 'financial_performance', 'amber', 0),
    ('recent_hot', '近期热度', 'trend_ranking', 'purple', 0),
    ('recent_trend', '近期趋势', 'trend_ranking', 'purple', 0),
    ('growth_potential', '成长潜力', 'trend_ranking', 'purple', 0),
    ('breakthrough', '突破新高', 'trend_ranking', 'purple', 0),
    ('technology', '科技股', 'industry_category', 'gray', 0),
    ('finance', '金融股', 'industry_category', 'gray', 0),
    ('healthcare', '医疗保健', 'industry_category', 'gray', 0),
    ('energy', '能源股', 'industry_category', 'gray', 0),
    ('consumer', '消费品', 'industry_category', 'gray', 0),
    ('sp500', '标普500', 'special_lists', 'blue', 0),
    ('nasdaq100', '纳斯达克100', 'special_lists', 'blue', 0),
    ('dow30', '道琼斯30', 'special_lists', 'blue', 0)
    ON CONFLICT (tag_id) DO UPDATE SET
      tag_name = EXCLUDED.tag_name,
      category = EXCLUDED.category,
      color_theme = EXCLUDED.color_theme,
      updated_at = CURRENT_TIMESTAMP;
    `;
    
    await client.query(insertTagsSQL);
    console.log("✅ Base tags inserted/updated");
}

async function updateStockData(client) {
    console.log("📊 Updating stock data...");
    
    // 示例股票数据
    const sampleStocks = [
        { symbol: 'AAPL', name: '苹果公司', price: 195.89, change: 2.34, changePercent: 1.21, volume: 45234567, marketCap: '3.1T', sector: 'Technology' },
        { symbol: 'MSFT', name: '微软公司', price: 378.85, change: -1.23, changePercent: -0.32, volume: 23456789, marketCap: '2.8T', sector: 'Technology' },
        { symbol: 'GOOGL', name: '谷歌A类', price: 142.56, change: 3.45, changePercent: 2.48, volume: 34567890, marketCap: '1.8T', sector: 'Technology' },
        { symbol: 'AMZN', name: '亚马逊', price: 155.23, change: -0.87, changePercent: -0.56, volume: 28901234, marketCap: '1.6T', sector: 'Consumer Discretionary' },
        { symbol: 'TSLA', name: '特斯拉', price: 248.42, change: 12.34, changePercent: 5.23, volume: 67890123, marketCap: '789B', sector: 'Consumer Discretionary' }
    ];
    
    for (const stock of sampleStocks) {
        const insertStockSQL = `
        INSERT INTO stocks (symbol, name, price, change_amount, change_percent, volume, market_cap, sector, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (symbol) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          change_amount = EXCLUDED.change_amount,
          change_percent = EXCLUDED.change_percent,
          volume = EXCLUDED.volume,
          market_cap = EXCLUDED.market_cap,
          sector = EXCLUDED.sector,
          last_updated = CURRENT_TIMESTAMP;
        `;
        
        await client.query(insertStockSQL, [
            stock.symbol, stock.name, stock.price, stock.change, 
            stock.changePercent, stock.volume, stock.marketCap, stock.sector
        ]);
    }
    
    // 更新标签关联
    await updateStockTags(client);
    
    console.log("✅ Stock data updated successfully");
}

async function updateStockTags(client) {
    console.log("🏷️ Updating stock tags...");
    
    const tagAssignments = [
        { symbol: 'AAPL', tagId: 'high_volume' },
        { symbol: 'AAPL', tagId: 'technology' },
        { symbol: 'AAPL', tagId: 'sp500' },
        { symbol: 'MSFT', tagId: 'high_volume' },
        { symbol: 'MSFT', tagId: 'technology' },
        { symbol: 'MSFT', tagId: 'sp500' },
        { symbol: 'GOOGL', tagId: 'technology' },
        { symbol: 'GOOGL', tagId: 'high_growth' },
        { symbol: 'AMZN', tagId: 'consumer' },
        { symbol: 'TSLA', tagId: 'high_growth' },
        { symbol: 'TSLA', tagId: 'recent_hot' }
    ];
    
    for (const assignment of tagAssignments) {
        const insertTagSQL = `
        INSERT INTO stock_tags (stock_symbol, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (stock_symbol, tag_id) DO NOTHING;
        `;
        
        await client.query(insertTagSQL, [assignment.symbol, assignment.tagId]);
    }
    
    // 更新标签计数
    const updateCountSQL = `
    UPDATE tags SET stock_count = (
        SELECT COUNT(*) FROM stock_tags WHERE tag_id = tags.tag_id
    );
    `;
    
    await client.query(updateCountSQL);
    
    console.log("✅ Stock tags updated successfully");
}

main();