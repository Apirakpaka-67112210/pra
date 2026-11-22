const db = require('../config/db');

/**
 * POST /api/payments
 * ดำเนินการชำระเงินสำหรับรายการจอง
 */
async function processPayment(req, res, next) {
  try {
    const { booking_id, payment_method, card_details } = req.body;
    const currentUser = req.user;

    if (!booking_id || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสการจองและวิธีการชำระเงิน',
      });
    }

    const validMethods = ['promptpay', 'credit_card', 'bank_transfer'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'วิธีการชำระเงินไม่ถูกต้อง (รองรับ promptpay, credit_card, bank_transfer)',
      });
    }

    // Check booking existence
    const bookingQuery = await db.query(
      `SELECT b.*, r.room_name, r.price_per_hour, u.name as user_name, u.email as user_email
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       JOIN users u ON b.user_id = u.user_id
       WHERE b.booking_id = ?`,
      [booking_id]
    );

    if (bookingQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการจองนี้' });
    }

    const booking = bookingQuery.rows[0];

    // Ownership check (regular user can only pay their own booking)
    if (currentUser.role !== 'admin' && booking.user_id !== currentUser.user_id) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ชำระเงินสำหรับรายการจองนี้' });
    }

    // Check if already paid
    if (booking.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'รายการจองนี้ได้ทำการชำระเงินเรียบร้อยแล้ว',
      });
    }

    const amount = parseFloat(booking.total_price) || 500.0;

    // Generate unique transaction reference
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const transactionRef = `PAY-${dateStr}-${rand}`;

    // Insert payment record
    const payResult = await db.query(
      `INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, transaction_ref)
       VALUES (?, ?, ?, ?, 'completed', ?)`,
      [booking_id, booking.user_id, amount, payment_method, transactionRef]
    );

    // Update booking payment_status to 'paid'
    await db.query(
      "UPDATE bookings SET payment_status = 'paid' WHERE booking_id = ?",
      [booking_id]
    );

    const newPayment = await db.query(
      'SELECT * FROM payments WHERE payment_id = ?',
      [payResult.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'ชำระเงินสำเร็จเรียบร้อยแล้ว! ขอบคุณที่ใช้บริการ',
      data: {
        payment: newPayment.rows[0],
        receipt: {
          transaction_ref: transactionRef,
          booking_id: booking.booking_id,
          room_name: booking.room_name,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          user_name: booking.user_name,
          amount,
          payment_method,
          paid_at: newPayment.rows[0].paid_at || new Date().toISOString(),
          status: 'completed',
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments/booking/:bookingId
 * ดูข้อมูลการชำระเงินและใบเสร็จของรายการจอง
 */
async function getPaymentByBooking(req, res, next) {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const currentUser = req.user;

    const result = await db.query(
      `SELECT p.*, b.booking_date, b.start_time, b.end_time, b.title, r.room_name, u.name as user_name, u.email as user_email
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       JOIN rooms r ON b.room_id = r.room_id
       JOIN users u ON p.user_id = u.user_id
       WHERE p.booking_id = ?
       ORDER BY p.paid_at DESC LIMIT 1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ยังไม่พบข้อมูลการชำระเงินสำหรับรายการจองนี้',
      });
    }

    const payment = result.rows[0];

    if (currentUser.role !== 'admin' && payment.user_id !== currentUser.user_id) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ดูข้อมูลการชำระเงินนี้' });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments
 * ดูประวัติการชำระเงินทั้งหมด (Admin only)
 */
async function getAllPayments(req, res, next) {
  try {
    const { payment_method, status } = req.query;
    let sql = `
      SELECT p.*, b.booking_date, b.start_time, b.end_time, r.room_name, u.name as user_name, u.email as user_email
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN rooms r ON b.room_id = r.room_id
      JOIN users u ON p.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (payment_method) {
      sql += ' AND p.payment_method = ?';
      params.push(payment_method);
    }

    if (status) {
      sql += ' AND p.payment_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY p.paid_at DESC';

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
 * GET /api/payments/stats
 * สถิติรายได้และการชำระเงิน (Admin only)
 */
async function getPaymentStats(req, res, next) {
  try {
    const totalRev = await db.query(
      "SELECT SUM(amount) as total_revenue, COUNT(*) as total_transactions FROM payments WHERE payment_status = 'completed'"
    );

    const methodBreakdown = await db.query(
      "SELECT payment_method, COUNT(*) as count, SUM(amount) as revenue FROM payments WHERE payment_status = 'completed' GROUP BY payment_method"
    );

    res.json({
      success: true,
      data: {
        total_revenue: parseFloat(totalRev.rows[0].total_revenue) || 0,
        total_transactions: parseInt(totalRev.rows[0].total_transactions, 10) || 0,
        by_method: methodBreakdown.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  processPayment,
  getPaymentByBooking,
  getAllPayments,
  getPaymentStats,
};

