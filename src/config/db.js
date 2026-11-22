const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let dbType = (process.env.DB_CLIENT || 'mysql').toLowerCase();
let mysqlPool = null;
let sqliteDb = null;

// Helper to run SQLite in Promise
function runSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], insertId: null, affectedRows: 0 });
      });
    } else {
      sqliteDb.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ rows: [], insertId: this.lastID, affectedRows: this.changes });
      });
    }
  });
}

// Convert MySQL SQL dialect to SQLite when running in SQLite mode
function convertSqlForSqlite(sql) {
  let converted = sql
    .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
    .replace(/INT\s+AUTOINCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/CURDATE\(\)/gi, "date('now', 'localtime')")
    .replace(/DATE_ADD\(date\('now', 'localtime'\),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, "date('now', 'localtime', '+$1 day')")
    .replace(/DATE_ADD\(CURDATE\(\),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, "date('now', 'localtime', '+$1 day')")
    .replace(/TIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
    .replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO');
  return converted;
}

/**
 * Universal Query Execution
 * Returns normalized object: { rows, insertId, affectedRows }
 */
async function query(sql, params = []) {
  if (dbType === 'mysql' && mysqlPool) {
    try {
      const [results] = await mysqlPool.execute(sql, params);
      if (Array.isArray(results)) {
        return { rows: results, insertId: null, affectedRows: 0 };
      } else {
        return {
          rows: [],
          insertId: results.insertId,
          affectedRows: results.affectedRows,
        };
      }
    } catch (err) {
      throw err;
    }
  } else if (sqliteDb) {
    const sqliteSql = convertSqlForSqlite(sql);
    return await runSqlite(sqliteSql, params);
  } else {
    throw new Error('Database is not initialized.');
  }
}

/**
 * Initialize Database tables and sample seed data
 */
async function initDatabase() {
  const chosenType = (process.env.DB_CLIENT || 'mysql').toLowerCase();

  if (chosenType === 'mysql') {
    try {
      console.log('🔄 Connecting to MySQL at ' + (process.env.DB_HOST || 'localhost') + '...');
      const tempConn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '3306', 10),
      });

      const dbName = process.env.DB_NAME || 'meeting_room_db';
      await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await tempConn.end();

      mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      await mysqlPool.query('SELECT 1');
      dbType = 'mysql';
      console.log(`✅ Connected successfully to MySQL database "${dbName}".`);

      await createTablesAndSeed();
      return { client: 'mysql', database: dbName };
    } catch (err) {
      console.warn('⚠️ Could not connect to MySQL server:', err.message);
      console.warn('⚡ Switching automatically to SQLite fallback for instant zero-config execution...');
      return await initSqlite();
    }
  } else {
    return await initSqlite();
  }
}

async function initSqlite() {
  dbType = 'sqlite';
  const dbPath = path.resolve(process.env.SQLITE_DB_PATH || './database.sqlite');
  console.log(`🔄 Initializing SQLite database at: ${dbPath}`);

  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ Failed to open SQLite database:', err);
        return reject(err);
      }
      try {
        await runSqlite('PRAGMA foreign_keys = ON;');
        await createTablesAndSeed();
        console.log('✅ SQLite database initialized successfully.');
        resolve({ client: 'sqlite', database: dbPath });
      } catch (tableErr) {
        reject(tableErr);
      }
    });
  });
}

async function createTablesAndSeed() {
  // 1. Users Table
  if (dbType === 'mysql') {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Rooms Table (with price_per_hour)
    await query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id INT AUTO_INCREMENT PRIMARY KEY,
        room_name VARCHAR(100) NOT NULL,
        capacity INT NOT NULL,
        location VARCHAR(150) NOT NULL,
        price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 500.00,
        description TEXT,
        equipment VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Bookings Table (with total_price & payment_status)
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        room_id INT NOT NULL,
        booking_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        title VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
      );
    `);

    // 4. Payments Table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'completed',
        transaction_ref VARCHAR(100),
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    // Safe column migrations for existing tables in MySQL
    try { await query('ALTER TABLE rooms ADD COLUMN price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 500.00'); } catch (e) {}
    try { await query('ALTER TABLE bookings ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00'); } catch (e) {}
    try { await query("ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'"); } catch (e) {}
  } else {
    // SQLite syntax
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        location TEXT NOT NULL,
        price_per_hour REAL NOT NULL DEFAULT 500.00,
        description TEXT,
        equipment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        booking_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        total_price REAL NOT NULL DEFAULT 0.00,
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        status TEXT NOT NULL DEFAULT 'pending',
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'completed',
        transaction_ref TEXT,
        paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    // Safe column migrations for existing tables in SQLite
    try { await runSqlite('ALTER TABLE rooms ADD COLUMN price_per_hour REAL DEFAULT 500.00;'); } catch (e) {}
    try { await runSqlite('ALTER TABLE bookings ADD COLUMN total_price REAL DEFAULT 0.00;'); } catch (e) {}
    try { await runSqlite("ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'unpaid';"); } catch (e) {}
  }

  // Check and seed default users
  const userCheck = await query('SELECT COUNT(*) as cnt FROM users');
  const count = userCheck.rows[0].cnt || userCheck.rows[0]['COUNT(*)'] || 0;

  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash('123456', salt);
  const dpuPassword = await bcrypt.hash('67112210', salt);

  if (parseInt(count, 10) === 0) {
    console.log('🌱 Seeding initial demo data (Admin, Users, Rooms, Bookings)...');

    // Insert Users
    await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['ผู้ดูแลระบบ (Admin)', 'admin@meeting.com', defaultPassword, 'admin']
    );
    await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['สมชาย สายไอที', 'somchai@meeting.com', defaultPassword, 'user']
    );
    await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['สมหญิง จริงใจ', 'somying@meeting.com', defaultPassword, 'user']
    );

    // Insert Rooms with price_per_hour
    const rooms = [
      ['ห้องประชุมบอร์ดรูม (Boardroom A)', 20, 'ชั้น 4 อาคารอำนวยการ', 600.00, 'ห้องประชุมระดับผู้บริหาร พร้อมระบบ Video Conference 4K และเครื่องเสียงระดับพรีเมียม', 'Projector 4K, Video Conf, Smart Board, Microphone'],
      ['ห้องประชุมคิดสร้างสรรค์ (Creative Lab)', 10, 'ชั้น 2 อาคารนวัตกรรม', 400.00, 'ห้องประชุมขนาดกลาง เหมาะสำหรับระดมสมอง จัด workshop และประชุมกลุ่มย่อย', 'Whiteboard, TV 65 นิ้ว, HDMI/Wireless Display'],
      ['ห้องประชุมแกรนด์ฮอลล์ (Grand Conference Hall)', 80, 'ชั้น 1 อาคารนวัตกรรม', 1200.00, 'ห้องประชุมขนาดใหญ่ รองรับการจัดอบรม สัมมนา และการประชุมทั้งองค์กร', 'Dual Projector, Audio System, 4 Wireless Mics, Stage Lighting'],
      ['ห้องประชุมย่อย 1 (Focus Room 1)', 4, 'ชั้น 3 อาคารอำนวยการ', 250.00, 'ห้องประชุมขนาดกะทัดรัด เป็นส่วนตัว เหมาะสำหรับคุยงาน 1-on-1 หรือสัมภาษณ์งาน', 'TV 43 นิ้ว, Whiteboard, High-speed Wi-Fi'],
      ['ห้องประชุมเทรนนิ่ง (Training Room)', 30, 'ชั้น 2 อาคารอำนวยการ', 500.00, 'ห้องประชุมแบบห้องเรียน เหมาะกับการอบรมเชิงปฏิบัติการและการเรียนการสอน', 'Projector, Sound Bar, Modular Desks, LAN Ports']
    ];

    for (const r of rooms) {
      await query(
        'INSERT INTO rooms (room_name, capacity, location, price_per_hour, description, equipment) VALUES (?, ?, ?, ?, ?, ?)',
        r
      );
    }

    // Insert sample bookings for today & tomorrow
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    const b1 = await query(
      'INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, total_price, payment_status, status, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 1, today, '09:00:00', '11:00:00', 1200.00, 'paid', 'approved', 'ประชุมวางแผนโครงการประจำไตรมาส']
    );

    // Add initial payment for b1
    if (b1.insertId) {
      await query(
        'INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, transaction_ref) VALUES (?, ?, ?, ?, ?, ?)',
        [b1.insertId, 2, 1200.00, 'promptpay', 'completed', 'PAY-DEMO-0001']
      );
    }

    await query(
      'INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, total_price, payment_status, status, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [3, 2, today, '13:30:00', '15:00:00', 600.00, 'paid', 'approved', 'Brainstorm ออกแบบ UI/UX ระบบใหม่']
    );
    await query(
      'INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, total_price, payment_status, status, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 3, tomorrow, '10:00:00', '12:00:00', 2400.00, 'unpaid', 'pending', 'สัมมนาแนะนำเทคโนโลยีใหม่สำหรับองค์กร']
    );

    console.log('✅ Demo seed data created successfully.');
  }

  // Ensure user 67112210@dpu.ac.th always exists with password 67112210
  const dpuCheck = await query('SELECT user_id FROM users WHERE email = ?', ['67112210@dpu.ac.th']);
  if (dpuCheck.rows.length === 0) {
    await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['นักศึกษา DPU (67112210)', '67112210@dpu.ac.th', dpuPassword, 'user']
    );
    console.log('✅ Created user 67112210@dpu.ac.th (Password: 67112210)');
  } else {
    await query('UPDATE users SET password = ? WHERE email = ?', [dpuPassword, '67112210@dpu.ac.th']);
  }
}

module.exports = {
  query,
  initDatabase,
  getDbType: () => dbType,
};
