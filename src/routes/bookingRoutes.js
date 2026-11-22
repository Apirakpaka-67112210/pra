const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/auth');

// All booking routes require authentication
router.use(authenticateToken);

// GET /api/bookings - ดูรายการจอง
router.get('/', bookingController.getAllBookings);

// GET /api/bookings/:id - ดูรายละเอียดการจอง
router.get('/:id', bookingController.getBookingById);

// POST /api/bookings - สร้างการจองใหม่ (ป้องกัน double booking)
router.post('/', bookingController.createBooking);

// PUT /api/bookings/:id - แก้ไขการจอง / อนุมัติ / ปฏิเสธ
router.put('/:id', bookingController.updateBooking);

// DELETE /api/bookings/:id - ยกเลิกการจอง
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;

