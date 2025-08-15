// /api/update-financials.js - 低频财务数据更新工人
import { Pool } from 'pg';

// 使用统一的环境变量名
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// --- 辅助函数：从 Finnhub 获取财务指标 ---
async function getFinnhubMetrics(ticker, apiKey) {
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`;
    try {
        console.log(`[Finnhub] Fetching metrics for ${ticker}`);
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            console.warn(`[Finnhub] API for ${ticker} returned status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error(`[Finnhub] Fetch failed for ${ticker}:`, error.message);
        return null;
    }
}

// --- API 主处理函数 ---
export default async function handler(req, res) {
    // 安全校验
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    if (!FINNHUB_API_KEY) {
        return res.status(500).json({ error: 'Finnhub API key is not configured.' });
    }

    console.log('💰 API call received: Starting financial data update using Finnhub...');
    const client = await pool.connect();

    try {
        const { rows: companies } = await client.query('SELECT ticker FROM stocks');
        console.log(`📊 Found ${companies.length} stocks in database.`);

        let successCount = 0;
        await client.query('BEGIN');

        for (const company of companies) {
            const ticker = company.ticker;
            
            // 尊重 Finnhub API 限制，每次请求间隔1.1秒
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const financialData = await getFinnhubMetrics(ticker, FINNHUB_API_KEY);
            
            if (financialData && financialData.metric) {
                const metrics = financialData.metric;
                
                // 更新财务数据
                const result = await client.query(
                    `UPDATE stocks SET 
                        market_cap_numeric = $1, 
                        roe_ttm = $2, 
                        pe_ttm = $3,
                        dividend_yield = $4,
                        eps_ttm = $5,
                        revenue_ttm = $6,
                        updated_at = NOW()
                     WHERE ticker = $7`,
                    [
                        metrics.marketCapitalization || null,
                        metrics.roeTTM || null,
                        metrics.peTTM || null,
                        metrics.dividendYieldIndicatedAnnual || null,
                        metrics.epsTTM || null,
                        metrics.revenueTTM || null,
                        ticker
                    ]
                );
                
                if (result.rowCount > 0) {
                    successCount++;
                    console.log(`✅ Updated financial data for ${ticker}`);
                } else {
                    console.warn(`⚠️  No rows updated for ${ticker}`);
                }
            } else {
                console.warn(`❌ Failed to get financial data for ${ticker}`);
            }
        }

        await client.query('COMMIT');
        console.log(`\n💰 Financial update complete: ${successCount} stocks successfully updated.`);
        res.status(200).json({ 
            success: true, 
            updated: successCount, 
            total: companies.length,
            type: 'financial_data'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('💥 An error occurred during the financial update process:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) client.release();
    }
}