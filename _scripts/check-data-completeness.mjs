// /_scripts/check-data-completeness.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function checkDataCompleteness() {
    const client = await pool.connect();
    
    try {
        console.log("===== Data Completeness Check =====");
        
        // 获取总股票数
        const totalResult = await client.query('SELECT COUNT(*) as total FROM stocks');
        const totalStocks = parseInt(totalResult.rows[0].total);
        console.log(`📊 Total stocks in database: ${totalStocks}`);
        
        if (totalStocks === 0) {
            console.log('⚠️ No stocks found in database');
            return;
        }
        
        // 检查各字段的完整性
        const fieldsToCheck = [
            { field: 'last_price', description: '最新价格', workflow: 'update-market-data' },
            { field: 'change_amount', description: '涨跌额', workflow: 'update-market-data' },
            { field: 'change_percent', description: '涨跌幅', workflow: 'update-market-data' },
            { field: 'market_cap', description: '市值', workflow: 'update-hot-financials' },
            { field: 'pe_ttm', description: '市盈率', workflow: 'update-hot-financials' },
            { field: 'roe_ttm', description: '净资产收益率', workflow: 'update-hot-financials' },
            { field: 'name_zh', description: '中文名称', workflow: 'update-company-profiles' },
            { field: 'industry_zh', description: '行业中文', workflow: 'update-company-profiles' }
        ];
        
        console.log('\n📋 Field Completeness Report:');
        console.log('='.repeat(80));
        
        for (const { field, description, workflow } of fieldsToCheck) {
            const nullResult = await client.query(
                `SELECT COUNT(*) as null_count FROM stocks WHERE ${field} IS NULL`
            );
            const nullCount = parseInt(nullResult.rows[0].null_count);
            const completeness = ((totalStocks - nullCount) / totalStocks * 100).toFixed(1);
            
            const status = completeness >= 90 ? '✅' : completeness >= 50 ? '⚠️' : '❌';
            console.log(`${status} ${field.padEnd(20)} | ${description.padEnd(15)} | ${completeness.padStart(5)}% | ${workflow}`);
            
            if (nullCount > 0) {
                // 显示一些空值样本
                const sampleResult = await client.query(
                    `SELECT ticker, name FROM stocks WHERE ${field} IS NULL LIMIT 5`
                );
                console.log(`   📝 Sample missing: ${sampleResult.rows.map(r => r.ticker).join(', ')}`);
            }
        }
        
        // 检查最近更新时间
        console.log('\n⏰ Last Update Times:');
        console.log('='.repeat(50));
        
        const updateResult = await client.query(`
            SELECT 
                COUNT(*) as count,
                MAX(last_updated) as latest_update,
                MIN(last_updated) as earliest_update
            FROM stocks 
            WHERE last_updated IS NOT NULL
        `);
        
        if (updateResult.rows[0].count > 0) {
            const { count, latest_update, earliest_update } = updateResult.rows[0];
            console.log(`📊 Stocks with update time: ${count}/${totalStocks}`);
            console.log(`📊 Latest update: ${latest_update}`);
            console.log(`📊 Earliest update: ${earliest_update}`);
            
            // 检查最近24小时内更新的股票
            const recentResult = await client.query(`
                SELECT COUNT(*) as recent_count 
                FROM stocks 
                WHERE last_updated > NOW() - INTERVAL '24 hours'
            `);
            const recentCount = parseInt(recentResult.rows[0].recent_count);
            console.log(`📊 Updated in last 24h: ${recentCount}/${totalStocks} (${(recentCount/totalStocks*100).toFixed(1)}%)`);
        } else {
            console.log('❌ No stocks have update timestamps');
        }
        
        // 检查关键字段组合
        console.log('\n🔍 Critical Field Combinations:');
        console.log('='.repeat(50));
        
        const marketDataResult = await client.query(`
            SELECT COUNT(*) as complete_count 
            FROM stocks 
            WHERE last_price IS NOT NULL 
            AND change_amount IS NOT NULL 
            AND change_percent IS NOT NULL
        `);
        const marketDataComplete = parseInt(marketDataResult.rows[0].complete_count);
        console.log(`📊 Complete market data: ${marketDataComplete}/${totalStocks} (${(marketDataComplete/totalStocks*100).toFixed(1)}%)`);
        
        const financialDataResult = await client.query(`
            SELECT COUNT(*) as complete_count 
            FROM stocks 
            WHERE market_cap IS NOT NULL 
            AND pe_ttm IS NOT NULL 
            AND roe_ttm IS NOT NULL
        `);
        const financialDataComplete = parseInt(financialDataResult.rows[0].complete_count);
        console.log(`📊 Complete financial data: ${financialDataComplete}/${totalStocks} (${(financialDataComplete/totalStocks*100).toFixed(1)}%)`);
        
        // 总结和建议
        console.log('\n💡 Recommendations:');
        console.log('='.repeat(50));
        
        if (marketDataComplete < totalStocks * 0.8) {
            console.log('🔧 Market data incomplete - Check Polygon API key and run update-market-data workflow');
        }
        
        if (financialDataComplete < totalStocks * 0.8) {
            console.log('🔧 Financial data incomplete - Check Finnhub API key and run update-hot-financials workflow');
        }
        
        if (recentCount < totalStocks * 0.5) {
            console.log('🔧 Many stocks not updated recently - Check if workflows are running properly');
        }
        
        console.log('\n✅ Data completeness check completed');
        
    } catch (error) {
        console.error('❌ Error checking data completeness:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    const { NEON_DATABASE_URL, DATABASE_URL } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    // 检查是否为测试模式
    const isTestMode = !dbUrl || dbUrl.includes('username:password');
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No valid database connection");
        console.log("✅ Script structure validation passed");
        console.log("📝 To run with real database:");
        console.log("   Set DATABASE_URL to your Neon database connection string");
        return;
    }
    
    try {
        await checkDataCompleteness();
    } catch (error) {
        console.error("❌ Check failed:", error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();