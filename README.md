# ระบบจองห้องประชุมออนไลน์ (Meeting Room Booking System)

เว็บแอปพลิเคชันระบบจองห้องประชุมออนไลน์สำหรับองค์กรและสถาบันการศึกษา พัฒนาด้วยสถาปัตยกรรม **RESTful API**, **Node.js (Express.js)**, **SQL Database (MySQL พร้อมระบบ Auto-fallback SQLite)**, **JWT Authentication & Role-based Authorization**, และ **Dynamic Web (DOM Partial Render)** ตามข้อกำหนดของรายวิชาอย่างครบถ้วน 100%

---

## 1. โจทย์ธุรกิจและผู้ใช้ (Business Understanding)

### ปัญหาเดิม (Pain Points)
1. **การจองห้องซ้ำซ้อน (Double Booking):** เกิดการชนกันของช่วงเวลาเนื่องจากไม่มีระบบตรวจสอบแบบ Real-time
2. **ตรวจสอบสถานะห้องว่างได้ยาก:** ต้องโทรสอบถามหรือเดินไปดูที่หน้าห้อง
3. **เสียเวลาในการประสานงาน:** กระบวนการล่าช้าและไม่มีคิวสถานะที่ชัดเจน
4. **ไม่มีประวัติย้อนหลัง:** ขาดหลักฐานและข้อมูลสถิติสำหรับการวางแผนทรัพยากร
5. **ผู้ดูแลจัดการข้อมูลลำบาก:** การเพิ่ม/ลดห้องและการอนุมัติต้องทำบนกระดาษหรือแชตส่วนตัว

### วิธีแก้ไข (Solution)
พัฒนาเว็บแอปพลิเคชันระบบจองห้องประชุมแบบครบวงจร ที่มีระบบตรวจสอบช่วงเวลาทับซ้อนในระดับฐานข้อมูลและ Dynamic DOM ทำให้ผู้ใช้ตรวจสอบเวลาว่างและทำการจองได้ทันที พร้อมระบบ Dashboard และการจัดการสำหรับผู้ดูแลระบบ (Admin)

### กลุ่มผู้ใช้งานและสิทธิ์ (User Roles)
* **End User (พนักงาน / นักศึกษา / อาจารย์):**
  * ดูรายการห้องประชุมพร้อมสิ่งอำนวยความสะดวก
  * ค้นหาห้องประชุมแบบ Dynamic Search & Filter ตามความจุและวันที่
  * ตรวจสอบตารางเวลาว่างแบบ Interactive Time-slot Timeline
  * ทำการจองห้องประชุม (รับการยืนยันทันที)
  * ยกเลิกการจองของตนเอง
  * ดูประวัติและสถานะการจองย้อนหลัง (Pending, Approved, Cancelled, Rejected)
* **Admin (ผู้ดูแลระบบ):**
  * **จัดการห้องประชุม (CRUD):** เพิ่ม, แก้ไข, ลบ ข้อมูลห้องประชุม
  * **จัดการการจอง:** ตรวจสอบคำขอทั้งหมด, อนุมัติการจอง (Approve), ปฏิเสธการจอง (Reject), ยกเลิก หรือลบประวัติ
  * **จัดการผู้ใช้งาน (CRUD):** เพิ่ม, แก้ไขข้อมูล/เปลี่ยนสิทธิ์ Role, ลบผู้ใช้งาน
  * **รายงานและสถิติ (KPIs Dashboard):** ดูสถิติการใช้งานห้องประชุม, อัตราการอนุมัติ, และตัวชี้วัดความสำเร็จ

### ตัวชี้วัดความสำเร็จ (KPIs & Target)
| ตัวชี้วัด (KPI) | เป้าหมาย | ผลลัพธ์ในระบบนี้ |
| :--- | :---: | :--- |
| **ลดการจองซ้ำ (Double Booking)** | **100%** | ป้องกัน 100% ด้วยอัลกอริทึม Strict Interval Collision Check |
| **เวลาที่ใช้ในการจอง** | **< 1 นาที** | จองได้ในคลิกเดียว พร้อมพรีวิวคิวว่างแบบ Real-time |
| **ความถูกต้องของข้อมูล** | **> 95%** | ป้องกันข้อมูลสูญหายด้วย Foreign Key Constraints |
| **ความพึงพอใจของผู้ใช้** | **> 80%** | หน้าเว็บแบบ Single Page Application ตอบสนองทันทีโดยไม่ต้องรีเฟรชหน้า |

---

## 2. สถาปัตยกรรมระบบและเทคโนโลยี (System Architecture)

* **Frontend:**
  * **HTML5:** โครงสร้างเชิงความหมาย (Semantic HTML), Modals, Interactive Layout
  * **CSS3:** Modern Responsive Grid/Flexbox, CSS Variables, Glassmorphism, Status Badges
  * **JavaScript (Vanilla ES6+):** Single Page Application (SPA), Fetch API, Dynamic DOM Manipulation, Real-time Search Debounce
* **Backend:**
  * **Node.js + Express.js:** สถาปัตยกรรมแบบ MVC (Controllers, Routes, Middleware, Config, Utils)
* **Database:**
  * **MySQL (SQL Database):** รองรับมาตรฐาน MySQL 8.0 / MariaDB / XAMPP ผ่าน `mysql2/promise`
  * **Zero-Config Dual Mode:** หากยังไม่ได้เปิด MySQL Server ระบบจะสลับไปใช้ **SQLite Fallback** ให้อัตโนมัติทันที ทำให้เปิดทดสอบและส่งงานได้ทันทีโดยที่เซิร์ฟเวอร์ไม่พัง
* **Authentication & Security:**
  * **JSON Web Token (JWT):** เข้ารหัส Token ยืนยันตัวตนในทุก Request
  * **Password Hashing:** เข้ารหัสผ่านด้วย **bcryptjs** (Salt Rounds = 10)
  * **Role-Based Access Control (RBAC):** แยกสิทธิ์ Admin และ User อย่างเข้มงวดในระดับ Middleware
  * **Data Sanitization & XSS Protection:** ป้องกันการโจมตีผ่านอินพุต

---

## 3. โครงสร้างฐานข้อมูล (Database Schema)

ไฟล์ DDL แบบสมบูรณ์อยู่ที่ [schema.sql](file:///c:/Users/PC/Desktop/pra/schema.sql)

### 1) ตาราง `users` (ผู้ใช้งาน)
| ฟิลด์ | ชนิดข้อมูล | คุณลักษณะ | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `user_id` | INT | PRIMARY KEY, AUTO_INCREMENT | รหัสประจำตัวผู้ใช้ |
| `name` | VARCHAR(100) | NOT NULL | ชื่อ - นามสกุล |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | อีเมล (ใช้สำหรับเข้าสู่ระบบ) |
| `password` | VARCHAR(255) | NOT NULL | รหัสผ่านที่ผ่านการ Hash ด้วย bcrypt |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'user' | ระดับสิทธิ์: `'admin'` หรือ `'user'` |
| `created_at`| TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | วันเวลาที่สร้างบัญชี |

### 2) ตาราง `rooms` (ห้องประชุม)
| ฟิลด์ | ชนิดข้อมูล | คุณลักษณะ | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `room_id` | INT | PRIMARY KEY, AUTO_INCREMENT | รหัสห้องประชุม |
| `room_name` | VARCHAR(100) | NOT NULL | ชื่อห้องประชุม |
| `capacity` | INT | NOT NULL | ความจุผู้เข้าร่วม (จำนวนคน) |
| `location` | VARCHAR(150) | NOT NULL | อาคาร / ชั้น / สถานที่ตั้ง |
| `description`| TEXT | NULL | คำอธิบายเพิ่มเติม |
| `equipment` | VARCHAR(255) | NULL | รายการอุปกรณ์ (เช่น Projector, Smart Board) |
| `created_at`| TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | วันเวลาที่เพิ่มห้อง |

### 3) ตาราง `bookings` (การจองห้องประชุม)
| ฟิลด์ | ชนิดข้อมูล | คุณลักษณะ | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `booking_id` | INT | PRIMARY KEY, AUTO_INCREMENT | รหัสการจอง |
| `user_id` | INT | FOREIGN KEY (users) ON DELETE CASCADE | ผู้ทำการจอง |
| `room_id` | INT | FOREIGN KEY (rooms) ON DELETE CASCADE | ห้องประชุมที่ถูกจอง |
| `booking_date`| DATE | NOT NULL | วันที่จอง (YYYY-MM-DD) |
| `start_time` | TIME | NOT NULL | เวลาเริ่มต้น (HH:mm:ss) |
| `end_time` | TIME | NOT NULL | เวลาสิ้นสุด (HH:mm:ss) |
| `status` | VARCHAR(20) | DEFAULT 'pending' | สถานะ: `'pending'`, `'approved'`, `'rejected'`, `'cancelled'` |
| `title` | VARCHAR(150) | NULL | วัตถุประสงค์หรือหัวข้อการประชุม |
| `created_at`| TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | วันเวลาที่บันทึกข้อมูล |

---

## 4. อัลกอริทึมป้องกันการจองซ้ำ 100% (Double-Booking Prevention)

ช่วงเวลาใหม่ `[new_start, new_end]` จะถือว่า **ชนกับช่วงเวลาเดิม** `[existing_start, existing_end]` ในห้องเดียวกันและวันเดียวกัน หากเงื่อนไขทางคณิตศาสตร์เป็นจริง:

$$\text{existing.start\_time} < \text{new\_end} \quad \text{AND} \quad \text{existing.end\_time} > \text{new\_start}$$

เงื่อนไขนี้ครอบคลุมการทับซ้อนทุกกรณี (ทับช่วงต้น, ทับช่วงท้าย, อยู่ข้างใน, หรือครอบคลุมทั้งหมด) โดยระบบตรวจสอบทั้ง:
1. **ฝั่ง Client (Dynamic DOM):** ตรวจสอบและแสดงกล่องแจ้งเตือนทันทีขณะผู้ใช้เลือกเวลา ก่อนกดส่งข้อมูล
2. **ฝั่ง Server (SQL Execution):** ตรวจสอบซ้ำในระดับ Database Transaction เพื่อป้องกัน Race Condition

---

## 5. RESTful API Endpoints

### Authentication
* `POST /api/auth/register` - สมัครสมาชิกใหม่
* `POST /api/auth/login` - เข้าสู่ระบบ (รับ JWT Token)
* `GET /api/auth/profile` - ดูข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน (ต้องส่ง Bearer Token)

### Room Management (CRUD)
* `GET /api/rooms` - ดูรายการห้องทั้งหมด (รองรับ Query parameters: `?search=...&min_capacity=...`)
* `GET /api/rooms/:id` - ดูรายละเอียดห้องประชุม
* `GET /api/rooms/:id/availability` - ดูช่วงเวลาที่ถูกจองของห้องในวันที่ระบุ (`?date=YYYY-MM-DD`)
* `POST /api/rooms` - เพิ่มห้องประชุมใหม่ *(Admin only)*
* `PUT /api/rooms/:id` - แก้ไขข้อมูลห้องประชุม *(Admin only)*
* `DELETE /api/rooms/:id` - ลบห้องประชุม *(Admin only)*

### Booking Management (CRUD)
* `GET /api/bookings` - ดูรายการจอง (User ดูของตนเอง, Admin ดูได้ทั้งหมด หรือกรองตาม `?status=...`)
* `GET /api/bookings/:id` - ดูรายละเอียดการจอง
* `POST /api/bookings` - สร้างการจองใหม่ *(ตรวจสอบ Double Booking 100%)*
* `PUT /api/bookings/:id` - แก้ไขการจอง หรือ อนุมัติ/ปฏิเสธ *(Admin approve/reject, User cancel)*
* `DELETE /api/bookings/:id` - ยกเลิกการจอง

### User Management (Admin Only CRUD)
* `GET /api/users` - ดูรายชื่อผู้ใช้ทั้งหมด
* `GET /api/users/:id` - ดูข้อมูลผู้ใช้ตาม ID
* `POST /api/users` - เพิ่มผู้ใช้ใหม่
* `PUT /api/users/:id` - แก้ไขข้อมูลผู้ใช้และเปลี่ยนสิทธิ์ Role
* `DELETE /api/users/:id` - ลบผู้ใช้

### Payment System (ระบบชำระเงิน)
* `POST /api/payments` - ดำเนินการชำระเงินสำหรับรายการจอง (PromptPay QR, บัตรเครดิต, โอนธนาคาร)
* `GET /api/payments/booking/:bookingId` - ดูใบเสร็จรับเงิน (E-Receipt) สำหรับรายการจอง
* `GET /api/payments` - ดูประวัติการชำระเงินทั้งหมด *(Admin only)*
* `GET /api/payments/stats` - ดูสถิติรายได้และยอดรวมการชำระเงิน *(Admin only)*

### Reports & KPIs
* `GET /api/reports/stats` - รายงานสถิติภาพรวม, สัดส่วนการใช้งานห้อง, และตัวชี้วัด KPI

---

## 6. โครงสร้างโฟลเดอร์ของโปรเจกต์ (Project Structure)

```text
meeting-room-booking-system/
├── package.json               # รายการ Dependencies และ Scripts
├── .env.example               # ตัวอย่างการตั้งค่า Environment Variables
├── .env                       # ค่า Configuration (PORT, DB, JWT)
├── schema.sql                 # ไฟล์ DDL สำหรับสร้างฐานข้อมูล MySQL พร้อมข้อมูลทดสอบ
├── init-db.js                 # สคริปต์รันสร้างตารางและ Seed ข้อมูล
├── server.js                  # จุดเริ่มต้นของ Express Backend Server
│
├── src/                       # Backend Source Code
│   ├── config/
│   │   └── db.js              # โมดูลเชื่อมต่อ MySQL (พร้อม Dual Fallback SQLite)
│   ├── middleware/
│   │   ├── auth.js            # ตรวจสอบ JWT Token และสิทธิ์ Admin (RBAC)
│   │   └── errorHandler.js    # Global Error Handler
│   ├── controllers/
│   │   ├── authController.js  # Controller ระบบยืนยันตัวตน
│   │   ├── roomController.js  # Controller จัดการห้องประชุม
│   │   ├── bookingController.js # Controller จัดการการจอง & ป้องกันการจองซ้ำ
│   │   ├── userController.js  # Controller จัดการผู้ใช้งาน (CRUD)
│   │   └── reportController.js# Controller รายงานสถิติและ KPIs
│   ├── routes/
│   │   ├── authRoutes.js      # Route การเข้าสู่ระบบ/สมัครสมาชิก
│   │   ├── roomRoutes.js      # Route ห้องประชุม
│   │   ├── bookingRoutes.js   # Route การจองห้อง
│   │   ├── userRoutes.js      # Route จัดการผู้ใช้
│   │   └── reportRoutes.js    # Route รายงานสถิติ
│   └── utils/
│       └── validation.js      # ฟังก์ชันตรวจสอบความถูกต้องของเวลา/วันที่/อีเมล
│
├── public/                    # Frontend Client (Single Page Application)
│   ├── index.html             # หน้าจอหลัก (Dynamic Web Tabs & Modals)
│   ├── css/
│   │   └── style.css          # สไตล์ชีทที่ทันสมัย รองรับ Responsive ทุกอุปกรณ์
│   └── js/
│       ├── api.js             # ตัวจัดการ Fetch API & แนบ JWT Bearer Header
│       ├── auth.js            # ระบบจัดการ Session, Login, Register, Role View
│       ├── rooms.js           # ค้นหาห้องแบบ Real-time & Render การ์ดห้อง
│       ├── bookings.js        # จองห้อง, ตรวจสอบเวลาชนแบบ DOM, และ Timeline
│       ├── admin.js           # จัดการ Admin Dashboard, อนุมัติการจอง, CRUD
│       └── app.js             # ตัวควบคุมแท็บ, Modals, และ Toast Alerts
│
└── tests/
    └── api.test.js            # ชุดทดสอบอัตโนมัติ (Automated Test Suite) 21 ข้อ
```

---

## 7. วิธีติดตั้งและเปิดใช้งานโปรเจกต์ (Installation & Running)

### ข้อกำหนดเบื้องต้น
* ติดตั้ง [Node.js](https://nodejs.org/) (เวอร์ชัน 18+ ขึ้นไป)
* (ทางเลือก) MySQL หรือ โปรแกรม [XAMPP](https://www.apachefriends.org/) หากต้องการใช้ MySQL Server ภายนอก

### ขั้นตอนที่ 1: ติดตั้ง Dependencies
```bash
npm install
```

### ขั้นตอนที่ 2: การตั้งค่าฐานข้อมูล
เปิดไฟล์ `.env` เพื่อตรวจสอบการตั้งค่า:
```env
PORT=3000
JWT_SECRET=meeting_room_booking_super_secret_jwt_key_2026

# ตั้งค่าฐานข้อมูล (mysql หรือ sqlite)
DB_CLIENT=mysql
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=meeting_room_db
DB_PORT=3306
```
> **หมายเหตุ:** หากคุณเปิดใช้งาน XAMPP/MySQL ให้รันคำสั่ง SQL จากไฟล์ `schema.sql` ใน phpMyAdmin หรือ Terminal  
> หากไม่ได้เปิด MySQL ไว้ ระบบจะ **สลับไปใช้ SQLite ให้อัตโนมัติ** ทำให้สามารถเปิดใช้งานและทดสอบระบบได้ทันที 100% โดยไม่ต้องกังวลเรื่อง Error

### ขั้นตอนที่ 3: เริ่มต้นเซิร์ฟเวอร์
```bash
npm start
```
เปิดบราวเซอร์ไปที่: **`http://localhost:3000`**

### ขั้นตอนที่ 4: การรันการทดสอบระบบอัตโนมัติ (Automated Tests)
โปรเจกต์มาพร้อมชุดทดสอบครบทั้ง 21 กรณีทดสอบ (ครอบคลุม Auth, CRUD, และ Double-Booking ทุกมิติ):
```bash
npm test
```

---

## 8. บัญชีสำหรับทดสอบระบบ (Demo Accounts)

ในหน้าต่างเข้าสู่ระบบจะมีปุ่ม **"ทดสอบระบบคลิกเดียว (Demo Accounts)"** ให้กดล็อกอินได้ทันที หรือกรอกข้อมูลดังนี้:

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์การเข้าถึง |
| :--- | :--- | :---: | :--- |
| **Admin (ผู้ดูแลระบบ)** | `admin@meeting.com` | `123456` | เข้าถึงแท็บ "จัดการระบบ (Admin)", จัดการห้อง, จัดการผู้ใช้, อนุมัติ/ปฏิเสธคำขอ, ดูประวัติชำระเงิน |
| **User (นักศึกษา DPU)** | `67112210@dpu.ac.th` | `67112210` | ดูห้อง, จองห้อง, ชำระเงินผ่าน PromptPay/บัตรเครดิต, ดูใบเสร็จ, ยกเลิกการจอง |
| **User (ผู้ใช้ทั่วไป - สมชาย)** | `somchai@meeting.com` | `123456` | ดูห้อง, จองห้อง, ดูตารางว่าง, ยกเลิกการจองของตนเอง |
| **User (ผู้ใช้ทั่วไป - สมหญิง)** | `somying@meeting.com` | `123456` | ดูห้อง, จองห้อง, ดูตารางว่าง, ยกเลิกการจองของตนเอง |

