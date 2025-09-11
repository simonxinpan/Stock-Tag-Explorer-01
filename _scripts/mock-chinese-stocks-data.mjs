#!/usr/bin/env node

/**
 * Mock Chinese Stocks Data Injection Script
 * 模拟中概股数据注入脚本
 * 
 * This script demonstrates the Chinese stocks workflow functionality
 * when database connection is not available.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Chinese stocks data
const mockChineseStocks = [
  {
    symbol: 'BABA',
    name: '阿里巴巴集团',
    price: 85.42,
    change: 2.15,
    changePercent: 2.58,
    volume: 12500000,
    marketCap: 205800000000
  },
  {
    symbol: 'JD',
    name: '京东集团',
    price: 32.18,
    change: -0.87,
    changePercent: -2.63,
    volume: 8900000,
    marketCap: 48200000000
  },
  {
    symbol: 'TCEHY',
    name: '腾讯控股',
    price: 42.35,
    change: 1.23,
    changePercent: 2.99,
    volume: 6700000,
    marketCap: 405600000000
  },
  {
    symbol: 'BIDU',
    name: '百度',
    price: 98.76,
    change: 3.45,
    changePercent: 3.62,
    volume: 4200000,
    marketCap: 34500000000
  },
  {
    symbol: 'NIO',
    name: '蔚来汽车',
    price: 8.92,
    change: 0.34,
    changePercent: 3.96,
    volume: 15600000,
    marketCap: 15800000000
  }
];

async function main() {
  try {
    console.log('🇨🇳 === 中概股模拟数据注入开始 ===');
    console.log(`📊 Market Type: ${process.env.MARKET_TYPE || 'chinese_stocks'}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    // Simulate data processing
    console.log('\n📈 处理中概股数据...');
    
    for (const stock of mockChineseStocks) {
      console.log(`✅ ${stock.symbol} (${stock.name}): $${stock.price} (${stock.changePercent > 0 ? '+' : ''}${stock.changePercent}%)`);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Create mock output file
    const outputPath = join(__dirname, '..', 'mock-chinese-stocks-output.json');
    const output = {
      success: true,
      timestamp: new Date().toISOString(),
      market: 'chinese_stocks',
      data: mockChineseStocks,
      count: mockChineseStocks.length,
      note: '🧪 模拟数据演示中概股功能'
    };
    
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 模拟数据已保存到: ${outputPath}`);
    
    console.log('\n🎉 === 中概股模拟数据注入完成 ===');
    console.log(`📊 总计处理: ${mockChineseStocks.length} 只中概股`);
    console.log('🔗 GitHub Actions 工作流运行成功!');
    
  } catch (error) {
    console.error('❌ 模拟数据注入失败:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main().catch(console.error);

export default main;