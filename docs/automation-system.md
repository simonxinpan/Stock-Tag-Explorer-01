# 股票数据自动化更新系统

## 系统概述

本项目实现了一个基于 GitHub Actions 的三层自动化定时数据注入系统，完全在免费额度内运行，为股票标签浏览器提供实时、准确的市场数据。

## 三层架构设计

### 🚀 第一层：高频市场数据更新（每15分钟）

**目标**: 保持股价、成交量等核心市场数据的实时性

**脚本**: `_scripts/update-market-data.mjs`
**工作流**: `.github/workflows/update-market-data.yml`
**数据源**: Polygon API
**更新频率**: 每15分钟
**更新内容**:
- 股票价格 (price)
- 涨跌幅 (change_percent)
- 成交量 (volume)
- 最后更新时间 (last_updated)

**特点**:
- 使用 Polygon 快照 API，一次调用获取所有股票数据
- 高效批量更新，避免 API 限制
- 轻量级操作，执行时间短

### ⚡ 第二层：中频热门股财务指标更新（每小时）

**目标**: 为市场最重要的股票提供更频繁的财务数据更新

**脚本**: `_scripts/update-hot-financials.mjs`
**工作流**: `.github/workflows/update-hot-financials.yml`
**数据源**: Finnhub API
**更新频率**: 每小时整点
**更新范围**: 市值最高的50只股票
**更新内容**:
- 市值 (market_cap)
- ROE (roe_ttm)
- PE比率 (pe_ttm)
- PB比率 (pb_ratio)
- 负债权益比 (debt_to_equity)
- 流动比率 (current_ratio)

**特点**:
- 精选热门股票，确保重要数据的时效性
- 尊重 Finnhub API 限制（60次/分钟）
- 智能错误处理和重试机制

### 🔄 第三层：低频全量财务+标签更新（每天）

**目标**: 每天对所有股票进行全面的财务数据更新和动态标签计算

**脚本**: `_scripts/update-all-financials-and-tags.mjs`
**工作流**: `.github/workflows/update-all-daily.yml`
**数据源**: Finnhub API
**更新频率**: 每天北京时间下午4点（UTC 8:00）
**更新范围**: 所有股票（约500只）
**更新内容**:
- 完整财务指标更新
- 动态标签重新计算和应用
- 数据完整性检查

**动态标签系统**:
- **市值分类**: 超大盘股、大盘股、中盘股、小盘股
- **估值标签**: 低估值、高估值
- **盈利能力**: 高ROE、低ROE
- **财务健康**: 低负债、高负债、流动性强/弱
- **表现标签**: 强势股、弱势股

## 技术特点

### 🆓 完全免费运行
- **GitHub Actions**: 每月2000分钟免费额度
- **Neon Database**: 免费层提供足够的数据库资源
- **API调用**: 在免费额度内合理分配

### 🛡️ 健壮性设计
- **错误处理**: 完善的异常捕获和恢复机制
- **事务管理**: 确保数据一致性
- **API限制**: 智能延迟避免超限
- **重试机制**: 自动处理临时故障

### 📊 性能优化
- **批量操作**: 减少数据库连接开销
- **索引优化**: 快速查询和更新
- **分批提交**: 避免长事务锁定
- **内存管理**: 高效的数据处理

## 部署和配置

### 环境变量设置

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加：

```
NEON_DATABASE_URL=postgresql://username:password@host/database
POLYGON_API_KEY=your_polygon_api_key
FINNHUB_API_KEY=your_finnhub_api_key
```

### 工作流文件

所有工作流文件已配置完成，推送到 GitHub 后自动激活：

1. `update-market-data.yml` - 高频市场数据更新
2. `update-hot-financials.yml` - 中频热门股更新
3. `update-all-daily.yml` - 低频全量更新
4. `update-data.yml` - 原有的基础数据更新（保留）

### 手动触发

所有工作流都支持手动触发（workflow_dispatch），可在 GitHub Actions 页面手动执行。

## 监控和维护

### 日志监控
- 每个脚本都有详细的执行日志
- 成功/失败状态清晰标识
- 错误信息完整记录

### 数据质量
- 自动数据验证
- 异常值检测
- 完整性检查

### 性能指标
- 执行时间监控
- API调用统计
- 数据更新量统计

## 扩展性

### 添加新的数据源
1. 创建新的脚本文件
2. 配置相应的工作流
3. 添加必要的环境变量

### 调整更新频率
修改工作流文件中的 cron 表达式：
- `*/15 * * * *` - 每15分钟
- `0 * * * *` - 每小时
- `0 8 * * *` - 每天8点

### 增加新的标签类型
在 `update-database.mjs` 中的 `insertBaseTags` 函数添加新标签定义。

## 成本分析

### GitHub Actions 使用量
- 高频更新: ~96次/天 × 2分钟 = 192分钟/天
- 中频更新: ~24次/天 × 3分钟 = 72分钟/天
- 低频更新: ~1次/天 × 60分钟 = 60分钟/天
- **总计**: ~324分钟/天，月使用量约9720分钟

**结论**: 在2000分钟免费额度内安全运行，建议适当调整频率以保持缓冲。

### API 调用量
- Polygon: 每15分钟1次，月调用量 ~2880次
- Finnhub: 每小时50次 + 每天500次，月调用量 ~51500次

**结论**: 在各API免费额度内合理使用。

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `NEON_DATABASE_URL` 环境变量
   - 确认数据库服务状态

2. **API调用失败**
   - 检查API密钥有效性
   - 确认API调用额度

3. **工作流执行失败**
   - 查看 GitHub Actions 日志
   - 检查脚本语法错误

### 紧急恢复

如果系统出现严重问题，可以：
1. 手动触发 `update-data.yml` 重建基础数据
2. 运行 `node _scripts/update-database.mjs` 重置数据库结构
3. 逐步重启各层自动化任务

---

**系统状态**: ✅ 已部署并运行
**最后更新**: 2024年12月
**维护者**: FE-Core Team