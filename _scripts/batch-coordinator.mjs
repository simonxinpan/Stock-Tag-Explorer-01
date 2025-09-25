// 文件: _scripts/batch-coordinator.mjs
// 版本: S&P 500 Batch Processing Coordinator
// 功能: 协调11个批次的顺序处理，确保API限制和数据库性能

import { spawn } from 'child_process';
import fs from 'fs/promises';
import 'dotenv/config';

// === 配置区 ===
const TOTAL_BATCHES = 11;
const STOCKS_PER_BATCH = 50;
const DELAY_PER_STOCK = 4; // 秒
const BATCH_INTERVAL = 10 * 60; // 10分钟，转换为秒
const SCRIPT_PATH = './_scripts/update-sp500-enhanced.mjs';
const STOCK_LIST_FILE = './sp500_stocks.json';
const DEBUG = process.env.DEBUG === 'true';
const COORDINATOR_MODE = process.env.COORDINATOR_MODE || 'sequential'; // sequential, parallel, smart

// === 工具函数 ===
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

function getCurrentTimestamp() {
  return new Date().toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// === 批次执行函数 ===
async function executeBatch(batchNumber, totalStocks) {
  const batchStart = (batchNumber - 1) * STOCKS_PER_BATCH + 1;
  const batchEnd = Math.min(batchNumber * STOCKS_PER_BATCH, totalStocks);
  const actualStocksInBatch = batchEnd - batchStart + 1;
  
  console.log(`\n🚀 [批次 ${batchNumber}] 开始执行`);
  console.log(`   📊 股票范围: ${batchStart}-${batchEnd} (${actualStocksInBatch}只)`);
  console.log(`   ⏰ 开始时间: ${getCurrentTimestamp()}`);
  console.log(`   ⏱️ 预计耗时: ${formatTime(actualStocksInBatch * DELAY_PER_STOCK)}`);
  
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      BATCH_START: batchStart.toString(),
      BATCH_END: batchEnd.toString(),
      DEBUG: DEBUG.toString()
    };
    
    const child = spawn('node', [SCRIPT_PATH], {
      env,
      stdio: DEBUG ? 'inherit' : 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    if (!DEBUG) {
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }
    
    child.on('close', (code) => {
      const endTime = getCurrentTimestamp();
      
      if (code === 0) {
        console.log(`✅ [批次 ${batchNumber}] 执行成功`);
        console.log(`   ⏰ 完成时间: ${endTime}`);
        
        if (!DEBUG && output) {
          // 提取关键信息
          const successMatch = output.match(/成功更新:\s*(\d+)/);
          const failedMatch = output.match(/更新失败:\s*(\d+)/);
          const successRateMatch = output.match(/成功率:\s*([\d.]+)%/);
          
          if (successMatch) {
            console.log(`   📈 成功更新: ${successMatch[1]} 只股票`);
          }
          if (failedMatch && parseInt(failedMatch[1]) > 0) {
            console.log(`   ❌ 更新失败: ${failedMatch[1]} 只股票`);
          }
          if (successRateMatch) {
            console.log(`   📊 成功率: ${successRateMatch[1]}%`);
          }
        }
        
        resolve({
          batchNumber,
          success: true,
          actualStocks: actualStocksInBatch,
          output: output
        });
      } else {
        console.error(`❌ [批次 ${batchNumber}] 执行失败，退出码: ${code}`);
        if (errorOutput) {
          console.error(`   错误信息: ${errorOutput.substring(0, 200)}...`);
        }
        
        resolve({
          batchNumber,
          success: false,
          actualStocks: actualStocksInBatch,
          error: errorOutput,
          exitCode: code
        });
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ [批次 ${batchNumber}] 进程启动失败:`, error.message);
      resolve({
        batchNumber,
        success: false,
        actualStocks: actualStocksInBatch,
        error: error.message
      });
    });
  });
}

// === 批次协调策略 ===
async function executeSequentialBatches(totalStocks) {
  console.log(`📋 顺序执行模式：将按顺序执行 ${TOTAL_BATCHES} 个批次`);
  console.log(`⏱️ 总预计耗时: ${formatTime(TOTAL_BATCHES * (STOCKS_PER_BATCH * DELAY_PER_STOCK + BATCH_INTERVAL))}`);
  
  const results = [];
  
  for (let batchNumber = 1; batchNumber <= TOTAL_BATCHES; batchNumber++) {
    const result = await executeBatch(batchNumber, totalStocks);
    results.push(result);
    
    // 批次间隔（除了最后一个批次）
    if (batchNumber < TOTAL_BATCHES) {
      console.log(`⏸️ [批次间隔] 等待 ${formatTime(BATCH_INTERVAL)} 后执行下一批次...`);
      await delay(BATCH_INTERVAL * 1000);
    }
  }
  
  return results;
}

async function executeSmartBatches(totalStocks) {
  console.log(`🧠 智能执行模式：根据系统负载动态调整批次间隔`);
  
  const results = [];
  let adaptiveInterval = BATCH_INTERVAL;
  
  for (let batchNumber = 1; batchNumber <= TOTAL_BATCHES; batchNumber++) {
    const startTime = Date.now();
    const result = await executeBatch(batchNumber, totalStocks);
    const executionTime = (Date.now() - startTime) / 1000;
    
    results.push(result);
    
    // 根据执行时间调整间隔
    if (result.success) {
      const expectedTime = result.actualStocks * DELAY_PER_STOCK;
      if (executionTime > expectedTime * 1.5) {
        // 执行时间过长，增加间隔
        adaptiveInterval = Math.min(adaptiveInterval * 1.2, BATCH_INTERVAL * 2);
        console.log(`⚠️ 检测到执行缓慢，调整批次间隔为 ${formatTime(Math.round(adaptiveInterval))}`);
      } else if (executionTime < expectedTime * 0.8) {
        // 执行时间较短，减少间隔
        adaptiveInterval = Math.max(adaptiveInterval * 0.9, BATCH_INTERVAL * 0.5);
        console.log(`⚡ 检测到执行快速，调整批次间隔为 ${formatTime(Math.round(adaptiveInterval))}`);
      }
    } else {
      // 执行失败，增加间隔
      adaptiveInterval = Math.min(adaptiveInterval * 1.5, BATCH_INTERVAL * 3);
      console.log(`❌ 检测到执行失败，增加批次间隔为 ${formatTime(Math.round(adaptiveInterval))}`);
    }
    
    // 批次间隔
    if (batchNumber < TOTAL_BATCHES) {
      console.log(`⏸️ [智能间隔] 等待 ${formatTime(Math.round(adaptiveInterval))} 后执行下一批次...`);
      await delay(adaptiveInterval * 1000);
    }
  }
  
  return results;
}

// === 结果报告函数 ===
function generateExecutionReport(results, totalTime) {
  console.log(`\n📊 ===== 批次执行报告 =====`);
  console.log(`⏰ 总执行时间: ${formatTime(Math.round(totalTime / 1000))}`);
  console.log(`📈 执行模式: ${COORDINATOR_MODE}`);
  
  const successfulBatches = results.filter(r => r.success).length;
  const failedBatches = results.filter(r => r.success === false).length;
  const totalStocksProcessed = results.reduce((sum, r) => sum + r.actualStocks, 0);
  
  console.log(`\n📋 批次统计:`);
  console.log(`   ✅ 成功批次: ${successfulBatches}/${TOTAL_BATCHES}`);
  console.log(`   ❌ 失败批次: ${failedBatches}/${TOTAL_BATCHES}`);
  console.log(`   📊 成功率: ${((successfulBatches / TOTAL_BATCHES) * 100).toFixed(1)}%`);
  console.log(`   📈 处理股票总数: ${totalStocksProcessed}`);
  
  if (failedBatches > 0) {
    console.log(`\n❌ 失败批次详情:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   批次 ${r.batchNumber}: ${r.error || '未知错误'}`);
    });
  }
  
  console.log(`\n⚡ 性能指标:`);
  const avgTimePerBatch = totalTime / TOTAL_BATCHES / 1000;
  const avgTimePerStock = totalTime / totalStocksProcessed / 1000;
  console.log(`   ⏱️ 平均每批次: ${formatTime(Math.round(avgTimePerBatch))}`);
  console.log(`   ⏱️ 平均每只股票: ${avgTimePerStock.toFixed(1)}秒`);
  
  // 建议
  console.log(`\n💡 优化建议:`);
  if (failedBatches > 2) {
    console.log(`   🔧 失败批次较多，建议检查API密钥和网络连接`);
  }
  if (avgTimePerStock > DELAY_PER_STOCK * 1.5) {
    console.log(`   🐌 执行速度较慢，建议检查API响应时间`);
  }
  if (successfulBatches === TOTAL_BATCHES) {
    console.log(`   🎉 所有批次执行成功，系统运行良好！`);
  }
}

// === 主函数 ===
async function main() {
  console.log(`🚀 ===== S&P 500 批次协调器启动 =====`);
  console.log(`📅 启动时间: ${getCurrentTimestamp()}`);
  console.log(`🔧 执行模式: ${COORDINATOR_MODE}`);
  console.log(`📊 配置参数:`);
  console.log(`   📈 总批次数: ${TOTAL_BATCHES}`);
  console.log(`   📊 每批次股票数: ${STOCKS_PER_BATCH}`);
  console.log(`   ⏱️ 每股票间隔: ${DELAY_PER_STOCK}秒`);
  console.log(`   ⏸️ 批次间隔: ${formatTime(BATCH_INTERVAL)}`);
  
  try {
    // 验证股票列表文件
    const stocksData = await fs.readFile(STOCK_LIST_FILE, 'utf-8');
    const stocks = JSON.parse(stocksData);
    const totalStocks = stocks.length;
    
    console.log(`📋 股票列表验证:`);
    console.log(`   📈 总股票数: ${totalStocks}`);
    console.log(`   📊 实际批次数: ${Math.ceil(totalStocks / STOCKS_PER_BATCH)}`);
    
    if (totalStocks === 0) {
      console.error(`❌ 股票列表为空，请检查 ${STOCK_LIST_FILE}`);
      process.exit(1);
    }
    
    // 执行批次处理
    const startTime = Date.now();
    let results;
    
    switch (COORDINATOR_MODE) {
      case 'smart':
        results = await executeSmartBatches(totalStocks);
        break;
      case 'sequential':
      default:
        results = await executeSequentialBatches(totalStocks);
        break;
    }
    
    const totalTime = Date.now() - startTime;
    
    // 生成报告
    generateExecutionReport(results, totalTime);
    
    // 确定退出码
    const failedBatches = results.filter(r => !r.success).length;
    if (failedBatches === 0) {
      console.log(`\n🎉 所有批次执行成功！`);
      process.exit(0);
    } else if (failedBatches <= 2) {
      console.log(`\n⚠️ 部分批次失败，但大部分成功`);
      process.exit(1);
    } else {
      console.log(`\n❌ 多个批次失败，请检查系统状态`);
      process.exit(2);
    }
    
  } catch (error) {
    console.error(`❌ 批次协调器执行失败:`, error.message);
    if (DEBUG) {
      console.error(error.stack);
    }
    process.exit(3);
  }
}

// 启动协调器
main();