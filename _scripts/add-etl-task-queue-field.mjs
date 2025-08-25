import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addTaskQueueField() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Adding ETL task queue field to stocks table...');
        
        // 检查字段是否已存在
        const checkField = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'stocks' 
            AND column_name = 'daily_data_last_updated'
        `);
        
        if (checkField.rows.length > 0) {
            console.log('✅ Field daily_data_last_updated already exists');
            return;
        }
        
        // 添加新字段
        await client.query(`
            ALTER TABLE stocks 
            ADD COLUMN daily_data_last_updated DATE
        `);
        
        console.log('✅ Successfully added daily_data_last_updated field');
        
        // 验证字段添加
        const verifyField = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'stocks' 
            AND column_name = 'daily_data_last_updated'
        `);
        
        if (verifyField.rows.length > 0) {
            console.log(`✅ Field verification successful: ${verifyField.rows[0].column_name} (${verifyField.rows[0].data_type})`);
        }
        
        // 显示当前stocks表结构
        const tableStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'stocks' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Current stocks table structure:');
        tableStructure.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
    } catch (error) {
        console.error('❌ Error adding ETL task queue field:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await addTaskQueueField();
        console.log('\n🎉 ETL task queue field setup completed successfully!');
    } catch (error) {
        console.error('💥 Setup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();