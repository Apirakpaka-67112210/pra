/**
 * Room Management & Catalog Module (Dynamic DOM & Real-time Filter)
 */
const rooms = {
  allRooms: [],
  searchTimeout: null,

  async init() {
    // Set default date to today for room filter
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('room-filter-date');
    if (dateInput) dateInput.value = today;

    await this.loadRooms();
  },

  async loadRooms() {
    const gridEl = document.getElementById('rooms-grid');
    gridEl.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>กำลังค้นหาข้อมูลห้องประชุม...</p>
      </div>
    `;

    try {
      const search = document.getElementById('room-search-input')?.value || '';
      const capacity = document.getElementById('room-capacity-filter')?.value || '';

      const res = await api.get('/rooms', { search, min_capacity: capacity });
      this.allRooms = res.data || [];
      this.renderRoomsGrid(this.allRooms);

      // Populate room dropdown in timeline tab
      bookings.populateTimelineRoomSelect(this.allRooms);
    } catch (err) {
      gridEl.innerHTML = `
        <div class="loading-state text-danger">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:0.5rem;"></i>
          <p>เกิดข้อผิดพลาดในการโหลดห้องประชุม: ${err.message}</p>
          <button class="btn-secondary btn-sm" onclick="rooms.loadRooms()">ลองใหม่อีกครั้ง</button>
        </div>
      `;
    }
  },

  handleSearchInput() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadRooms();
    }, 250); // Dynamic DOM debounce
  },

  applyFilters() {
    this.loadRooms();
  },

  resetFilters() {
    const searchInput = document.getElementById('room-search-input');
    const capSelect = document.getElementById('room-capacity-filter');
    const dateInput = document.getElementById('room-filter-date');
    if (searchInput) searchInput.value = '';
    if (capSelect) capSelect.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    this.loadRooms();
  },

  renderRoomsGrid(roomList) {
    const gridEl = document.getElementById('rooms-grid');
    const countBadge = document.getElementById('rooms-found-count');
    if (countBadge) countBadge.textContent = roomList.length;

    if (roomList.length === 0) {
      gridEl.innerHTML = `
        <div class="loading-state">
          <i class="fa-solid fa-folder-open" style="font-size:2.5rem; color:var(--text-light); margin-bottom:0.75rem;"></i>
          <h3>ไม่พบห้องประชุมที่ตรงกับเงื่อนไข</h3>
          <p class="text-muted text-sm">ลองปรับคำค้นหา หรือล้างตัวกรองเพื่อดูห้องทั้งหมด</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = roomList
      .map((room) => {
        const equipments = room.equipment
          ? room.equipment.split(',').map((item) => `<span class="equipment-tag"><i class="fa-solid fa-check"></i> ${item.trim()}</span>`).join('')
          : '<span class="equipment-tag text-muted">อุปกรณ์มาตรฐาน</span>';

        const isAdmin = auth.isAdmin();

        return `
          <div class="room-card" data-room-id="${room.room_id}">
            <div class="room-header">
              <div>
                <h3 class="room-name">${app.escapeHtml(room.room_name)}</h3>
              </div>
              <span class="room-capacity-badge">
                <i class="fa-solid fa-users"></i> ${room.capacity} ท่าน
              </span>
            </div>
            
            <div class="room-body">
              <div class="room-location">
                <i class="fa-solid fa-location-dot text-primary"></i>
                <span>${app.escapeHtml(room.location)}</span>
              </div>

              <div class="room-price-row">
                <span class="room-price-badge"><i class="fa-solid fa-tag text-warning"></i> ${parseFloat(room.price_per_hour || 500).toLocaleString('th-TH')} บาท/ชม.</span>
              </div>

              <p class="room-description">
                ${app.escapeHtml(room.description || 'ห้องประชุมพร้อมสิ่งอำนวยความสะดวกครบครัน')}
              </p>

              <div class="room-equipment-tags">
                ${equipments}
              </div>
            </div>

            <div class="room-footer">
              <button class="btn-primary flex-1" onclick="bookings.openBookingModal(${room.room_id})">
                <i class="fa-solid fa-calendar-plus"></i> จองห้องนี้
              </button>
              <button class="btn-secondary" onclick="bookings.viewRoomTimeline(${room.room_id})" title="ดูตารางว่างของห้องนี้">
                <i class="fa-solid fa-calendar-days"></i> ตารางว่าง
              </button>
              ${
                isAdmin
                  ? `
                <button class="btn-icon-action" onclick="admin.openEditRoomModal(${room.room_id})" title="แก้ไขห้อง (Admin)">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon-action danger" onclick="admin.confirmDeleteRoom(${room.room_id}, '${app.escapeHtml(room.room_name)}')" title="ลบห้อง (Admin)">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              `
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');
  },
};

