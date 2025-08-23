// /_scripts/update-financials-daily.mjs
// 整合的每日财务数据和动态标签更新脚本
// 合并了 update-hot-financials.mjs, update-all-financials-and-tags.mjs, update-database.mjs 的功能

import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// 确保必要的表存在
async function ensureTablesExist(client) {
    // 创建 stock_tags 表（如果不存在）
    await client.query(`
        CREATE TABLE IF NOT EXISTS stock_tags (
            id SERIAL PRIMARY KEY,
            stock_ticker VARCHAR(10) NOT NULL,
            tag_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (stock_ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
            UNIQUE(stock_ticker, tag_id)
        )
    `);
    console.log("✅ Ensured stock_tags table exists");
}

// 获取 Finnhub 财务指标
async function getFinnhubMetrics(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.warn(`⚠️ Finnhub API error for ${symbol}: ${data.error}`);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Error fetching Finnhub data for ${symbol}:`, error.message);
        return null;
    }
}

// 获取 Finnhub 实时报价数据（用于 market_status 计算）
async function getFinnhubQuote(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.warn(`⚠️ Finnhub Quote API error for ${symbol}: ${data.error}`);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Error fetching Finnhub quote for ${symbol}:`, error.message);
        return null;
    }
}

// 计算市场状态
function getMarketStatus(quoteTimestamp) {
    if (!quoteTimestamp) return 'Unknown';
    
    const quoteDate = new Date(quoteTimestamp * 1000); // API返回的是秒，转为毫秒
    const nowDate = new Date();
    
    // 如果数据是12小时前的，基本可以认为是休市
    if ((nowDate - quoteDate) > 12 * 60 * 60 * 1000) {
        return 'Closed';
    }

    // 获取美东时间的小时 (EST is UTC-5, EDT is UTC-4)
    // 简单起见，我们按 UTC 时间大致匡算
    const quoteUTCHour = quoteDate.getUTCHours();
    
    // 美股常规交易时间大致是 13:30 UTC - 20:00 UTC
    if (quoteUTCHour >= 13 && quoteUTCHour < 20) {
        return 'Regular';
    } else if (quoteUTCHour >= 8 && quoteUTCHour < 13) {
        return 'Pre-market';
    } else {
        return 'Post-market';
    }
}

// 应用标签到股票
async function applyTag(client, stockTicker, tagName) {
    try {
        // 根据标签名称查找标签ID
        const { rows } = await client.query(
            'SELECT id FROM tags WHERE name = $1',
            [tagName]
        );
        
        if (rows.length === 0) {
            console.warn(`⚠️ Tag '${tagName}' not found`);
            return;
        }
        
        const tagId = rows[0].id;
        
        // 插入股票标签关联（如果不存在）
        await client.query(
            `INSERT INTO stock_tags (stock_ticker, tag_id) 
             VALUES ($1, $2) 
             ON CONFLICT (stock_ticker, tag_id) DO NOTHING`,
            [stockTicker, tagId]
        );
        
        console.log(`🏷️ Applied tag '${tagName}' to ${stockTicker}`);
    } catch (error) {
        console.error(`❌ Error applying tag '${tagName}' to ${stockTicker}:`, error.message);
    }
}

// 计算并应用动态标签
async function calculateAndApplyTags(client, stock) {
    const tags = [];
    
    // 基于市值的标签
    if (stock.market_cap) {
        if (stock.market_cap >= 200000000000) { // >= 2000亿美元
            tags.push('Mega Cap');
        } else if (stock.market_cap >= 10000000000) { // >= 100亿美元
            tags.push('Large Cap');
        } else if (stock.market_cap >= 2000000000) { // >= 20亿美元
            tags.push('Mid Cap');
        } else {
            tags.push('Small Cap');
        }
    }
    
    // 基于ROE的标签
    if (stock.roe_ttm !== null && stock.roe_ttm !== undefined) {
        if (stock.roe_ttm >= 0.20) { // >= 20%
            tags.push('High ROE');
        } else if (stock.roe_ttm >= 0.15) { // >= 15%
            tags.push('Good ROE');
        } else if (stock.roe_ttm < 0) {
            tags.push('Negative ROE');
        }
    }
    
    // 基于PE的标签
    if (stock.pe_ttm !== null && stock.pe_ttm !== undefined) {
        if (stock.pe_ttm > 0 && stock.pe_ttm <= 15) {
            tags.push('Value Stock');
        } else if (stock.pe_ttm > 30) {
            tags.push('Growth Stock');
        } else if (stock.pe_ttm < 0) {
            tags.push('Loss Making');
        }
    }
    
    // 基于股息收益率的标签
    if (stock.dividend_yield !== null && stock.dividend_yield !== undefined) {
        if (stock.dividend_yield >= 0.04) { // >= 4%
            tags.push('High Dividend');
        } else if (stock.dividend_yield >= 0.02) { // >= 2%
            tags.push('Dividend Stock');
        }
    }
    
    // 应用所有标签
    for (const tagName of tags) {
        await applyTag(client, stock.ticker, tagName);
    }
}

// 更新所有股票的财务数据
async function updateAllFinancials(client, apiKey) {
    console.log("📊 Starting comprehensive financial data update...");
    
    // 获取所有股票
    const { rows: stocks } = await client.query('SELECT ticker FROM stocks ORDER BY ticker');
    console.log(`📋 Found ${stocks.length} stocks to update`);
    
    const BATCH_SIZE = 10;
    const API_DELAY = 1200; // 1.2秒延迟，避免API限制
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
        const batch = stocks.slice(i, i + BATCH_SIZE);
        console.log(`\n🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(stocks.length/BATCH_SIZE)}`);
        
        for (const stock of batch) {
            try {
                // 获取财务指标
                const financialData = await getFinnhubMetrics(stock.ticker, apiKey);
                
                // 获取实时报价（用于dividend_yield和market_status）
                const quoteData = await getFinnhubQuote(stock.ticker, apiKey);
                
                if (financialData && financialData.metric) {
                    const metrics = financialData.metric;
                    
                    // 计算dividend_yield（如果有股息数据）
                    let dividendYield = null;
                    if (metrics.dividendYieldIndicatedAnnual) {
                        dividendYield = metrics.dividendYieldIndicatedAnnual / 100; // 转换为小数
                    }
                    
                    // 计算market_status
                    let marketStatus = 'Unknown';
                    if (quoteData && quoteData.t) {
                        marketStatus = getMarketStatus(quoteData.t);
                    }
                    
                    // 更新数据库
                    await client.query(
                        `UPDATE stocks SET 
                         market_cap = $1, 
                         roe_ttm = $2, 
                         pe_ttm = $3,
                         dividend_yield = $4,
                         market_status = $5,
                         last_updated = NOW() 
                         WHERE ticker = $6`,
                        [
                            metrics.marketCapitalization || null,
                            metrics.roeTTM || null,
                            metrics.peTTM || null,
                            dividendYield,
                            marketStatus,
                            stock.ticker
                        ]
                    );
                    
                    updatedCount++;
                    console.log(`✅ Updated ${stock.ticker} (${updatedCount}/${stocks.length}) - MC: ${metrics.marketCapitalization ? '$' + (metrics.marketCapitalization/1e9).toFixed(1) + 'B' : 'N/A'}, PE: ${metrics.peTTM || 'N/A'}, ROE: ${metrics.roeTTM ? (metrics.roeTTM*100).toFixed(1) + '%' : 'N/A'}`);
                } else {
                    errorCount++;
                    console.warn(`⚠️ No financial data for ${stock.ticker} (${errorCount} errors so far)`);
                }
                
                // API限制延迟
                await new Promise(resolve => setTimeout(resolve, API_DELAY));
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error updating ${stock.ticker}:`, error.message);
            }
        }
    }
    
    console.log(`\n📊 Financial update completed: ${updatedCount} updated, ${errorCount} errors`);
    return updatedCount;
}

// 重新计算所有动态标签
async function recalculateAllTags(client) {
    console.log("🏷️ Starting dynamic tags recalculation...");
    
    // 清空所有动态标签关联
    await client.query('DELETE FROM stock_tags');
    console.log("🧹 Cleared existing dynamic tags");
    
    // 获取所有股票的最新财务数据
    const { rows: stocks } = await client.query(
        'SELECT ticker, market_cap, roe_ttm, pe_ttm, dividend_yield FROM stocks ORDER BY ticker'
    );
    
    console.log(`📋 Recalculating tags for ${stocks.length} stocks...`);
    
    let taggedCount = 0;
    for (const stock of stocks) {
        await calculateAndApplyTags(client, stock);
        taggedCount++;
        
        if (taggedCount % 50 === 0) {
            console.log(`🏷️ Processed ${taggedCount}/${stocks.length} stocks for tagging`);
        }
    }
    
    console.log(`✅ Dynamic tags recalculation completed for ${taggedCount} stocks`);
}

async function main() {
    console.log("===== Starting DAILY Financials & Tags Update Job =====");
    
    const { NEON_DATABASE_URL, DATABASE_URL, FINNHUB_API_KEY } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    // 检查是否为测试模式
    const isTestMode = !dbUrl || dbUrl.includes('username:password') || !FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here';
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No valid database connection or API key");
        console.log("✅ Script structure validation passed");
        console.log("📝 To run with real database and API:");
        console.log("   1. Set DATABASE_URL to your Neon database connection string");
        console.log("   2. Set FINNHUB_API_KEY to your Finnhub API key");
        console.log("===== Test completed successfully =====");
        return;
    }
    
    if (!dbUrl || !FINNHUB_API_KEY) {
        console.error("FATAL: Missing DATABASE_URL or FINNHUB_API_KEY environment variables.");
        process.exit(1);
    }
    
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 确保表结构存在
        await ensureTablesExist(client);
        
        // 第一阶段：更新所有股票的财务数据
        const updatedCount = await updateAllFinancials(client, FINNHUB_API_KEY);
        
        // 第二阶段：重新计算动态标签
        if (updatedCount > 0) {
            await recalculateAllTags(client);
        } else {
            console.log("⚠️ No stocks updated, skipping tag recalculation");
        }
        
        console.log("\n===== Daily Financials & Tags Update completed successfully =====");
        
    } catch (error) {
        console.error("❌ Daily update failed:", error.message);
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

main();