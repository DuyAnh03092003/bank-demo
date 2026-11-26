/*
 * An Tâm Bank Payment Integration POC — browser-only mock payment/OTP flow.
 * Do NOT use as bank, wallet or payment authentication: OTP is generated and
 * checked on the client, and payment completion is only a UI simulation.
 * Consent GET/POST remains real via the pre-existing DT middleware integration.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('walletPage') || !$('payCheck') || !window.DT) return;
  const D = window.DT;
  const state = {
    amount: 0, orderId: '', stage: 'account', pnr: '', phone: '', subject: null,
    otp: null, otpExpires: 0, attemptsLeft: 5, otpVerified: false,
    consentVerified: false, busy: false, deadline: 0, clock: null,
  };
  const vnd = n => new Intl.NumberFormat('vi-VN').format(n) + ' VND';
  const mask = s => '•••• ' + String(s).slice(-4);
  const randomDigits = length => {
    // Uniform 6-digit demo code, intentionally displayed on the test screen.
    const values = new Uint32Array(1); crypto.getRandomValues(values);
    return String(values[0] % (10 ** length)).padStart(length, '0');
  };
  const randomRef = () => {
    const bytes = new Uint8Array(4); crypto.getRandomValues(bytes);
    return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const setMessage = (text = '', tone = 'info') => {
    const node = $('payMessage');
    node.textContent = text;
    node.dataset.tone = tone;
    node.hidden = !text;
  };
  const showStage = stage => {
    state.stage = stage;
    ['account','payment'].forEach(key => {
      $('payStage' + key[0].toUpperCase() + key.slice(1)).classList.toggle('hidden', key !== stage);
      const n = document.querySelector('[data-gstep="' + key + '"]');
      if (n) n.classList.toggle('is-current', key === stage);
    });
    setMessage();
    $('walletPage').scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const setConsentMessage = (message = '', tone = 'warning') => {
    const node = $('payConsentMessage');
    node.textContent = message;
    node.dataset.tone = tone;
    node.hidden = !message;
  };
  const setConsentSubmitEnabled = () => {
    $('paySubmitConsent').disabled = state.busy || !state.subject || !/^\d{6}$/.test($('payOtpInput').value.trim());
  };
  const setBusy = flag => {
    state.busy = flag;
    for (const id of ['payCheck','paySubmitConsent','payFinalize']) {
      const el = $(id); if (el) el.disabled = flag;
    }
    if (!flag) {
      setConsentSubmitEnabled();
      $('payFinalize').disabled = !state.consentVerified;
    }
  };
  const resetOtp = () => {
    state.otp = null; state.otpExpires = 0; state.attemptsLeft = 5; state.otpVerified = false;
    $('payOtpInput').value = ''; $('payOtpInput').disabled = false;
    $('payOtpDemo').value = '';
    $('payOtpStatus').textContent = 'Nhập OTP giả lập để xác nhận.';
    $('payOtpExpiry').textContent = '180 giây';
    setConsentMessage();
    setConsentSubmitEnabled();
  };
  const closeConsentPopup = () => {
    $('payConsentModal').classList.add('hidden');
    resetOtp();
  };
  const timerTick = () => {
    const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    if ($('payCountdownMinute') && $('payCountdownSecond')) {
      $('payCountdownMinute').textContent = mm;
      $('payCountdownSecond').textContent = ss;
    } else { $('payCountdown').textContent = `${mm}:${ss}`; }
    if (state.otp && !state.otpVerified) {
      $('payOtpExpiry').textContent = 'Còn ' + Math.max(0, Math.ceil((state.otpExpires - Date.now()) / 1000)) + ' giây';
    }
    if (remaining === 0 && !$('walletPage').classList.contains('hidden')) {
      close();
      window.showToast?.('Phiên thanh toán mô phỏng đã hết hạn. Vui lòng bắt đầu lại.');
    }
  };
  const fromSession = () => {
    const session = D.session?.();
    if (session?.pnr) $('payAccount').value = session.pnr.replace(window.POC_CONFIG?.PNR_PREFIX || '', '');
    if (session?.subject?.subject_phone) $('payPhone').value = session.subject.subject_phone;
    if (session?.subject?.subject_name && $('payHolderName')) $('payHolderName').value = session.subject.subject_name;
  };
  function start({ amount }) {
    if (state.clock) clearInterval(state.clock);
    state.amount = Math.max(0, Number(amount) || 0);
    state.orderId = 'POC-' + randomRef();
    state.pnr = ''; state.phone = ''; state.subject = null;
    state.consentVerified = false; state.deadline = Date.now() + 15 * 60 * 1000;
    $('payAccount').value = ''; $('payPhone').value = '';
    if ($('payHolderName')) $('payHolderName').value = '';
    $('payDemoExpired').checked = false;
    closeConsentPopup(); fromSession();
    $('payAmount').innerHTML = new Intl.NumberFormat('vi-VN').format(state.amount) + '<sup>VND</sup>';
    $('payOrderValue').textContent = vnd(state.amount);
    $('payOrderId').textContent = state.orderId;
    showStage('account'); timerTick();
    state.clock = setInterval(timerTick, 1000);
  }
  function close() {
    if (state.clock) clearInterval(state.clock);
    state.clock = null;
    closeConsentPopup();
    state.consentVerified = false;
    $('walletPage').classList.add('hidden');
    document.title = 'MARTI | Mua sắm trực tuyến';
    setMessage();
  }
  async function getSubject() {
    const records = await D.lookup(state.pnr);
    const subject = D.selectSubject(records, state.phone);
    if (!subject) throw new Error('Không tìm thấy tài khoản POC. Hãy đăng ký tài khoản trên website An Tâm Bank POC trước.');
    return subject;
  }
  async function checkConsent() {
    if (state.busy) return;
    const account = $('payAccount').value.trim();
    const phone = $('payPhone').value.trim();
    if (!D.isAccountNumber(account)) return setMessage('Vui lòng nhập đúng số tài khoản An Tâm Bank POC đã được tạo.', 'error');
    if (!/^0\d{9}$/.test(phone)) return setMessage('Số điện thoại POC phải gồm 10 chữ số và bắt đầu bằng 0.', 'error');
    state.pnr = D.pnr(account); state.phone = phone;
    setBusy(true); setMessage('Đang kiểm tra Consent thực tế trên DataTrust...', 'info');
    try {
      state.subject = await getSubject();
      if (!($('payDemoExpired').checked) && D.canLink(state.subject)) {
        state.consentVerified = true;
        showReady();
      } else {
        state.consentVerified = false;
        $('paySubjectName').textContent = state.subject.subject_name || 'Khách hàng An Tâm Bank POC';
        $('payMaskedAccount').textContent = mask(state.pnr);
        $('payConsentReason').textContent = $('payDemoExpired').checked
          ? 'Chế độ kiểm thử: sự đồng ý cần được xác nhận lại để tiếp tục.'
          : 'Chưa có sự đồng ý chia sẻ dữ liệu tài khoản còn hiệu lực. Vui lòng xác nhận theo yêu cầu của An Tâm Bank POC.';
        openConsentPopup();
      }
    } catch (error) { setMessage(error.message, 'error'); }
    finally { setBusy(false); }
  }
  function issueDemoOtp() {
    resetOtp();
    state.otp = randomDigits(6);
    state.otpExpires = Date.now() + 180 * 1000;
    $('payOtpDemo').value = state.otp; // demo only: deliberately copyable test code
    $('payOtpStatus').textContent = 'Đã phát hành OTP giả lập; vui lòng nhập mã trước khi hết hạn.';
    // Native alert is intentional, per the POC scenario. Never accept a real bank OTP.
    $('payOtpInput').focus?.();
  }
  function openConsentPopup() {
    $('payConsentModal').classList.remove('hidden');
    issueDemoOtp();
  }
  function verifyOtp() {
    if (!state.subject) return false;
    if (!state.otp || Date.now() >= state.otpExpires) {
      issueDemoOtp();
      setConsentMessage('OTP đã hết hạn. Mã giả lập mới được tạo và hiển thị.', 'warning');
      return false;
    }
    const input = $('payOtpInput').value.trim();
    if (!/^\d{6}$/.test(input)) {
      setConsentMessage('Vui lòng nhập đủ 6 chữ số OTP.', 'warning');
      return false;
    }
    if (input !== state.otp) {
      state.attemptsLeft--;
      if (state.attemptsLeft <= 0) {
        issueDemoOtp();
        setConsentMessage('Bạn đã nhập sai 5 lần; hệ thống đã cấp mã giả lập mới.', 'warning');
      } else {
        setConsentMessage('Mã OTP không đúng. Còn ' + state.attemptsLeft + ' lần thử.', 'warning');
      }
      return false;
    }
    state.otpVerified = true;
    state.otp = null; // OTP is consumed after successful verification
    $('payOtpInput').disabled = true;
    $('payOtpStatus').textContent = '✓ OTP giả lập hợp lệ. Đang ghi nhận sự đồng ý...';
    setConsentMessage();
    return true;
  }
  function showReady() {
    closeConsentPopup();
    $('payConfirmAccount').textContent = mask(state.pnr);
    $('payConfirmAmount').textContent = vnd(state.amount);
    showStage('payment');
    setMessage('DataTrust xác nhận Consent hợp lệ, có thể tiếp tục mô phỏng thanh toán.', 'success');
  }
  async function submitConsent() {
    if (state.busy || !state.subject || !verifyOtp()) return;
    setBusy(true); setConsentMessage('Đang ghi nhận sự đồng ý vào DataTrust...', 'info');
    try {
      const s = state.subject;
      const subject = {
        sub_name: s.subject_name || '', sub_phone: s.subject_phone || state.phone,
        sub_email: s.subject_email || '', sub_dob: s.subject_dob || '',
        sub_cid: s.subject_cid || '', sub_nationality: s.subject_nationality || ''
      };
      await D.submit('account_link', D.payload('account_link', subject, state.pnr, { wallet_link: true }, 'WALLET_LINK'));
      state.consentVerified = true;
      $('payDemoExpired').checked = false;
      showReady();
    } catch (error) {
      $('payOtpInput').disabled = false;
      state.otpVerified = false;
      issueDemoOtp();
      setConsentMessage(error.message, 'error');
    } finally { setBusy(false); }
  }
  async function finalize() {
  if (state.busy || !state.consentVerified) return;
  const ref = 'MOCK-PAY-' + randomRef();
  close();
  window.showPaymentResult?.(
    true,
    `Giao dịch ${ref} được MÔ PHỎNG thành công. Không có thanh toán hoặc trích tiền thật.`
  );
}
  $('payCheck').addEventListener('click', checkConsent);
  $('payOtpInput').addEventListener('input', setConsentSubmitEnabled);
  $('payOtpInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitConsent(); } });
  $('payCopyOtp').addEventListener('click', async () => {
    const code = $('payOtpDemo').value;
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setConsentMessage('Đã sao chép OTP giả lập.', 'success'); }
    catch { $('payOtpDemo').focus(); $('payOtpDemo').select(); setConsentMessage('Chọn và sao chép mã OTP trong ô bên cạnh.', 'info'); }
  });
  $('paySubmitConsent').addEventListener('click', submitConsent);
  const cancelConsent = () => { if (!state.busy) closeConsentPopup(); };
  $('payConsentBack').addEventListener('click', cancelConsent);
  $('payConsentClose').addEventListener('click', cancelConsent);
  $('payPaymentBack').addEventListener('click', () => showStage('account'));
  $('payFinalize').addEventListener('click', finalize);
  $('payAccount').addEventListener('input', () => { state.consentVerified = false; setMessage(); });
  $('payPhone').addEventListener('input', () => { state.consentVerified = false; setMessage(); });
  $('payHolderName')?.addEventListener('input', () => { state.consentVerified = false; setMessage(); });
  window.POC_PAYMENT = { start, close };
})();
