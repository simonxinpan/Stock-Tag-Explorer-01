import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('🔧 数据库连接配置:', {
  url: process.env.DATABASE_URL ? '已配置' : '未配置',
  ssl: '已启用'
});

/**
 * 添加Polygon API的新字段到stocks表
 * 包括：vwap(成交量加权平均价)、trade_count(交易笔数)、is_otc(是否场外交易)、turnover(成交额)
 */
async function addPolygonFields() {
  let client;
  
  try {
    console.log('🔄 开始添加Polygon API新字段...');
    console.log('📡 正在连接数据库...');
    
    client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 检查stocks表是否存在
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stocks'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ stocks表不存在，请先运行数据库初始化脚本');
      return;
    }
    
    // 检查哪些字段已经存在
    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stocks'
    `);
    
    const columnNames = existingColumns.rows.map(row => row.column_name);
    console.log('📋 现有字段:', columnNames);
    
    // 定义需要添加的新字段
    const newFields = [
      {
        name: 'vwap',
        type: 'NUMERIC(16, 4)',
        comment: '成交量加权平均价 (Volume Weighted Average Price)'
      },
      {
        name: 'trade_count',
        type: 'BIGINT',
        comment: '交易笔数 (Number of trades)'
      },
      {
        name: 'is_otc',
        type: 'BOOLEAN DEFAULT FALSE',
        comment: '是否为场外交易 (Over-the-counter trading)'
      },
      {
        name: 'turnover',
        type: 'NUMERIC(20, 2)',
        comment: '成交额 (Turnover amount)'
      },
      {
        name: 'open_price',
        type: 'NUMERIC(10, 2)',
        comment: '开盘价 (Opening price)'
      },
      {
        name: 'high_price',
        type: 'NUMERIC(10, 2)',
        comment: '最高价 (High price)'
      },
      {
        name: 'low_price',
        type: 'NUMERIC(10, 2)',
        comment: '最低价 (Low price)'
      },
      {
        name: 'previous_close',
        type: 'NUMERIC(10, 2)',
        comment: '前收盘价 (Previous close price)'
      },
      {
        name: 'volume',
        type: 'BIGINT',
        comment: '成交量 (Trading volume)'
      }
    ];
    
    // 添加缺失的字段
    for (const field of newFields) {
      if (!columnNames.includes(field.name)) {
        console.log(`➕ 添加字段: ${field.name} (${field.comment})`);
        
        const addColumnSQL = `
          ALTER TABLE stocks 
          ADD COLUMN ${field.name} ${field.type};
        `;
        
        await client.query(addColumnSQL);
        
        // 添加字段注释
        const commentSQL = `
          COMMENT ON COLUMN stocks.${field.name} IS '${field.comment}';
        `;
        
        await client.query(commentSQL);
        
        console.log(`✅ 字段 ${field.name} 添加成功`);
      } else {
        console.log(`⏭️ 字段 ${field.name} 已存在，跳过`);
      }
    }
    
    // 创建新字段的索引
    console.log('📊 创建新字段索引...');
    
    const indexes = [
      {
        name: 'idx_stocks_vwap',
        column: 'vwap',
        description: 'VWAP索引，用于主力动向榜'
      },
      {
        name: 'idx_stocks_trade_count',
        column: 'trade_count',
        description: '交易笔数索引，用于散户热门榜'
      },
      {
        name: 'idx_stocks_turnover',
        column: 'turnover',
        description: '成交额索引，用于成交额榜'
      },
      {
        name: 'idx_stocks_is_otc',
        column: 'is_otc',
        description: 'OTC标识索引'
      }
    ];
    
    for (const index of indexes) {
      try {
        const createIndexSQL = `
          CREATE INDEX IF NOT EXISTS ${index.name} 
          ON stocks(${index.column});
        `;
        
        await client.query(createIndexSQL);
        console.log(`✅ 索引 ${index.name} 创建成功 - ${index.description}`);
      } catch (indexError) {
        console.log(`⚠️ 索引 ${index.name} 创建失败:`, indexError.message);
      }
    }
    
    // 验证新字段
    console.log('🔍 验证新字段...');
    const updatedColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stocks'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 更新后的表结构:');
    updatedColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    console.log('🎉 Polygon API字段添加完成！');
    console.log('📝 新增字段说明:');
    console.log('  - vwap: 成交量加权平均价，用于判断主力成本线');
    console.log('  - trade_count: 交易笔数，用于分析散户vs机构参与度');
    console.log('  - is_otc: 场外交易标识，用于风险提示');
    console.log('  - turnover: 成交额，用于成交额榜单');
    console.log('  - open_price/high_price/low_price: 完整的OHLC数据');
    console.log('  - previous_close: 前收盘价，用于计算涨跌幅');
    console.log('  - volume: 成交量（重新添加，确保数据完整性）');
    
  } catch (error) {
    console.error('❌ 添加Polygon字段时出错:', error.message);
    console.error('❌ 错误详情:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
      console.log('🔌 数据库连接已释放');
    }
  }
}

// 主函数
async function main() {
  try {
    await addPolygonFields();
    console.log('✅ 数据库升级完成');
  } catch (error) {
    console.error('❌ 数据库升级失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}

// 备用检测方式
if (process.argv[1] && process.argv[1].endsWith('add-polygon-fields.mjs')) {
  main();
}

export { addPolygonFields };