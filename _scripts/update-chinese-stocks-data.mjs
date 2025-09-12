# ====================================================================
#  中概股高频数据更新工作流 (最终修复版)
#  版本: 5.0 - Aligned Environment Variables
# ====================================================================
name: Update Chinese Stocks Market Data (High Frequency)

on:
  schedule:
    # 中概股更新: 在美股交易时段的每小时 05, 20, 35, 50 分执行
    - cron: '5,20,35,50 13-20 * * 1-5'
  workflow_dispatch:
    inputs:
      debug_mode:
        description: 'Enable debug mode for detailed logs? (开启调试日志?)'
        required: true
        default: 'false'
        type: choice
          - 'true'
          - 'false'

jobs:
  update_chinese_stocks:
    name: "🐉 Update Chinese Stocks Data"
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci

      - name: Run Chinese Stocks Update Script
        env:
          # 关键修正: 确保这里的变量名与脚本读取的、以及Secrets中设置的完全一致
          CHINESE_STOCKS_DB_URL: ${{ secrets.CHINESE_STOCKS_DB_URL }} 
          FINNHUB_API_KEY: ${{ secrets.FINNHUB_API_KEY }}
          DEBUG: ${{ github.event.inputs.debug_mode || 'false' }}
        
        # 运行我们100%确认正确的脚本
        run: node _scripts/update-chinese-stocks-data.mjs
        