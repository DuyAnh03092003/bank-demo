/* ═══════════════════════════════════════════════════════════════
   NEOBANK — Customer Consent Flow
   script.js
   ═══════════════════════════════════════════════════════════════ */

/* ─── STATE ──────────────────────────────────────────────────── */
const state = {
  currentStep: 1,
  totalSteps: 5,
  consentChecked: false,
  otpCountdownTimer: null,
  verifiedItems: { cccd: false, face: false },
  formData: {}
};

/* ─── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateProgress();
  initOtpInputs();
  generateRefCode();
});

/* ─── STEP NAVIGATION ────────────────────────────────────────── */
function goToStep(targetStep) {
  // Validate before leaving step 1
  if (state.currentStep === 1 && targetStep > 1) {
    if (!validateStep1()) return;
  }

  // Save step 1 data
  if (state.currentStep === 1) {
    state.formData.phone = document.getElementById('phone').value;
    state.formData.email = document.getElementById('email').value;
    state.formData.fullname = document.getElementById('fullname').value;
    document.getElementById('otpPhoneDisplay').textContent = '0' + state.formData.phone;
    document.getElementById('successEmail').textContent = state.formData.email;
  }

  // Start OTP countdown when entering step 3
  if (targetStep === 3 && state.currentStep !== 3) {
    setTimeout(startOtpCountdown, 400);
  }

  // Animate out current panel
  const currentPanel = document.getElementById('step' + state.currentStep)
    || document.getElementById('stepSuccess');
  if (currentPanel) {
    currentPanel.style.animation = 'stepOut 0.2s ease forwards';
    setTimeout(() => {
      currentPanel.classList.remove('active');
      currentPanel.style.animation = '';
      showStep(targetStep);
    }, 180);
  } else {
    showStep(targetStep);
  }
}

function showStep(targetStep) {
  state.currentStep = targetStep;
  updateProgress();

  let panelId = targetStep === 0 ? 'stepSuccess' : 'step' + targetStep;
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function submitForm() {
  // Show loading on button
  const btn = event.target.closest('.btn');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<div class="upload-spinner" style="width:22px;height:22px;border-width:2px"></div>';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.disabled = false;

    // Animate out step 5
    const step5 = document.getElementById('step5');
    step5.style.animation = 'stepOut 0.2s ease forwards';
    setTimeout(() => {
      step5.classList.remove('active');
      step5.style.animation = '';
      // Show success
      state.currentStep = 0;
      const successPanel = document.getElementById('stepSuccess');
      successPanel.classList.add('active');
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Hide progress on success
      document.querySelector('.progress-container').style.opacity = '0.4';
    }, 180);

  }, 1800);
}

/* ─── PROGRESS UPDATE ────────────────────────────────────────── */
function updateProgress() {
  if (state.currentStep === 0) return;

  const pct = ((state.currentStep - 1) / state.totalSteps) * 100;
  document.getElementById('progressFill').style.width = pct + '%';

  // Update step dots
  document.querySelectorAll('.step-item').forEach(item => {
    const s = parseInt(item.dataset.step);
    item.classList.remove('active', 'completed');
    if (s === state.currentStep) item.classList.add('active');
    if (s < state.currentStep)   item.classList.add('completed');
  });
}

/* ─── STEP 1: VALIDATION ─────────────────────────────────────── */
function validateStep1() {
  let valid = true;
  const phone    = document.getElementById('phone');
  const email    = document.getElementById('email');
  const fullname = document.getElementById('fullname');

  // Phone validation
  const phoneVal = phone.value.replace(/\D/g,'');
  if (!phoneVal || phoneVal.length < 8) {
    showFieldError(phone, 'phoneError');
    valid = false;
  } else {
    clearFieldError(phone, 'phoneError');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value || !emailRegex.test(email.value)) {
    showFieldError(email, 'emailError');
    valid = false;
  } else {
    clearFieldError(email, 'emailError');
  }

  // Name validation
  if (!fullname.value.trim() || fullname.value.trim().length < 2) {
    showFieldError(fullname, 'nameError');
    valid = false;
  } else {
    clearFieldError(fullname, 'nameError');
  }

  if (!valid) {
    showToast('Vui lòng kiểm tra lại thông tin', 'error', '⚠️');
  }
  return valid;
}

function showFieldError(input, errorId) {
  input.classList.add('error');
  document.getElementById(errorId).classList.add('visible');
}
function clearFieldError(input, errorId) {
  input.classList.remove('error');
  document.getElementById(errorId).classList.remove('visible');
}

// Live validation
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('phone').addEventListener('input', function() {
    if (this.value) clearFieldError(this, 'phoneError');
  });
  document.getElementById('email').addEventListener('input', function() {
    if (this.value) clearFieldError(this, 'emailError');
  });
  document.getElementById('fullname').addEventListener('input', function() {
    if (this.value) clearFieldError(this, 'nameError');
  });
});

/* ─── STEP 2: CONSENT TOGGLE ─────────────────────────────────── */
function toggleConsent() {
  state.consentChecked = !state.consentChecked;

  const checkbox    = document.getElementById('checkboxEl');
  const wrapper     = document.getElementById('consentCheckbox');
  const consentBtn  = document.getElementById('consentBtn');

  checkbox.classList.toggle('checked', state.consentChecked);
  wrapper.classList.toggle('checked', state.consentChecked);
  consentBtn.disabled = !state.consentChecked;

  if (state.consentChecked) {
    showToast('Đã xác nhận đồng ý', 'success', '✓');
  }
}

/* ─── STEP 2: MODAL ──────────────────────────────────────────── */
function openModal() {
  document.getElementById('termsModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('termsModal').classList.remove('open');
  document.body.style.overflow = '';
}
function closeModalOutside(e) {
  if (e.target === document.getElementById('termsModal')) closeModal();
}

/* ─── STEP 3: OTP ────────────────────────────────────────────── */
function initOtpInputs() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, idx) => {
    // Input event
    box.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g,'');
      e.target.value = val;
      box.classList.toggle('filled', val.length > 0);
      box.classList.remove('error');

      if (val && idx < boxes.length - 1) {
        boxes[idx + 1].focus();
      }
      // Auto-verify when all 6 filled
      if (allOtpFilled()) {
        setTimeout(() => verifyOtp(), 200);
      }
    });

    // Backspace: go to previous box
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
        boxes[idx - 1].value = '';
        boxes[idx - 1].classList.remove('filled');
      }
    });

    // Paste handler
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text').replace(/\D/g,'');
      if (text.length >= 6) {
        boxes.forEach((b, i) => {
          b.value = text[i] || '';
          b.classList.toggle('filled', !!text[i]);
        });
        boxes[5].focus();
        setTimeout(() => verifyOtp(), 200);
      }
    });

    box.addEventListener('focus', () => box.select());
  });
}

function allOtpFilled() {
  return [...document.querySelectorAll('.otp-box')].every(b => b.value.length === 1);
}

function verifyOtp() {
  const boxes = document.querySelectorAll('.otp-box');
  const otp = [...boxes].map(b => b.value).join('');

  if (otp.length < 6) {
    showToast('Vui lòng nhập đủ 6 chữ số', 'error', '⚠️');
    boxes.forEach(b => b.classList.add('error'));
    return;
  }

  // Simulate: accept any 6-digit OTP, but reject "000000"
  if (otp === '000000') {
    boxes.forEach(b => { b.classList.add('error'); b.classList.remove('filled'); b.value = ''; });
    showToast('Mã OTP không chính xác', 'error', '✕');
    boxes[0].focus();
    return;
  }

  // Success
  boxes.forEach(b => b.disabled = true);
  showToast('Xác thực OTP thành công!', 'success', '✓');
  clearInterval(state.otpCountdownTimer);
  setTimeout(() => goToStep(4), 600);
}

function startOtpCountdown() {
  clearInterval(state.otpCountdownTimer);
  let timeLeft = 60;
  const countdownEl = document.getElementById('countdown');
  const timerRow    = document.getElementById('otpTimerRow');
  const resendRow   = document.getElementById('resendRow');

  timerRow.classList.remove('hidden');
  resendRow.classList.add('hidden');

  // Reset OTP boxes
  document.querySelectorAll('.otp-box').forEach(b => {
    b.value = ''; b.disabled = false;
    b.classList.remove('filled','error');
  });
  document.querySelectorAll('.otp-box')[0].focus();

  countdownEl.textContent = timeLeft;
  state.otpCountdownTimer = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(state.otpCountdownTimer);
      timerRow.classList.add('hidden');
      resendRow.classList.remove('hidden');
    }
  }, 1000);
}

/* ─── STEP 4: UPLOAD SIMULATION ──────────────────────────────── */
function simulateUpload(type) {
  const zoneId   = type === 'cccd' ? 'cccdZone' : 'faceZone';
  const statusId = type === 'cccd' ? 'cccdStatus' : 'faceStatus';
  const cardId   = type === 'cccd' ? 'cccdCard' : 'faceCard';
  const zone     = document.getElementById(zoneId);
  const status   = document.getElementById(statusId);
  const card     = document.getElementById(cardId);

  if (state.verifiedItems[type]) return; // already done

  // Show loading
  zone.classList.add('loading');
  zone.innerHTML = `
    <div class="upload-icon">
      <div class="upload-spinner"></div>
    </div>
    <div class="upload-text">Đang xử lý...</div>
    <div class="upload-hint">Vui lòng chờ</div>
  `;

  const delay = type === 'cccd' ? 2000 : 2500;
  setTimeout(() => {
    state.verifiedItems[type] = true;
    zone.classList.remove('loading');
    zone.classList.add('success');
    zone.innerHTML = `
      <div class="upload-icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M6 14L11 19L22 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="upload-text" style="color:var(--green)">Xác thực thành công!</div>
      <div class="upload-hint">${type === 'cccd' ? 'CCCD đã được xác minh' : 'Khuôn mặt đã khớp'}</div>
    `;
    card.classList.add('done');
    status.innerHTML = `<span style="color:var(--green);background:var(--green-light);padding:4px 10px;border-radius:100px;">✓ Xong</span>`;

    // Update verify progress
    const both = state.verifiedItems.cccd && state.verifiedItems.face;
    const pct  = (state.verifiedItems.cccd ? 50 : 0) + (state.verifiedItems.face ? 50 : 0);
    document.getElementById('verifyProgress').style.width = pct + '%';

    if (both) {
      document.getElementById('verifyNextBtn').disabled = false;
      showToast('Xác thực danh tính hoàn tất!', 'success', '✓');
    } else {
      const next = type === 'cccd' ? 'Tiếp tục xác thực khuôn mặt' : 'Tiếp tục chụp CCCD';
      showToast(type === 'cccd' ? 'CCCD xác thực thành công!' : 'Khuôn mặt xác thực thành công!', 'success', '✓');
    }
  }, delay);
}

/* ─── PURPOSE CHIPS ──────────────────────────────────────────── */
function togglePurpose(el) {
  el.classList.toggle('selected');
}

/* ─── SUCCESS SCREEN ─────────────────────────────────────────── */
function generateRefCode() {
  const code = Math.floor(10000000 + Math.random() * 90000000);
  const el = document.getElementById('refCode');
  if (el) el.textContent = code;
}
function goHome()  { showToast('Đang chuyển về trang chủ...', '', '🏠'); }
function goLogin() { showToast('Đang mở trang đăng nhập...', '', '🔐'); }

/* ─── TOAST NOTIFICATION ─────────────────────────────────────── */
let toastTimeout;
function showToast(msg, type = '', icon = '') {
  clearTimeout(toastTimeout);
  const toast    = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon= document.getElementById('toastIcon');

  toast.className = 'toast';
  if (type) toast.classList.add(type);
  toastMsg.textContent = msg;
  toastIcon.textContent = icon;

  // Force reflow
  void toast.offsetWidth;
  toast.classList.add('show');

  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ─── KEYBOARD NAVIGATION ────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  // Close modal on Escape
  if (e.key === 'Escape') closeModal();

  // Enter key advances from step 1
  if (e.key === 'Enter' && state.currentStep === 1) {
    const focused = document.activeElement;
    if (!focused || focused.tagName !== 'BUTTON') {
      goToStep(2);
    }
  }
});
