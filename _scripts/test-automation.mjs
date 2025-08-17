// /_scripts/test-automation.mjs
// 测试所有自动化脚本的基本功能

import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 测试数据库连接
async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    
    if (!process.env.NEON_DATABASE_URL) {
        console.log('⚠️ NEON_DATABASE_URL not set - running in test mode');
        return false;
    }
    
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Database connection successful:', result.rows[0].current_time);
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// 测试 API 连接
async function testAPIConnections() {
    console.log('🔍 Testing API connections...');
    
    // 测试 Polygon API
    if (process.env.POLYGON_API_KEY) {
        try {
            const response = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apikey=${process.env.POLYGON_API_KEY}&limit=1`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                console.log('✅ Polygon API connection successful');
            } else {
                console.log('⚠️ Polygon API response:', data.status);
            }
        } catch (error) {
            console.error('❌ Polygon API connection failed:', error.message);
        }
    } else {
        console.log('⚠️ POLYGON_API_KEY not set');
    }
    
    // 测试 Finnhub API
    if (process.env.FINNHUB_API_KEY) {
        try {
            const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=AAPL&metric=all&token=${process.env.FINNHUB_API_KEY}`);
            const data = await response.json();
            
            if (!data.error) {
                console.log('✅ Finnhub API connection successful');
            } else {
                console.log('⚠️ Finnhub API error:', data.error);
            }
        } catch (error) {
            console.error('❌ Finnhub API connection failed:', error.message);
        }
    } else {
        console.log('⚠️ FINNHUB_API_KEY not set');
    }
}

// 测试表结构
async function testTableStructure() {
    console.log('🔍 Testing table structure...');
    
    if (!process.env.NEON_DATABASE_URL) {
        console.log('⚠️ Skipping table structure test - no database connection');
        return;
    }
    
    try {
        const client = await pool.connect();
        
        // 检查表是否存在
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('stocks', 'tags', 'stock_tags')
        `);
        
        const existingTables = tablesResult.rows.map(row => row.table_name);
        console.log('📋 Existing tables:', existingTables);
        
        // 检查 stocks 表结构
        if (existingTables.includes('stocks')) {
            const stocksColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'stocks'
                ORDER BY ordinal_position
            `);
            
            const requiredColumns = ['symbol', 'name', 'price', 'market_cap', 'roe_ttm', 'pe_ttm', 'pb_ratio', 'debt_to_equity', 'current_ratio'];
            const existingColumns = stocksColumns.rows.map(row => row.column_name);
            const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
            
            if (missingColumns.length === 0) {
                console.log('✅ Stocks table structure is complete');
            } else {
                console.log('⚠️ Missing columns in stocks table:', missingColumns);
            }
        }
        
        // 检查标签数量
        if (existingTables.includes('tags')) {
            const tagsCount = await client.query('SELECT COUNT(*) as count FROM tags');
            console.log(`📊 Tags count: ${tagsCount.rows[0].count}`);
            
            // 检查动态标签是否存在
            const dynamicTags = await client.query(`
                SELECT tag_id, category 
                FROM tags 
                WHERE category IN ('market_cap', 'valuation', 'performance', 'financial_health')
            `);
            console.log(`📊 Dynamic tags count: ${dynamicTags.rows.length}`);
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Table structure test failed:', error.message);
    }
}

// 测试脚本文件是否存在
async function testScriptFiles() {
    console.log('🔍 Testing script files...');
    
    const scripts = [
        '_scripts/update-database.mjs',
        '_scripts/update-market-data.mjs',
        '_scripts/update-hot-financials.mjs',
        '_scripts/update-all-financials-and-tags.mjs'
    ];
    
    for (const script of scripts) {
        try {
            const fs = await import('fs');
            if (fs.existsSync(script)) {
                console.log(`✅ ${script} exists`);
            } else {
                console.log(`❌ ${script} missing`);
            }
        } catch (error) {
            console.log(`❌ Error checking ${script}:`, error.message);
        }
    }
}

// 测试工作流文件是否存在
async function testWorkflowFiles() {
    console.log('🔍 Testing workflow files...');
    
    const workflows = [
        '.github/workflows/update-data.yml',
        '.github/workflows/update-market-data.yml',
        '.github/workflows/update-hot-financials.yml',
        '.github/workflows/update-all-daily.yml'
    ];
    
    for (const workflow of workflows) {
        try {
            const fs = await import('fs');
            if (fs.existsSync(workflow)) {
                console.log(`✅ ${workflow} exists`);
            } else {
                console.log(`❌ ${workflow} missing`);
            }
        } catch (error) {
            console.log(`❌ Error checking ${workflow}:`, error.message);
        }
    }
}

// 主测试函数
async function main() {
    console.log('===== 🧪 Automation System Test Suite =====\n');
    
    try {
        await testScriptFiles();
        console.log('');
        
        await testWorkflowFiles();
        console.log('');
        
        const dbConnected = await testDatabaseConnection();
        console.log('');
        
        await testAPIConnections();
        console.log('');
        
        if (dbConnected) {
            await testTableStructure();
        }
        
        console.log('\n===== 🎉 Test Suite Completed =====');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

main();