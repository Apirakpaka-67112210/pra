/**
 * Booking Management & Interactive Timeline Module
 */
const bookings = {
  myBookings: [],
  currentBookingRoom: null,
  activeExistingSlots: [],
  myBookingFilterStatus: 'all',

  init() {
    // Set default date for timeline
    const today = new Date().toISOString().split('T')[0];
    const timelineDate = document.getElementById('timeline-date-picker');
    if (timelineDate) timelineDate.value = today;
  },

  /**
   * Opens Booking Modal for a specific room
   */
  async openBookingModal(roomId, defaultDate = null, defaultStart = null, defaultEnd = null) {
    if (!auth.isLoggedIn()) {
      app.showToast('กรุณาเข้าสู่ระบบก่อนทำการจองห้องประชุม', 'info');
      app.openModal('auth-modal');
      return;
    }

    const room = rooms.allRooms.find((r) => r.room_id === roomId);
    if (!room) {
      app.showToast('ไม่พบข้อมูลห้องประชุม', 'error');
      return;
    }

    this.currentBookingRoom = room;

    document.getElementById('booking-room-id').value = room.room_id;
    document.getElementById('modal-banner-room-name').textContent = room.room_name;
    const priceHourly = parseFloat(room.price_per_hour || 500).toLocaleString('th-TH');
    document.getElementById('modal-banner-room-info').textContent = `ความจุ: ${room.capacity} ท่าน | สถานที่: ${room.location} | อัตรา: ${priceHourly} บาท/ชม.`;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').value = defaultDate || today;
    document.getElementById('booking-start-time').value = defaultStart || '09:00';
    document.getElementById('booking-end-time').value = defaultEnd || '10:00';
    document.getElementById('booking-title').value = '';

    // Clear conflict warning
    this.hideConflictWarning();

    // Load existing booked slots for this room on the chosen date
    await this.loadRoomScheduleForModal(room.room_id, defaultDate || today);

    // Initial check and price estimate
    this.checkModalConflict();
    this.updatePriceEstimate();

    app.openModal('booking-modal');
  },

  async loadRoomScheduleForModal(roomId, date) {
    const listEl = document.getElementById('modal-existing-slots-list');
    listEl.innerHTML = '<span class="text-muted text-sm">กำลังโหลดคิวจอง...</span>';

    try {
      const res = await api.get(`/rooms/${roomId}/availability`, { date });
      this.activeExistingSlots = res.booked_slots || [];

      if (this.activeExistingSlots.length === 0) {
        listEl.innerHTML = '<span class="badge badge-approved"><i class="fa-solid fa-circle-check"></i> ยังไม่มีการจองในวันนี้ (ว่างทั้งวัน)</span>';
      } else {
        listEl.innerHTML = this.activeExistingSlots
          .map((slot) => {
            const start = slot.start_time.substring(0, 5);
            const end = slot.end_time.substring(0, 5);
            return `<span class="slot-booked-pill"><i class="fa-solid fa-lock"></i> ${start} - ${end} (${app.escapeHtml(slot.booked_by)})</span>`;
          })
          .join('');
      }
    } catch (err) {
      listEl.innerHTML = '<span class="text-danger text-sm">ไม่สามารถดึงข้อมูลคิวจองได้</span>';
    }
  },

  /**
   * Real-time DOM validation: Check conflict instantly while typing/selecting times
   */
  async checkModalConflict() {
    const roomId = document.getElementById('booking-room-id').value;
    const date = document.getElementById('booking-date').value;
    const startTime = document.getElementById('booking-start-time').value;
    const endTime = document.getElementById('booking-end-time').value;

    if (!roomId || !date) return;

    // Reload schedule if date changed
    await this.loadRoomScheduleForModal(roomId, date);

    if (!startTime || !endTime) {
      this.hideConflictWarning();
      return;
    }

    if (startTime >= endTime) {
      this.showConflictWarning('เวลาเริ่มการประชุมต้องมาก่อนเวลาสิ้นสุดการประชุม');
      return;
    }

    // Check overlap condition: slot.start < new_end AND slot.end > new_start
    const normStart = startTime.length === 5 ? `${startTime}:00` : startTime;
    const normEnd = endTime.length === 5 ? `${endTime}:00` : endTime;

    const conflict = this.activeExistingSlots.find((slot) => {
      const sStart = slot.start_time;
      const sEnd = slot.end_time;
      return sStart < normEnd && sEnd > normStart;
    });

    if (conflict) {
      const cStart = conflict.start_time.substring(0, 5);
      const cEnd = conflict.end_time.substring(0, 5);
      this.showConflictWarning(`ช่วงเวลานี้ชนกับการจองที่มีอยู่แล้ว (${cStart} - ${cEnd} น. โดย ${conflict.booked_by})`);
    } else {
      this.hideConflictWarning();
    }

    this.updatePriceEstimate();
  },

  updatePriceEstimate() {
    const startTime = document.getElementById('booking-start-time')?.value;
    const endTime = document.getElementById('booking-end-time')?.value;
    const priceDisplay = document.getElementById('modal-price-calc-display');
    if (!priceDisplay || !this.currentBookingRoom) return;

    if (!startTime || !endTime || startTime >= endTime) {
      priceDisplay.innerHTML = '<span class="text-muted text-sm">กรุณาเลือกช่วงเวลาเพื่อคำนวณค่าบริการ</span>';
      return;
    }

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const hours = Math.max(0.5, ((eH * 60 + eM) - (sH * 60 + sM)) / 60);
    const rate = parseFloat(this.currentBookingRoom.price_per_hour || 500);
    const total = Math.round(hours * rate * 100) / 100;

    priceDisplay.innerHTML = `
      <div class="price-calc-box">
        <span><i class="fa-solid fa-clock text-warning"></i> ระยะเวลา: <strong>${hours} ชั่วโมง</strong> (อัตรา ${rate.toLocaleString('th-TH')} บ./ชม.)</span>
        <span class="total-highlight">ยอดชำระ: <strong class="text-warning">${total.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</strong></span>
      </div>
    `;
  },

  showConflictWarning(msg) {
    const box = document.getElementById('modal-conflict-warning');
    const text = document.getElementById('modal-conflict-text');
    const submitBtn = document.getElementById('btn-submit-booking');

    text.textContent = msg;
    box.style.display = 'flex';
    submitBtn.disabled = true;
  },

  hideConflictWarning() {
    const box = document.getElementById('modal-conflict-warning');
    const submitBtn = document.getElementById('btn-submit-booking');

    box.style.display = 'none';
    submitBtn.disabled = false;
  },

  /**
   * Submit Create Booking
   */
  async handleCreateBooking(event) {
    event.preventDefault();

    const roomId = document.getElementById('booking-room-id').value;
    const date = document.getElementById('booking-date').value;
    const startTime = document.getElementById('booking-start-time').value;
    const endTime = document.getElementById('booking-end-time').value;
    const title = document.getElementById('booking-title').value.trim();

    const submitBtn = document.getElementById('btn-submit-booking');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกการจอง...';

    try {
      const res = await api.post('/bookings', {
        room_id: parseInt(roomId, 10),
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        title,
      });

      app.showToast(res.message, 'success');
      app.closeModal('booking-modal');

      // Refresh My Bookings & Timeline dynamically
      this.loadMyBookings();
      this.renderTimeline();
      if (auth.isAdmin()) {
        admin.loadDashboardStats();
      }

      // Open Payment Modal immediately
      if (res.data && res.data.booking_id) {
        payments.openPaymentModal(res.data.booking_id, res.data.total_price, res.data.room_name);
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการจองห้อง';
    }
  },

  /**
   * Load My Bookings
   */
  async loadMyBookings() {
    if (!auth.isLoggedIn()) return;

    const tbody = document.getElementById('my-bookings-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner"></div>กำลังโหลดรายการ...</td></tr>';

    try {
      const res = await api.get('/bookings', { scope: 'mine' });
      this.myBookings = res.data || [];

      // Update badge counter in nav
      const countBadge = document.getElementById('my-booking-count');
      if (countBadge) {
        const activeCount = this.myBookings.filter((b) => b.status === 'pending' || b.status === 'approved').length;
        countBadge.textContent = activeCount;
        countBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
      }

      this.renderMyBookingsTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    }
  },

  filterMyBookings(status) {
    this.myBookingFilterStatus = status;

    // Update active chip styling
    const chips = document.querySelectorAll('#my-booking-status-filter .chip');
    chips.forEach((c) => c.classList.remove('active'));
    event.target.classList.add('active');

    this.renderMyBookingsTable();
  },

  renderMyBookingsTable() {
    const tbody = document.getElementById('my-bookings-tbody');
    let filtered = this.myBookings;

    if (this.myBookingFilterStatus !== 'all') {
      filtered = this.myBookings.filter((b) => b.status === this.myBookingFilterStatus);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted" style="padding:2rem;">
            <i class="fa-regular fa-folder-open" style="font-size:1.8rem; margin-bottom:0.5rem; display:block;"></i>
            ไม่พบรายการจองห้องประชุม
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((b) => {
        const dateStr = b.booking_date.split('T')[0];
        const start = b.start_time.substring(0, 5);
        const end = b.end_time.substring(0, 5);
        const statusBadge = app.getStatusBadge(b.status);
        const priceNum = parseFloat(b.total_price) || 0;
        const isPaid = b.payment_status === 'paid';

        const payBadge = isPaid
          ? `<div style="display:flex; align-items:center; gap:0.4rem;">
               <span class="badge badge-approved"><i class="fa-solid fa-circle-check"></i> ชำระแล้ว</span>
               <button class="btn-icon-action" onclick="payments.openReceiptModal(${b.booking_id})" title="ดูใบเสร็จรับเงิน"><i class="fa-solid fa-receipt text-warning"></i></button>
             </div>`
          : `<div style="display:flex; align-items:center; gap:0.4rem;">
               <span class="badge badge-pending"><i class="fa-solid fa-clock"></i> รอชำระ</span>
               <button class="btn-primary btn-sm" onclick="payments.openPaymentModal(${b.booking_id}, ${priceNum}, '${app.escapeHtml(b.room_name)}')"><i class="fa-solid fa-credit-card"></i> จ่ายเงิน</button>
             </div>`;

        const canCancel = b.status === 'pending' || b.status === 'approved';

        return `
          <tr data-booking-id="${b.booking_id}">
            <td><strong>#${b.booking_id}</strong></td>
            <td>
              <strong>${app.escapeHtml(b.room_name)}</strong>
              <div class="text-sm text-muted">${app.escapeHtml(b.room_location)}</div>
            </td>
            <td>${app.escapeHtml(b.title || 'การประชุม')}</td>
            <td>${dateStr}</td>
            <td><i class="fa-regular fa-clock text-muted"></i> ${start} - ${end} น.</td>
            <td><strong>${priceNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong></td>
            <td>${payBadge}</td>
            <td>${statusBadge}</td>
            <td>
              ${
                canCancel
                  ? `<button class="btn-secondary btn-sm text-danger" onclick="bookings.confirmCancelBooking(${b.booking_id})" title="ยกเลิกการจอง">
                       <i class="fa-solid fa-ban"></i> ยกเลิก
                     </button>`
                  : '<span class="text-muted text-sm">-</span>'
              }
            </td>
          </tr>
        `;
      })
      .join('');
  },

  async confirmCancelBooking(bookingId) {
    if (!confirm(`คุณต้องการยกเลิกการจอง #${bookingId} ใช่หรือไม่?`)) return;

    try {
      const res = await api.delete(`/bookings/${bookingId}`);
      app.showToast(res.message, 'success');
      this.loadMyBookings();
      this.renderTimeline();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ==========================================================
  // Timeline View
  // ==========================================================
  populateTimelineRoomSelect(roomList) {
    const select = document.getElementById('timeline-room-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = roomList
      .map((r) => `<option value="${r.room_id}">${app.escapeHtml(r.room_name)} (จุ ${r.capacity} ท่าน)</option>`)
      .join('');

    if (currentVal && roomList.some((r) => r.room_id === parseInt(currentVal, 10))) {
      select.value = currentVal;
    }
  },

  viewRoomTimeline(roomId) {
    app.switchTab('timeline-tab');
    const select = document.getElementById('timeline-room-select');
    if (select) {
      select.value = roomId;
      this.renderTimeline();
    }
  },

  async renderTimeline() {
    const select = document.getElementById('timeline-room-select');
    const datePicker = document.getElementById('timeline-date-picker');
    const gridEl = document.getElementById('timeline-grid');
    const summaryEl = document.getElementById('timeline-summary');

    if (!select || !select.value || !datePicker || !datePicker.value) return;

    const roomId = parseInt(select.value, 10);
    const date = datePicker.value;

    const room = rooms.allRooms.find((r) => r.room_id === roomId);
    summaryEl.textContent = `สถานะห้อง: ${room ? room.room_name : ''} ประจำวันที่ ${date}`;

    gridEl.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await api.get(`/rooms/${roomId}/availability`, { date });
      const bookedSlots = res.booked_slots || [];

      // Generate standard hourly slots from 08:00 to 18:00
      const hours = [
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00'
      ];

      gridEl.innerHTML = hours
        .map((startH) => {
          const startHourNum = parseInt(startH.split(':')[0], 10);
          const endH = `${String(startHourNum + 1).padStart(2, '0')}:00`;

          const slotStartSec = `${startH}:00`;
          const slotEndSec = `${endH}:00`;

          // Check if slot overlaps with any active booking
          const match = bookedSlots.find((b) => b.start_time < slotEndSec && b.end_time > slotStartSec);

          if (match) {
            const isApproved = match.status === 'approved';
            const stateClass = isApproved ? 'booked' : 'pending';
            const statusLabel = isApproved ? 'จองแล้ว' : 'รออนุมัติ';
            return `
              <div class="time-slot-box ${stateClass}" title="จองโดย: ${app.escapeHtml(match.booked_by)} (${app.escapeHtml(match.title || '')})">
                <div class="slot-time"><i class="fa-solid fa-lock"></i> ${startH} - ${endH}</div>
                <div class="slot-status">${statusLabel} (${app.escapeHtml(match.booked_by)})</div>
              </div>
            `;
          } else {
            return `
              <div class="time-slot-box free" onclick="bookings.openBookingModal(${roomId}, '${date}', '${startH}', '${endH}')" title="คลิกเพื่อจองช่วงเวลานี้ทันที">
                <div class="slot-time"><i class="fa-regular fa-clock"></i> ${startH} - ${endH}</div>
                <div class="slot-status text-success">ว่าง (กดเพื่อจอง)</div>
              </div>
            `;
          }
        })
        .join('');
    } catch (err) {
      gridEl.innerHTML = `<div class="text-danger text-center">เกิดข้อผิดพลาดในการโหลดตาราง: ${err.message}</div>`;
    }
  },
};

