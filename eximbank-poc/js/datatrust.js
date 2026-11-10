(() => {
  const C = window.POC_CONFIG;
  const sessionKey = 'eximbank-poc-session';
  const accountLength = () => C.ACCOUNT_LENGTH ?? 12;

  // PNR được tạo từ số tài khoản, không còn từ số điện thoại.
  const pnr = account => C.PNR_PREFIX + account.trim();

  function isAccountNumber(value) {
    const newFormat = new RegExp(
      '^[1-9][0-9]{' + (accountLength() - 1) + '}$'
    );

    // Vẫn hỗ trợ tài khoản POC cũ dùng số điện thoại.
    return newFormat.test(value) || /^0\d{9}$/.test(value);
  }

  function randomAccountNumber() {
    const length = accountLength();

    if (!Number.isInteger(length) || length < 6 || length > 32) {
      throw Error('ACCOUNT_LENGTH phải là số nguyên từ 6 đến 32.');
    }

    function randomDigit(n) {
      const buffer = new Uint8Array(1);
      const limit = 256 - (256 % n);

      do {
        crypto.getRandomValues(buffer);
      } while (buffer[0] >= limit);

      return buffer[0] % n;
    }

    // Chữ số đầu từ 1–9.
    let account = String(1 + randomDigit(9));

    while (account.length < length) {
      account += randomDigit(10);
    }

    return account;
  }

  async function generateAccount() {
    const attempts = C.ACCOUNT_GENERATION_ATTEMPTS ?? 10;

    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100) {
      throw Error('Số lần thử sinh tài khoản phải từ 1 đến 100.');
    }

    for (let i = 0; i < attempts; i++) {
      const account = randomAccountNumber();
      const code = pnr(account);

      // lookup() đã xử lý HTTP 204 thành danh sách rỗng.
      // Nếu API lỗi, hàm sẽ dừng và báo lỗi.
      const records = await lookup(code);

      if (records.length === 0) {
        return { account, code };
      }
    }

    throw Error('Chưa tạo được số tài khoản chưa sử dụng. Vui lòng thử lại.');
  }
  const ids = type => Object.values(C.CONSENTS[type].checkboxes).flatMap(x => x.purposes);
  function validateConfig() {
    if (!C.WS.trim()) throw Error('Vui lòng điền WS trong js/config.js.');
    const owner = new Map();
    for (const [type, group] of Object.entries(C.CONSENTS)) {
      for (const [key, box] of Object.entries(group.checkboxes)) {
        if (!Array.isArray(box.purposes) || !box.purposes.length) throw Error(`Chưa cấu hình danh sách purpose cho ${key}.`);
        for (const id of box.purposes) {
          if (typeof id !== 'string' || !id.trim() || owner.has(id)) throw Error(`Purpose trống hoặc bị lặp: ${id}. Kiểm tra cấu hình checkbox.`);
          owner.set(id, type);
        }
      }
    }
  }
  function url(path) {
    if (!C.WS.trim()) throw Error('Vui lòng điền WS trong js/config.js.');
    return C.API_BASE_URL.replace(/\/$/, '') + path.replace('{WS}', encodeURIComponent(C.WS.trim()));
  }
  async function request(path, options = {}, auth = false, allowEmptyLookup = false) {
    const headers = { Accept: 'application/json' };
    if (auth) {
      if (!C.API_TOKEN.trim()) throw Error('Vui lòng điền API_TOKEN trong js/config.js.');
      headers.Authorization = C.API_TOKEN.trim();
      if (C.IP) headers['X-Forwarded-For'] = C.IP;
    }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), C.TIMEOUT_MS);
    try {
      const response = await fetch(url(path), { ...options, headers, signal: controller.signal });
      if (response.status === 204 && allowEmptyLookup) {
        return { success: true, data: [] };
      }

      const raw = await response.text();
      let body;
      try { body = raw ? JSON.parse(raw) : {}; } catch { throw Error('API trả về dữ liệu không phải JSON.'); }
      if (!response.ok || body.success === false) throw Error(body.message || `API lỗi HTTP ${response.status}.`);
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw Error('API phản hồi quá lâu. Vui lòng kiểm tra lại trạng thái trước khi thử gửi lại.');
      if (error instanceof TypeError) throw Error('Không kết nối được API. Kiểm tra địa chỉ, mạng và cấu hình CORS.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function lookup(code) {
    const body = await request(C.STATUS_PATH + '?pnr=' + encodeURIComponent(code), {}, true, true);
    if (body.success !== true || !Array.isArray(body.data)) throw Error('Response tra cứu không đúng cấu trúc success/data.');
    if (body.pnr && body.pnr !== code) throw Error('API trả về mã tham chiếu không khớp.');
    return body.data;
  }
  function selectSubject(subjects, phone) {
    if (!subjects.length) return null;

    if (!phone) {
      if (subjects.length === 1) return subjects[0];

      throw Error('PNR có nhiều chủ thể; chưa xác định được chủ tài khoản.');
    }

    const matching = subjects.filter(x => x.subject_phone === phone);

    if (matching.length === 1) return matching[0];

    if (subjects.length === 1 && !subjects[0].subject_phone) {
      return subjects[0];
    }

    throw Error('Tài khoản không khớp với số điện thoại. Vui lòng kiểm tra lại hoặc liên hệ ngân hàng.');
  }
  function validPurpose(p, now = Date.now()) {
    return p?.status === 'agreed' && (p.expired_time === null || (typeof p.expired_time === 'number' && p.expired_time > now));
  }
  function canLink(subject) {
    const required = ids('account_link');
    if (!required.length) throw Error('Chưa cấu hình purpose liên kết ví.');
    const purposes = (subject.consents || []).flatMap(c => c.purposes || []);
    // Nếu API trả nhiều bản ghi cùng ID, tất cả phải hợp lệ; không bỏ qua bản bị rút/hết hạn.
    return required.every(id => { const matches = purposes.filter(p => p.purpose_id === id); return matches.length > 0 && matches.every(p => validPurpose(p)); });
  }
  function device() {
    const ua = navigator.userAgent;
    return { device_type: /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop', browser: /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other', os: /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other' };
  }
  function payload(type, subject, code, choices, screen = 'ACCOUNT_REGISTRATION') {
    const group = C.CONSENTS[type];
    const purposes = Object.entries(group.checkboxes).flatMap(([key, box]) => box.purposes.map(id => ({ purpose_id: id, status: choices[key] === true ? 'agreed' : 'rejected' })));
    if (!purposes.length) throw Error('Chưa cấu hình purpose cho ' + type);
    return { method: 'api_sync', pnr: code, channel_context: { int_type: 'checkbox_select', screen_code: screen, screen_vi: screen === 'WALLET_LINK' ? 'Liên kết ví điện tử' : 'Đăng ký mở tài khoản', screen_en: screen === 'WALLET_LINK' ? 'Wallet Link' : 'Account Registration', comp_type: 'inline_form', text: Object.values(group.checkboxes).map(x => x.label).join('\n'), method: 'ui_interaction', action: screen === 'WALLET_LINK' ? 'Đồng ý và liên kết' : 'Xác nhận đăng ký' }, device_info: device(), source: { sys_name: 'Website POC Eximbank', sys_code: 'EXIMBANK_POC', channel: 'web_app', col_type: 'processor_third_party', col_name: 'DataTrust' }, datas: [{ ...subject, sub_code: '', is_submitter: true, purposes }] };
  }
  async function submit(type, body) {
    const form = new FormData(); form.append('text', JSON.stringify(body));
    const result = await request(C.CONSENTS[type].path, { method: 'POST', body: form }, true);
    if (!C.isConsentSuccess(result)) throw Error(result.message || 'API chưa xác nhận ghi nhận consent thành công.');
    return result;
  }
  function session() { try { const x = JSON.parse(sessionStorage.getItem(sessionKey)); return x?.pnr ? x : null; } catch { return null; } }
  function saveSession(code, subject) { sessionStorage.setItem(sessionKey, JSON.stringify({ pnr: code, subject })); }
  function logout() { sessionStorage.removeItem(sessionKey); location.href = 'index.html'; }
  window.DT = {
    pnr,
    isAccountNumber,
    generateAccount,
    ids,
    validateConfig,
    lookup,
    selectSubject,
    validPurpose,
    canLink,
    payload,
    submit,
    session,
    saveSession,
    logout
  };
})();
