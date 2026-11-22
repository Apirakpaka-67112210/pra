const db = require('../config/db');

/**
 * GET /api/rooms
 * ดูรายการห้องทั้งหมด (พร้อมรองรับการค้นหาแบบ dynamic search และ filter ความจุ)
 */
async function getAllRooms(req, res, next) {
  try {
    const { search, min_capacity } = req.query;
    let sql = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (room_name LIKE ? OR location LIKE ? OR equipment LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (min_capacity && !isNaN(min_capacity)) {
      sql += ' AND capacity >= ?';
      params.push(parseInt(min_capacity, 10));
    }

    sql += ' ORDER BY room_id ASC';

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
 * GET /api/rooms/:id
 * ดูรายละเอียดห้อง
 */
async function getRoomById(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'รหัสห้องประชุมไม่ถูกต้อง' });
    }

    const result = await db.query('SELECT * FROM rooms WHERE room_id = ?', [roomId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบห้องประชุมที่ระบุ' });
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
 * POST /api/rooms
 * เพิ่มห้องประชุม (Admin only)
 */
async function createRoom(req, res, next) {
  try {
    const { room_name, capacity, location, price_per_hour, description, equipment } = req.body;

    if (!room_name || !capacity || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลห้องให้ครบถ้วน (ชื่อห้อง, ความจุ, สถานที่ตั้ง)',
      });
    }

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ความจุของห้องต้องเป็นตัวเลขที่มากกว่า 0',
      });
    }

    const priceNum = price_per_hour !== undefined ? parseFloat(price_per_hour) : 500.0;

    const result = await db.query(
      'INSERT INTO rooms (room_name, capacity, location, price_per_hour, description, equipment) VALUES (?, ?, ?, ?, ?, ?)',
      [
        room_name.trim(),
        capNum,
        location.trim(),
        priceNum,
        description ? description.trim() : '',
        equipment ? equipment.trim() : '',
      ]
    );

    const newRoom = await db.query('SELECT * FROM rooms WHERE room_id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'เพิ่มห้องประชุมสำเร็จ',
      data: newRoom.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/rooms/:id
 * แก้ไขข้อมูลห้อง (Admin only)
 */
async function updateRoom(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'รหัสห้องประชุมไม่ถูกต้อง' });
    }

    const existing = await db.query('SELECT * FROM rooms WHERE room_id = ?', [roomId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบห้องประชุมที่ต้องการแก้ไข' });
    }

    const { room_name, capacity, location, price_per_hour, description, equipment } = req.body;

    const updatedName = room_name !== undefined ? room_name.trim() : existing.rows[0].room_name;
    const updatedCap = capacity !== undefined ? parseInt(capacity, 10) : existing.rows[0].capacity;
    const updatedLoc = location !== undefined ? location.trim() : existing.rows[0].location;
    const updatedPrice = price_per_hour !== undefined ? parseFloat(price_per_hour) : (existing.rows[0].price_per_hour || 500.0);
    const updatedDesc = description !== undefined ? description.trim() : existing.rows[0].description;
    const updatedEq = equipment !== undefined ? equipment.trim() : existing.rows[0].equipment;

    if (isNaN(updatedCap) || updatedCap <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ความจุของห้องต้องเป็นตัวเลขที่มากกว่า 0',
      });
    }

    await db.query(
      'UPDATE rooms SET room_name = ?, capacity = ?, location = ?, price_per_hour = ?, description = ?, equipment = ? WHERE room_id = ?',
      [updatedName, updatedCap, updatedLoc, updatedPrice, updatedDesc, updatedEq, roomId]
    );

    const updatedRoom = await db.query('SELECT * FROM rooms WHERE room_id = ?', [roomId]);

    res.json({
      success: true,
      message: 'แก้ไขข้อมูลห้องประชุมสำเร็จ',
      data: updatedRoom.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/rooms/:id
 * ลบห้องประชุม (Admin only)
 */
async function deleteRoom(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'รหัสห้องประชุมไม่ถูกต้อง' });
    }

    const existing = await db.query('SELECT * FROM rooms WHERE room_id = ?', [roomId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบห้องประชุมที่ต้องการลบ' });
    }

    await db.query('DELETE FROM rooms WHERE room_id = ?', [roomId]);

    res.json({
      success: true,
      message: `ลบห้องประชุม "${existing.rows[0].room_name}" เรียบร้อยแล้ว`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rooms/:id/availability?date=YYYY-MM-DD
 * ตรวจสอบช่วงเวลาที่จองแล้วของห้องในวันที่กำหนด
 */
async function getRoomSchedule(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT b.booking_id, b.start_time, b.end_time, b.status, b.title, u.name as booked_by
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       WHERE b.room_id = ? AND b.booking_date = ? AND b.status IN ('approved', 'pending')
       ORDER BY b.start_time ASC`,
      [roomId, date]
    );

    res.json({
      success: true,
      room_id: roomId,
      date,
      booked_slots: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomSchedule,
};

