const axios = require('axios');
require('dotenv').config();

// 从trending.js复制的函数
async function getRealStockData(market, type) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not found in environment variables');
  }

  console.log(`🔍 正在获取${market}市场的${type}数据...`);
  console.log(`📊 使用API密钥: ${apiKey.substring(0, 10)}...`);

  try {
    let symbols = [];
    
    if (market === 'sp500') {
      // 标普500主要股票
      symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'UNH', 'JNJ'];
    } else if (market === 'chinese_stocks') {
      // 中概股
      symbols = ['BABA', 'JD', 'PDD', 'BIDU', 'NIO', 'XPEV', 'LI', 'BILI', 'TME', 'NTES'];
    }

    console.log(`📈 查询股票代码: ${symbols.join(', ')}`);

    const stockData = [];
    
    for (const symbol of symbols) {
      try {
        // 获取股票基本信息
        const tickerUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apikey=${apiKey}`;
        console.log(`🔗 请求URL: ${tickerUrl}`);
        
        const tickerResponse = await axios.get(tickerUrl);
        
        if (tickerResponse.data && tickerResponse.data.results) {
          const ticker = tickerResponse.data.results;
          
          // 获取前一日收盘价
          const prevCloseUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${apiKey}`;
          const prevCloseResponse = await axios.get(prevCloseUrl);
          
          if (prevCloseResponse.data && prevCloseResponse.data.results && prevCloseResponse.data.results.length > 0) {
            const prevData = prevCloseResponse.data.results[0];
            
            const stockInfo = {
              symbol: symbol,
              name: getStockName(symbol, market),
              price: prevData.c || 0,
              change: (prevData.c - prevData.o) || 0,
              change_percent: prevData.o ? ((prevData.c - prevData.o) / prevData.o * 100) : 0,
              volume: prevData.v || 0,
              market_cap: ticker.market_cap || 0,
              market_cap_formatted: formatMarketCap(ticker.market_cap || 0)
            };
            
            stockData.push(stockInfo);
            console.log(`✅ 成功获取 ${symbol}: $${stockInfo.price}, 涨跌幅: ${stockInfo.change_percent.toFixed(2)}%`);
          }
        }
        
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ 获取${symbol}数据失败:`, error.message);
      }
    }
    
    console.log(`📊 总共获取到 ${stockData.length} 只股票的数据`);
    return stockData;
    
  } catch (error) {
    console.error('❌ getRealStockData错误:', error.message);
    throw error;
  }
}

function getStockName(symbol, market) {
  if (market === 'chinese_stocks') {
    return getChineseStockName(symbol);
  }
  
  const stockNames = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'NVDA': 'NVIDIA Corporation',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.',
    'BRK.B': 'Berkshire Hathaway Inc.',
    'UNH': 'UnitedHealth Group Inc.',
    'JNJ': 'Johnson & Johnson'
  };
  
  return stockNames[symbol] || symbol;
}

function getChineseStockName(symbol) {
  const chineseNames = {
    'BABA': '阿里巴巴',
    'JD': '京东',
    'PDD': '拼多多',
    'BIDU': '百度',
    'NIO': '蔚来',
    'XPEV': '小鹏汽车',
    'LI': '理想汽车',
    'BILI': '哔哩哔哩',
    'TME': '腾讯音乐',
    'NTES': '网易'
  };
  
  return chineseNames[symbol] || symbol;
}

function formatMarketCap(marketCap) {
  if (!marketCap || marketCap === 0) return 'N/A';
  
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  } else {
    return `$${marketCap.toLocaleString()}`;
  }
}

// 测试函数
async function testAPI() {
  console.log('🧪 开始测试trending API的真实数据获取功能...\n');
  
  try {
    console.log('=== 测试标普500市场 ===');
    const sp500Data = await getRealStockData('sp500', 'top_gainers');
    console.log(`标普500数据: ${sp500Data.length} 条记录\n`);
    
    console.log('=== 测试中概股市场 ===');
    const chineseData = await getRealStockData('chinese_stocks', 'top_gainers');
    console.log(`中概股数据: ${chineseData.length} 条记录\n`);
    
    console.log('✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAPI();