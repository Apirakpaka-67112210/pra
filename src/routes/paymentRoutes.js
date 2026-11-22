const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All payment routes require authentication
router.use(authenticateToken);

// POST /api/payments - ดำเนินการชำระเงิน
router.post('/', paymentController.processPayment);

// GET /api/payments/booking/:bookingId - ดูใบเสร็จ/ประวัติชำระของรายการจอง
router.get('/booking/:bookingId', paymentController.getPaymentByBooking);

// GET /api/payments/stats - ดูสถิติรายได้ (Admin only)
router.get('/stats', requireAdmin, paymentController.getPaymentStats);

// GET /api/payments - ดูรายการชำระเงินทั้งหมด (Admin only)
router.get('/', requireAdmin, paymentController.getAllPayments);

module.exports = router;

