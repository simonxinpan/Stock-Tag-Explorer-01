// /_scripts/comprehensive-tag-assignment.js
// 为所有标签分配股票数据的综合脚本

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 综合的标签分配规则
const comprehensiveTagAssignments = [
    // 标普500成分股
    { ticker: 'AAPL', tagName: '标普500' },
    { ticker: 'MSFT', tagName: '标普500' },
    { ticker: 'GOOGL', tagName: '标普500' },
    { ticker: 'AMZN', tagName: '标普500' },
    { ticker: 'NVDA', tagName: '标普500' },
    { ticker: 'META', tagName: '标普500' },
    { ticker: 'TSLA', tagName: '标普500' },
    { ticker: 'BRK.B', tagName: '标普500' },
    { ticker: 'UNH', tagName: '标普500' },
    { ticker: 'JNJ', tagName: '标普500' },
    { ticker: 'XOM', tagName: '标普500' },
    { ticker: 'JPM', tagName: '标普500' },
    { ticker: 'V', tagName: '标普500' },
    { ticker: 'PG', tagName: '标普500' },
    { ticker: 'HD', tagName: '标普500' },
    
    // 科技股
    { ticker: 'AAPL', tagName: '科技股' },
    { ticker: 'MSFT', tagName: '科技股' },
    { ticker: 'GOOGL', tagName: '科技股' },
    { ticker: 'META', tagName: '科技股' },
    { ticker: 'NVDA', tagName: '科技股' },
    { ticker: 'ADBE', tagName: '科技股' },
    { ticker: 'CRM', tagName: '科技股' },
    { ticker: 'ORCL', tagName: '科技股' },
    { ticker: 'INTC', tagName: '科技股' },
    { ticker: 'AMD', tagName: '科技股' },
    { ticker: 'QCOM', tagName: '科技股' },
    { ticker: 'CSCO', tagName: '科技股' },
    
    // 金融股
    { ticker: 'JPM', tagName: '金融股' },
    { ticker: 'BAC', tagName: '金融股' },
    { ticker: 'WFC', tagName: '金融股' },
    { ticker: 'GS', tagName: '金融股' },
    { ticker: 'MS', tagName: '金融股' },
    { ticker: 'C', tagName: '金融股' },
    { ticker: 'AXP', tagName: '金融股' },
    { ticker: 'BLK', tagName: '金融股' },
    { ticker: 'SCHW', tagName: '金融股' },
    { ticker: 'USB', tagName: '金融股' },
    
    // 医疗保健
    { ticker: 'JNJ', tagName: '医疗保健' },
    { ticker: 'PFE', tagName: '医疗保健' },
    { ticker: 'UNH', tagName: '医疗保健' },
    { ticker: 'ABBV', tagName: '医疗保健' },
    { ticker: 'MRK', tagName: '医疗保健' },
    { ticker: 'TMO', tagName: '医疗保健' },
    { ticker: 'ABT', tagName: '医疗保健' },
    { ticker: 'DHR', tagName: '医疗保健' },
    { ticker: 'BMY', tagName: '医疗保健' },
    { ticker: 'AMGN', tagName: '医疗保健' },
    
    // 超大盘股 (市值 > 2000亿)
    { ticker: 'AAPL', tagName: '超大盘股' },
    { ticker: 'MSFT', tagName: '超大盘股' },
    { ticker: 'GOOGL', tagName: '超大盘股' },
    { ticker: 'AMZN', tagName: '超大盘股' },
    { ticker: 'NVDA', tagName: '超大盘股' },
    { ticker: 'META', tagName: '超大盘股' },
    { ticker: 'TSLA', tagName: '超大盘股' },
    { ticker: 'BRK.B', tagName: '超大盘股' },
    { ticker: 'UNH', tagName: '超大盘股' },
    { ticker: 'JNJ', tagName: '超大盘股' },
    
    // 大盘股 (市值 100-2000亿)
    { ticker: 'XOM', tagName: '大盘股' },
    { ticker: 'JPM', tagName: '大盘股' },
    { ticker: 'V', tagName: '大盘股' },
    { ticker: 'PG', tagName: '大盘股' },
    { ticker: 'HD', tagName: '大盘股' },
    { ticker: 'CVX', tagName: '大盘股' },
    { ticker: 'MA', tagName: '大盘股' },
    { ticker: 'BAC', tagName: '大盘股' },
    { ticker: 'ABBV', tagName: '大盘股' },
    { ticker: 'PFE', tagName: '大盘股' },
    
    // 高ROE股票
    { ticker: 'AAPL', tagName: '高ROE' },
    { ticker: 'MSFT', tagName: '高ROE' },
    { ticker: 'GOOGL', tagName: '高ROE' },
    { ticker: 'META', tagName: '高ROE' },
    { ticker: 'NVDA', tagName: '高ROE' },
    { ticker: 'MA', tagName: '高ROE' },
    { ticker: 'V', tagName: '高ROE' },
    { ticker: 'ADBE', tagName: '高ROE' },
    { ticker: 'CRM', tagName: '高ROE' },
    { ticker: 'ORCL', tagName: '高ROE' },
    
    // 强势股
    { ticker: 'NVDA', tagName: '强势股' },
    { ticker: 'TSLA', tagName: '强势股' },
    { ticker: 'AMD', tagName: '强势股' },
    { ticker: 'AVGO', tagName: '强势股' },
    { ticker: 'NFLX', tagName: '强势股' },
    { ticker: 'ADBE', tagName: '强势股' },
    { ticker: 'CRM', tagName: '强势股' },
    { ticker: 'GOOGL', tagName: '强势股' },
    { ticker: 'META', tagName: '强势股' },
    { ticker: 'AAPL', tagName: '强势股' },
    
    // 高分红股票
    { ticker: 'T', tagName: '高分红' },
    { ticker: 'VZ', tagName: '高分红' },
    { ticker: 'XOM', tagName: '高分红' },
    { ticker: 'CVX', tagName: '高分红' },
    { ticker: 'JNJ', tagName: '高分红' },
    { ticker: 'PG', tagName: '高分红' },
    { ticker: 'KO', tagName: '高分红' },
    { ticker: 'PEP', tagName: '高分红' },
    { ticker: 'MO', tagName: '高分红' },
    { ticker: 'PM', tagName: '高分红' },
    
    // 低估值股票
    { ticker: 'BAC', tagName: '低估值' },
    { ticker: 'WFC', tagName: '低估值' },
    { ticker: 'JPM', tagName: '低估值' },
    { ticker: 'XOM', tagName: '低估值' },
    { ticker: 'CVX', tagName: '低估值' },
    { ticker: 'T', tagName: '低估值' },
    { ticker: 'VZ', tagName: '低估值' },
    { ticker: 'IBM', tagName: '低估值' },
    { ticker: 'INTC', tagName: '低估值' },
    { ticker: 'F', tagName: '低估值' },
    
    // 高估值股票
    { ticker: 'TSLA', tagName: '高估值' },
    { ticker: 'NVDA', tagName: '高估值' },
    { ticker: 'NFLX', tagName: '高估值' },
    { ticker: 'AMZN', tagName: '高估值' },
    { ticker: 'CRM', tagName: '高估值' },
    { ticker: 'ADBE', tagName: '高估值' },
    { ticker: 'SHOP', tagName: '高估值' },
    { ticker: 'ZM', tagName: '高估值' },
    { ticker: 'ROKU', tagName: '高估值' },
    { ticker: 'SNOW', tagName: '高估值' }
];

// 根据标签名称获取标签ID
async function getTagIdByName(client, tagName) {
    const result = await client.query(
        'SELECT id FROM tags WHERE name = $1',
        [tagName]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

// 检查股票是否存在
async function checkStockExists(client, ticker) {
    const result = await client.query(
        'SELECT ticker FROM stocks WHERE ticker = $1',
        [ticker]
    );
    return result.rows.length > 0;
}

// 添加股票到标签
async function addStockToTag(client, ticker, tagId) {
    try {
        await client.query(
            `INSERT INTO stock_tags (stock_ticker, tag_id) 
             VALUES ($1, $2) 
             ON CONFLICT (stock_ticker, tag_id) DO NOTHING`,
            [ticker, tagId]
        );
        return true;
    } catch (error) {
        console.error(`❌ Error adding ${ticker} to tag ${tagId}:`, error.message);
        return false;
    }
}

// 执行综合标签分配
async function executeComprehensiveTagAssignment(client) {
    console.log('🚀 开始执行综合标签分配...');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const assignment of comprehensiveTagAssignments) {
        const { ticker, tagName } = assignment;
        
        try {
            // 检查股票是否存在
            const stockExists = await checkStockExists(client, ticker);
            if (!stockExists) {
                console.log(`⚠️ 股票 ${ticker} 不存在，跳过`);
                skipCount++;
                continue;
            }
            
            // 获取标签ID
            const tagId = await getTagIdByName(client, tagName);
            if (!tagId) {
                console.log(`⚠️ 标签 "${tagName}" 不存在，跳过`);
                skipCount++;
                continue;
            }
            
            // 添加股票到标签
            const success = await addStockToTag(client, ticker, tagId);
            if (success) {
                successCount++;
                console.log(`✅ ${ticker} -> ${tagName}`);
            } else {
                errorCount++;
            }
            
        } catch (error) {
            console.error(`❌ 处理 ${ticker} -> ${tagName} 时出错:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`\n📊 分配结果统计:`);
    console.log(`✅ 成功分配: ${successCount}`);
    console.log(`⚠️ 跳过: ${skipCount}`);
    console.log(`❌ 错误: ${errorCount}`);
    console.log(`📈 总处理数: ${comprehensiveTagAssignments.length}`);
}

// 显示标签统计
async function showTagStats(client) {
    console.log('\n📊 当前标签统计:');
    
    const query = `
        SELECT 
            t.name,
            t.type,
            COUNT(st.stock_ticker) as stock_count
        FROM tags t
        LEFT JOIN stock_tags st ON t.id = st.tag_id
        GROUP BY t.id, t.name, t.type
        ORDER BY stock_count DESC, t.name
    `;
    
    const result = await client.query(query);
    
    console.log('\n标签名称\t\t股票数量\t类型');
    console.log('----------------------------------------');
    
    for (const row of result.rows) {
        const nameDisplay = row.name.padEnd(16);
        const countDisplay = row.stock_count.toString().padStart(6);
        console.log(`${nameDisplay}\t${countDisplay}\t\t${row.type || 'N/A'}`);
    }
    
    const emptyTags = result.rows.filter(row => row.stock_count == 0);
    console.log(`\n📈 总标签数: ${result.rows.length}`);
    console.log(`🎯 有股票的标签: ${result.rows.length - emptyTags.length}`);
    console.log(`⚠️ 空标签数: ${emptyTags.length}`);
}

async function main() {
    console.log('🚀 开始综合标签分配任务...');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 执行标签分配
        await executeComprehensiveTagAssignment(client);
        
        // 显示统计信息
        await showTagStats(client);
        
        await client.query('COMMIT');
        console.log('\n✅ 综合标签分配完成!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 分配过程中出现错误:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeComprehensiveTagAssignment, showTagStats };