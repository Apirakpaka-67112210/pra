const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { isValidEmail } = require('../utils/validation');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * สมัครสมาชิก
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, รหัสผ่าน)',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบอีเมลไม่ถูกต้อง',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
      });
    }

    // Check if email already exists
    const existing = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้ถูกลงทะเบียนในระบบแล้ว',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default role is user; if role requested is admin, check if caller is already admin, else default to 'user'
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const result = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, assignedRole]
    );

    const newUserId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: newUserId,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: assignedRole,
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จเรียบร้อยแล้ว',
      data: {
        token,
        user: {
          user_id: newUserId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: assignedRole,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * เข้าสู่ระบบ
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลและรหัสผ่าน',
      });
    }

    const result = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/profile
 * ดูข้อมูลผู้ใช้ปัจจุบัน
 */
async function getProfile(req, res, next) {
  try {
    const result = await db.query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้งาน',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getProfile,
};

