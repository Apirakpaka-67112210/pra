const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/rooms - ดูรายการห้องทั้งหมด (ค้นหา / กรอง)
router.get('/', roomController.getAllRooms);

// GET /api/rooms/:id/availability - ดูช่วงเวลาที่ถูกจองของห้องในวันที่ระบุ
router.get('/:id/availability', roomController.getRoomSchedule);

// GET /api/rooms/:id - ดูรายละเอียดห้อง
router.get('/:id', roomController.getRoomById);

// POST /api/rooms - เพิ่มห้องประชุม (Admin only)
router.post('/', authenticateToken, requireAdmin, roomController.createRoom);

// PUT /api/rooms/:id - แก้ไขข้อมูลห้อง (Admin only)
router.put('/:id', authenticateToken, requireAdmin, roomController.updateRoom);

// DELETE /api/rooms/:id - ลบห้องประชุม (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, roomController.deleteRoom);

module.exports = router;

