import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function analyzeMissingFields() {
    const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!dbUrl || dbUrl.includes('your-database-url')) {
        console.log("===== 测试模式 - 无有效数据库连接 =====");
        console.log("⚠️ 要分析真实数据，请设置 DATABASE_URL 环境变量");
        return;
    }

    let client;
    try {
        client = await pool.connect();
        console.log("✅ 数据库连接成功");

        // 检查总股票数量
        const { rows: [totalCount] } = await client.query('SELECT COUNT(*) as count FROM stocks');
        console.log(`📊 总股票数量: ${totalCount.count}`);

        // 分析各字段的空值情况
        const fieldsToCheck = [
            'last_price',
            'change_amount', 
            'change_percent',
            'week_52_high',
            'week_52_low',
            'market_cap',
            'pe_ttm',
            'roe_ttm',
            'name_zh',
            'name_en',
            'sector_zh',
            'sector_en',
            'logo'
        ];

        console.log("\n📋 字段空值分析:");
        console.log("字段名称".padEnd(20) + "空值数量".padEnd(10) + "空值比例".padEnd(10) + "负责工作流");
        console.log("-".repeat(70));

        const workflowMapping = {
            'last_price': 'update-market-data',
            'change_amount': 'update-market-data',
            'change_percent': 'update-market-data', 
            'week_52_high': 'update-market-data',
            'week_52_low': 'update-market-data',
            'market_cap': 'update-hot-financials / update-all-financials-and-tags',
            'pe_ttm': 'update-hot-financials / update-all-financials-and-tags',
            'roe_ttm': 'update-hot-financials / update-all-financials-and-tags',
            'name_zh': 'update-company-profiles',
            'name_en': 'update-company-profiles',
            'sector_zh': 'update-company-profiles',
            'sector_en': 'update-company-profiles',
            'logo': 'update-company-profiles'
        };

        for (const field of fieldsToCheck) {
            const { rows: [nullCount] } = await client.query(
                `SELECT COUNT(*) as count FROM stocks WHERE ${field} IS NULL`
            );
            const percentage = ((nullCount.count / totalCount.count) * 100).toFixed(1);
            const workflow = workflowMapping[field] || '未知';
            
            console.log(
                field.padEnd(20) + 
                nullCount.count.toString().padEnd(10) + 
                `${percentage}%`.padEnd(10) + 
                workflow
            );
        }

        // 检查具体的空值记录样本
        console.log("\n🔍 空值记录样本分析:");
        
        // 市场数据空值样本
        const { rows: marketDataSamples } = await client.query(`
            SELECT ticker, last_price, change_amount, change_percent, week_52_high, week_52_low
            FROM stocks 
            WHERE last_price IS NULL OR change_amount IS NULL OR change_percent IS NULL
            LIMIT 5
        `);
        
        if (marketDataSamples.length > 0) {
            console.log("\n📈 市场数据空值样本:");
            marketDataSamples.forEach(stock => {
                console.log(`${stock.ticker}: price=${stock.last_price}, change=${stock.change_amount}, percent=${stock.change_percent}`);
            });
        }

        // 财务数据空值样本
        const { rows: financialSamples } = await client.query(`
            SELECT ticker, market_cap, pe_ttm, roe_ttm
            FROM stocks 
            WHERE market_cap IS NULL OR pe_ttm IS NULL OR roe_ttm IS NULL
            LIMIT 5
        `);
        
        if (financialSamples.length > 0) {
            console.log("\n💰 财务数据空值样本:");
            financialSamples.forEach(stock => {
                console.log(`${stock.ticker}: cap=${stock.market_cap}, pe=${stock.pe_ttm}, roe=${stock.roe_ttm}`);
            });
        }

        // 公司信息空值样本
        const { rows: profileSamples } = await client.query(`
            SELECT ticker, name_zh, name_en, sector_zh, sector_en, logo
            FROM stocks 
            WHERE name_zh IS NULL OR sector_zh IS NULL OR logo IS NULL
            LIMIT 5
        `);
        
        if (profileSamples.length > 0) {
            console.log("\n🏢 公司信息空值样本:");
            profileSamples.forEach(stock => {
                console.log(`${stock.ticker}: name_zh=${stock.name_zh}, sector_zh=${stock.sector_zh}, logo=${stock.logo ? 'YES' : 'NO'}`);
            });
        }

        // 数据源分析
        console.log("\n📡 数据源分析:");
        console.log("字段组".padEnd(25) + "数据源".padEnd(20) + "API端点");
        console.log("-".repeat(70));
        console.log("市场数据".padEnd(25) + "Polygon".padEnd(20) + "/v2/snapshot/locale/us/markets/stocks/tickers");
        console.log("财务指标".padEnd(25) + "Finnhub".padEnd(20) + "/stock/metric");
        console.log("公司资料".padEnd(25) + "Finnhub/Polygon".padEnd(20) + "/stock/profile2 或 /v3/reference/tickers");

    } catch (error) {
        console.error("❌ 分析失败:", error.message);
    } finally {
        if (client) {
            client.release();
        }
        if (pool) {
            await pool.end();
        }
    }
}

analyzeMissingFields();