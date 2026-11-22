/**
 * Comprehensive Automated Test Suite
 * Tests Authentication, Rooms CRUD, Bookings CRUD, Strict Double Booking Prevention, and Admin APIs
 */
const http = require('http');
const app = require('../server');
const db = require('../src/config/db');

let server;
let port;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Meeting Room Booking System Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Initialize Database
    await db.initDatabase();

    // 2. Start HTTP Test Server on random available port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`🚀 Test server running on ${baseUrl} (${db.getDbType().toUpperCase()})\n`);
        resolve();
      });
    });

    // TEST 1: Health check endpoint
    const health = await request('/api/health');
    assert(health.status === 200 && health.body.status === 'OK', 'GET /api/health should return 200 OK');

    // TEST 2: Login with wrong password
    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@meeting.com', password: 'wrongpassword' },
    });
    assert(badLogin.status === 401 && badLogin.body.success === false, 'POST /api/auth/login with wrong password returns 401');

    // TEST 3: Login as Admin
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@meeting.com', password: '123456' },
    });
    assert(adminLogin.status === 200 && adminLogin.body.data.token, 'POST /api/auth/login as Admin returns JWT token');
    const adminToken = adminLogin.body.data.token;

    // TEST 4: Login as regular user
    const userLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'somchai@meeting.com', password: '123456' },
    });
    assert(userLogin.status === 200 && userLogin.body.data.user.role === 'user', 'POST /api/auth/login as regular User returns role "user"');
    const userToken = userLogin.body.data.token;
    const userId = userLogin.body.data.user.user_id;

    // TEST 4.1: Login as DPU Student user (67112210@dpu.ac.th / 67112210)
    const dpuLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: '67112210@dpu.ac.th', password: '67112210' },
    });
    assert(dpuLogin.status === 200 && dpuLogin.body.data.user.email === '67112210@dpu.ac.th', 'POST /api/auth/login as DPU Student (67112210@dpu.ac.th) succeeds');
    const dpuToken = dpuLogin.body.data.token;

    // TEST 5: GET /api/auth/profile
    const profile = await request('/api/auth/profile', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(profile.status === 200 && profile.body.data.email === 'somchai@meeting.com', 'GET /api/auth/profile retrieves current authenticated user');

    // TEST 6: GET /api/rooms
    const roomsList = await request('/api/rooms');
    assert(roomsList.status === 200 && Array.isArray(roomsList.body.data) && roomsList.body.data.length >= 5, 'GET /api/rooms returns seeded rooms list');

    // TEST 7: Regular user cannot create room (Forbidden 403)
    const userCreateRoom = await request('/api/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { room_name: 'Hacker Room', capacity: 10, location: 'Floor 1' },
    });
    assert(userCreateRoom.status === 403, 'POST /api/rooms by regular user is rejected with 403 Forbidden');

    // TEST 8: Admin can create room (CRUD: Create)
    const adminCreateRoom = await request('/api/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        room_name: 'ห้องประชุม VIP 99',
        capacity: 12,
        location: 'ชั้น 5 อาคารอำนวยการ',
        equipment: 'TV 85 นิ้ว, Whiteboard',
        description: 'ห้องประชุมพิเศษสำหรับงานสัมมนา',
      },
    });
    assert(adminCreateRoom.status === 201 && adminCreateRoom.body.data.room_id, 'POST /api/rooms by Admin creates new room (201 Created)');
    const createdRoomId = adminCreateRoom.body.data.room_id;

    // TEST 9: Admin can update room (CRUD: Update)
    const adminUpdateRoom = await request(`/api/rooms/${createdRoomId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { capacity: 16 },
    });
    assert(adminUpdateRoom.status === 200 && adminUpdateRoom.body.data.capacity === 16, 'PUT /api/rooms/:id by Admin updates room capacity');

    // =========================================================================
    // CORE TEST: 100% DOUBLE-BOOKING PREVENTION LOGIC
    // =========================================================================
    const testDate = '2026-12-01';

    // Step A: Book slot 14:00 - 16:00
    const booking1 = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        room_id: createdRoomId,
        booking_date: testDate,
        start_time: '14:00',
        end_time: '16:00',
        title: 'การประชุมทดสอบระบบ 1',
      },
    });
    assert(booking1.status === 201, 'Step A: Booking initial slot 14:00 - 16:00 succeeds (201)');
    const booking1Id = booking1.body.data.booking_id;

    // Step B: Double-Booking Conflict 1 (Overlap at end: 15:00 - 17:00)
    const conflict1 = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        room_id: createdRoomId,
        booking_date: testDate,
        start_time: '15:00',
        end_time: '17:00',
        title: 'พยายามจองทับซ้อนช่วงท้าย',
      },
    });
    assert(conflict1.status === 409 && conflict1.body.success === false, 'Step B: Overlapping booking (15:00-17:00) is BLOCKED with 409 Conflict');

    // Step C: Double-Booking Conflict 2 (Overlap at start: 13:00 - 15:00)
    const conflict2 = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        room_id: createdRoomId,
        booking_date: testDate,
        start_time: '13:00',
        end_time: '15:00',
        title: 'พยายามจองทับซ้อนช่วงต้น',
      },
    });
    assert(conflict2.status === 409 && conflict2.body.success === false, 'Step C: Overlapping booking (13:00-15:00) is BLOCKED with 409 Conflict');

    // Step D: Double-Booking Conflict 3 (Completely inside: 14:30 - 15:30)
    const conflict3 = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        room_id: createdRoomId,
        booking_date: testDate,
        start_time: '14:30',
        end_time: '15:30',
        title: 'พยายามจองข้างในช่วงเวลาเดิม',
      },
    });
    assert(conflict3.status === 409 && conflict3.body.success === false, 'Step D: Inner overlapping booking (14:30-15:30) is BLOCKED with 409 Conflict');

    // Step E: Double-Booking Conflict 4 (Enclosing: 13:00 - 17:00)
    const conflict4 = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        room_id: createdRoomId,
        booking_date: testDate,
        start_time: '13:00',
        end_time: '17:00',
        title: 'พยายามจองครอบเวลาเดิมทั้งหมด',
      },
    });
    assert(conflict4.status === 409 && conflict4.body.success === false, 'Step E: Enclosing overlapping booking (13:00-17:00) is BLOCKED with 409 Conflict');

    // Step F: Adjacent non-overlapping booking (16:00 - 17:00) MUST SUCCEED!
    const adjacentBooking = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        room_id: createdRoomId,
        booking_date: testDate,
        start_time: '16:00',
        end_time: '17:00',
        title: 'จองช่วงเวลาติดกันที่ไม่ทับซ้อน',
      },
    });
    assert(adjacentBooking.status === 201, 'Step F: Adjacent slot (16:00-17:00) exactly after end_time SUCCEEDS (201)');

    // Step G: Cancel booking 1
    const cancelRes = await request(`/api/bookings/${booking1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(cancelRes.status === 200, 'Step G: Cancel booking #1 succeeds (200 OK)');

    // Step H: Now the previously blocked slot (14:00 - 16:00) CAN BE BOOKED AGAIN!
    const rebookSlot = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        room_id: createdRoomId,
        booking_date: testDate,
        start_time: '14:00',
        end_time: '16:00',
        title: 'จองเวลาที่เพิ่งยกเลิกไป',
      },
    });
    assert(rebookSlot.status === 201, 'Step H: Previously cancelled slot is now successfully re-bookable!');

    // TEST 10: Admin approves booking
    const approveRes = await request(`/api/bookings/${rebookSlot.body.data.booking_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(approveRes.status === 200 && approveRes.body.data.status === 'approved', 'PUT /api/bookings/:id by Admin approves booking');

    // TEST 10.1: Process Payment for booking (POST /api/payments)
    const payRes = await request('/api/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        booking_id: rebookSlot.body.data.booking_id,
        payment_method: 'promptpay',
      },
    });
    assert(payRes.status === 201 && payRes.body.data.receipt.transaction_ref, 'POST /api/payments processes payment and generates receipt');

    // TEST 10.2: Get Payment Receipt (GET /api/payments/booking/:bookingId)
    const receiptRes = await request(`/api/payments/booking/${rebookSlot.body.data.booking_id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(receiptRes.status === 200 && receiptRes.body.data.payment_status === 'completed', 'GET /api/payments/booking/:id retrieves payment receipt');

    // TEST 10.3: Get Payment Revenue Stats (GET /api/payments/stats)
    const payStatsRes = await request('/api/payments/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(payStatsRes.status === 200 && payStatsRes.body.data.total_revenue > 0, 'GET /api/payments/stats returns total revenue');

    // TEST 11: GET /api/reports/stats (KPI & Dashboard)
    const statsRes = await request('/api/reports/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(statsRes.status === 200 && statsRes.body.data.kpi.double_booking_prevention.includes('100%'), 'GET /api/reports/stats returns 100% double-booking prevention KPI');

    // TEST 12: Admin User Management (CRUD)
    const createUserRes = await request('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'นักศึกษา ทดสอบ',
        email: 'student.test@meeting.com',
        password: 'password123',
        role: 'user',
      },
    });
    assert(createUserRes.status === 201 && createUserRes.body.data.user_id, 'POST /api/users by Admin creates new user');
    const newUserId = createUserRes.body.data.user_id;

    // Delete created test user
    const deleteUserRes = await request(`/api/users/${newUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteUserRes.status === 200, 'DELETE /api/users/:id by Admin deletes user');

    // Clean up created room
    await request(`/api/rooms/${createdRoomId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    console.log('\n======================================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('💥 Test suite encountered fatal error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();

