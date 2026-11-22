"""
BossBooking - Meeting Room Booking System
Generate PPTX Presentation (python-pptx 1.0.x compatible)
"""
import sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

def create_presentation(output_path):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Theme Colors
    COLOR_BG    = RGBColor(13, 16, 23)        # #0d1017
    COLOR_CARD  = RGBColor(26, 31, 46)        # #1a1f2e
    COLOR_GOLD  = RGBColor(251, 191, 36)      # #fbbf24
    COLOR_WHITE = RGBColor(248, 250, 252)     # #f8fafc
    COLOR_MUTED = RGBColor(148, 163, 184)     # #94a3b8
    COLOR_GREEN = RGBColor(34, 197, 94)       # #22c55e
    COLOR_DARK  = RGBColor(0, 0, 0)

    blank_layout = prs.slide_layouts[6]  # completely blank

    # ── helpers ────────────────────────────────────────────────
    def bg(slide):
        """Fill slide background."""
        # Use a full-slide rectangle as background
        sh = slide.shapes.add_shape(
            1,  # MSO_SHAPE_TYPE.RECTANGLE = 1
            Inches(0), Inches(0),
            prs.slide_width, prs.slide_height
        )
        sh.fill.solid()
        sh.fill.fore_color.rgb = COLOR_BG
        sh.line.fill.background()
        return sh

    def rect(slide, l, t, w, h, fill_color, border_color=None, border_pt=1):
        sh = slide.shapes.add_shape(1, l, t, w, h)
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill_color
        if border_color:
            sh.line.color.rgb = border_color
            sh.line.width = Pt(border_pt)
        else:
            sh.line.fill.background()
        return sh

    def txt(slide, text, l, t, w, h,
            size=14, bold=False, color=None, align=PP_ALIGN.LEFT,
            wrap=True, font='Tahoma'):
        """Add a textbox."""
        tb = slide.shapes.add_textbox(l, t, w, h)
        tf = tb.text_frame
        tf.word_wrap = wrap
        p = tf.paragraphs[0]
        p.alignment = align
        run = p.add_run()
        run.text = text
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.name = font
        run.font.color.rgb = color if color else COLOR_WHITE
        return tb

    def header(slide, title, subtitle=None):
        """Standard header + footer for each slide."""
        # top gold bar
        rect(slide, Inches(0), Inches(0), prs.slide_width, Inches(0.08), COLOR_GOLD)
        # title
        txt(slide, title,
            Inches(0.6), Inches(0.15), Inches(12), Inches(0.75),
            size=24, bold=True, color=COLOR_GOLD)
        if subtitle:
            txt(slide, subtitle,
                Inches(0.6), Inches(0.85), Inches(12), Inches(0.4),
                size=12, color=COLOR_MUTED)
        # bottom bar
        rect(slide, Inches(0), Inches(7.3), prs.slide_width, Inches(0.06), COLOR_GOLD)
        txt(slide, 'BossBooking — ระบบจองห้องประชุมออนไลน์  |  Mini Project  |  67112210 Apirakpaka  |  DPU',
            Inches(0.6), Inches(7.35), Inches(12), Inches(0.3),
            size=9, color=COLOR_MUTED)

    # ── Slide 1: Cover ─────────────────────────────────────────
    s1 = prs.slides.add_slide(blank_layout)
    bg(s1)
    # gold accent strip left
    rect(s1, Inches(0), Inches(0), Inches(0.3), prs.slide_height, COLOR_GOLD)
    # centered title area
    rect(s1, Inches(1.5), Inches(2.0), Inches(10.3), Inches(3.4), COLOR_CARD, COLOR_GOLD, 2)
    txt(s1, '🏢 BossBooking',
        Inches(2), Inches(2.3), Inches(9.5), Inches(1.0),
        size=40, bold=True, color=COLOR_GOLD, align=PP_ALIGN.CENTER)
    txt(s1, 'ระบบจองห้องประชุมออนไลน์',
        Inches(2), Inches(3.1), Inches(9.5), Inches(0.7),
        size=22, bold=True, color=COLOR_WHITE, align=PP_ALIGN.CENTER)
    txt(s1, 'Meeting Room Booking System',
        Inches(2), Inches(3.7), Inches(9.5), Inches(0.5),
        size=16, color=COLOR_MUTED, align=PP_ALIGN.CENTER)
    txt(s1, 'สำหรับองค์กรและสถาบันการศึกษา',
        Inches(2), Inches(4.15), Inches(9.5), Inches(0.4),
        size=14, color=COLOR_MUTED, align=PP_ALIGN.CENTER)
    # student info box
    rect(s1, Inches(3.5), Inches(5.6), Inches(6.3), Inches(1.2), RGBColor(26,31,46), COLOR_GOLD, 1)
    txt(s1, 'นักศึกษา: อภิรักษ์ (Apirakpaka)   รหัส: 67112210',
        Inches(3.7), Inches(5.75), Inches(6), Inches(0.45),
        size=13, bold=True, color=COLOR_GOLD, align=PP_ALIGN.CENTER)
    txt(s1, 'มหาวิทยาลัยธุรกิจบัณฑิตย์ (DPU)  |  Web Application Development',
        Inches(3.7), Inches(6.1), Inches(6), Inches(0.45),
        size=11, color=COLOR_MUTED, align=PP_ALIGN.CENTER)

    # ── Slide 2: Business Understanding ───────────────────────
    s2 = prs.slides.add_slide(blank_layout)
    bg(s2)
    header(s2, '01 | Business Understanding', 'ที่มาและปัญหาของโครงการ')

    # Problem box
    rect(s2, Inches(0.5), Inches(1.4), Inches(5.9), Inches(5.5), COLOR_CARD, COLOR_GOLD, 1.5)
    txt(s2, '❌  ปัญหาที่พบ (Pain Points)',
        Inches(0.7), Inches(1.5), Inches(5.5), Inches(0.5),
        size=14, bold=True, color=COLOR_GOLD)
    problems = [
        '•  การจองห้องซ้ำซ้อน (Double Booking)',
        '•  ตรวจสอบห้องว่างได้ยาก',
        '•  เสียเวลาติดต่อทางโทรศัพท์/แชต',
        '•  ไม่มีประวัติการใช้งานย้อนหลัง',
        '•  ผู้ดูแลจัดการข้อมูลยากลำบาก',
    ]
    for i, p in enumerate(problems):
        txt(s2, p, Inches(0.7), Inches(2.1) + Inches(0.65)*i,
            Inches(5.5), Inches(0.55), size=13, color=COLOR_WHITE)

    # Solution box
    rect(s2, Inches(6.9), Inches(1.4), Inches(5.9), Inches(5.5), COLOR_CARD, COLOR_GREEN, 1.5)
    txt(s2, '✅  วิธีแก้ไข (Solution)',
        Inches(7.1), Inches(1.5), Inches(5.5), Inches(0.5),
        size=14, bold=True, color=COLOR_GREEN)
    solutions = [
        '•  เว็บแอปพลิเคชันจองห้องออนไลน์',
        '•  ตรวจสอบห้องว่างแบบ Real-time',
        '•  ระบบ CRUD ครบถ้วน',
        '•  JWT Authentication & Role-based',
        '•  ระบบชำระเงิน PromptPay + ใบเสร็จ',
        '•  Admin Dashboard + Reports',
    ]
    for i, s in enumerate(solutions):
        txt(s2, s, Inches(7.1), Inches(2.1) + Inches(0.65)*i,
            Inches(5.5), Inches(0.55), size=13, color=COLOR_WHITE)

    # ── Slide 3: User Roles ─────────────────────────────────────
    s3 = prs.slides.add_slide(blank_layout)
    bg(s3)
    header(s3, '02 | กลุ่มผู้ใช้งาน (User Roles)', 'Role-Based Access Control (RBAC)')

    # End User
    rect(s3, Inches(0.5), Inches(1.4), Inches(5.9), Inches(5.5), COLOR_CARD, COLOR_GOLD, 1.5)
    txt(s3, '👤  End User (พนักงาน/นักศึกษา)',
        Inches(0.7), Inches(1.5), Inches(5.5), Inches(0.5),
        size=15, bold=True, color=COLOR_GOLD)
    user_features = [
        '•  ดูรายการห้องประชุมทั้งหมด',
        '•  ตรวจสอบเวลาว่างแบบ Dynamic',
        '•  จองห้องประชุมออนไลน์',
        '•  ชำระเงินผ่าน PromptPay',
        '•  รับใบเสร็จอิเล็กทรอนิกส์',
        '•  ยกเลิกการจองของตัวเอง',
        '•  ดูประวัติการจองย้อนหลัง',
    ]
    for i, f in enumerate(user_features):
        txt(s3, f, Inches(0.7), Inches(2.1) + Inches(0.65)*i,
            Inches(5.5), Inches(0.55), size=13, color=COLOR_WHITE)

    # Admin
    rect(s3, Inches(6.9), Inches(1.4), Inches(5.9), Inches(5.5), COLOR_CARD, RGBColor(239,68,68), 1.5)
    txt(s3, '👑  Admin (ผู้ดูแลระบบ)',
        Inches(7.1), Inches(1.5), Inches(5.5), Inches(0.5),
        size=15, bold=True, color=RGBColor(239,68,68))
    admin_features = [
        '•  เพิ่ม / แก้ไข / ลบ ห้องประชุม',
        '•  อนุมัติหรือยกเลิกการจอง',
        '•  จัดการข้อมูลผู้ใช้งาน',
        '•  ดูรายงานสถิติการใช้งาน',
        '•  ดูรายได้และสถิติการชำระเงิน',
        '•  ตรวจสอบ KPI (Double Booking 0%)',
    ]
    for i, f in enumerate(admin_features):
        txt(s3, f, Inches(7.1), Inches(2.1) + Inches(0.65)*i,
            Inches(5.5), Inches(0.55), size=13, color=COLOR_WHITE)

    # ── Slide 4: System Architecture ────────────────────────────
    s4 = prs.slides.add_slide(blank_layout)
    bg(s4)
    header(s4, '03 | System Architecture', 'รูปแบบสถาปัตยกรรมระบบ')

    layers = [
        ('🖥️  Frontend',  'HTML5 + CSS3 + Vanilla JavaScript\nDynamic DOM | Fetch API | Real-time Search',  Inches(0.4), COLOR_GOLD),
        ('⚙️  Backend',   'Node.js + Express.js  |  REST API\nJWT Auth  |  bcrypt  |  CORS  |  18+ Endpoints', Inches(2.6), RGBColor(99,102,241)),
        ('🗄️  Database',  'MySQL (Production)  |  SQLite (Auto-fallback)\n4 Tables: users, rooms, bookings, payments',  Inches(4.8), RGBColor(16,185,129)),
        ('🔒  Security',  'HTTPS  |  JWT Token  |  RBAC  |  bcrypt Hash\nInput Validation  |  SQL Injection Protection', Inches(7.0), RGBColor(239,68,68)),
    ]

    for label, detail, top, color in layers:
        rect(s4, Inches(0.5), top, Inches(12.3), Inches(1.9), COLOR_CARD, color, 1.5)
        txt(s4, label, Inches(0.7), top+Inches(0.1), Inches(12), Inches(0.55),
            size=16, bold=True, color=color)
        txt(s4, detail, Inches(0.7), top+Inches(0.6), Inches(12), Inches(1.0),
            size=13, color=COLOR_WHITE)

    # ── Slide 5: Database Schema ─────────────────────────────────
    s5 = prs.slides.add_slide(blank_layout)
    bg(s5)
    header(s5, '04 | Database Schema', 'โครงสร้างฐานข้อมูล — 4 ตาราง')

    tables_info = [
        ('users', 'user_id  |  name  |  email\npassword  |  role (admin/user)', Inches(0.4), Inches(1.4), COLOR_GOLD),
        ('rooms', 'room_id  |  room_name  |  capacity\nlocation  |  price_per_hour', Inches(6.8), Inches(1.4), RGBColor(99,102,241)),
        ('bookings', 'booking_id  |  user_id  |  room_id\nbooking_date  |  start_time  |  end_time\nstatus (pending/approved/cancelled)', Inches(0.4), Inches(4.0), RGBColor(16,185,129)),
        ('payments', 'payment_id  |  booking_id  |  amount\npayment_method  |  receipt_no\nstatus  |  paid_at', Inches(6.8), Inches(4.0), RGBColor(239,68,68)),
    ]

    for tname, fields, l, t, color in tables_info:
        rect(s5, l, t, Inches(5.9), Inches(2.8), COLOR_CARD, color, 1.5)
        txt(s5, f'📋  {tname}', l+Inches(0.2), t+Inches(0.1), Inches(5.5), Inches(0.5),
            size=16, bold=True, color=color)
        txt(s5, fields, l+Inches(0.2), t+Inches(0.65), Inches(5.5), Inches(2.0),
            size=13, color=COLOR_WHITE)

    # ── Slide 6: Double-Booking Prevention ───────────────────────
    s6 = prs.slides.add_slide(blank_layout)
    bg(s6)
    header(s6, '05 | Double-Booking Prevention', 'กลไกป้องกันการจองห้องซ้ำซ้อน — 100% Effective')

    rect(s6, Inches(0.5), Inches(1.4), Inches(12.3), Inches(2.4), COLOR_CARD, COLOR_GOLD, 2)
    txt(s6, '🔒  SQL Overlap Detection Algorithm',
        Inches(0.7), Inches(1.5), Inches(12), Inches(0.5), size=15, bold=True, color=COLOR_GOLD)
    txt(s6, 'SELECT * FROM bookings\nWHERE room_id = ? AND booking_date = ? AND status != \'cancelled\'\nAND start_time < [new_end] AND end_time > [new_start]',
        Inches(0.7), Inches(2.0), Inches(12), Inches(1.5),
        size=13, color=COLOR_GREEN, font='Courier New')

    cases = [
        ('✅  PASS', 'Case A: จองช่วง 14:00–16:00  →  สำเร็จ 201', COLOR_GREEN),
        ('❌  BLOCK', 'Case B: จองซ้อน 15:00–17:00  →  409 Conflict', RGBColor(239,68,68)),
        ('❌  BLOCK', 'Case C: จองซ้อน 13:00–15:00  →  409 Conflict', RGBColor(239,68,68)),
        ('❌  BLOCK', 'Case D: จองซ้อนภายใน 14:30–15:30  →  409 Conflict', RGBColor(239,68,68)),
        ('✅  PASS', 'Case F: ต่อกันพอดี 16:00–17:00  →  สำเร็จ 201', COLOR_GREEN),
    ]
    for i, (badge, detail, color) in enumerate(cases):
        top = Inches(4.0) + Inches(0.65)*i
        rect(s6, Inches(0.5), top, Inches(1.8), Inches(0.5), color, None)
        txt(s6, badge, Inches(0.5), top, Inches(1.8), Inches(0.5),
            size=11, bold=True, color=COLOR_DARK, align=PP_ALIGN.CENTER)
        txt(s6, detail, Inches(2.5), top, Inches(10.3), Inches(0.5),
            size=13, color=COLOR_WHITE)

    # ── Slide 7: Payment System ──────────────────────────────────
    s7 = prs.slides.add_slide(blank_layout)
    bg(s7)
    header(s7, '06 | Payment System', 'ระบบชำระเงินและใบเสร็จอิเล็กทรอนิกส์')

    flow = [
        ('1', 'จองห้อง\nสำเร็จ', COLOR_GOLD),
        ('2', 'คำนวณ\nราคา', RGBColor(99,102,241)),
        ('3', 'PromptPay\nQR Code', RGBColor(16,185,129)),
        ('4', 'ยืนยัน\nการชำระ', RGBColor(251,146,60)),
        ('5', 'รับ\nใบเสร็จ', RGBColor(239,68,68)),
    ]
    for i, (num, label, color) in enumerate(flow):
        l = Inches(0.6) + Inches(2.5)*i
        rect(s7, l, Inches(1.5), Inches(2.1), Inches(2.1), COLOR_CARD, color, 2)
        txt(s7, num, l, Inches(1.6), Inches(2.1), Inches(0.6),
            size=28, bold=True, color=color, align=PP_ALIGN.CENTER)
        txt(s7, label, l, Inches(2.2), Inches(2.1), Inches(0.9),
            size=13, color=COLOR_WHITE, align=PP_ALIGN.CENTER)
        if i < 4:
            txt(s7, '→', l+Inches(2.1), Inches(1.9), Inches(0.4), Inches(0.6),
                size=22, bold=True, color=COLOR_GOLD, align=PP_ALIGN.CENTER)

    apis = [
        'POST  /api/payments             — ประมวลผลการชำระเงิน',
        'GET   /api/payments/booking/:id — ดึงข้อมูลใบเสร็จ',
        'GET   /api/payments/stats       — รายงานรายได้รวม (Admin)',
    ]
    rect(s7, Inches(0.5), Inches(4.0), Inches(12.3), Inches(2.8), COLOR_CARD, COLOR_GOLD, 1)
    txt(s7, '💰  Payment API Endpoints',
        Inches(0.7), Inches(4.1), Inches(12), Inches(0.5),
        size=15, bold=True, color=COLOR_GOLD)
    for i, api in enumerate(apis):
        txt(s7, api, Inches(0.7), Inches(4.65) + Inches(0.65)*i, Inches(12), Inches(0.55),
            size=13, color=COLOR_GREEN, font='Courier New')

    # ── Slide 8: API Endpoints ───────────────────────────────────
    s8 = prs.slides.add_slide(blank_layout)
    bg(s8)
    header(s8, '07 | RESTful API Endpoints', '18+ Endpoints — JWT Authentication & RBAC')

    groups = [
        ('🔐 Auth', [
            'POST  /api/auth/register   — สมัครสมาชิก',
            'POST  /api/auth/login      — เข้าสู่ระบบ / JWT',
            'GET   /api/auth/profile    — ดูโปรไฟล์',
        ], Inches(0.4), Inches(1.4), COLOR_GOLD),
        ('🏢 Rooms', [
            'GET    /api/rooms          — ดูห้องทั้งหมด',
            'GET    /api/rooms/:id      — ดูรายละเอียดห้อง',
            'POST   /api/rooms          — เพิ่มห้อง [Admin]',
            'PUT    /api/rooms/:id      — แก้ไขห้อง [Admin]',
            'DELETE /api/rooms/:id      — ลบห้อง [Admin]',
        ], Inches(0.4), Inches(3.8), RGBColor(99,102,241)),
        ('📅 Bookings', [
            'GET    /api/bookings       — ดูรายการจอง',
            'POST   /api/bookings       — จองห้อง',
            'PUT    /api/bookings/:id   — อัปเดต [Admin]',
            'DELETE /api/bookings/:id   — ยกเลิกการจอง',
        ], Inches(6.8), Inches(1.4), RGBColor(16,185,129)),
        ('👥 Users+Reports', [
            'GET    /api/users          — จัดการผู้ใช้ [Admin]',
            'POST   /api/users          — เพิ่มผู้ใช้ [Admin]',
            'DELETE /api/users/:id      — ลบผู้ใช้ [Admin]',
            'GET    /api/reports/stats  — รายงาน KPI',
        ], Inches(6.8), Inches(3.8), RGBColor(239,68,68)),
    ]

    for title, endpoints, l, t, color in groups:
        h = Inches(2.1 + len(endpoints)*0.52)
        rect(s8, l, t, Inches(5.9), Inches(0.55 + len(endpoints)*0.55), COLOR_CARD, color, 1.5)
        txt(s8, title, l+Inches(0.2), t+Inches(0.05), Inches(5.5), Inches(0.45),
            size=14, bold=True, color=color)
        for j, ep in enumerate(endpoints):
            txt(s8, ep, l+Inches(0.2), t+Inches(0.5)+Inches(0.52)*j, Inches(5.5), Inches(0.45),
                size=11, color=COLOR_WHITE, font='Courier New')

    # ── Slide 9: Test Results ────────────────────────────────────
    s9 = prs.slides.add_slide(blank_layout)
    bg(s9)
    header(s9, '08 | Automated Test Results', 'ผลการทดสอบอัตโนมัติ — 25/25 Passed')

    # Big score
    rect(s9, Inches(0.5), Inches(1.4), Inches(4.0), Inches(2.5), COLOR_CARD, COLOR_GREEN, 2)
    txt(s9, '25 / 25', Inches(0.5), Inches(1.6), Inches(4.0), Inches(1.0),
        size=48, bold=True, color=COLOR_GREEN, align=PP_ALIGN.CENTER)
    txt(s9, 'Tests Passed  ✅  100%',
        Inches(0.5), Inches(2.6), Inches(4.0), Inches(0.6),
        size=16, bold=True, color=COLOR_GOLD, align=PP_ALIGN.CENTER)

    # Test categories
    categories = [
        ('Auth Tests (5)', '5/5', COLOR_GREEN),
        ('Room CRUD (3)', '3/3', COLOR_GREEN),
        ('Double-Booking (8)', '8/8', COLOR_GREEN),
        ('Payment Tests (3)', '3/3', COLOR_GREEN),
        ('User Mgmt (3)', '3/3', COLOR_GREEN),
        ('Reports/KPI (1)', '1/1', COLOR_GREEN),
    ]
    rect(s9, Inches(5.0), Inches(1.4), Inches(7.8), Inches(5.5), COLOR_CARD, COLOR_GOLD, 1)
    txt(s9, '📊  ผลแบ่งตามหมวดหมู่',
        Inches(5.2), Inches(1.5), Inches(7.5), Inches(0.5),
        size=14, bold=True, color=COLOR_GOLD)
    for i, (cat, score, color) in enumerate(categories):
        top = Inches(2.1) + Inches(0.75)*i
        txt(s9, cat, Inches(5.2), top, Inches(5.0), Inches(0.5), size=13, color=COLOR_WHITE)
        rect(s9, Inches(10.5), top+Inches(0.05), Inches(1.5), Inches(0.4), color, None)
        txt(s9, score, Inches(10.5), top, Inches(1.5), Inches(0.5),
            size=13, bold=True, color=COLOR_DARK, align=PP_ALIGN.CENTER)

    # KPI
    rect(s9, Inches(0.5), Inches(4.0), Inches(4.0), Inches(2.9), COLOR_CARD, COLOR_GOLD, 1)
    txt(s9, '🎯  KPI',
        Inches(0.7), Inches(4.1), Inches(3.5), Inches(0.4),
        size=14, bold=True, color=COLOR_GOLD)
    kpis = ['Double-booking: 0%  ✅', 'เวลาจอง: < 5 วินาที  ✅', 'ความแม่นยำ: 100%  ✅']
    for i, k in enumerate(kpis):
        txt(s9, k, Inches(0.7), Inches(4.6)+Inches(0.7)*i, Inches(3.5), Inches(0.6),
            size=13, color=COLOR_WHITE)

    # ── Slide 10: Conclusion ─────────────────────────────────────
    s10 = prs.slides.add_slide(blank_layout)
    bg(s10)
    # gold strip
    rect(s10, Inches(0), Inches(0), Inches(0.3), prs.slide_height, COLOR_GOLD)

    txt(s10, '🎓  สรุปโครงการ',
        Inches(1.0), Inches(0.5), Inches(11.5), Inches(0.8),
        size=28, bold=True, color=COLOR_GOLD)

    summary_items = [
        '✅  CRUD ครบถ้วน — Users, Rooms, Bookings, Payments',
        '✅  REST API  18+ Endpoints  |  JWT + RBAC Security',
        '✅  Dynamic DOM  |  Real-time Search  |  Partial Render',
        '✅  Double-Booking Prevention  100%  (25/25 Tests Pass)',
        '✅  ระบบชำระเงิน PromptPay + ใบเสร็จอิเล็กทรอนิกส์',
        '✅  Admin Dashboard  |  KPI Reports  |  Revenue Stats',
        '✅  MySQL / SQLite Auto-fallback  |  Zero-config Setup',
    ]
    for i, item in enumerate(summary_items):
        top = Inches(1.5) + Inches(0.65)*i
        txt(s10, item, Inches(1.0), top, Inches(11.5), Inches(0.6),
            size=14, color=COLOR_WHITE)

    # bottom info box
    rect(s10, Inches(1.0), Inches(6.1), Inches(11.3), Inches(1.0), COLOR_CARD, COLOR_GOLD, 1.5)
    txt(s10, '👤  Apirakpaka   |   🎓  67112210   |   🏫  DPU   |   github.com/Apirakpaka-67112210',
        Inches(1.0), Inches(6.2), Inches(11.3), Inches(0.6),
        size=13, bold=True, color=COLOR_GOLD, align=PP_ALIGN.CENTER)

    prs.save(output_path)
    print(f'✅  Presentation saved to: {output_path}')
    print(f'📊  Total slides: {len(prs.slides)}')

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'MiniProject_Apirak_67112210_Presentation.pptx'
    create_presentation(out)
