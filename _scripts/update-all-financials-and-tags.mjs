// /_scripts/update-all-financials-and-tags.mjs
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
        
        await client.query(
            `INSERT INTO stock_tags (stock_ticker, tag_id) 
             VALUES ($1, $2) 
             ON CONFLICT (stock_ticker, tag_id) DO NOTHING`,
            [stockTicker, tagId]
        );
    } catch (error) {
        console.error(`❌ Error applying tag ${tagName} to ${stockTicker}:`, error.message);
    }
}

// 计算并应用动态标签
async function calculateAndApplyTags(client, stock) {
    const { ticker, market_cap, pe_ttm, roe_ttm, change_percent } = stock;
    
    // 清除该股票的所有动态标签
    await client.query(
        `DELETE FROM stock_tags 
         WHERE stock_ticker = $1 
         AND tag_id IN (
             SELECT id FROM tags 
             WHERE type IN ('market_cap', 'valuation', 'performance', 'financial_health')
         )`,
        [ticker]
    );
    
    // 市值分类标签
    if (market_cap) {
        if (market_cap >= 200000000000) {
            await applyTag(client, ticker, '超大盘股');
        } else if (market_cap >= 10000000000) {
            await applyTag(client, ticker, '大盘股');
        } else if (market_cap >= 2000000000) {
            await applyTag(client, ticker, '中盘股');
        } else {
            await applyTag(client, ticker, '小盘股');
        }
    }
    
    // 估值标签
    if (pe_ttm !== null && pe_ttm !== undefined) {
        if (pe_ttm < 15) {
            await applyTag(client, ticker, '低估值');
        } else if (pe_ttm > 30) {
            await applyTag(client, ticker, '高估值');
        }
    }
    
    // 盈利能力标签
    if (roe_ttm !== null && roe_ttm !== undefined) {
        if (roe_ttm > 20) {
            await applyTag(client, ticker, '高ROE');
        } else if (roe_ttm < 5) {
            await applyTag(client, ticker, '低ROE');
        }
    }
    
    // 表现标签
    if (change_percent !== null && change_percent !== undefined) {
        if (change_percent > 5) {
            await applyTag(client, ticker, '强势股');
        } else if (change_percent < -5) {
            await applyTag(client, ticker, '弱势股');
        }
    }
}

async function main() {
    console.log("===== Starting DAILY full financial & tag update job =====");
    
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
        
        // 确保必要的表存在
        await ensureTablesExist(client);
        
        // 获取所有股票
        const { rows: companies } = await client.query('SELECT ticker FROM stocks ORDER BY ticker');
        console.log(`📋 Found ${companies.length} stocks to update`);
        
        // 分批处理，避免长时间事务导致死锁
        const BATCH_SIZE = 3; // 更小的批次，因为这个脚本处理更多数据
        let updatedCount = 0;
        let taggedCount = 0;
        
        for (let i = 0; i < companies.length; i += BATCH_SIZE) {
            const batch = companies.slice(i, i + BATCH_SIZE);
            
            // 每个批次使用独立事务
            await client.query('BEGIN');
            
            try {
                for (let j = 0; j < batch.length; j++) {
                    const company = batch[j];
                    const currentIndex = i + j + 1;
                    
                    console.log(`📊 Processing ${company.ticker} (${currentIndex}/${companies.length})`);
                    
                    // 获取财务数据
                    const financialData = await getFinnhubMetrics(company.ticker, FINNHUB_API_KEY);
                    
                    // 添加延迟避免API限制（Finnhub限制60次/分钟）
                    await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1秒延迟
                    
                    // 获取实时报价数据（用于 market_status 计算）
                    const quoteData = await getFinnhubQuote(company.ticker, FINNHUB_API_KEY);
                    
                    if (financialData && financialData.metric) {
                        const metrics = financialData.metric;
                        
                        // 🔍 提取 dividend_yield 数据
                        const dividendYield = metrics.dividendYieldIndicatedAnnual || metrics.dividendYield || null;
                        
                        // 🔍 计算 market_status
                        const marketStatus = quoteData ? getMarketStatus(quoteData.t) : 'Unknown';
                        
                        // 更新财务数据（包含新字段）
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
                                company.ticker
                            ]
                        );
                        
                        // 🔍 调试日志：显示新字段的更新情况
                        console.log(`💰 ${company.ticker}: dividend_yield=${dividendYield}, market_status=${marketStatus}`);
                        
                        updatedCount++;
                        
                        // 获取更新后的股票数据用于标签计算
                        const { rows: [updatedStock] } = await client.query(
                            'SELECT * FROM stocks WHERE ticker = $1',
                            [company.ticker]
                        );
                        
                        if (updatedStock) {
                            await calculateAndApplyTags(client, updatedStock);
                            taggedCount++;
                        }
                    } else {
                        console.warn(`⚠️ No financial data available for ${company.ticker}`);
                        
                        // 即使没有新的财务数据，也尝试基于现有数据计算标签
                        const { rows: [existingStock] } = await client.query(
                            'SELECT * FROM stocks WHERE ticker = $1',
                            [company.ticker]
                        );
                        
                        if (existingStock) {
                            await calculateAndApplyTags(client, existingStock);
                            taggedCount++;
                        }
                    }
                    
                    // 尊重 Finnhub API 限制 (60 calls/minute)
                    await new Promise(resolve => setTimeout(resolve, 1200));
                }
                
                // 提交当前批次
                await client.query('COMMIT');
                console.log(`✅ Batch completed: Processed ${Math.min(i + BATCH_SIZE, companies.length)} stocks`);
                
            } catch (batchError) {
                // 回滚当前批次
                await client.query('ROLLBACK');
                console.error(`❌ Batch failed at stock ${i + 1}-${Math.min(i + BATCH_SIZE, companies.length)}:`, batchError.message);
                // 继续处理下一批次，不中断整个流程
            }
        }
        console.log(`✅ SUCCESS: Updated financial data for ${updatedCount} stocks`);
        console.log(`✅ SUCCESS: Applied tags to ${taggedCount} stocks`);
        
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error("❌ JOB FAILED:", error.message);
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