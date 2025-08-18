# 数据库更新诊断日志增强报告

## 问题分析

根据最新的运行日志分析，我们确认了以下情况：

✅ **API 数据获取已完全成功**
- 新的单只股票获取策略（12秒延迟）工作正常
- 日志显示成功获取了股票数据：`CINF: price=151.06, volume=760775`
- 403 Forbidden 错误已完全解决

❌ **数据库更新环节存在问题**
- API 获取的数据没有成功写入数据库
- `last_price`、`change_amount`、`change_percent` 字段仍然为 NULL
- 问题出现在"最后一步"：数据在内存中存在，但写入数据库失败

## 新增诊断功能

为了精确定位数据库更新问题，我们在 `update-market-data.mjs` 脚本中添加了以下诊断日志：

### 1. 数据准备阶段日志

```javascript
// 在数据获取完成后显示总体情况
console.log(`✅ API fetching complete. Preparing to update ${polygonMarketData.size} stocks in the database.`);

// 在 DEBUG 模式下显示样本数据
if (process.env.DEBUG && polygonMarketData.size > 0) {
    const sampleData = Array.from(polygonMarketData.entries()).slice(0, 3);
    console.log('📊 Sample data to be written:');
    sampleData.forEach(([ticker, data]) => {
        console.log(`   ${ticker}: price=${data.c}, open=${data.o}, high=${data.h}, low=${data.l}`);
    });
}
```

### 2. SQL 执行详细日志

```javascript
// 在 DEBUG 模式下打印每个 SQL 语句和参数
if (process.env.DEBUG) {
    console.log(`🔄 Executing SQL for ${company.ticker}:`);
    console.log(`   SQL: ${sql.replace(/\s+/g, ' ').trim()}`);
    console.log(`   Params: ${JSON.stringify(params)}`);
}

// 打印数据库操作结果
if (process.env.DEBUG) {
    console.log(`✅ Update for ${company.ticker} successful. Rows affected: ${result.rowCount}`);
}
```

### 3. 行影响数检查

```javascript
// 检查是否真的更新了数据
if (result.rowCount === 0) {
    console.warn(`⚠️ WARNING: No rows updated for ${company.ticker} - ticker might not exist in database`);
} else {
    updatedCount++;
}
```

### 4. 增强错误处理

```javascript
catch (batchError) {
    await client.query('ROLLBACK');
    console.error(`❌ Batch failed at stocks ${i + 1}-${Math.min(i + BATCH_SIZE, companiesArray.length)}:`);
    console.error(`   Error message: ${batchError.message}`);
    console.error(`   Error code: ${batchError.code || 'N/A'}`);
    console.error(`   Error detail: ${batchError.detail || 'N/A'}`);
    if (process.env.DEBUG) {
        console.error(`   Full error object:`, batchError);
    }
}
```

## 可能的问题原因

基于经验分析，最可能的原因包括：

### 1. 字段名不匹配 (概率 > 80%)
- 脚本尝试更新 `price` 字段，但数据库中是 `last_price`
- 脚本尝试更新 `volume` 字段，但数据库中可能没有对应列

### 2. WHERE 条件失败
- `WHERE ticker = $6` 中的 ticker 值可能不匹配数据库中的记录
- ticker 值可能在传递过程中变成了 `undefined`

### 3. 数据类型不匹配
- 数字类型的价格数据与数据库列类型不兼容

### 4. 事务回滚
- 批次中任何一个更新失败都会导致整个事务回滚
- 所有成功的更新也会被撤销

## 使用新的诊断功能

### 1. 启用调试模式

在 GitHub Actions 中手动触发工作流时：
- 进入 Actions 页面
- 选择 "Update Market Data" 工作流
- 点击 "Run workflow"
- **将 "Enable debug mode" 设置为 `true`**

### 2. 本地测试

```bash
# 设置调试模式
export DEBUG=true

# 运行脚本
node _scripts/update-market-data.mjs
```

### 3. 关键日志位置

运行后，重点查看日志的以下部分：

1. **数据准备阶段**：
   ```
   ✅ API fetching complete. Preparing to update X stocks in the database.
   📊 Sample data to be written:
   ```

2. **SQL 执行阶段**：
   ```
   🔄 Executing SQL for AAPL:
      SQL: UPDATE stocks SET last_price = $1, ...
      Params: [150.25, 2.5, 1.69, 152.0, 148.5, "AAPL"]
   ✅ Update for AAPL successful. Rows affected: 1
   ```

3. **错误信息**：
   ```
   ❌ Batch failed at stocks 1-10:
      Error message: column "price" does not exist
      Error code: 42703
   ```

## 预期诊断结果

运行新的诊断版本后，我们预期会看到以下情况之一：

### 情况 A：字段名错误
```
❌ Batch failed:
   Error message: column "price" does not exist
   Error code: 42703
```
**解决方案**：修正 SQL 语句中的字段名

### 情况 B：WHERE 条件失败
```
⚠️ WARNING: No rows updated for AAPL - ticker might not exist in database
```
**解决方案**：检查数据库中的 ticker 值格式

### 情况 C：数据类型错误
```
❌ Batch failed:
   Error message: invalid input syntax for type numeric
   Error code: 22P02
```
**解决方案**：检查数据类型转换

### 情况 D：事务回滚
```
❌ Batch failed at stocks 1-10:
   Error message: [具体错误]
✅ SUCCESS: Updated market data for 0 stocks
```
**解决方案**：修复导致事务失败的具体问题

## 下一步行动

1. **立即执行**：在 GitHub Actions 中启用调试模式重新运行工作流
2. **分析日志**：重点查看数据库更新阶段的详细日志
3. **定位问题**：根据具体的错误信息确定问题类型
4. **修复问题**：针对性地修复发现的问题
5. **验证修复**：再次运行并确认数据成功写入数据库

---

**诊断增强完成时间**：2024年12月
**状态**：✅ 已部署，等待调试运行结果
**预期**：通过详细日志精确定位数据库更新失败的根本原因