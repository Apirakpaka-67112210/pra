-- ==============================================================
-- Database Schema: Meeting Room Booking System (ระบบจองห้องประชุมออนไลน์)
-- ==============================================================

-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS meeting_room_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meeting_room_db;

-- 1. Users Table (ตารางผู้ใช้งาน)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms Table (ตารางห้องประชุม พร้อมราคาต่อชั่วโมง)
CREATE TABLE IF NOT EXISTS rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    location VARCHAR(150) NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    description TEXT,
    equipment VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table (ตารางการจองห้องประชุม พร้อมราคารวมและสถานะชำระเงิน)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid', 'refunded'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    title VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

-- 4. Payments Table (ตารางบันทึกการชำระเงิน)
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'promptpay', 'credit_card', 'bank_transfer'
    payment_status VARCHAR(20) NOT NULL DEFAULT 'completed',
    transaction_ref VARCHAR(100),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Index for fast conflict check and double booking prevention
CREATE INDEX idx_booking_conflict ON bookings (room_id, booking_date, status, start_time, end_time);

-- ==============================================================
-- Initial Seed Data (ข้อมูลเริ่มต้นสำหรับการทดสอบระบบ)
-- Note: Passwords are hashed with bcrypt
-- ==============================================================

INSERT IGNORE INTO users (user_id, name, email, password, role) VALUES
(1, 'ผู้ดูแลระบบ (Admin)', 'admin@meeting.com', '$2a$10$f9sY/b.ZJ/8lUfU3M/E/7eqX2dC3Y8pX4Q0eZpXl3w1H9Xk1B1D7a', 'admin'),
(2, 'สมชาย สายไอที', 'somchai@meeting.com', '$2a$10$f9sY/b.ZJ/8lUfU3M/E/7eqX2dC3Y8pX4Q0eZpXl3w1H9Xk1B1D7a', 'user'),
(3, 'สมหญิง จริงใจ', 'somying@meeting.com', '$2a$10$f9sY/b.ZJ/8lUfU3M/E/7eqX2dC3Y8pX4Q0eZpXl3w1H9Xk1B1D7a', 'user'),
(4, 'นักศึกษา DPU (67112210)', '67112210@dpu.ac.th', '$2a$10$oY753s3eI0dKsmb4P8Fq..e0b8B8Jj2GkKqE8lqZk3V3eN0xYv7z.', 'user');

INSERT IGNORE INTO rooms (room_id, room_name, capacity, location, price_per_hour, description, equipment) VALUES
(1, 'ห้องประชุมบอร์ดรูม (Boardroom A)', 20, 'ชั้น 4 อาคารอำนวยการ', 600.00, 'ห้องประชุมระดับผู้บริหาร พร้อมระบบ Video Conference และเครื่องเสียงระดับพรีเมียม', 'Projector 4K, Video Conf, Smart Board, Microphone'),
(2, 'ห้องประชุมคิดสร้างสรรค์ (Creative Lab)', 10, 'ชั้น 2 อาคารนวัตกรรม', 400.00, 'ห้องประชุมขนาดกลาง เหมาะสำหรับระดมสมองและประชุมกลุ่มย่อย', 'Whiteboard, TV 65 นิ้ว, HDMI/Wireless Display'),
(3, 'ห้องประชุมแกรนด์ฮอลล์ (Grand Conference Hall)', 80, 'ชั้น 1 อาคารนวัตกรรม', 1200.00, 'ห้องประชุมขนาดใหญ่ รองรับการจัดอบรม สัมมนา และการประชุมทั้งแผนก', 'Dual Projector, Audio System, 4 Wireless Mics, Stage Lighting'),
(4, 'ห้องประชุมย่อย 1 (Focus Room 1)', 4, 'ชั้น 3 อาคารอำนวยการ', 250.00, 'ห้องประชุมขนาดเล็ก เป็นส่วนตัว เหมาะสำหรับคุยงาน 1-on-1 หรือสัมภาษณ์งาน', 'TV 43 นิ้ว, Whiteboard, High-speed Wi-Fi'),
(5, 'ห้องประชุมเทรนนิ่ง (Training Room)', 30, 'ชั้น 2 อาคารอำนวยการ', 500.00, 'ห้องประชุมแบบห้องเรียน เหมาะกับการอบรมเชิงปฏิบัติการ', 'Projector, Sound Bar, Modular Desks, LAN Ports');

INSERT IGNORE INTO bookings (booking_id, user_id, room_id, booking_date, start_time, end_time, total_price, payment_status, status, title) VALUES
(1, 2, 1, CURDATE(), '09:00:00', '11:00:00', 1200.00, 'paid', 'approved', 'ประชุมวางแผนโครงการประจำไตรมาส'),
(2, 3, 2, CURDATE(), '13:30:00', '15:00:00', 600.00, 'paid', 'approved', 'Brainstorm ออกแบบ UI/UX ระบบใหม่'),
(3, 2, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '12:00:00', 2400.00, 'unpaid', 'pending', 'สัมมนาแนะนำเทคโนโลยีใหม่สำหรับองค์กร');

INSERT IGNORE INTO payments (payment_id, booking_id, user_id, amount, payment_method, payment_status, transaction_ref) VALUES
(1, 1, 2, 1200.00, 'promptpay', 'completed', 'PAY-DEMO-0001');
