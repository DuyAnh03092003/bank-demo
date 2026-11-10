(() => {
  const $ = id => document.getElementById(id), D = window.DT, C = window.POC_CONFIG;
  const message = (id, text) => { if ($(id)) $(id).textContent = text; };
  function boxes(target, types, prefix) {
    for (const type of types) {
      const group = C.CONSENTS[type], section = document.createElement('section'); section.className = 'consent-box';
      const heading = document.createElement('h2'); heading.textContent = group.label; section.append(heading);
      for (const [key, config] of Object.entries(group.checkboxes)) {
        const label = document.createElement('label'); label.className = 'consent-option';
        const input = document.createElement('input'); input.type = 'checkbox'; input.id = prefix + key; input.dataset.consentType = type; input.dataset.consentKey = key; input.required = config.required;
        const span = document.createElement('span'); span.textContent = config.label + (config.required ? ' (Bắt buộc)' : ' (Không bắt buộc)'); label.append(input, span); section.append(label);
      }
      target.append(section);
    }
  }
  const choices = type => Object.fromEntries([...document.querySelectorAll(`#accountConsents input[data-consent-type="${type}"]`)].map(el => [el.dataset.consentKey, el.checked]));
  const current = D.session();
  document.querySelectorAll('a[href="account.html"]').forEach(el => el.classList.toggle('hidden', !!current));
  const nav = document.querySelector('.nav-actions');
  if (nav) {
    const link = document.createElement('a'); link.className = 'btn btn-line'; link.href = current ? 'consents.html' : 'login.html'; link.textContent = current ? 'Quản lý sự đồng ý' : 'Đăng nhập'; nav.prepend(link);
    if (current) { const b = document.createElement('button'); b.className = 'btn btn-light'; b.textContent = 'Đăng xuất'; b.onclick = D.logout; nav.append(b); }
  }
  if ($('registerForm') && current) { location.replace('consents.html'); return; }
  if ($('loginPnr')) {
    $('loginPnr').placeholder = '123456789012';
  }

  if ($('walletAccount')) {
    $('walletAccount').placeholder = 'Nhập số tài khoản được cấp khi đăng ký';

    const label = document.querySelector('label[for="walletAccount"]');
    if (label) label.textContent = 'Số tài khoản';
  }
  if ($('loginForm')) {
    if (current) { location.replace('consents.html'); return; }
    $('loginForm').addEventListener('submit', async e => {
      e.preventDefault(); const code = $('loginPnr').value.trim(), button = $('loginSubmit'); button.disabled = true; message('loginMessage', 'Đang kiểm tra tài khoản…');
      try {
        if (
          !code.startsWith(C.PNR_PREFIX) ||
          !D.isAccountNumber(code.slice(C.PNR_PREFIX.length))
        ) {
          throw Error('Tên đăng nhập là số tài khoản.');
        }
        const records = await D.lookup(code); if (!records.length) throw Error('Tài khoản không tồn tại.');
        const subject = D.selectSubject(records); D.saveSession(code, subject); location.href = 'consents.html';
      } catch (error) { message('loginMessage', error.message); } finally { button.disabled = false; }
    });
  }
  if ($('registerForm')) {
    boxes($('accountConsents'), ['bank_service', 'account_link'], 'register_');
    const form = $('registerForm'), next = $('accountContinue'), confirm = $('confirmAccount');
    let draft = null, submitted = new Set(), inFlight = false;
    const refresh = () => { next.disabled = [...form.querySelectorAll('input[type=checkbox][required]')].some(x => !x.checked); }; form.addEventListener('change', refresh); refresh();
    const today = new Date(); $('dob').max = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    form.addEventListener('submit', async e => {
      e.preventDefault(); if (inFlight || !form.reportValidity()) return; inFlight = true; next.disabled = true;
      try {
        D.validateConfig();
        const phone = $('phone').value.trim();
        const fields = { FullName: $('fullName').value.trim(), Phone: phone, Email: $('email').value.trim(), Dob: $('dob').value, IdNumber: $('idNumber').value.trim(), District: $('district').value };
        if (!fields.FullName) throw Error('Vui lòng nhập họ và tên.');
        const subject = { sub_name: fields.FullName, sub_phone: phone, sub_email: fields.Email, sub_dob: fields.Dob.split('-').reverse().join(''), sub_cid: fields.IdNumber, sub_nationality: 'Việt Nam' };
        message('registerMessage', 'Đang tạo số tài khoản mới…');
        const { account, code } = await D.generateAccount();
        draft = {
          code,
          account,
          phone,
          subject,
          bodies: Object.fromEntries(
            ['bank_service', 'account_link'].map(type => [
              type,
              D.payload(type, subject, code, choices(type))
            ])
          )
        };
        submitted.clear();
        Object.entries(fields).forEach(([key, value]) => $('review' + key).textContent = value);
        message('reviewRequiredConsent', '✓ Đồng ý xử lý thông tin để cung cấp dịch vụ ngân hàng.');
        message('reviewOffersConsent', choices('bank_service').offers ? '✓ Đồng ý nhận thông tin ưu đãi.' : 'Không đồng ý nhận thông tin ưu đãi.');
        message('reviewLinkConsent', choices('account_link').wallet_link ? '✓ Đồng ý sử dụng thông tin cho liên kết tài khoản.' : 'Không đồng ý sử dụng thông tin cho liên kết tài khoản.');
        message('registerMessage', '');
        message(
          'registrationStatus',
          `Số tài khoản mới: ${account}. Tên đăng nhập: ${code}`
        ); $('account-form').classList.add('hidden'); $('accountReview').classList.remove('hidden');
      } catch (error) { message('registerMessage', error.message); } finally { inFlight = false; refresh(); }
    });
    $('editAccount').onclick = () => { if (submitted.size || inFlight) return; $('accountReview').classList.add('hidden'); $('account-form').classList.remove('hidden'); };
    confirm.onclick = async () => {
      if (!draft || inFlight) return; inFlight = true; confirm.disabled = true; $('editAccount').disabled = true;
      try {
        if (!submitted.size && (await D.lookup(draft.code)).length) {
          throw Error(
            'Số tài khoản vừa sinh đã tồn tại. Chọn Quay lại chỉnh sửa rồi Tiếp tục để tạo số mới.'
          );
        }
        for (const type of ['bank_service', 'account_link']) {
          if (submitted.has(type)) continue; message('registrationStatus', 'Đang gửi: ' + C.CONSENTS[type].label + '…');
          await D.submit(type, draft.bodies[type]); submitted.add(type);
        }
        $('accountReview').classList.add('hidden'); $('accountSuccess').classList.remove('hidden');
        message('accountSuccessText', `Cảm ơn ${draft.subject.sub_name}. Số tài khoản: ${draft.account}. Tên đăng nhập: ${draft.code}. Các lựa chọn đồng ý đã được ghi nhận.`);
      } catch (error) { message('registrationStatus', `${error.message}${submitted.size ? ' Đã ghi nhận ' + [...submitted].map(t => C.CONSENTS[t].label).join(', ') + '. Bấm thử lại để gửi phần còn thiếu.' : ''}`); confirm.textContent = 'Thử lại'; }
      finally { inFlight = false; confirm.disabled = false; $('editAccount').disabled = !!submitted.size; }
    };
  }

  const withdrawalPurposes = {
    PUR_00005: '81064932362128947',
    PUR_00007: '81064932362174314',
    PUR_00008: '81064932362186741',
    PUR_00009: '81064932362200977',
    PUR_00010: '81064932362222568'
  };

  const withdrawalFormUrl =
    'https://irm-demo.datatrust.one/irm/request/621861/ecd7/217716bc-ecd7-45bc-a5b0-46108584db0f';

  function openWithdrawalForm(eligiblePurposes, subject) {
    if (!eligiblePurposes.length) return;

    if (document.getElementById('withdrawalDialog')) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'withdrawalDialog';
    dialog.style.cssText = `
    width:min(580px,calc(100% - 32px));
    max-height:85vh;
    overflow:auto;
    padding:24px;
    border:1px solid #dce7ef;
    border-radius:14px;
    color:#17324d;
  `;

    dialog.innerHTML = `
    <form>
      <h2>Rút lại sự đồng ý</h2>
      <p data-customer></p>

      <fieldset>
        <legend>Chọn mục đích cần rút lại</legend>
        <div data-purposes></div>
      </fieldset>

      <fieldset style="margin-top:16px">
        <legend>Trường dữ liệu cần rút lại</legend>
        <label class="consent-option">
          <input type="checkbox" name="field" value="Email">
          <span>Email</span>
        </label>
        <label class="consent-option">
          <input type="checkbox" name="field" value="Số điện thoại">
          <span>Số điện thoại</span>
        </label>
      </fieldset>

      <div class="field" style="margin-top:16px">
        <label>Lý do rút lại sự đồng ý</label>
        <textarea name="reason" rows="3" maxlength="2000"></textarea>
      </div>

      <p data-feedback role="status"></p>

      <div class="form-foot">
        <button type="button" class="btn btn-light" data-close>
          Hủy
        </button>
        <button type="submit" class="btn btn-blue" data-send disabled>
          Gửi yêu cầu
        </button>
      </div>
    </form>
  `;

    const form = dialog.querySelector('form');
    const send = dialog.querySelector('[data-send]');
    const close = dialog.querySelector('[data-close]');
    const feedback = dialog.querySelector('[data-feedback]');
    const options = dialog.querySelector('[data-purposes]');

    let busy = false;
    let sent = false;

    dialog.querySelector('[data-customer]').textContent =
      `${subject.subject_name || ''} · Số tài khoản: ${current.pnr}`;

    for (const purpose of eligiblePurposes) {
      const label = document.createElement('label');
      label.className = 'consent-option';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'purpose';
      input.value = purpose.withdrawalId;

      const text = document.createElement('span');
      text.textContent = purpose.purpose_name || purpose.purpose_id;

      label.append(input, text);
      options.append(label);
    }

    const checkedValues = name =>
      [...form.querySelectorAll(`input[name="${name}"]:checked`)]
        .map(input => input.value);

    const refresh = () => {
      send.disabled =
        busy ||
        sent ||
        checkedValues('purpose').length === 0 ||
        checkedValues('field').length === 0;
    };

    form.addEventListener('change', refresh);

    close.onclick = () => {
      if (!busy) dialog.close();
    };

    dialog.addEventListener('cancel', event => {
      if (busy) event.preventDefault();
    });

    dialog.addEventListener('close', () => dialog.remove());

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || sent) return;

      const selectedIds = checkedValues('purpose');
      const fields = checkedValues('field');
      const selected = eligiblePurposes.filter(
        item => selectedIds.includes(item.withdrawalId)
      );

      if (!selected.length || !fields.length) return;

      // Chụp lựa chọn tại thời điểm gửi.
      const reason = form.elements.reason.value.trim();

      busy = true;
      close.disabled = true;
      refresh();
      feedback.textContent = 'Đang kiểm tra sự đồng ý…';

      const controller = new AbortController();
      let timer;

      try {
        const freshSubject = D.selectSubject(
          await D.lookup(current.pnr)
        );

        if (!freshSubject) {
          throw Error('Không tìm thấy thông tin tài khoản.');
        }

        const freshPurposes = (freshSubject.consents || [])
          .flatMap(item => item.purposes || []);

        const valid = selected.every(item => {
          const matches = freshPurposes.filter(p =>
            [String(item.purpose_id), item.withdrawalId]
              .includes(String(p.purpose_id))
          );

          return matches.length > 0 &&
            matches.every(p => D.validPurpose(p));
        });

        if (!valid) {
          throw Error(
            'Một số mục đích không còn đủ điều kiện rút. Đóng form và cập nhật thông tin.'
          );
        }

        if (
          !freshSubject.subject_name ||
          !freshSubject.subject_email ||
          selected.some(item => !item.purpose_name)
        ) {
          throw Error('Thiếu họ tên, email hoặc tên mục đích để gửi yêu cầu.');
        }

        const body = {
          lang: 'vi',
          content: [
            {
              id: 'pnrId',
              title: 'Mã tham chiếu',
              type: 1,
              answer: current.pnr
            },
            {
              id: 'value-name',
              title: 'Họ và tên',
              type: 10,
              answer: freshSubject.subject_name
            },
            {
              id: 'value-number-phone',
              title: 'Số điện thoại',
              type: 11,
              answer: freshSubject.subject_phone || ''
            },
            {
              id: 'value-email',
              title: 'Email',
              type: 12,
              answer: freshSubject.subject_email
            },
            {
              id: 'serviceId-75998382764827834',
              title: 'Sản phẩm/Dịch vụ',
              type: 5,
              answer: 'Ngân hàng số'
            },
            {
              id: 'appId-72620599152941602',
              title: 'Loại yêu cầu xử lý DLCN',
              type: 5,
              answer: 'Rút lại sự đồng ý'
            },
            {
              id: 'cb-withdraw-purpose-1794279336151',
              title: 'Mục đích xử lý cần rút lại sự đồng ý',
              type: 3,
              answer: selected.map(item => item.purpose_name),
              answer_id: selected.map(item => item.withdrawalId)
            },
            {
              id: 'cb-withdraw-type-1794279336152',
              title: 'Trường dữ liệu cần rút lại',
              type: 3,
              answer: fields
            },
            {
              id: 'para-withdraw-reason-1794279336153',
              title: 'Mô tả lý do rút lại sự đồng ý',
              type: 2,
              answer: reason
            }
          ]
        };

        const formData = new FormData();
        formData.append('key', 'text');
        formData.append('text', JSON.stringify(body));

        feedback.textContent = 'Đang gửi yêu cầu…';
        timer = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(
          C.WITHDRAWAL_URL || withdrawalFormUrl,
          {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData,
            signal: controller.signal
          }
        );

        const raw = await response.text();
        let result = null;

        try {
          result = raw ? JSON.parse(raw) : null;
        } catch {
          // Chưa có mẫu response IRM để xác nhận nội dung phản hồi.
        }

        if (!response.ok || result?.success === false || result?.error) {
          throw Error(
            result?.message ||
            result?.msg ||
            `API phản hồi lỗi HTTP ${response.status}.`
          );
        }

        sent = true;
        send.textContent = 'Đã gửi';
        close.textContent = 'Đóng';

        feedback.textContent = result?.success === true
          ? 'Đã gửi yêu cầu. Vui lòng kiểm tra email để thực hiện bước tiếp theo nếu có.'
          : `API đã phản hồi HTTP ${response.status}. Vui lòng kiểm tra email hoặc hồ sơ DataTrust để xác nhận yêu cầu đã được tiếp nhận.`;

        message(
          'consentMessage',
          'Bấm “Cập nhật thông tin” sau khi yêu cầu được xử lý để xem trạng thái mới.'
        );
      } catch (error) {
        feedback.textContent = error.name === 'AbortError'
          ? 'Chưa nhận được phản hồi. Kiểm tra hồ sơ DataTrust trước khi gửi lại để tránh trùng yêu cầu.'
          : error.message;
      } finally {
        clearTimeout(timer);
        busy = false;
        close.disabled = false;
        refresh();
      }
    });

    document.body.append(dialog);
    dialog.showModal();
  }

  if ($('consentList')) {
    if (!current) { location.replace('login.html'); return; }
    const load = async () => {
      $('openWithdrawal').disabled = true;
      $('openWithdrawal').onclick = null;
      $('refreshConsents').disabled = true; message('consentMessage', 'Đang tải…'); $('consentList').replaceChildren();
      try {
        const subject = D.selectSubject(await D.lookup(current.pnr));
        if (!subject) throw Error('Không tìm thấy tài khoản.');
        const eligibleMap = new Map();

        for (const consent of subject.consents || []) {
          for (const purpose of consent.purposes || []) {
            const id = String(purpose.purpose_id);

            const withdrawalId =
              withdrawalPurposes[id] ||
              (
                Object.values(withdrawalPurposes).includes(id)
                  ? id
                  : null
              );

            if (withdrawalId && D.validPurpose(purpose)) {
              eligibleMap.set(withdrawalId, {
                ...purpose,
                withdrawalId
              });
            }
          }
        }

        const eligiblePurposes = [...eligibleMap.values()];

        $('openWithdrawal').disabled = eligiblePurposes.length === 0;

        $('openWithdrawal').onclick = () => {
          openWithdrawalForm(eligiblePurposes, subject);
        };
        D.saveSession(current.pnr, subject); message('customerSummary', `${subject.subject_name || ''} · Số tài khoản: ${current.pnr.slice(C.PNR_PREFIX.length)} · ${current.pnr}`);
        let count = 0;
        for (const consent of subject.consents || []) for (const purpose of consent.purposes || []) {
          count++; const type = Object.keys(C.CONSENTS).find(t => D.ids(t).includes(purpose.purpose_id));
          const row = document.createElement('article'); row.className = 'consent-record';
          const title = document.createElement('h3'); title.textContent = purpose.purpose_name || purpose.purpose_id;
          const detail = document.createElement('p');
          const status =
            purpose.status === 'agreed'
              ? (
                D.validPurpose(purpose)
                  ? 'Đã đồng ý · Còn hiệu lực'
                  : 'Đã đồng ý · Hết hạn hoặc thời hạn không hợp lệ'
              )
              : purpose.status === 'rejected'
                ? 'Không đồng ý'
                : purpose.status === 'revoked'
                  ? 'Đã rút lại sự đồng ý'
                  : purpose.status;
          detail.textContent = `${type ? C.CONSENTS[type].label : (consent.product_name || 'Chưa phân nhóm')} · ${purpose.purpose_id} · ${status}`;

          const expiry = document.createElement('p');
          const rawExpiry = purpose.expired_time;

          const expiryDate = new Date(
            typeof rawExpiry === 'string' && /^\d+$/.test(rawExpiry.trim())
              ? Number(rawExpiry)
              : rawExpiry
          );

          if (purpose.status === 'revoked') {
            expiry.textContent = 'Không còn hiệu lực do đã rút lại sự đồng ý.';
          } else if (purpose.status === 'rejected') {
            expiry.textContent = 'Không có hiệu lực do chưa đồng ý.';
          } else if (
            rawExpiry == null ||
            (typeof rawExpiry === 'string' && rawExpiry.trim() === '') ||
            Number.isNaN(expiryDate.getTime())
          ) {
            expiry.textContent = 'Thời hạn: Có hiệu lực đến khi kết thúc dịch vụ hoặc rút lại sự đồng ý.';
          } else {
            expiry.textContent = `Thời hạn: ${expiryDate.toLocaleString('vi-VN')}`;
          }

          row.append(title, detail, expiry);

          const purposeId = String(purpose.purpose_id);

          const canWithdraw =
            Object.prototype.hasOwnProperty.call(withdrawalPurposes, purposeId) ||
            Object.values(withdrawalPurposes).includes(purposeId);

          if (!canWithdraw) {
            const note = document.createElement('p');
            note.textContent =
              'Cần có sự đồng ý để thực hiện nghiệp vụ chính.';
            note.style.cssText = 'color: #64748b; font-size: 13px;';
            row.append(note);
          }
          $('consentList').append(row);
        }
        message('consentMessage', count ? '' : 'Chưa có thông tin sự đồng ý.');
      } catch (error) { message('consentMessage', error.message); } finally { $('refreshConsents').disabled = false; }
    }; $('refreshConsents').onclick = load; load();
  }
  if ($('walletConfirm')) {
    let busy = false, identity = null;
    // Công tắc giả lập hết hạn — chỉ áp dụng cho luồng liên kết ví.
    const demoLabel = document.createElement('label');
    demoLabel.className = 'consent-option';

    const demoExpired = document.createElement('input');
    demoExpired.type = 'checkbox';
    demoExpired.id = 'demoExpiredConsent';
    demoExpired.setAttribute('role', 'switch');

    const demoText = document.createElement('span');
    demoText.textContent = 'POC: Giả lập consent liên kết hết hạn';

    demoLabel.append(demoExpired, demoText);

    const shopBanner = document.querySelector('.shop-banner');

    if (shopBanner) {
      const demoPanel = document.createElement('div');

      demoPanel.style.cssText = `
    max-width: 1200px;
    margin: 0 auto 20px;
    padding: 12px 20px;
    background: #fff7e6;
    border: 1px solid #f0d49b;
    border-radius: 8px;
  `;

      demoLabel.style.margin = '0';
      demoPanel.append(demoLabel);
      shopBanner.insertAdjacentElement('afterend', demoPanel);
    }

    // Đổi chế độ thì xóa lựa chọn đang thao tác và kiểm tra lại.
    demoExpired.addEventListener('change', () => {
      reset();

      message(
        'walletMessage',
        demoExpired.checked
          ? 'Đã bật giả lập hết hạn. Bấm Xác nhận liên kết để xin lại sự đồng ý.'
          : 'Đã tắt giả lập. Hệ thống sẽ kiểm tra hiệu lực thực tế.'
      );
    });
    boxes($('walletConsent'), ['account_link'], 'wallet_');
    const inputs = [...$('walletConsent').querySelectorAll('input')]; inputs.forEach(i => i.required = true);
    const reset = () => { identity = null; $('walletConsent').classList.add('hidden'); inputs.forEach(i => i.checked = false); $('walletConfirm').textContent = 'Xác nhận liên kết'; message('walletMessage', ''); };
    $('walletPhone').addEventListener('input', reset); $('walletAccount').addEventListener('input', reset);
    $('walletCancel').addEventListener('click', reset); $('walletBack').addEventListener('click', reset);
    if (current) {
      $('walletPhone').value = current.subject?.subject_phone || '';
      $('walletAccount').value = current.pnr.slice(C.PNR_PREFIX.length);
    }
    $('walletConfirm').onclick = async () => {
      if (busy) return; demoExpired.disabled = true; busy = true; $('walletConfirm').disabled = true; $('walletPhone').disabled = true; $('walletAccount').disabled = true;
      try {
        const phone = $('walletPhone').value.trim(), account = $('walletAccount').value.trim();
        if (!/^0\d{9}$/.test(phone)) {
          throw Error('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.');
        }

        if (!D.isAccountNumber(account)) {
          throw Error('Vui lòng nhập đúng số tài khoản được cấp khi đăng ký.');
        }
        const code = D.pnr(account);
        message('walletMessage', 'Đang kiểm tra sự đồng ý…');
        const subject = D.selectSubject(await D.lookup(code), phone); if (!subject) throw Error('Tài khoản không tồn tại. Vui lòng đăng ký mở tài khoản.');
        if (demoExpired.checked || !D.canLink(subject)) {
          if (identity !== code) {
            identity = code; $('walletConsent').classList.remove('hidden');
            const linkPurposeIds = D.ids('account_link');

            const expired = demoExpired.checked ||
              (subject.consents || []).some(consent =>
                (consent.purposes || []).some(p =>
                  linkPurposeIds.includes(p.purpose_id) &&
                  p.status === 'agreed' &&
                  typeof p.expired_time === 'number' &&
                  p.expired_time <= Date.now()
                )
              );

            message(
              'walletMessage',
              expired
                ? 'Sự đồng ý liên kết tài khoản đã hết hạn. Vui lòng đồng ý để tiếp tục liên kết.'
                : 'Bạn chưa đồng ý liên kết tài khoản. Vui lòng xem và chọn đồng ý để tiếp tục.'
            ); $('walletConfirm').textContent = 'Đồng ý và liên kết'; return;
          }
          if (inputs.some(i => !i.checked)) throw Error('Vui lòng đồng ý với các mục đích liên kết tài khoản để tiếp tục.');
          const data = { sub_name: subject.subject_name || '', sub_phone: subject.subject_phone || phone, sub_email: subject.subject_email || '', sub_dob: subject.subject_dob || '', sub_cid: subject.subject_cid || '', sub_nationality: subject.subject_nationality || '' };
          const selected = Object.fromEntries(inputs.map(i => [i.dataset.consentKey, i.checked]));
          await D.submit('account_link', D.payload('account_link', data, code, selected, 'WALLET_LINK'));
          const updated = D.selectSubject(await D.lookup(code), phone);
          if (!updated || !D.canLink(updated)) throw Error('Đã gửi sự đồng ý nhưng chưa tra cứu thấy hiệu lực. Vui lòng kiểm tra lại sau.');
          demoExpired.checked = false;
        }
        reset(); $('walletPage').classList.add('hidden'); document.title = 'MARTI | Mua sắm trực tuyến'; window.showToast('Liên kết ví thành công (mô phỏng).');
      } catch (error) { message('walletMessage', error.message); } finally { busy = false; demoExpired.disabled = false; $('walletConfirm').disabled = false; $('walletPhone').disabled = false; $('walletAccount').disabled = false; }
    };
  }
})();
