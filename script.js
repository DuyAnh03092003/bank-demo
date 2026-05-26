/* ═══════════════════════════════════════════════════════════════
   VIETBANK — Customer Consent & Registration Flow
   script.js (Tích hợp DataTrust API)
   ═══════════════════════════════════════════════════════════════ */

/* ─── STATE MANAGEMENT ───────────────────────────────────────── */
const state = {
  currentStep: 1,
  totalSteps: 5,
  consentChecked: false,
  otpCountdownTimer: null,
  verifiedItems: { cccd: false, face: false },
  formData: {
    purposes: [] // Lưu trữ các dịch vụ khách hàng chọn ở Bước 5
  }
};

/* ─── APP INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('progressFill')) {
    updateProgress();
    initOtpInputs();
    generateRefCode();
    initLiveValidation();
  }
});

/* ─── STEP NAVIGATION ────────────────────────────────────────── */
function goToStep(targetStep) {
  if (state.currentStep === 1 && targetStep > 1) {
    if (!validateStep1()) return;
  }

  if (state.currentStep === 1) {
    state.formData.phone = document.getElementById('phone').value.trim();
    state.formData.email = document.getElementById('email').value.trim();
    state.formData.fullname = document.getElementById('fullname').value.trim().replace(/\s+/g, " ").toUpperCase();
    
    const otpDisplay = document.getElementById('otpPhoneDisplay');
    const emailDisplay = document.getElementById('successEmail');
    if (otpDisplay) otpDisplay.textContent = '0' + state.formData.phone;
    if (emailDisplay) emailDisplay.textContent = state.formData.email;
  }

  if (targetStep === 3 && state.currentStep !== 3) {
    setTimeout(startOtpCountdown, 400);
  }

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

/* ─── FORM SUBMISSION (STEP 5) — GỬI DỮ LIỆU ĐẾN SERVER DATATRUST ─── */
async function submitForm() {
  const btn = event.target.closest('.btn');
  if (!btn) return;
  
  const originalHTML = btn.innerHTML;
  // Hiển thị trạng thái Loading
  btn.innerHTML = '<div class="upload-spinner" style="width:22px;height:22px;border-width:2px"></div><span style="margin-left: 8px;">ĐANG XỬ LÝ...</span>';
  btn.disabled = true;

  // Cấu hình thông tin kết nối DataTrust
  const TOKEN = "eyJraWQiOiIxLTZkNzg2ZTgwLTEyN2QtNGFjZi05OTRmLTk1MjgxMjIyZjQwNSIsImFsZyI6IlJTNTEyIiwidHlwIjoiSldUIn0.eyJpc3MiOiJWVHJ1c3QgSW50ZWdyYXRpb24gLSAxIiwic3ViIjoiVG9rZW4gQWNjZXNzIEludGVncmF0aW9uIiwiZXhwIjoxNzk1MzU1MDQxLCJuYmYiOjE3Nzk4MDMwMzEsImlhdCI6MTc3OTgwMzAzMSwic2NvcGVzIjp7ImFwaXMiOlsid3JpdGUiLCJyZWFkIiwiZGVsZXRlIl19LCJ1c2VySWQiOiI3MjMzOTE4OTY5MjE2MzUyNiIsIndvcmtzcGFjZUlkIjoiNzI5MDIxMTgyOTg4MzkyNzUifQ.CM4NP-yqe6PidyWcuwyuX7P7jZ52bBCnQF0k2p1F5F-lS4CgnpGdHsmzBM-nlESa3Q7ut0y6NCj0XtKsj4DMbb2ipKquAwA224JspXIW0B4cKKcXuSXu0heEDBZ1_SbkY7d1wxIzM6yLxy1Rd23hWD6zwKUxFptcUPd6NoiLBAM";  
  const BASE_URL = "https://uat-api.datatrust.one/72902099310730275";
  const sourceId = Date.now();

  try {
    // 1. Gửi thông tin cá nhân khách hàng (Individual Customer)
    const customerRes = await fetch(`${BASE_URL}/integration/individual-customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: TOKEN
      },
      body: JSON.stringify([
        {
          name: state.formData.fullname,
          phone_number: '0' + state.formData.phone,
          email: state.formData.email,
          source_id: sourceId,
          service_source_id: "75998364686415412",
          type: "Cá nhân",
          status: "1",
          address: "",
          province: "",
          district: "",
          wards: ""
        }
      ])
    });

    const customerData = await customerRes.json();
    if (!customerRes.ok) {
      console.error("❌ Create customer error:", customerData);
      throw new Error("Tạo hồ sơ khách hàng thất bại");
    }

    // Định dạng chuỗi danh mục dịch vụ đã chọn để đưa vào chiến dịch đồng ý dữ liệu
    const purposeString = state.formData.purposes.length > 0 
      ? ` [Mục đích sử dụng: ${state.formData.purposes.join(', ')}]` 
      : "";

    // 2. Tạo Payload Consent gửi đến hệ thống quản lý đồng ý dữ liệu
    const payload = {
      campaign_name: "Lấy sự đồng ý sử dụng dữ liệu khách hàng VietBank" + purposeString,
      datas: [
        {
          subject_source_id: sourceId,
          subject_name: state.formData.fullname,
          subject_phone: '0' + state.formData.phone,
          subject_email: state.formData.email,
          consent_source_id: Date.now(),
          service_source_id: "75998365289590102",
          create_time: Date.now(),
          consent_status: "agree_all",
          assignees: []
        }
      ],
      source: {
        system_name: "VietBank Digital Web",
        channel_name: "web_form"
      },
      campaign_source_id: "3f72be8d-6d6c-4cc6-9c5f-b8b569dddf17",
      consent_type: "consent_right_to_know",
      subject_type: "service"
    };

    const formDataObject = new FormData();
    formDataObject.append("payload", JSON.stringify(payload));

    const consentRes = await fetch(`${BASE_URL}/integration/consent`, {
      method: "POST",
      headers: {
        Authorization: TOKEN
      },
      body: formDataObject
    });

    const consentText = await consentRes.text();
    if (!consentRes.ok) {
      console.error("❌ Consent error:", consentText);
      throw new Error("Gửi chấp thuận dữ liệu (Consent) thất bại");
    }

    console.log("✅ DataTrust Flow Success:", consentText);
    showToast('Xử lý hồ sơ thành công!', 'success', '✓');

    // Chuyển sang giao diện thông báo đăng ký thành công hoàn tất (Step Success)
    const step5 = document.getElementById('step5');
    if (step5) {
      step5.style.animation = 'stepOut 0.2s ease forwards';
      setTimeout(() => {
        step5.classList.remove('active');
        step5.style.animation = '';
        
        state.currentStep = 0;
        const successPanel = document.getElementById('stepSuccess');
        if (successPanel) successPanel.classList.add('active');
        
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) progressContainer.style.opacity = '0.4';
      }, 180);
    }

  } catch (error) {
    console.error("❌ Flow error:", error);
    showToast('Có lỗi kết nối hệ thống. Vui lòng thử lại.', 'error', '✕');
    alert("Có lỗi xảy ra trong quá trình xử lý dữ liệu an toàn. Vui lòng thử lại.");

    // Hoàn tác trạng thái của nút bấm nếu xảy ra lỗi
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

/* ─── PROGRESS BAR & DOTS ────────────────────────────────────── */
function updateProgress() {
  if (state.currentStep === 0) return;

  const progressFill = document.getElementById('progressFill');
  if (progressFill) {
    const pct = ((state.currentStep - 1) / state.totalSteps) * 100;
    progressFill.style.width = pct + '%';
  }

  document.querySelectorAll('.step-item').forEach(item => {
    const s = parseInt(item.dataset.step);
    item.classList.remove('active', 'completed');
    if (s === state.currentStep) item.classList.add('active');
    if (s < state.currentStep)   item.classList.add('completed');
  });
}

/* ─── STEP 1: VALIDATION LOGIC ───────────────────────────────── */
function validateStep1() {
  let valid = true;
  const phone = document.getElementById('phone');
  const email = document.getElementById('email');
  const fullname = document.getElementById('fullname');

  const phoneVal = phone.value.replace(/\D/g, '');
  if (!phoneVal || phoneVal.length < 9) {
    showFieldError(phone, 'phoneError');
    valid = false;
  } else {
    clearFieldError(phone, 'phoneError');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value || !emailRegex.test(email.value)) {
    showFieldError(email, 'emailError');
    valid = false;
  } else {
    clearFieldError(email, 'emailError');
  }

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
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.classList.add('visible');
}

function clearFieldError(input, errorId) {
  input.classList.remove('error');
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.classList.remove('visible');
}

function initLiveValidation() {
  document.getElementById('phone').addEventListener('input', function() {
    if (this.value) clearFieldError(this, 'phoneError');
  });
  document.getElementById('email').addEventListener('input', function() {
    if (this.value) clearFieldError(this, 'emailError');
  });
  document.getElementById('fullname').addEventListener('input', function() {
    if (this.value) clearFieldError(this, 'nameError');
  });
}

/* ─── STEP 2: CONSENT TOGGLE & MODAL ─────────────────────────── */
function toggleConsent() {
  state.consentChecked = !state.consentChecked;

  const checkbox = document.getElementById('checkboxEl');
  const wrapper = document.getElementById('consentCheckbox');
  const consentBtn = document.getElementById('consentBtn');

  if (checkbox) checkbox.classList.toggle('checked', state.consentChecked);
  if (wrapper) wrapper.classList.toggle('checked', state.consentChecked);
  if (consentBtn) consentBtn.disabled = !state.consentChecked;

  if (state.consentChecked) {
    showToast('Đã xác nhận đồng ý', 'success', '✓');
  }
}

function openModal() {
  const modal = document.getElementById('termsModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById('termsModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('termsModal')) closeModal();
}

/* ─── STEP 3: OTP KEYPAD PROCESSING ──────────────────────────── */
function initOtpInputs() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      box.classList.toggle('filled', val.length > 0);
      box.classList.remove('error');

      if (val && idx < boxes.length - 1) {
        boxes[idx + 1].focus();
      }
      if (allOtpFilled()) {
        setTimeout(() => verifyOtp(), 200);
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
        boxes[idx - 1].value = '';
        boxes[idx - 1].classList.remove('filled');
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text').replace(/\D/g, '');
      if (text.length >= 6) {
        boxes.forEach((b, i) => {
          b.value = text[i] || '';
          b.classList.toggle('filled', !!text[i]);
        });
        if (boxes[5]) boxes[5].focus();
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

  if (otp === '000000') {
    boxes.forEach(b => { b.classList.add('error'); b.classList.remove('filled'); b.value = ''; });
    showToast('Mã OTP không chính xác', 'error', '✕');
    if (boxes[0]) boxes[0].focus();
    return;
  }

  boxes.forEach(b => b.disabled = true);
  showToast('Xác thực OTP thành công!', 'success', '✓');
  clearInterval(state.otpCountdownTimer);
  setTimeout(() => goToStep(4), 600);
}

function startOtpCountdown() {
  clearInterval(state.otpCountdownTimer);
  let timeLeft = 60;
  const countdownEl = document.getElementById('countdown');
  const timerRow = document.getElementById('otpTimerRow');
  const resendRow = document.getElementById('resendRow');

  if (timerRow) timerRow.classList.remove('hidden');
  if (resendRow) resendRow.classList.add('hidden');

  document.querySelectorAll('.otp-box').forEach(b => {
    b.value = ''; b.disabled = false;
    b.classList.remove('filled', 'error');
  });
  const firstBox = document.querySelectorAll('.otp-box')[0];
  if (firstBox) firstBox.focus();

  if (countdownEl) countdownEl.textContent = timeLeft;
  state.otpCountdownTimer = setInterval(() => {
    timeLeft--;
    if (countdownEl) countdownEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(state.otpCountdownTimer);
      if (timerRow) timerRow.classList.add('hidden');
      if (resendRow) resendRow.classList.remove('hidden');
    }
  }, 1000);
}

/* ─── STEP 4: EKYC UPLOAD SIMULATION ─────────────────────────── */
function simulateUpload(type) {
  const zoneId = type === 'cccd' ? 'cccdZone' : 'faceZone';
  const statusId = type === 'cccd' ? 'cccdStatus' : 'faceStatus';
  const cardId = type === 'cccd' ? 'cccdCard' : 'faceCard';
  const zone = document.getElementById(zoneId);
  const status = document.getElementById(statusId);
  const card = document.getElementById(cardId);

  if (state.verifiedItems[type] || !zone) return;

  zone.classList.add('loading');
  zone.innerHTML = `
    <div class="upload-icon"><div class="upload-spinner"></div></div>
    <div class="upload-text">Đang xử lý...</div>
    <div class="upload-hint">Vui lòng chờ giây lát</div>
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
      <div class="upload-hint">${type === 'cccd' ? 'CCCD đã được xác minh' : 'Khuôn mặt đã trùng khớp'}</div>
    `;
    if (card) card.classList.add('done');
    if (status) status.innerHTML = `<span style="color:var(--green);background:var(--green-light);padding:4px 10px;border-radius:100px;">✓ Xong</span>`;

    const both = state.verifiedItems.cccd && state.verifiedItems.face;
    const pct = (state.verifiedItems.cccd ? 50 : 0) + (state.verifiedItems.face ? 50 : 0);
    const verifyProgressBar = document.getElementById('verifyProgress');
    if (verifyProgressBar) verifyProgressBar.style.width = pct + '%';

    if (both) {
      const nextBtn = document.getElementById('verifyNextBtn');
      if (nextBtn) nextBtn.disabled = false;
      showToast('Xác thực danh tính hoàn tất!', 'success', '✓');
    } else {
      showToast(type === 'cccd' ? 'CCCD xác thực thành công!' : 'Khuôn mặt xác thực thành công!', 'success', '✓');
    }
  }, delay);
}

/* ─── MISC CHIPS UTILS (Cập nhật lưu trữ dịch vụ đã chọn) ──────── */
function togglePurpose(el) {
  el.classList.toggle('selected');
  const text = el.textContent.trim();
  
  if (el.classList.contains('selected')) {
    if (!state.formData.purposes.includes(text)) {
      state.formData.purposes.push(text);
    }
  } else {
    state.formData.purposes = state.formData.purposes.filter(item => item !== text);
  }
}

function generateRefCode() {
  const code = Math.floor(10000000 + Math.random() * 90000000);
  const el = document.getElementById('refCode');
  if (el) el.textContent = code;
}

/* ─── ROUTING CHUYỂN TRANG CHỦ MỚI (INDEX.HTML) ───────────────── */
function goHome() {
  showToast('Đang chuyển về trang chủ...', '', '🏠');
  setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

function goLogin() {
  showToast('Đang mở trang đăng nhập...', '', '🔐');
  setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

/* ─── TOAST CONTROLLER ───────────────────────────────────────── */
let toastTimeout;
function showToast(msg, type = '', icon = '') {
  clearTimeout(toastTimeout);
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');

  if (!toast || !toastMsg) return;

  toast.className = 'toast';
  if (type) toast.classList.add(type);
  toastMsg.textContent = msg;
  if (toastIcon) toastIcon.textContent = icon;

  void toast.offsetWidth; // Force Reflow
  toast.classList.add('show');

  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ─── KEYBOARD NAVIGATION ────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();

  if (e.key === 'Enter' && state.currentStep === 1) {
    const focused = document.activeElement;
    if (!focused || focused.tagName !== 'BUTTON') {
      goToStep(2);
    }
  }
});
