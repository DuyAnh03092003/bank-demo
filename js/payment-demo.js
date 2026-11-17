/*
 * Eximbank Payment Integration POC — browser-only mock payment/OTP flow.
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
    ['account','consent','payment'].forEach(key => {
      $('payStage' + key[0].toUpperCase() + key.slice(1)).classList.toggle('hidden', key !== stage);
      const n = document.querySelector('[data-gstep="' + key + '"]');
      if (n) n.classList.toggle('is-current', key === stage);
    });
    setMessage();
    $('walletPage').scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const setBusy = flag => {
    state.busy = flag;
    for (const id of ['payCheck','payCreateOtp','payVerifyOtp','paySubmitConsent','payFinalize']) {
      const el = $(id); if (el) el.disabled = flag;
    }
    if (!flag) {
      $('paySubmitConsent').disabled = !state.otpVerified || !$('payAgree').checked;
      $('payFinalize').disabled = !state.consentVerified;
      $('payVerifyOtp').disabled = state.otpVerified;
    }
  };
  const resetOtp = () => {
    state.otp = null; state.otpExpires = 0; state.attemptsLeft = 5; state.otpVerified = false;
    $('payOtpInput').value = ''; $('payOtpInput').disabled = false; $('payVerifyOtp').disabled = false;
    $('payAgree').checked = false;
    $('payAgree').disabled = true;
    $('paySubmitConsent').disabled = true;
    $('payOtpInbox').classList.add('hidden');
    $('payOtpStatus').textContent = 'Chưa xác thực OTP.';
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
    resetOtp(); fromSession();
    $('payAmount').innerHTML = new Intl.NumberFormat('vi-VN').format(state.amount) + '<sup>VND</sup>';
    $('payOrderValue').textContent = vnd(state.amount);
    $('payOrderId').textContent = state.orderId;
    showStage('account'); timerTick();
    state.clock = setInterval(timerTick, 1000);
  }
  function close() {
    if (state.clock) clearInterval(state.clock);
    state.clock = null;
    resetOtp();
    state.consentVerified = false;
    $('walletPage').classList.add('hidden');
    document.title = 'MARTI | Mua sắm trực tuyến';
    setMessage();
  }
  async function getSubject() {
    const records = await D.lookup(state.pnr);
    const subject = D.selectSubject(records, state.phone);
    if (!subject) throw new Error('Không tìm thấy tài khoản POC. Hãy đăng ký tài khoản trên website Eximbank POC trước.');
    return subject;
  }
  async function checkConsent() {
    if (state.busy) return;
    const account = $('payAccount').value.trim();
    const phone = $('payPhone').value.trim();
    if (!D.isAccountNumber(account)) return setMessage('Vui lòng nhập đúng số tài khoản Eximbank POC đã được tạo.', 'error');
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
        resetOtp();
        $('paySubjectName').textContent = state.subject.subject_name || 'Khách hàng Eximbank POC';
        $('payMaskedAccount').textContent = mask(state.pnr);
        $('payConsentReason').textContent = $('payDemoExpired').checked
          ? 'Chế độ POC: giả lập sự đồng ý cần được cấp lại. Xác thực OTP thử nghiệm trước khi ghi nhận lại Consent.'
          : 'Mục đích chia sẻ dữ liệu tài khoản với ví chưa có hiệu lực. Xác thực OTP thử nghiệm và xác nhận đồng ý để tiếp tục.';
        showStage('consent');
      }
    } catch (error) { setMessage(error.message, 'error'); }
    finally { setBusy(false); }
  }
  function createOtp() {
    if (state.busy || !state.subject) return;
    resetOtp();
    state.otp = randomDigits(6);
    state.otpExpires = Date.now() + 180 * 1000;
    $('payOtpDemo').textContent = state.otp;
    $('payOtpInbox').classList.remove('hidden');
    $('payOtpStatus').textContent = 'Đã tạo OTP POC. Nhập mã trong hộp thư giả lập (hiệu lực 3 phút).';
    $('payOtpInput').focus();
  }
  function verifyOtp() {
    if (state.busy || !state.subject) return;
    if (!state.otp) return setMessage('Chưa tạo OTP. Hãy nhấn “Tạo OTP thử nghiệm”.', 'warning');
    if (Date.now() > state.otpExpires) {
      resetOtp();
      return setMessage('OTP đã hết hiệu lực. Hãy tạo mã mới.', 'warning');
    }
    const input = $('payOtpInput').value.trim();
    if (!/^\d{6}$/.test(input)) return setMessage('Vui lòng nhập đủ 6 chữ số OTP.', 'warning');
    if (state.attemptsLeft <= 0) return setMessage('Đã hết lượt thử. Hãy tạo OTP mới.', 'error');
    if (input !== state.otp) {
      state.attemptsLeft--;
      if (state.attemptsLeft === 0) {
        resetOtp();
        return setMessage('Nhập sai 5 lần. Vui lòng tạo OTP khác.', 'error');
      }
      $('payOtpStatus').textContent = 'OTP chưa đúng. Còn ' + state.attemptsLeft + ' lần thử.';
      return setMessage('Mã OTP thử nghiệm không khớp.', 'warning');
    }
    state.otpVerified = true;
    state.otp = null; // consume code
    $('payOtpDemo').textContent = 'Đã xác nhận';
    $('payOtpStatus').textContent = '✓ OTP thử nghiệm hợp lệ. Bạn có thể lựa chọn đồng ý.';
    $('payAgree').disabled = false;
    $('payOtpInput').disabled = true;
    $('payVerifyOtp').disabled = true;
    setMessage('Xác thực thử nghiệm thành công. Vui lòng xác nhận mục đích chia sẻ dữ liệu.', 'success');
  }
  function showReady() {
    $('payConfirmAccount').textContent = mask(state.pnr);
    $('payConfirmAmount').textContent = vnd(state.amount);
    showStage('payment');
    setMessage('DataTrust xác nhận Consent hợp lệ, có thể tiếp tục mô phỏng thanh toán.', 'success');
  }
  async function submitConsent() {
    if (state.busy || !state.subject || !state.otpVerified || !$('payAgree').checked) return;
    setBusy(true); setMessage('Đang ghi nhận sự đồng ý vào DataTrust...', 'info');
    try {
      const s = state.subject;
      const subject = {
        sub_name: s.subject_name || '', sub_phone: s.subject_phone || state.phone,
        sub_email: s.subject_email || '', sub_dob: s.subject_dob || '',
        sub_cid: s.subject_cid || '', sub_nationality: s.subject_nationality || ''
      };
      await D.submit('account_link', D.payload('account_link', subject, state.pnr, { wallet_link: true }, 'WALLET_LINK'));
      // POST success is not proof of an active Consent; read it back.
      for (let i = 0; i < 3; i++) {
        if (i) await new Promise(resolve => setTimeout(resolve, 700));
        state.subject = await getSubject();
        if (D.canLink(state.subject)) break;
      }
      if (!D.canLink(state.subject)) throw new Error('Đã gửi yêu cầu, nhưng DataTrust chưa xác nhận Consent còn hiệu lực. Không thể tiếp tục.');
      state.consentVerified = true;
      $('payDemoExpired').checked = false;
      showReady();
    } catch (error) { setMessage(error.message, 'error'); }
    finally { setBusy(false); }
  }
  async function finalize() {
    if (state.busy || !state.consentVerified) return;
    setBusy(true); setMessage('Đang kiểm tra lại hiệu lực Consent trước khi mô phỏng thanh toán...', 'info');
    try {
      const fresh = await getSubject();
      if (!D.canLink(fresh)) {
        state.consentVerified = false;
        showStage('account');
        throw new Error('Consent hiện không còn hiệu lực. Hãy kiểm tra và xin đồng ý lại.');
      }
      const ref = 'MOCK-PAY-' + randomRef();
      close();
      window.showPaymentResult?.(true, `Giao dịch ${ref} được MÔ PHỎNG thành công. Không có thanh toán hoặc trích tiền thật.`);
    } catch (error) { setMessage(error.message, 'error'); }
    finally { setBusy(false); }
  }
  $('payCheck').addEventListener('click', checkConsent);
  $('payCreateOtp').addEventListener('click', createOtp);
  $('payVerifyOtp').addEventListener('click', verifyOtp);
  $('payOtpInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); verifyOtp(); } });
  $('payAgree').addEventListener('change', () => { $('paySubmitConsent').disabled = !state.otpVerified || !$('payAgree').checked; });
  $('paySubmitConsent').addEventListener('click', submitConsent);
  $('payConsentBack').addEventListener('click', () => { resetOtp(); $('payOtpInput').disabled = false; $('payVerifyOtp').disabled = false; showStage('account'); });
  $('payPaymentBack').addEventListener('click', () => showStage('account'));
  $('payFinalize').addEventListener('click', finalize);
  $('payAccount').addEventListener('input', () => { state.consentVerified = false; setMessage(); });
  $('payPhone').addEventListener('input', () => { state.consentVerified = false; setMessage(); });
  $('payHolderName')?.addEventListener('input', () => { state.consentVerified = false; setMessage(); });
  window.POC_PAYMENT = { start, close };
})();
