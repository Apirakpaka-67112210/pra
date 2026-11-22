const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register - สมัครสมาชิก
router.post('/register', authController.register);

// POST /api/auth/login - เข้าสู่ระบบ
router.post('/login', authController.login);

// GET /api/auth/profile - ดูข้อมูลผู้ใช้
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;

