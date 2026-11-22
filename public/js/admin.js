/**
 * Admin Management Center Module (CRUD for Rooms, Bookings, Users & Stats)
 */
const admin = {
  activeSubtab: 'admin-overview',

  switchSubtab(subtabId) {
    this.activeSubtab = subtabId;
    document.querySelectorAll('.admin-subpane').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.subnav-tab').forEach((el) => el.classList.remove('active'));

    const targetPane = document.getElementById(subtabId);
    if (targetPane) targetPane.classList.add('active');

    const targetTab = document.querySelector(`[data-subtab="${subtabId}"]`);
    if (targetTab) targetTab.classList.add('active');

    if (subtabId === 'admin-overview') {
      this.loadDashboardStats();
    } else if (subtabId === 'admin-bookings') {
      this.loadAllBookings();
    } else if (subtabId === 'admin-rooms') {
      this.loadAllRoomsTable();
    } else if (subtabId === 'admin-users') {
      this.loadAllUsersTable();
    } else if (subtabId === 'admin-payments') {
      this.loadAllPaymentsTable();
    }
  },

  // ==========================================================
  // Subtab 1: Dashboard Stats & KPIs
  // ==========================================================
  async loadDashboardStats() {
    if (!auth.isAdmin()) return;

    try {
      const res = await api.get('/reports/stats');
      const data = res.data;

      // Update counters
      document.getElementById('stat-total-bookings').textContent = data.summary.total_bookings;
      document.getElementById('stat-pending-bookings').textContent = data.summary.pending_approvals;
      document.getElementById('stat-approved-bookings').textContent = data.summary.approved_bookings;
      document.getElementById('stat-total-rooms').textContent = data.summary.total_rooms;
      document.getElementById('stat-total-users').textContent = data.summary.total_users;

      // Update pending badge in admin subnav
      const pendingBadge = document.getElementById('admin-pending-count');
      if (pendingBadge) {
        pendingBadge.textContent = data.summary.pending_approvals;
        pendingBadge.style.display = data.summary.pending_approvals > 0 ? 'inline-block' : 'none';
      }

      // Render Room Usage Table
      const usageTbody = document.getElementById('admin-room-usage-tbody');
      if (data.rooms_usage && data.rooms_usage.length > 0) {
        const total = data.summary.total_bookings || 1;
        usageTbody.innerHTML = data.rooms_usage
          .map((r) => {
            const count = parseInt(r.total_bookings, 10) || 0;
            const pct = Math.round((count / total) * 100);
            return `
              <tr>
                <td><strong>${app.escapeHtml(r.room_name)}</strong></td>
                <td>${app.escapeHtml(r.location)}</td>
                <td><span class="badge badge-user">${r.capacity} ท่าน</span></td>
                <td><strong>${count} ครั้ง</strong></td>
                <td>
                  <div style="background:rgba(255,255,255,0.1); border-radius:999px; height:8px; width:120px; overflow:hidden; display:inline-block; vertical-align:middle; margin-right:8px;">
                    <div style="background:var(--primary); height:100%; width:${pct}%;"></div>
                  </div>
                  <span class="text-sm font-semibold" style="color:var(--primary);">${pct}%</span>
                </td>
              </tr>
            `;
          })
          .join('');
      } else {
        usageTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">ยังไม่มีข้อมูลการใช้งาน</td></tr>';
      }
    } catch (err) {
      console.warn('Failed to load dashboard stats:', err.message);
    }
  },

  // ==========================================================
  // Subtab 2: Manage All Bookings (Approve, Reject, Cancel)
  // ==========================================================
  async loadAllBookings() {
    if (!auth.isAdmin()) return;

    const tbody = document.getElementById('admin-bookings-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner"></div>กำลังโหลดรายการ...</td></tr>';

    try {
      const status = document.getElementById('admin-booking-status-filter')?.value || '';
      const res = await api.get('/bookings', { status });
      const bookingList = res.data || [];

      if (bookingList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:2rem;">ไม่พบรายการจองตามเงื่อนไข</td></tr>';
        return;
      }

      tbody.innerHTML = bookingList
        .map((b) => {
          const dateStr = b.booking_date.split('T')[0];
          const start = b.start_time.substring(0, 5);
          const end = b.end_time.substring(0, 5);
          const statusBadge = app.getStatusBadge(b.status);

          let actionButtons = '';
          if (b.status === 'pending') {
            actionButtons = `
              <button class="btn-icon-action success" onclick="admin.changeBookingStatus(${b.booking_id}, 'approved')" title="อนุมัติการจอง">
                <i class="fa-solid fa-check"></i>
              </button>
              <button class="btn-icon-action danger" onclick="admin.changeBookingStatus(${b.booking_id}, 'rejected')" title="ปฏิเสธการจอง">
                <i class="fa-solid fa-xmark"></i>
              </button>
            `;
          } else if (b.status === 'approved') {
            actionButtons = `
              <button class="btn-icon-action danger" onclick="admin.changeBookingStatus(${b.booking_id}, 'cancelled')" title="ยกเลิกการจอง">
                <i class="fa-solid fa-ban"></i>
              </button>
            `;
          } else {
            actionButtons = `
              <button class="btn-icon-action danger" onclick="admin.deleteBookingHard(${b.booking_id})" title="ลบรายการนี้ถาวร">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            `;
          }

          return `
            <tr>
              <td>#${b.booking_id}</td>
              <td>
                <strong>${app.escapeHtml(b.user_name)}</strong>
                <div class="text-sm text-muted">${app.escapeHtml(b.user_email)}</div>
              </td>
              <td>${app.escapeHtml(b.room_name)}</td>
              <td>${app.escapeHtml(b.title || '-')}</td>
              <td>${dateStr}</td>
              <td>${start} - ${end} น.</td>
              <td>${statusBadge}</td>
              <td><div style="display:flex; gap:0.35rem;">${actionButtons}</div></td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    }
  },

  async changeBookingStatus(bookingId, newStatus) {
    const actionLabel = newStatus === 'approved' ? 'อนุมัติ' : newStatus === 'rejected' ? 'ปฏิเสธ' : 'ยกเลิก';
    if (!confirm(`คุณต้องการ ${actionLabel} การจอง #${bookingId} ใช่หรือไม่?`)) return;

    try {
      const res = await api.put(`/bookings/${bookingId}`, { status: newStatus });
      app.showToast(res.message, 'success');
      this.loadAllBookings();
      this.loadDashboardStats();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async deleteBookingHard(bookingId) {
    if (!confirm(`คุณต้องการลบประวัติการจอง #${bookingId} ออกจากฐานข้อมูลถาวรใช่หรือไม่?`)) return;

    try {
      const res = await api.delete(`/bookings/${bookingId}`, { hard: 'true' });
      app.showToast(res.message, 'success');
      this.loadAllBookings();
      this.loadDashboardStats();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ==========================================================
  // Subtab 3: Manage Rooms (CRUD)
  // ==========================================================
  async loadAllRoomsTable() {
    if (!auth.isAdmin()) return;

    const tbody = document.getElementById('admin-rooms-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner"></div>กำลังโหลดรายการ...</td></tr>';

    try {
      const res = await api.get('/rooms');
      const roomList = res.data || [];

      if (roomList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">ยังไม่มีข้อมูลห้องประชุม</td></tr>';
        return;
      }

      tbody.innerHTML = roomList
        .map((r) => `
          <tr>
            <td><strong>#${r.room_id}</strong></td>
            <td><strong>${app.escapeHtml(r.room_name)}</strong></td>
            <td><span class="badge badge-user">${r.capacity} ท่าน</span></td>
            <td>${app.escapeHtml(r.location)}</td>
            <td><span class="text-sm text-muted">${app.escapeHtml(r.equipment || '-')}</span></td>
            <td>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn-icon-action" onclick="admin.openEditRoomModal(${r.room_id})" title="แก้ไขห้อง">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon-action danger" onclick="admin.confirmDeleteRoom(${r.room_id}, '${app.escapeHtml(r.room_name)}')" title="ลบห้อง">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `)
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    }
  },

  openAddRoomModal() {
    document.getElementById('room-crud-title').innerHTML = '<i class="fa-solid fa-door-open"></i> เพิ่มห้องประชุมใหม่';
    document.getElementById('room-crud-id').value = '';
    document.getElementById('room-crud-name').value = '';
    document.getElementById('room-crud-capacity').value = '';
    document.getElementById('room-crud-location').value = '';
    document.getElementById('room-crud-equipment').value = '';
    document.getElementById('room-crud-description').value = '';

    app.openModal('room-crud-modal');
  },

  openEditRoomModal(roomId) {
    const room = rooms.allRooms.find((r) => r.room_id === roomId);
    if (!room) return;

    document.getElementById('room-crud-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> แก้ไขห้องประชุม';
    document.getElementById('room-crud-id').value = room.room_id;
    document.getElementById('room-crud-name').value = room.room_name;
    document.getElementById('room-crud-capacity').value = room.capacity;
    document.getElementById('room-crud-location').value = room.location;
    document.getElementById('room-crud-equipment').value = room.equipment || '';
    document.getElementById('room-crud-description').value = room.description || '';

    app.openModal('room-crud-modal');
  },

  async handleSaveRoom(event) {
    event.preventDefault();
    const id = document.getElementById('room-crud-id').value;
    const room_name = document.getElementById('room-crud-name').value.trim();
    const capacity = parseInt(document.getElementById('room-crud-capacity').value, 10);
    const location = document.getElementById('room-crud-location').value.trim();
    const equipment = document.getElementById('room-crud-equipment').value.trim();
    const description = document.getElementById('room-crud-description').value.trim();

    try {
      if (id) {
        // Edit Room (PUT)
        const res = await api.put(`/rooms/${id}`, { room_name, capacity, location, equipment, description });
        app.showToast(res.message, 'success');
      } else {
        // Create Room (POST)
        const res = await api.post('/rooms', { room_name, capacity, location, equipment, description });
        app.showToast(res.message, 'success');
      }

      app.closeModal('room-crud-modal');
      rooms.loadRooms();
      this.loadAllRoomsTable();
      this.loadDashboardStats();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async confirmDeleteRoom(roomId, roomName) {
    if (!confirm(`คุณต้องการลบห้อง "${roomName}" ใช่หรือไม่?\nคำเตือน: การลบห้องจะส่งผลต่อการจองที่เกี่ยวข้องทั้งหมด!`)) return;

    try {
      const res = await api.delete(`/rooms/${roomId}`);
      app.showToast(res.message, 'success');
      rooms.loadRooms();
      this.loadAllRoomsTable();
      this.loadDashboardStats();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ==========================================================
  // Subtab 4: Manage Users (CRUD)
  // ==========================================================
  async loadAllUsersTable() {
    if (!auth.isAdmin()) return;

    const tbody = document.getElementById('admin-users-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner"></div>กำลังโหลดรายชื่อ...</td></tr>';

    try {
      const res = await api.get('/users');
      const userList = res.data || [];

      tbody.innerHTML = userList
        .map((u) => {
          const roleBadge = u.role === 'admin' ? '<span class="badge badge-admin"><i class="fa-solid fa-shield"></i> Admin</span>' : '<span class="badge badge-user"><i class="fa-solid fa-user"></i> User</span>';
          const isSelf = auth.currentUser && auth.currentUser.user_id === u.user_id;

          return `
            <tr>
              <td><strong>#${u.user_id}</strong></td>
              <td><strong>${app.escapeHtml(u.name)}</strong> ${isSelf ? '<span class="text-sm text-primary">(คุณ)</span>' : ''}</td>
              <td>${app.escapeHtml(u.email)}</td>
              <td>${roleBadge}</td>
              <td>${u.created_at ? u.created_at.split('T')[0] : '-'}</td>
              <td>
                <div style="display:flex; gap:0.4rem;">
                  <button class="btn-icon-action" onclick="admin.openEditUserModal(${u.user_id}, '${app.escapeHtml(u.name)}', '${app.escapeHtml(u.email)}', '${u.role}')" title="แก้ไขผู้ใช้">
                    <i class="fa-solid fa-user-pen"></i>
                  </button>
                  ${
                    !isSelf
                      ? `
                    <button class="btn-icon-action danger" onclick="admin.confirmDeleteUser(${u.user_id}, '${app.escapeHtml(u.name)}')" title="ลบผู้ใช้">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  `
                      : ''
                  }
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    }
  },

  openAddUserModal() {
    document.getElementById('user-crud-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> เพิ่มผู้ใช้งานใหม่';
    document.getElementById('user-crud-id').value = '';
    document.getElementById('user-crud-name').value = '';
    document.getElementById('user-crud-email').value = '';
    document.getElementById('user-crud-password').value = '';
    document.getElementById('user-crud-password').setAttribute('required', 'required');
    document.getElementById('user-crud-password-hint').style.display = 'none';
    document.getElementById('user-crud-role').value = 'user';

    app.openModal('user-crud-modal');
  },

  openEditUserModal(userId, name, email, role) {
    document.getElementById('user-crud-title').innerHTML = '<i class="fa-solid fa-user-pen"></i> แก้ไขข้อมูลผู้ใช้';
    document.getElementById('user-crud-id').value = userId;
    document.getElementById('user-crud-name').value = name;
    document.getElementById('user-crud-email').value = email;
    document.getElementById('user-crud-password').value = '';
    document.getElementById('user-crud-password').removeAttribute('required');
    document.getElementById('user-crud-password-hint').style.display = 'block';
    document.getElementById('user-crud-role').value = role;

    app.openModal('user-crud-modal');
  },

  async handleSaveUser(event) {
    event.preventDefault();
    const id = document.getElementById('user-crud-id').value;
    const name = document.getElementById('user-crud-name').value.trim();
    const email = document.getElementById('user-crud-email').value.trim();
    const password = document.getElementById('user-crud-password').value;
    const role = document.getElementById('user-crud-role').value;

    try {
      if (id) {
        // Edit User (PUT)
        const payload = { name, email, role };
        if (password && password.trim()) {
          payload.password = password;
        }
        const res = await api.put(`/users/${id}`, payload);
        app.showToast(res.message, 'success');
      } else {
        // Create User (POST)
        const res = await api.post('/users', { name, email, password, role });
        app.showToast(res.message, 'success');
      }

      app.closeModal('user-crud-modal');
      this.loadAllUsersTable();
      this.loadDashboardStats();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async confirmDeleteUser(userId, userName) {
    if (!confirm(`คุณต้องการลบผู้ใช้ "${userName}" ใช่หรือไม่?`)) return;

    try {
      const res = await api.delete(`/users/${userId}`);
      app.showToast(res.message, 'success');
      this.loadAllUsersTable();
      this.loadDashboardStats();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ==========================================================
  // Subtab 5: Manage Payments (ประวัติการชำระเงินและรายได้)
  // ==========================================================
  async loadAllPaymentsTable() {
    if (!auth.isAdmin()) return;

    const tbody = document.getElementById('admin-payments-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner"></div>กำลังโหลดรายการ...</td></tr>';

    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/payments'),
        api.get('/payments/stats')
      ]);

      const payList = listRes.data || [];
      const stats = statsRes.data || { total_revenue: 0, total_transactions: 0 };

      // Update revenue counter cards
      const revEl = document.getElementById('admin-total-revenue');
      const transEl = document.getElementById('admin-total-transactions');
      if (revEl) revEl.textContent = `${parseFloat(stats.total_revenue).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿`;
      if (transEl) transEl.textContent = `${stats.total_transactions} รายการ`;

      if (payList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:2rem;">ยังไม่มีประวัติการชำระเงิน</td></tr>';
        return;
      }

      const methodLabels = {
        promptpay: '<span class="badge badge-user"><i class="fa-solid fa-qrcode"></i> พร้อมเพย์</span>',
        credit_card: '<span class="badge badge-admin"><i class="fa-solid fa-credit-card"></i> บัตรเครดิต</span>',
        bank_transfer: '<span class="badge badge-pending"><i class="fa-solid fa-building-columns"></i> โอนธนาคาร</span>',
      };

      tbody.innerHTML = payList
        .map((p) => {
          const amt = parseFloat(p.amount) || 0;
          const dateStr = p.paid_at ? new Date(p.paid_at).toLocaleString('th-TH') : '-';
          return `
            <tr>
              <td><code>${app.escapeHtml(p.transaction_ref || '#' + p.payment_id)}</code></td>
              <td><strong>#${p.booking_id}</strong> (${app.escapeHtml(p.room_name || '-')})</td>
              <td>
                <strong>${app.escapeHtml(p.user_name || '-')}</strong>
                <div class="text-sm text-muted">${app.escapeHtml(p.user_email || '')}</div>
              </td>
              <td><strong class="text-warning">${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</strong></td>
              <td>${methodLabels[p.payment_method] || p.payment_method}</td>
              <td><span class="badge badge-approved"><i class="fa-solid fa-circle-check"></i> สำเร็จ</span></td>
              <td>
                <button class="btn-icon-action" onclick="payments.openReceiptModal(${p.booking_id})" title="พิมพ์ใบเสร็จ">
                  <i class="fa-solid fa-receipt text-warning"></i>
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    }
  },
};

