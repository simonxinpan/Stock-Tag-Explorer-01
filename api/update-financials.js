// /api/update-financials.js
import { Pool } from 'pg';
// ... (pool a's a's connection setup)
// ... (getFinnhubMetrics 辅助函数)

export default async function handler(req, res) {
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) { /* ... */ }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows: companies } = await client.query('SELECT ticker FROM stocks');
        for (const company of companies) {
            await new Promise(resolve => setTimeout(resolve, 1100)); // ** 尊重 Finnhub **
            const financialData = await getFinnhubMetrics(company.ticker, process.env.FINNHUB_API_KEY);
            if (financialData && financialData.metric) {
                await client.query(
                    `UPDATE stocks SET market_cap = $1, roe_ttm = $2, pe_ttm = $3 WHERE ticker = $4`,
                    [
                        financialData.metric.marketCapitalization,
                        financialData.metric.roeTTM,
                        financialData.metric.peTTM,
                        company.ticker
                    ]
                );
            }
        }
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (error) { /* ... */ } 
    finally { client.release(); }
}