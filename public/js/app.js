/**
 * Main Application Orchestrator & UI Utilities
 */
const app = {
  activeTab: 'rooms-tab',

  async init() {
    console.log('🚀 Initializing Meeting Room Booking App...');

    // Initialize modules
    auth.init();
    await rooms.init();
    bookings.init();

    // Check DB status and update UI badge
    this.checkHealth();

    // Setup global listeners (modal close on escape or backdrop)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });
  },

  async checkHealth() {
    try {
      const res = await api.get('/health');
      const badge = document.getElementById('db-type-badge');
      if (badge && res.db_client) {
        badge.textContent = `SQL Database (${res.db_client.toUpperCase()})`;
      }
    } catch (e) {
      console.warn('Health check warning:', e.message);
    }
  },

  switchTab(tabId) {
    // If clicking a user-only or admin-only tab without auth, redirect
    if (tabId === 'my-bookings-tab' && !auth.isLoggedIn()) {
      this.showToast('กรุณาเข้าสู่ระบบเพื่อดูประวัติการจอง', 'info');
      this.openModal('auth-modal');
      return;
    }

    if (tabId === 'admin-tab' && !auth.isAdmin()) {
      this.showToast('หน้านี้สำหรับผู้ดูแลระบบเท่านั้น', 'error');
      return;
    }

    this.activeTab = tabId;

    // Toggle nav active classes
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Toggle pane active classes
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      if (pane.id === tabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Lazy load data for respective tab
    if (tabId === 'rooms-tab') {
      rooms.loadRooms();
    } else if (tabId === 'timeline-tab') {
      bookings.renderTimeline();
    } else if (tabId === 'my-bookings-tab') {
      bookings.loadMyBookings();
    } else if (tabId === 'admin-tab') {
      admin.switchSubtab('admin-overview');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Modal helpers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle text-primary';
    if (type === 'success') icon = 'fa-circle-check text-success';
    if (type === 'error') icon = 'fa-triangle-exclamation text-danger';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Status Badge Helper
  getStatusBadge(status) {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return '<span class="badge badge-approved"><i class="fa-solid fa-circle-check"></i> อนุมัติแล้ว</span>';
      case 'pending':
        return '<span class="badge badge-pending"><i class="fa-solid fa-clock"></i> รออนุมัติ</span>';
      case 'cancelled':
        return '<span class="badge badge-cancelled"><i class="fa-solid fa-ban"></i> ยกเลิกแล้ว</span>';
      case 'rejected':
        return '<span class="badge badge-rejected"><i class="fa-solid fa-xmark"></i> ไม่อนุมัติ</span>';
      default:
        return `<span class="badge badge-cancelled">${s}</span>`;
    }
  },

  // XSS protection
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

