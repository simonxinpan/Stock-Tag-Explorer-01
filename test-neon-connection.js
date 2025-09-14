const { Pool } = require('pg');
require('dotenv').config();

async function testNeonConnection() {
  console.log('🔍 Testing Neon database connection...');
  
  const connectionString = process.env.DATABASE_URL;
  console.log('Connection string format:', connectionString ? 'Found' : 'Missing');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  // Extract parts for debugging
  const url = new URL(connectionString);
  console.log('Host:', url.hostname);
  console.log('Database:', url.pathname.slice(1));
  console.log('User:', url.username);
  console.log('Password length:', url.password ? url.password.length : 0);
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔌 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful:', result.rows[0]);
    
    client.release();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
  } finally {
    await pool.end();
  }
}

testNeonConnection().catch(console.error);