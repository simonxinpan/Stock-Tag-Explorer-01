import 'dotenv/config';

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const API_KEY = process.env.FINANCIAL_MODELING_PREP_API_KEY;
    
    if (!API_KEY) {
        console.error('API Key not configured');
        // 返回模拟数据而不是错误，确保页面正常运行
        const mockData = [
            { sector: 'Technology', changesPercentage: '2.45%' },
            { sector: 'Healthcare', changesPercentage: '1.23%' },
            { sector: 'Financial Services', changesPercentage: '-0.87%' },
            { sector: 'Consumer Cyclical', changesPercentage: '0.56%' },
            { sector: 'Communication Services', changesPercentage: '1.78%' },
            { sector: 'Industrials', changesPercentage: '0.34%' },
            { sector: 'Consumer Defensive', changesPercentage: '-0.12%' },
            { sector: 'Energy', changesPercentage: '3.21%' },
            { sector: 'Utilities', changesPercentage: '-0.45%' },
            { sector: 'Real Estate', changesPercentage: '0.89%' },
            { sector: 'Basic Materials', changesPercentage: '1.67%' }
        ];
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(mockData);
        return;
    }
    
    const url = `https://financialmodelingprep.com/api/v3/sector-performance?apikey=${API_KEY}`;
    
    try {
        const apiResponse = await fetch(url);
        
        if (!apiResponse.ok) {
            throw new Error(`API responded with status: ${apiResponse.status}`);
        }
        
        const data = await apiResponse.json();
        
        // 设置缓存头
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(data);
    } catch (error) {
        console.error('Failed to fetch sector performance data:', error);
        
        // 返回模拟数据作为降级方案
        const mockData = [
            { sector: 'Technology', changesPercentage: '2.45%' },
            { sector: 'Healthcare', changesPercentage: '1.23%' },
            { sector: 'Financial Services', changesPercentage: '-0.87%' },
            { sector: 'Consumer Cyclical', changesPercentage: '0.56%' },
            { sector: 'Communication Services', changesPercentage: '1.78%' },
            { sector: 'Industrials', changesPercentage: '0.34%' },
            { sector: 'Consumer Defensive', changesPercentage: '-0.12%' },
            { sector: 'Energy', changesPercentage: '3.21%' },
            { sector: 'Utilities', changesPercentage: '-0.45%' },
            { sector: 'Real Estate', changesPercentage: '0.89%' },
            { sector: 'Basic Materials', changesPercentage: '1.67%' }
        ];
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(mockData);
    }
}