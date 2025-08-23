// 验证数据库字段状态
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function main() {
    console.log("🔍 验证数据库字段状态...");
    
    const client = await pool.connect();
    try {
        // 检查表结构
        console.log("\n📋 检查 stocks 表结构:");
        const { rows: columns } = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'stocks' 
            AND column_name IN ('volume', 'turnover', 'dividend_yield', 'market_status')
            ORDER BY column_name
        `);
        
        columns.forEach(col => {
            console.log(`   ✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // 检查数据状态
        console.log("\n📊 检查字段数据状态:");
        const { rows: stats } = await client.query(`
            SELECT 
                COUNT(*) as total_stocks,
                COUNT(volume) as volume_filled,
                COUNT(turnover) as turnover_filled,
                COUNT(dividend_yield) as dividend_yield_filled,
                COUNT(market_status) as market_status_filled
            FROM stocks
        `);
        
        const stat = stats[0];
        console.log(`   📈 总股票数: ${stat.total_stocks}`);
        console.log(`   📊 volume 有数据: ${stat.volume_filled} (${(stat.volume_filled/stat.total_stocks*100).toFixed(1)}%)`);
        console.log(`   💰 turnover 有数据: ${stat.turnover_filled} (${(stat.turnover_filled/stat.total_stocks*100).toFixed(1)}%)`);
        console.log(`   💵 dividend_yield 有数据: ${stat.dividend_yield_filled} (${(stat.dividend_yield_filled/stat.total_stocks*100).toFixed(1)}%)`);
        console.log(`   🏪 market_status 有数据: ${stat.market_status_filled} (${(stat.market_status_filled/stat.total_stocks*100).toFixed(1)}%)`);
        
        // 显示样本数据
        console.log("\n🔍 样本数据 (前5个股票):");
        const { rows: samples } = await client.query(`
            SELECT ticker, volume, turnover, dividend_yield, market_status, last_updated
            FROM stocks 
            ORDER BY ticker 
            LIMIT 5
        `);
        
        samples.forEach(stock => {
            console.log(`   ${stock.ticker}: vol=${stock.volume}, turnover=${stock.turnover}, div_yield=${stock.dividend_yield}, status=${stock.market_status}`);
        });
        
        // 检查最近更新的数据
        console.log("\n⏰ 最近更新的股票 (按更新时间排序):");
        const { rows: recent } = await client.query(`
            SELECT ticker, volume, turnover, dividend_yield, market_status, last_updated
            FROM stocks 
            WHERE last_updated IS NOT NULL
            ORDER BY last_updated DESC 
            LIMIT 3
        `);
        
        recent.forEach(stock => {
            console.log(`   ${stock.ticker}: vol=${stock.volume}, turnover=${stock.turnover}, div_yield=${stock.dividend_yield}, status=${stock.market_status} (${stock.last_updated})`);
        });
        
    } catch (error) {
        console.error(`❌ 验证失败:`, error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);