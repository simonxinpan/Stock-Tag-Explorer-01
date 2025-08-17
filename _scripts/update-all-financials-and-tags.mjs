// /_scripts/update-all-financials-and-tags.mjs
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

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

// 应用标签到股票
async function applyTag(client, stockSymbol, tagId) {
    try {
        await client.query(
            `INSERT INTO stock_tags (stock_symbol, tag_id) 
             VALUES ($1, $2) 
             ON CONFLICT (stock_symbol, tag_id) DO NOTHING`,
            [stockSymbol, tagId]
        );
    } catch (error) {
        console.error(`❌ Error applying tag ${tagId} to ${stockSymbol}:`, error.message);
    }
}

// 计算并应用动态标签
async function calculateAndApplyTags(client, stock) {
    const { symbol, market_cap, pe_ttm, roe_ttm, pb_ratio, debt_to_equity, current_ratio, change_percent } = stock;
    
    // 清除该股票的所有动态标签
    await client.query(
        `DELETE FROM stock_tags 
         WHERE stock_symbol = $1 
         AND tag_id IN (
             SELECT tag_id FROM tags 
             WHERE category IN ('market_cap', 'valuation', 'performance', 'financial_health')
         )`,
        [symbol]
    );
    
    // 市值分类标签
    if (market_cap) {
        if (market_cap >= 200000000000) {
            await applyTag(client, symbol, 'mega_cap');
        } else if (market_cap >= 10000000000) {
            await applyTag(client, symbol, 'large_cap');
        } else if (market_cap >= 2000000000) {
            await applyTag(client, symbol, 'mid_cap');
        } else {
            await applyTag(client, symbol, 'small_cap');
        }
    }
    
    // 估值标签
    if (pe_ttm !== null && pe_ttm !== undefined) {
        if (pe_ttm < 15) {
            await applyTag(client, symbol, 'undervalued');
        } else if (pe_ttm > 30) {
            await applyTag(client, symbol, 'overvalued');
        }
    }
    
    // 盈利能力标签
    if (roe_ttm !== null && roe_ttm !== undefined) {
        if (roe_ttm > 20) {
            await applyTag(client, symbol, 'high_roe');
        } else if (roe_ttm < 5) {
            await applyTag(client, symbol, 'low_roe');
        }
    }
    
    // 财务健康标签
    if (debt_to_equity !== null && debt_to_equity !== undefined) {
        if (debt_to_equity < 0.3) {
            await applyTag(client, symbol, 'low_debt');
        } else if (debt_to_equity > 1.0) {
            await applyTag(client, symbol, 'high_debt');
        }
    }
    
    if (current_ratio !== null && current_ratio !== undefined) {
        if (current_ratio > 2.0) {
            await applyTag(client, symbol, 'strong_liquidity');
        } else if (current_ratio < 1.0) {
            await applyTag(client, symbol, 'weak_liquidity');
        }
    }
    
    // 表现标签
    if (change_percent !== null && change_percent !== undefined) {
        if (change_percent > 5) {
            await applyTag(client, symbol, 'strong_performer');
        } else if (change_percent < -5) {
            await applyTag(client, symbol, 'weak_performer');
        }
    }
}

async function main() {
    console.log("===== Starting DAILY full financial & tag update job =====");
    
    const { NEON_DATABASE_URL, FINNHUB_API_KEY } = process.env;
    if (!NEON_DATABASE_URL || !FINNHUB_API_KEY) {
        console.error("FATAL: Missing NEON_DATABASE_URL or FINNHUB_API_KEY environment variables.");
        process.exit(1);
    }
    
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 获取所有股票
        const { rows: companies } = await client.query('SELECT symbol FROM stocks ORDER BY symbol');
        console.log(`📋 Found ${companies.length} stocks to update`);
        
        // 开始事务
        await client.query('BEGIN');
        
        let updatedCount = 0;
        let taggedCount = 0;
        
        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            
            // 尊重 Finnhub API 限制 (60 calls/minute)
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            console.log(`📊 Processing ${company.symbol} (${i + 1}/${companies.length})`);
            
            // 获取财务数据
            const financialData = await getFinnhubMetrics(company.symbol, FINNHUB_API_KEY);
            
            if (financialData && financialData.metric) {
                const metrics = financialData.metric;
                
                // 更新财务数据
                await client.query(
                    `UPDATE stocks SET 
                     market_cap = $1, 
                     roe_ttm = $2, 
                     pe_ttm = $3, 
                     pb_ratio = $4,
                     debt_to_equity = $5,
                     current_ratio = $6,
                     last_updated = NOW() 
                     WHERE symbol = $7`,
                    [
                        metrics.marketCapitalization ? Math.round(metrics.marketCapitalization) : null,
                        metrics.roeTTM || null,
                        metrics.peTTM || null,
                        metrics.pbAnnual || null,
                        metrics.totalDebt2TotalEquityAnnual || null,
                        metrics.currentRatioAnnual || null,
                        company.symbol
                    ]
                );
                
                updatedCount++;
                
                // 获取更新后的股票数据用于标签计算
                const { rows: [updatedStock] } = await client.query(
                    'SELECT * FROM stocks WHERE symbol = $1',
                    [company.symbol]
                );
                
                if (updatedStock) {
                    await calculateAndApplyTags(client, updatedStock);
                    taggedCount++;
                }
            } else {
                console.warn(`⚠️ No financial data available for ${company.symbol}`);
                
                // 即使没有新的财务数据，也尝试基于现有数据计算标签
                const { rows: [existingStock] } = await client.query(
                    'SELECT * FROM stocks WHERE symbol = $1',
                    [company.symbol]
                );
                
                if (existingStock) {
                    await calculateAndApplyTags(client, existingStock);
                    taggedCount++;
                }
            }
            
            // 每处理50只股票提交一次，避免长事务
            if ((i + 1) % 50 === 0) {
                await client.query('COMMIT');
                await client.query('BEGIN');
                console.log(`✅ Checkpoint: Processed ${i + 1} stocks`);
            }
        }
        
        await client.query('COMMIT');
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