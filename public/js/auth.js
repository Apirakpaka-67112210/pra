/**
 * Authentication & Session Management Module
 */
const auth = {
  currentUser: null,
  authMode: 'login', // 'login' or 'register'

  init() {
    const savedUser = localStorage.getItem('user');
    const token = api.getToken();

    if (savedUser && token) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.updateUI();
        // Verify profile with server in background
        this.fetchProfile();
      } catch (e) {
        this.logout(false);
      }
    } else {
      this.updateUI();
    }
  },

  async fetchProfile() {
    try {
      const res = await api.get('/auth/profile');
      if (res.success && res.data) {
        this.currentUser = res.data;
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        this.updateUI();
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err.message);
    }
  },

  setAuthMode(mode) {
    this.authMode = mode;
    const titleEl = document.getElementById('auth-modal-title');
    const nameGroup = document.getElementById('auth-name-group');
    const roleGroup = document.getElementById('auth-role-group');
    const submitBtn = document.getElementById('auth-submit-btn');
    const quickDemo = document.getElementById('quick-demo-accounts');

    const loginTab = document.getElementById('auth-tab-login');
    const registerTab = document.getElementById('auth-tab-register');

    if (mode === 'login') {
      titleEl.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ';
      nameGroup.style.display = 'none';
      roleGroup.style.display = 'none';
      quickDemo.style.display = 'block';
      submitBtn.textContent = 'เข้าสู่ระบบ';
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      document.getElementById('auth-name').removeAttribute('required');
    } else {
      titleEl.innerHTML = '<i class="fa-solid fa-user-plus"></i> สมัครสมาชิก';
      nameGroup.style.display = 'block';
      roleGroup.style.display = 'block';
      quickDemo.style.display = 'none';
      submitBtn.textContent = 'สร้างบัญชีผู้ใช้งาน';
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      document.getElementById('auth-name').setAttribute('required', 'required');
    }
  },

  quickFill(email, password) {
    document.getElementById('auth-email').value = email;
    document.getElementById('auth-password').value = password;
  },

  async handleSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();
    const role = document.getElementById('auth-role').value;

    const submitBtn = document.getElementById('auth-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังดำเนินการ...';

    try {
      if (this.authMode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        api.setToken(res.data.token);
        this.currentUser = res.data.user;
        localStorage.setItem('user', JSON.stringify(this.currentUser));

        app.showToast(`ยินดีต้อนรับคุณ ${this.currentUser.name}!`, 'success');
        app.closeModal('auth-modal');
        this.updateUI();

        // Refresh views
        rooms.loadRooms();
        bookings.loadMyBookings();
        if (this.currentUser.role === 'admin') {
          admin.loadDashboardStats();
        }
      } else {
        const res = await api.post('/auth/register', { name, email, password, role });
        api.setToken(res.data.token);
        this.currentUser = res.data.user;
        localStorage.setItem('user', JSON.stringify(this.currentUser));

        app.showToast('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!', 'success');
        app.closeModal('auth-modal');
        this.updateUI();

        rooms.loadRooms();
        bookings.loadMyBookings();
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = this.authMode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้งาน';
    }
  },

  logout(showNotice = true) {
    api.setToken(null);
    localStorage.removeItem('user');
    this.currentUser = null;
    this.updateUI();
    if (showNotice) {
      app.showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    }
    app.switchTab('rooms-tab');
    rooms.loadRooms();
  },

  updateUI() {
    const userWidget = document.getElementById('user-profile-widget');
    const guestWidget = document.getElementById('guest-auth-widget');
    const userTabs = document.querySelectorAll('.user-only');
    const adminTabs = document.querySelectorAll('.admin-only');

    if (this.currentUser) {
      userWidget.style.display = 'flex';
      guestWidget.style.display = 'none';

      document.getElementById('nav-user-name').textContent = this.currentUser.name;
      document.getElementById('nav-user-avatar').innerHTML = '<i class="fa-solid fa-user-tie"></i>';
      
      const roleBadge = document.getElementById('nav-user-role');
      roleBadge.textContent = this.currentUser.role === 'admin' ? 'บอสใหญ่ (Admin)' : 'พนักงาน (User)';
      roleBadge.style.color = 'var(--primary)';

      userTabs.forEach((el) => (el.style.display = 'inline-flex'));

      if (this.currentUser.role === 'admin') {
        adminTabs.forEach((el) => (el.style.display = 'inline-flex'));
      } else {
        adminTabs.forEach((el) => (el.style.display = 'none'));
      }
    } else {
      userWidget.style.display = 'none';
      guestWidget.style.display = 'flex';
      userTabs.forEach((el) => (el.style.display = 'none'));
      adminTabs.forEach((el) => (el.style.display = 'none'));
    }
  },

  isLoggedIn() {
    return !!this.currentUser && !!api.getToken();
  },

  isAdmin() {
    return this.isLoggedIn() && this.currentUser.role === 'admin';
  },
};

