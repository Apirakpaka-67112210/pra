const db = require('./src/config/db');

async function run() {
  console.log('🔄 Initializing database schema and seed data...');
  try {
    const res = await db.initDatabase();
    console.log(`✅ Database initialization completed successfully (${res.client.toUpperCase()}).`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

run();

