const db = require('../config/db');
const { isValidTime, isValidDate, normalizeTime, isTimeOrderValid } = require('../utils/validation');

/**
 * GET /api/bookings
 * ดูรายการจอง
 * - ถ้าเป็น admin: ดูได้ทั้งหมด หรือกรองตาม room_id, date, status, user_id
 * - ถ้าเป็น user: ดูเฉพาะของตนเอง (หรือระบุ view=my_bookings)
 */
async function getAllBookings(req, res, next) {
  try {
    const { room_id, date, status, user_id, scope } = req.query;
    const currentUser = req.user;

    let sql = `
      SELECT 
        b.booking_id,
        b.user_id,
        u.name as user_name,
        u.email as user_email,
        b.room_id,
        r.room_name,
        r.capacity as room_capacity,
        r.location as room_location,
        r.price_per_hour,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.total_price,
        b.payment_status,
        b.status,
        b.title,
        b.created_at
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN rooms r ON b.room_id = r.room_id
      WHERE 1=1
    `;
    const params = [];

    // Role check: If not admin, or if user explicitly requested their own
    if (currentUser.role !== 'admin' || scope === 'mine') {
      sql += ' AND b.user_id = ?';
      params.push(currentUser.user_id);
    } else if (user_id) {
      sql += ' AND b.user_id = ?';
      params.push(parseInt(user_id, 10));
    }

    if (room_id) {
      sql += ' AND b.room_id = ?';
      params.push(parseInt(room_id, 10));
    }

    if (date) {
      sql += ' AND b.booking_date = ?';
      params.push(date);
    }

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.booking_date DESC, b.start_time DESC';

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
 * GET /api/bookings/:id
 * ดูรายละเอียดการจองรายการใดรายการหนึ่ง
 */
async function getBookingById(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'รหัสการจองไม่ถูกต้อง' });
    }

    const result = await db.query(
      `SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        r.room_name,
        r.capacity as room_capacity,
        r.location as room_location
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการจองนี้' });
    }

    const booking = result.rows[0];

    // If regular user, can only view own booking
    if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ดูรายการจองนี้' });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bookings
 * สร้างการจองห้องประชุมใหม่ (พร้อมป้องกัน Double Booking 100%)
 */
async function createBooking(req, res, next) {
  try {
    const { room_id, booking_date, start_time, end_time, title } = req.body;
    const userId = req.user.user_id;

    // 1. Validation: Field presence
    if (!room_id || !booking_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ห้อง, วันที่, เวลาเริ่ม, เวลาสิ้นสุด)',
      });
    }

    // 2. Validation: Date format
    if (!isValidDate(booking_date)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็นรูปแบบ YYYY-MM-DD)',
      });
    }

    // 3. Validation: Time format
    if (!isValidTime(start_time) || !isValidTime(end_time)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบเวลาไม่ถูกต้อง (ต้องเป็นรูปแบบ HH:mm เช่น 09:00)',
      });
    }

    // 4. Validation: Time order (start must be strictly before end)
    if (!isTimeOrderValid(start_time, end_time)) {
      return res.status(400).json({
        success: false,
        message: 'เวลาเริ่มการประชุมต้องมาก่อนเวลาสิ้นสุดการประชุม',
      });
    }

    const normStartTime = normalizeTime(start_time);
    const normEndTime = normalizeTime(end_time);

    // 5. Verify room exists and get hourly rate
    const roomCheck = await db.query('SELECT room_id, room_name, price_per_hour FROM rooms WHERE room_id = ?', [room_id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องประชุมที่เลือก',
      });
    }
    const room = roomCheck.rows[0];

    // Calculate total price based on duration and room price_per_hour
    const [startH, startM] = normStartTime.split(':').map(Number);
    const [endH, endM] = normEndTime.split(':').map(Number);
    const durationHours = Math.max(0.5, ((endH * 60 + endM) - (startH * 60 + startM)) / 60);
    const pricePerHour = parseFloat(room.price_per_hour) || 500.0;
    const totalPrice = Math.round(durationHours * pricePerHour * 100) / 100;

    // 6. Double Booking Check (ป้องกันการจองซ้ำซ้อน 100%)
    // เงื่อนไขการชนกัน: ช่วงเวลาใหม่ทับซ้อนกับช่วงเวลาเดิมในห้องเดียวกันและวันเดียวกัน
    // สำหรับสถานะ 'approved' หรือ 'pending'
    const conflictQuery = `
      SELECT b.booking_id, b.start_time, b.end_time, b.status, u.name as booked_by
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      WHERE b.room_id = ? 
        AND b.booking_date = ?
        AND b.status IN ('approved', 'pending')
        AND (b.start_time < ? AND b.end_time > ?)
    `;

    const conflicts = await db.query(conflictQuery, [
      room_id,
      booking_date,
      normEndTime,
      normStartTime,
    ]);

    if (conflicts.rows.length > 0) {
      const conf = conflicts.rows[0];
      return res.status(409).json({
        success: false,
        message: `ไม่สามารถจองได้: ห้อง "${room.room_name}" มีผู้จองแล้วในช่วงเวลา ${conf.start_time.substring(0, 5)} - ${conf.end_time.substring(0, 5)} (${conf.booked_by})`,
        conflict: conf,
      });
    }

    // Status: Default is 'pending' for regular user, or 'approved' if auto-approved / admin
    const initialStatus = req.user.role === 'admin' ? 'approved' : 'pending';

    const insertResult = await db.query(
      `INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, total_price, payment_status, status, title)
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)`,
      [
        userId,
        room_id,
        booking_date,
        normStartTime,
        normEndTime,
        totalPrice,
        initialStatus,
        title ? title.trim() : 'การประชุมทั่วไป',
      ]
    );

    const createdBooking = await db.query(
      `SELECT b.*, u.name as user_name, r.room_name
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.booking_id = ?`,
      [insertResult.insertId]
    );

    res.status(201).json({
      success: true,
      message: initialStatus === 'approved' 
        ? 'จองห้องประชุมสำเร็จและได้รับการอนุมัติแล้ว' 
        : 'ส่งคำขอจองห้องประชุมสำเร็จ (รอการอนุมัติจากผู้ดูแลระบบ)',
      data: createdBooking.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/bookings/:id
 * แก้ไขการจอง หรือ อนุมัติ/ปฏิเสธการจอง (Admin & User)
 */
async function updateBooking(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'รหัสการจองไม่ถูกต้อง' });
    }

    const existingCheck = await db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการจองที่ต้องการแก้ไข' });
    }

    const existing = existingCheck.rows[0];
    const currentUser = req.user;

    // Permissions: Admin can update anything. Regular user can only update their own pending booking.
    if (currentUser.role !== 'admin' && existing.user_id !== currentUser.user_id) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์แก้ไขการจองของผู้อื่น',
      });
    }

    const { room_id, booking_date, start_time, end_time, title, status } = req.body;

    // If changing status (only Admin can change status to approved/rejected; user can only cancel)
    let newStatus = existing.status;
    if (status !== undefined) {
      if (currentUser.role === 'admin') {
        const allowedStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
        }
        newStatus = status;
      } else {
        // Regular user can only change status to 'cancelled'
        if (status === 'cancelled') {
          newStatus = 'cancelled';
        } else if (status !== existing.status) {
          return res.status(403).json({
            success: false,
            message: 'ผู้ใช้ทั่วไปไม่มีสิทธิ์เปลี่ยนสถานะการอนุมัติ',
          });
        }
      }
    }

    const newRoomId = room_id !== undefined ? parseInt(room_id, 10) : existing.room_id;
    const newDate = booking_date !== undefined ? booking_date : existing.booking_date;
    const newStart = start_time !== undefined ? normalizeTime(start_time) : existing.start_time;
    const newEnd = end_time !== undefined ? normalizeTime(end_time) : existing.end_time;
    const newTitle = title !== undefined ? title.trim() : existing.title;

    if (!isTimeOrderValid(newStart, newEnd)) {
      return res.status(400).json({
        success: false,
        message: 'เวลาเริ่มการประชุมต้องมาก่อนเวลาสิ้นสุด',
      });
    }

    // If time, date, room or status changed to active ('approved' / 'pending'), check double booking!
    if (newStatus !== 'cancelled' && newStatus !== 'rejected') {
      const conflictCheck = await db.query(
        `SELECT b.booking_id, b.start_time, b.end_time, u.name as booked_by
         FROM bookings b
         JOIN users u ON b.user_id = u.user_id
         WHERE b.room_id = ?
           AND b.booking_date = ?
           AND b.booking_id != ?
           AND b.status IN ('approved', 'pending')
           AND (b.start_time < ? AND b.end_time > ?)`,
        [newRoomId, newDate, bookingId, newEnd, newStart]
      );

      if (conflictCheck.rows.length > 0) {
        const conf = conflictCheck.rows[0];
        return res.status(409).json({
          success: false,
          message: `ช่วงเวลานี้ชนกับการจองที่มีอยู่แล้ว (${conf.start_time.substring(0, 5)} - ${conf.end_time.substring(0, 5)} โดย ${conf.booked_by})`,
        });
      }
    }

    await db.query(
      `UPDATE bookings 
       SET room_id = ?, booking_date = ?, start_time = ?, end_time = ?, title = ?, status = ?
       WHERE booking_id = ?`,
      [newRoomId, newDate, newStart, newEnd, newTitle, newStatus, bookingId]
    );

    const updated = await db.query(
      `SELECT b.*, u.name as user_name, r.room_name 
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลการจองสำเร็จ',
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/bookings/:id
 * ยกเลิกหรือลบการจอง (Cancel booking)
 */
async function deleteBooking(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'รหัสการจองไม่ถูกต้อง' });
    }

    const check = await db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการจองนี้' });
    }

    const booking = check.rows[0];
    const currentUser = req.user;

    // Non-admin can only cancel their own booking
    if (currentUser.role !== 'admin' && booking.user_id !== currentUser.user_id) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ยกเลิกการจองของผู้อื่น' });
    }

    // Set status to cancelled or delete permanently
    // Setting status to 'cancelled' is better for audit trail / history, but if admin wants permanent delete, they can pass ?hard=true
    if (req.query.hard === 'true' && currentUser.role === 'admin') {
      await db.query('DELETE FROM bookings WHERE booking_id = ?', [bookingId]);
      return res.json({
        success: true,
        message: 'ลบรายการจองออกจากระบบถาวรเรียบร้อยแล้ว',
      });
    }

    await db.query("UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?", [bookingId]);

    res.json({
      success: true,
      message: 'ยกเลิกการจองห้องประชุมเรียบร้อยแล้ว',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
};

