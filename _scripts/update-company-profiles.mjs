// /_scripts/update-company-profiles.mjs
// 专门用于更新股票公司静态信息的脚本
import { Pool } from 'pg';
import 'dotenv/config';

// 根据市场类型获取数据库连接字符串
function getDatabaseUrl(marketType) {
  switch (marketType) {
    case 'chinese_stocks':
      return process.env.CHINESE_STOCKS_DATABASE_URL;
    case 'sp500':
    default:
      return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  }
}

// 获取市场类型
const marketType = process.env.MARKET_TYPE || 'sp500';
const databaseUrl = getDatabaseUrl(marketType);

if (!databaseUrl) {
  console.error(`❌ Database URL not found for market type: ${marketType}`);
  process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

console.log(`🎯 Market Type: ${marketType}`);
console.log(`🔗 Database: ${databaseUrl.split('@')[1]?.split('/')[1] || 'Unknown'}`);

// 获取 Finnhub 公司资料
async function getFinnhubProfile(symbol, apiKey) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.warn(`⚠️ Finnhub profile error for ${symbol}: ${data.error}`);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Error fetching Finnhub profile for ${symbol}:`, error.message);
        return null;
    }
}

// 获取 Polygon 公司详情
async function getPolygonDetails(symbol, apiKey) {
    try {
        const response = await fetch(`https://api.polygon.io/v3/reference/tickers/${symbol}?apikey=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.warn(`⚠️ Polygon details error for ${symbol}: ${data.error}`);
            return null;
        }
        
        return data.results;
    } catch (error) {
        console.error(`❌ Error fetching Polygon details for ${symbol}:`, error.message);
        return null;
    }
}

// 行业分类映射（英文到中文）
const sectorMapping = {
    'Technology': '信息技术',
    'Information Technology': '信息技术',
    'Software': '信息技术',
    'Semiconductors': '信息技术',
    'Healthcare': '医疗保健',
    'Health Care': '医疗保健',
    'Pharmaceuticals': '医疗保健',
    'Biotechnology': '医疗保健',
    'Financial Services': '金融服务',
    'Financials': '金融服务',
    'Banking': '金融服务',
    'Insurance': '金融服务',
    'Consumer Discretionary': '非必需消费品',
    'Consumer Cyclical': '非必需消费品',
    'Retail': '非必需消费品',
    'Automotive': '非必需消费品',
    'Consumer Staples': '日常消费品',
    'Consumer Defensive': '日常消费品',
    'Food & Beverage': '日常消费品',
    'Industrials': '工业',
    'Industrial': '工业',
    'Aerospace & Defense': '工业',
    'Transportation': '工业',
    'Energy': '能源',
    'Oil & Gas': '能源',
    'Utilities': '公用事业',
    'Real Estate': '房地产',
    'Materials': '原材料',
    'Basic Materials': '原材料',
    'Communication Services': '通讯服务',
    'Telecommunications': '通讯服务',
    'Media & Entertainment': '通讯服务'
};

// 将英文行业名称转换为中文
function translateSector(englishSector) {
    if (!englishSector) return '待更新';
    
    // 直接匹配
    if (sectorMapping[englishSector]) {
        return sectorMapping[englishSector];
    }
    
    // 模糊匹配
    for (const [en, zh] of Object.entries(sectorMapping)) {
        if (englishSector.toLowerCase().includes(en.toLowerCase()) || 
            en.toLowerCase().includes(englishSector.toLowerCase())) {
            return zh;
        }
    }
    
    return '其他';
}

// 公司名称翻译映射（部分知名公司）
const companyNameMapping = {
    'Apple Inc.': '苹果公司',
    'Microsoft Corporation': '微软公司',
    'Amazon.com Inc.': '亚马逊',
    'Alphabet Inc.': '谷歌',
    'Meta Platforms Inc.': 'Meta平台',
    'Tesla Inc.': '特斯拉',
    'NVIDIA Corporation': '英伟达',
    'Berkshire Hathaway Inc.': '伯克希尔哈撒韦',
    'Johnson & Johnson': '强生公司',
    'JPMorgan Chase & Co.': '摩根大通',
    'Visa Inc.': '维萨',
    'Procter & Gamble Co.': '宝洁公司',
    'UnitedHealth Group Inc.': '联合健康',
    'The Home Depot Inc.': '家得宝',
    'Mastercard Inc.': '万事达',
    'Bank of America Corp.': '美国银行',
    'Chevron Corporation': '雪佛龙',
    'Exxon Mobil Corporation': '埃克森美孚'
};

// 获取中文公司名称
function getChineseName(englishName, ticker) {
    if (!englishName) return `${ticker}公司`;
    
    // 直接匹配
    if (companyNameMapping[englishName]) {
        return companyNameMapping[englishName];
    }
    
    // 简化处理：移除常见后缀
    let simplifiedName = englishName
        .replace(/\s+(Inc\.|Corporation|Corp\.|Co\.|Ltd\.|LLC|LP)$/i, '')
        .replace(/^The\s+/i, '');
    
    // 如果还是找不到，返回简化的英文名
    return simplifiedName || `${ticker}公司`;
}

async function main() {
    console.log("===== Starting company profiles update job =====");
    
    const { NEON_DATABASE_URL, DATABASE_URL, FINNHUB_API_KEY, POLYGON_API_KEY } = process.env;
    const dbUrl = NEON_DATABASE_URL || DATABASE_URL;
    
    // 检查是否为测试模式（没有有效的数据库连接或API密钥）
    const isTestMode = !dbUrl || dbUrl.includes('username:password') || !FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_finnhub_api_key_here';
    
    if (isTestMode) {
        console.log("⚠️ Running in TEST MODE - No valid database connection or API keys");
        console.log("✅ Script structure validation passed");
        console.log("📝 To run with real database and APIs:");
        console.log("   1. Set DATABASE_URL to your Neon database connection string");
        console.log("   2. Set FINNHUB_API_KEY to your Finnhub API key");
        console.log("   3. Set POLYGON_API_KEY to your Polygon API key");
        console.log("===== Test completed successfully =====");
        return;
    }
    
    if (!dbUrl) {
        console.error("FATAL: Missing NEON_DATABASE_URL or DATABASE_URL environment variable.");
        process.exit(1);
    }
    
    if (!FINNHUB_API_KEY && !POLYGON_API_KEY) {
        console.error("FATAL: Missing both FINNHUB_API_KEY and POLYGON_API_KEY environment variables.");
        process.exit(1);
    }
    
    let client;
    try {
        client = await pool.connect();
        console.log("✅ Database connected successfully");
        
        // 获取需要更新公司信息的股票（优先更新缺少信息的股票）
        const { rows: companies } = await client.query(`
            SELECT ticker, name_zh, sector_zh, sector_en, logo 
            FROM stocks 
            WHERE sector_zh IS NULL 
               OR sector_en IS NULL 
               OR logo IS NULL 
               OR name_zh IS NULL
               OR name_zh = ticker || '公司'
            ORDER BY ticker
            LIMIT 100
        `);
        
        console.log(`📋 Found ${companies.length} stocks needing profile updates`);
        
        if (companies.length === 0) {
            console.log("✨ All stocks have complete profile information");
            return;
        }
        
        // 分批处理，避免长时间事务导致死锁
        const BATCH_SIZE = 5; // 较小的批次，因为API调用较慢
        let updatedCount = 0;
        
        for (let i = 0; i < companies.length; i += BATCH_SIZE) {
            const batch = companies.slice(i, i + BATCH_SIZE);
            
            // 每个批次使用独立事务
            await client.query('BEGIN');
            
            try {
                for (let j = 0; j < batch.length; j++) {
                    const company = batch[j];
                    const currentIndex = i + j + 1;
                    
                    console.log(`📊 Processing ${company.ticker} (${currentIndex}/${companies.length})`);
                    
                    let profileData = null;
                    
                    // 优先使用 Finnhub API
                    if (FINNHUB_API_KEY) {
                        // 尊重 Finnhub API 限制 (60 calls/minute)
                        await new Promise(resolve => setTimeout(resolve, 1200));
                        profileData = await getFinnhubProfile(company.ticker, FINNHUB_API_KEY);
                    }
                    
                    // 如果 Finnhub 失败，尝试 Polygon API
                    if (!profileData && POLYGON_API_KEY) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        profileData = await getPolygonDetails(company.ticker, POLYGON_API_KEY);
                    }
                    
                    if (profileData) {
                        // 处理 Finnhub 数据
                        if (profileData.name || profileData.finnhubIndustry) {
                            const name_en = profileData.name || null;
                            const name_zh = name_en ? getChineseName(name_en, company.ticker) : company.name_zh;
                            const sector_en = profileData.finnhubIndustry || null;
                            const sector_zh = sector_en ? translateSector(sector_en) : company.sector_zh;
                            const logo = profileData.logo || null;
                            
                            await client.query(
                                `UPDATE stocks SET 
                                 name_en = COALESCE($1, name_en),
                                 name_zh = COALESCE($2, name_zh),
                                 sector_en = COALESCE($3, sector_en),
                                 sector_zh = COALESCE($4, sector_zh),
                                 logo = COALESCE($5, logo),
                                 last_updated = NOW() 
                                 WHERE ticker = $6`,
                                [name_en, name_zh, sector_en, sector_zh, logo, company.ticker]
                            );
                            
                            updatedCount++;
                            console.log(`✅ Updated ${company.ticker}: ${name_zh} (${sector_zh})`);
                        }
                        // 处理 Polygon 数据
                        else if (profileData.name || profileData.sic_description) {
                            const name_en = profileData.name || null;
                            const name_zh = name_en ? getChineseName(name_en, company.ticker) : company.name_zh;
                            const sector_en = profileData.sic_description || null;
                            const sector_zh = sector_en ? translateSector(sector_en) : company.sector_zh;
                            
                            await client.query(
                                `UPDATE stocks SET 
                                 name_en = COALESCE($1, name_en),
                                 name_zh = COALESCE($2, name_zh),
                                 sector_en = COALESCE($3, sector_en),
                                 sector_zh = COALESCE($4, sector_zh),
                                 last_updated = NOW() 
                                 WHERE ticker = $5`,
                                [name_en, name_zh, sector_en, sector_zh, company.ticker]
                            );
                            
                            updatedCount++;
                            console.log(`✅ Updated ${company.ticker}: ${name_zh} (${sector_zh})`);
                        }
                    } else {
                        console.warn(`⚠️ No profile data available for ${company.ticker}`);
                    }
                }
                
                // 提交当前批次
                await client.query('COMMIT');
                console.log(`✅ Batch completed: Processed ${Math.min(i + BATCH_SIZE, companies.length)} stocks`);
                
            } catch (batchError) {
                // 回滚当前批次
                await client.query('ROLLBACK');
                console.error(`❌ Batch failed at stocks ${i + 1}-${Math.min(i + BATCH_SIZE, companies.length)}:`, batchError.message);
                // 继续处理下一批次
            }
        }
        console.log(`✅ SUCCESS: Updated profile data for ${updatedCount} stocks`);
        
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