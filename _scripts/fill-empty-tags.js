// /_scripts/fill-empty-tags.mjs
// 为所有显示0只股票的标签添加股票数据

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 标签到股票的映射规则
const tagStockMappings = {
    // 行业分类标签
    '科技股': ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'NVDA', 'ADBE', 'CRM', 'ORCL', 'INTC', 'AMD', 'QCOM'],
    '金融股': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK', 'SCHW', 'USB'],
    '医疗保健': ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN'],
    '非必需消费品': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'LOW', 'BKNG', 'CMG'],
    '日常消费品': ['PG', 'KO', 'PEP', 'WMT', 'COST', 'CL', 'KMB', 'GIS', 'K', 'HSY'],
    '工业股': ['BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT', 'DE', 'EMR'],
    '能源股': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'OXY', 'HAL'],
    '公用事业': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED'],
    '房地产': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'WELL', 'SPG', 'O', 'SBAC', 'DLR'],
    '原材料': ['LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PPG', 'IFF'],
    '通讯服务': ['GOOGL', 'META', 'DIS', 'NFLX', 'CMCSA', 'VZ', 'T', 'CHTR', 'TMUS', 'ATVI'],
    
    // 市值分类标签
    '超大盘股': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ'],
    '大盘股': ['XOM', 'JPM', 'V', 'PG', 'HD', 'CVX', 'MA', 'BAC', 'ABBV', 'PFE', 'AVGO', 'COST', 'DIS', 'KO'],
    '中盘股': ['ADBE', 'CRM', 'PYPL', 'INTC', 'AMD', 'QCOM', 'TXN', 'ORCL', 'ACN', 'CSCO'],
    '小盘股': ['ETSY', 'ROKU', 'PINS', 'SNAP', 'TWTR', 'SQ', 'SHOP', 'ZM', 'DOCU', 'CRWD'],
    
    // 估值标签
    '低估值': ['BAC', 'WFC', 'JPM', 'XOM', 'CVX', 'T', 'VZ', 'IBM', 'INTC', 'F'],
    '高估值': ['TSLA', 'NVDA', 'NFLX', 'AMZN', 'CRM', 'ADBE', 'SHOP', 'ZM', 'ROKU', 'SNOW'],
    
    // 盈利能力标签
    '高ROE': ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'MA', 'V', 'ADBE', 'CRM', 'ORCL'],
    '低ROE': ['GE', 'F', 'GM', 'AAL', 'DAL', 'UAL', 'CCL', 'NCLH', 'RCL', 'MGM'],
    
    // 表现标签
    '强势股': ['NVDA', 'TSLA', 'AMD', 'AVGO', 'NFLX', 'ADBE', 'CRM', 'GOOGL', 'META', 'AAPL'],
    '弱势股': ['INTC', 'IBM', 'GE', 'F', 'T', 'VZ', 'XOM', 'CVX', 'BA', 'MMM'],
    
    // 分红标签
    '高分红': ['T', 'VZ', 'XOM', 'CVX', 'JNJ', 'PG', 'KO', 'PEP', 'MO', 'PM'],
    
    // 特殊名单
    '标普500': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ', 'XOM', 'JPM', 'V', 'PG', 'HD'],
    
    // 市场表现标签
    '52周高点': ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'TSLA', 'AMZN', 'NFLX', 'ADBE', 'CRM'],
    '52周低点': ['INTC', 'IBM', 'GE', 'F', 'NFLX', 'PYPL', 'SNAP', 'ROKU', 'PINS', 'ZM'],
    '高成长': ['NVDA', 'TSLA', 'AMD', 'GOOGL', 'META', 'AMZN', 'NFLX', 'ADBE', 'CRM', 'AVGO'],
    '低波动': ['JNJ', 'PG', 'KO', 'PEP', 'WMT', 'COST', 'UNH', 'V', 'MA', 'MSFT'],
    '高分红': ['T', 'VZ', 'XOM', 'CVX', 'JNJ', 'PG', 'KO', 'PEP', 'MO', 'PM'],
    '近期热度': ['NVDA', 'TSLA', 'AMD', 'GOOGL', 'META', 'AAPL', 'MSFT', 'AMZN', 'NFLX', 'ADBE']
};

// 获取所有标签及其当前股票数量
async function getTagsWithStockCount(client) {
    const query = `
        SELECT 
            t.id,
            t.name,
            t.type,
            COUNT(st.stock_ticker) as current_stock_count
        FROM tags t
        LEFT JOIN stock_tags st ON t.id = st.tag_id
        GROUP BY t.id, t.name, t.type
        ORDER BY current_stock_count ASC, t.name
    `;
    
    const result = await client.query(query);
    return result.rows;
}

// 检查股票是否存在于数据库中
async function checkStockExists(client, ticker) {
    const result = await client.query(
        'SELECT ticker FROM stocks WHERE ticker = $1',
        [ticker]
    );
    return result.rows.length > 0;
}

// 为标签添加股票
async function addStockToTag(client, tagId, ticker) {
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

// 为空标签填充股票数据
async function fillEmptyTags(client) {
    console.log('🔍 检查需要填充的标签...');
    
    const tags = await getTagsWithStockCount(client);
    const emptyTags = tags.filter(tag => tag.current_stock_count == 0);
    
    console.log(`📊 找到 ${emptyTags.length} 个空标签需要填充`);
    
    if (emptyTags.length === 0) {
        console.log('✨ 所有标签都已有股票数据');
        return;
    }
    
    let totalAdded = 0;
    
    for (const tag of emptyTags) {
        console.log(`\n🏷️ 处理标签: ${tag.name} (${tag.type})`);
        
        const stockList = tagStockMappings[tag.name];
        
        if (!stockList) {
            console.log(`⚠️ 未找到标签 "${tag.name}" 的股票映射规则`);
            continue;
        }
        
        let addedCount = 0;
        
        for (const ticker of stockList) {
            // 检查股票是否存在
            const stockExists = await checkStockExists(client, ticker);
            
            if (!stockExists) {
                console.log(`⚠️ 股票 ${ticker} 不存在于数据库中，跳过`);
                continue;
            }
            
            // 添加股票到标签
            const success = await addStockToTag(client, tag.id, ticker);
            
            if (success) {
                addedCount++;
                totalAdded++;
                console.log(`✅ 添加 ${ticker} 到标签 "${tag.name}"`);
            }
        }
        
        console.log(`📈 标签 "${tag.name}" 添加了 ${addedCount} 只股票`);
    }
    
    console.log(`\n🎉 总共为空标签添加了 ${totalAdded} 个股票关联`);
}

// 显示填充后的统计信息
async function showFinalStats(client) {
    console.log('\n📊 填充后的标签统计:');
    
    const tags = await getTagsWithStockCount(client);
    
    console.log('\n标签名称\t\t股票数量\t类型');
    console.log('----------------------------------------');
    
    for (const tag of tags) {
        const nameDisplay = tag.name.padEnd(16);
        const countDisplay = tag.current_stock_count.toString().padStart(6);
        console.log(`${nameDisplay}\t${countDisplay}\t\t${tag.type}`);
    }
    
    const emptyTags = tags.filter(tag => tag.current_stock_count == 0);
    console.log(`\n📈 总标签数: ${tags.length}`);
    console.log(`🎯 有股票的标签: ${tags.length - emptyTags.length}`);
    console.log(`⚠️ 仍为空的标签: ${emptyTags.length}`);
}

async function main() {
    console.log('🚀 开始为空标签填充股票数据...');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 填充空标签
        await fillEmptyTags(client);
        
        // 显示最终统计
        await showFinalStats(client);
        
        await client.query('COMMIT');
        console.log('\n✅ 空标签填充完成!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ 填充过程中出现错误:', error);
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

module.exports = { fillEmptyTags, getTagsWithStockCount };