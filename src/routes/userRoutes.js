const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All user management routes require admin role
router.use(authenticateToken, requireAdmin);

// GET /api/users - ดูรายชื่อผู้ใช้ทั้งหมด
router.get('/', userController.getAllUsers);

// GET /api/users/:id - ดูข้อมูลผู้ใช้ตาม ID
router.get('/:id', userController.getUserById);

// POST /api/users - สร้างผู้ใช้ใหม่
router.post('/', userController.createUser);

// PUT /api/users/:id - แก้ไขข้อมูลผู้ใช้
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - ลบผู้ใช้
router.delete('/:id', userController.deleteUser);

module.exports = router;

