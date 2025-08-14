#!/usr/bin/env node

/**
 * 环境变量检查脚本
 * 用于GitHub Actions中快速验证必需的环境变量
 */

require('dotenv').config();

const requiredEnvVars = [
  'POLYGON_API_KEY',
  'FINNHUB_API_KEY', 
  'DATABASE_URL'
];

const optionalEnvVars = [
  'VERCEL_TOKEN',
  'ORG_ID',
  'PROJECT_ID'
];

function checkEnvironmentVariables() {
  console.log('🔍 检查环境变量配置...');
  
  let allRequired = true;
  let hasOptional = false;
  
  console.log('\n=== 必需的环境变量 ===');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value.trim() !== '') {
      console.log(`✅ ${varName}: 已设置`);
    } else {
      console.log(`❌ ${varName}: 未设置或为空`);
      allRequired = false;
    }
  });
  
  console.log('\n=== 可选的环境变量 ===');
  optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value.trim() !== '') {
      console.log(`✅ ${varName}: 已设置`);
      hasOptional = true;
    } else {
      console.log(`⚪ ${varName}: 未设置`);
    }
  });
  
  console.log('\n=== 检查结果 ===');
  
  if (allRequired) {
    console.log('✅ 所有必需的环境变量都已正确设置');
    
    if (hasOptional) {
      console.log('✅ 部分可选环境变量已设置，支持完整功能');
    } else {
      console.log('⚠️  可选环境变量未设置，某些功能可能受限');
    }
    
    console.log('🚀 环境配置检查通过，可以继续执行后续步骤');
    process.exit(0);
    
  } else {
    console.log('❌ 缺少必需的环境变量');
    console.log('\n📋 解决方案:');
    console.log('1. 检查GitHub Secrets配置');
    console.log('2. 确保变量名称完全匹配（区分大小写）');
    console.log('3. 验证变量值没有多余的空格或换行符');
    console.log('4. 参考 GITHUB_ACTIONS_SETUP.md 文档');
    
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  checkEnvironmentVariables();
}

module.exports = { checkEnvironmentVariables };