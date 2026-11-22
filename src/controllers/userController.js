const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { isValidEmail } = require('../utils/validation');

/**
 * GET /api/users
 * ดูรายชื่อผู้ใช้ทั้งหมด (Admin only)
 */
async function getAllUsers(req, res, next) {
  try {
    const { search, role } = req.query;
    let sql = 'SELECT user_id, name, email, role, created_at FROM users WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (role && role.trim()) {
      sql += ' AND role = ?';
      params.push(role.trim());
    }

    sql += ' ORDER BY user_id ASC';

    const result = await db.query(sql, params);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id
 * ดูข้อมูลผู้ใช้ตาม ID (Admin only)
 */
async function getUserById(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
    }

    const result = await db.query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้นี้' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users
 * สร้างผู้ใช้ใหม่ (Admin only)
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, รหัสผ่าน)',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    }

    const existing = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'อีเมลนี้มีอยู่ในระบบแล้ว' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const insert = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, assignedRole]
    );

    const newUser = await db.query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?',
      [insert.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'เพิ่มผู้ใช้งานสำเร็จ',
      data: newUser.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id
 * อัปเดตข้อมูลผู้ใช้ (Admin only)
 */
async function updateUser(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
    }

    const check = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข' });
    }

    const existing = check.rows[0];
    const { name, email, role, password } = req.body;

    const newName = name !== undefined ? name.trim() : existing.name;
    const newEmail = email !== undefined ? email.trim().toLowerCase() : existing.email;
    const newRole = role !== undefined ? role : existing.role;

    if (email && !isValidEmail(newEmail)) {
      return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    // Check duplicate email
    if (email && newEmail !== existing.email) {
      const dup = await db.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [newEmail, userId]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว' });
      }
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await db.query(
        'UPDATE users SET name = ?, email = ?, role = ?, password = ? WHERE user_id = ?',
        [newName, newEmail, newRole, hashedPassword, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET name = ?, email = ?, role = ? WHERE user_id = ?',
        [newName, newEmail, newRole, userId]
      );
    }

    const updated = await db.query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:id
 * ลบผู้ใช้ (Admin only)
 */
async function deleteUser(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
    }

    if (req.user.user_id === userId) {
      return res.status(400).json({
        success: false,
        message: 'คุณไม่สามารถลบบัญชีของตนเองที่กำลังเข้าสู่ระบบอยู่ได้',
      });
    }

    const check = await db.query('SELECT name FROM users WHERE user_id = ?', [userId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ที่ต้องการลบ' });
    }

    await db.query('DELETE FROM users WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      message: `ลบผู้ใช้ "${check.rows[0].name}" เรียบร้อยแล้ว`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};

