/**
 * Payment & Electronic Receipt Module (ระบบชำระเงินและใบเสร็จ)
 */
const payments = {
  currentBookingId: null,
  currentAmount: 0,
  currentRoomName: '',
  activeMethod: 'promptpay',
  countdownInterval: null,

  /**
   * Opens the Payment Modal for a booking
   */
  openPaymentModal(bookingId, amount, roomName) {
    if (!auth.isLoggedIn()) {
      app.showToast('กรุณาเข้าสู่ระบบก่อนชำระเงิน', 'info');
      app.openModal('auth-modal');
      return;
    }

    this.currentBookingId = bookingId;
    this.currentAmount = parseFloat(amount) || 500.0;
    this.currentRoomName = roomName || 'ห้องประชุม';

    // Populate modal fields
    document.getElementById('pay-modal-booking-id').textContent = `#${bookingId}`;
    document.getElementById('pay-modal-room-name').textContent = this.currentRoomName;
    document.getElementById('pay-modal-amount').textContent = `${this.currentAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
    document.getElementById('pay-qr-amount').textContent = `${this.currentAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;

    // Reset method to PromptPay
    this.switchMethod('promptpay');

    // Start 15-minute countdown for PromptPay
    this.startCountdown(15 * 60);

    app.openModal('payment-modal');
  },

  switchMethod(method) {
    this.activeMethod = method;

    // Toggle tab buttons
    document.querySelectorAll('.pay-method-btn').forEach((btn) => {
      if (btn.dataset.method === method) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle panes
    document.querySelectorAll('.pay-method-pane').forEach((pane) => {
      if (pane.id === `pay-pane-${method}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  },

  startCountdown(seconds) {
    clearInterval(this.countdownInterval);
    let remaining = seconds;
    const timerEl = document.getElementById('pay-qr-timer');

    function updateDisplay() {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      if (timerEl) {
        timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (remaining <= 0) {
        clearInterval(payments.countdownInterval);
        if (timerEl) timerEl.textContent = 'หมดอายุ';
      }
      remaining--;
    }

    updateDisplay();
    this.countdownInterval = setInterval(updateDisplay, 1000);
  },

  /**
   * Submit Payment (PromptPay / Card / Bank Transfer)
   */
  async submitPayment(event) {
    if (event) event.preventDefault();

    const submitBtn = document.getElementById('btn-confirm-pay');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบยอดชำระ...';
    }

    try {
      const res = await api.post('/payments', {
        booking_id: this.currentBookingId,
        payment_method: this.activeMethod,
      });

      clearInterval(this.countdownInterval);
      app.closeModal('payment-modal');
      app.showToast(res.message, 'success');

      // Refresh data
      bookings.loadMyBookings();
      if (auth.isAdmin()) {
        admin.loadDashboardStats();
        admin.loadAllBookings();
      }

      // Open Electronic Receipt
      if (res.data && res.data.receipt) {
        this.renderReceipt(res.data.receipt);
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ยืนยันการชำระเงิน';
      }
    }
  },

  /**
   * View Existing Receipt for a Booking
   */
  async openReceiptModal(bookingId) {
    try {
      const res = await api.get(`/payments/booking/${bookingId}`);
      if (res.success && res.data) {
        this.renderReceipt(res.data);
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  renderReceipt(receipt) {
    document.getElementById('rcpt-ref').textContent = receipt.transaction_ref || `PAY-${receipt.payment_id}`;
    document.getElementById('rcpt-date').textContent = new Date(receipt.paid_at || Date.now()).toLocaleString('th-TH');
    document.getElementById('rcpt-customer').textContent = receipt.user_name || (auth.currentUser ? auth.currentUser.name : '-');
    document.getElementById('rcpt-room').textContent = receipt.room_name || '-';
    document.getElementById('rcpt-booking-time').textContent = `${receipt.booking_date ? receipt.booking_date.split('T')[0] : ''} (${(receipt.start_time || '').substring(0, 5)} - ${(receipt.end_time || '').substring(0, 5)} น.)`;
    
    const methodNames = {
      promptpay: 'พร้อมเพย์ QR Code (PromptPay)',
      credit_card: 'บัตรเครดิต / เดบิต (Credit/Debit Card)',
      bank_transfer: 'โอนผ่านธนาคาร (Bank Transfer)',
    };
    document.getElementById('rcpt-method').textContent = methodNames[receipt.payment_method] || receipt.payment_method;
    
    const amountNum = parseFloat(receipt.amount) || 0;
    document.getElementById('rcpt-total').textContent = `${amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;

    app.openModal('receipt-modal');
  },

  printReceipt() {
    window.print();
  },
};

