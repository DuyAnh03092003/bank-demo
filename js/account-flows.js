(() => {
  const $ = id => document.getElementById(id), D = window.DT, C = window.POC_CONFIG;
  const message = (id, text) => { if ($(id)) $(id).textContent = text; };
  // UI-only labels transcribed from the purpose list shown in DataTrust.
  // The identifiers, checkbox definitions and API mapping remain in js/config.js.
  const purposeNames = {
    PUR_00000: 'Định danh và xác thực khách hàng',
    PUR_00001: 'Đăng ký và quản lý dịch vụ ngân hàng số',
    PUR_00002: 'Thực hiện giao dịch ngân hàng',
    PUR_00003: 'Bảo đảm an toàn và phòng chống gian lận',
    PUR_00004: 'Hỗ trợ khách hàng và giải quyết tra soát',
    PUR_00005: 'Gửi thông báo dịch vụ',
    PUR_00007: 'Đánh giá và cung cấp tín dụng',
    PUR_00008: 'Phân tích và cải thiện dịch vụ',
    PUR_00009: 'Cá nhân hóa trải nghiệm',
    PUR_00010: 'Tiếp thị và giới thiệu sản phẩm',
    PUR_00011: 'Liên kết và sử dụng dịch vụ đối tác'
  };
  function registrationConsents(target) {
    // Preserve the existing product/service cards and their original checkbox labels.
    Object.entries(C.CONSENTS).forEach(([type, group]) => {
      const section = document.createElement('section');
      section.className = 'registration-consent-group';
      const title = document.createElement('h3');
      title.textContent = group.label;
      section.append(title);

      Object.entries(group.checkboxes).forEach(([key, box]) => {
        const row = document.createElement('div');
        row.className = 'registration-consent-row';
        const heading = document.createElement('div');
        heading.className = 'registration-consent-heading';
        const master = document.createElement('input');
        master.type = 'checkbox';
        master.className = 'registration-consent-master';
        master.id = `register-${type}-${key}`;
        master.required = !!box.required;
        const label = document.createElement('label');
        label.htmlFor = master.id;
        const singleWalletPurpose = type === 'account_link' && box.purposes.length === 1;
        label.textContent = singleWalletPurpose
          ? `${purposeNames[box.purposes[0]] || box.label} (Không bắt buộc)`
          : `${box.label} (${box.required ? 'Bắt buộc' : 'Không bắt buộc'})`;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'registration-consent-toggle';
        toggle.textContent = 'Xem chi tiết ▾';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', `Xem các mục đích: ${box.label}`);
        heading.append(master, label);
        if (!singleWalletPurpose) heading.append(toggle);
        row.append(heading);

        const details = document.createElement('div');
        details.className = 'registration-consent-details hidden';
        const inputs = [];
        box.purposes.forEach(id => {
          const item = document.createElement('label');
          item.className = 'registration-consent-purpose';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.dataset.purposeId = id;
          input.dataset.consentType = type;
          input.dataset.consentKey = key;
          if (box.required) {
            input.disabled = true;
            item.classList.add('readonly');
          }
          const description = document.createElement('span');
          const name = document.createElement('strong');
          name.textContent = purposeNames[id] || `Mục đích ${id}`;
          description.append(name);
          item.append(input, description);
          details.append(item);
          inputs.push(input);
        });
        const summary = document.createElement('small');
        summary.className = 'registration-consent-count';
        if (!singleWalletPurpose) heading.insertAdjacentElement('afterend', summary);
        const update = () => {
          const checked = inputs.filter(input => input.checked).length;
          master.checked = !!inputs.length && checked === inputs.length;
          master.indeterminate = !box.required && checked > 0 && checked < inputs.length;
          summary.textContent = `${checked}/${inputs.length} mục đích đã chọn`;
          target.dispatchEvent(new Event('consent-change', { bubbles: true }));
        };
        master.addEventListener('change', () => {
          inputs.forEach(input => { input.checked = master.checked; });
          update();
        });
        inputs.forEach(input => input.addEventListener('change', update));
        if (!singleWalletPurpose) {
          toggle.addEventListener('click', () => {
            const expanded = details.classList.toggle('hidden') === false;
            toggle.textContent = expanded ? 'Thu gọn ▴' : 'Xem chi tiết ▾';
            toggle.setAttribute('aria-expanded', String(expanded));
          });
          row.append(details);
        } else {
          // Checkbox chính giữ data-purpose-id qua input ẩn trong DOM để không đổi payload.
          details.classList.add('registration-consent-data-only');
          details.hidden = true;
          row.append(details);
        }
        section.append(row);
        update();
      });
      target.append(section);
    });
    const policy = document.createElement('p'); policy.className = 'consent-policy-copy';
    policy.append('Vui lòng đọc ');
    const link = document.createElement('button'); link.type = 'button'; link.className = 'text-link'; link.textContent = 'Chính sách xử lý dữ liệu cá nhân';
    link.onclick = () => openPolicyDialog(); policy.append(link, ' trước khi tiếp tục.'); target.append(policy);
  }
  function openPolicyDialog() {
    if (document.getElementById('pocPolicyDialog')) return;
    const dialog = document.createElement('dialog'); dialog.id = 'pocPolicyDialog'; dialog.className = 'poc-dialog policy-dialog';
    const header = document.createElement('div'); header.className = 'dialog-head';
    const title = document.createElement('h2'); title.textContent = 'Chính sách xử lý dữ liệu cá nhân';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.className = 'close'; close.setAttribute('aria-label', 'Đóng');
    header.append(title, close);
    const frame = document.createElement('iframe'); frame.title = 'Chính sách xử lý dữ liệu cá nhân'; frame.src = 'https://irm-demo.datatrust.one/irm/policy-version/621861/81346406974458224/vi'; frame.className = 'policy-frame';
    dialog.append(header, frame); document.body.append(dialog);
    close.onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove()); dialog.showModal();
  }
  const choices = type => Object.fromEntries(Object.entries(C.CONSENTS[type].checkboxes).map(([key, box]) => [key,
    box.purposes.every(id => !!document.querySelector(`#accountConsents input[data-purpose-id="${id}"]:checked`))]));
  const purposeChoices = () => Object.fromEntries([...document.querySelectorAll('#accountConsents input[data-purpose-id]')].map(el => [el.dataset.purposeId, el.checked]));
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
    registrationConsents($('accountConsents'));
    const form = $('registerForm'), next = $('accountContinue'), confirm = $('confirmAccount');
    let draft = null, submitted = new Set(), inFlight = false;
    const refresh = () => { next.disabled = [...form.querySelectorAll('input[type=checkbox][required]')].some(x => !x.checked); }; form.addEventListener('change', refresh); form.addEventListener('consent-change', refresh); refresh();
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
              D.payload(type, subject, code, choices(type), 'ACCOUNT_REGISTRATION', purposeChoices())
            ])
          )
        };
        submitted.clear();
        Object.entries(fields).forEach(([key, value]) => $('review' + key).textContent = value);
        message('reviewRequiredConsent', '✓ Đồng ý xử lý thông tin để cung cấp dịch vụ ngân hàng.');
        message('reviewOffersConsent', `Nhóm không bắt buộc: ${Object.entries(purposeChoices()).filter(([id, selected]) => selected && !C.CONSENTS.bank_service.checkboxes.account_service.purposes.includes(id)).length} mục đích đã chọn.`);
        message('reviewLinkConsent', choices('account_link').wallet_link ? '✓ Đã chọn mục đích liên kết tài khoản.' : 'Chưa chọn mục đích liên kết tài khoản.');
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

  const walletWithdrawalPurpose = { purposeId: 'PUR_00011', withdrawalId: '81064932362405205', name: 'Liên kết và sử dụng dịch vụ đối tác' };

  const withdrawalFormUrl =
    'https://irm-demo.datatrust.one/irm/request/621861/ecd7/217716bc-ecd7-45bc-a5b0-46108584db0f';

  function openWithdrawalForm(eligiblePurposes, subject, type) {
    const isWallet = type === 'account_link';
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

    if (isWallet) {
      // A single wallet-link purpose needs no separate selection checkbox.
      const purposeFieldset = dialog.querySelector('[data-purposes]').closest('fieldset');
      purposeFieldset.querySelector('legend').textContent = 'Mục đích rút lại sự đồng ý';
      const fieldsFieldset = dialog.querySelector('input[name="field"]').closest('fieldset');
      fieldsFieldset.remove();
      const note = document.createElement('p');
      note.className = 'withdrawal-wallet-note';
      note.textContent = 'Lưu ý: Sau khi rút lại sự đồng ý, việc hủy liên kết tài khoản với ví điện tử sẽ được thực hiện sau một khoảng thời gian xử lý theo quy trình của ngân hàng.';
      purposeFieldset.insertAdjacentElement('afterend', note);
      dialog.querySelector('[data-send]').textContent = 'Xác nhận rút lại';
    }

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
      if (isWallet) {
        const text = document.createElement('strong');
        text.className = 'withdrawal-wallet-purpose';
        text.textContent = walletWithdrawalPurpose.name;
        options.append(text);
      } else {
        const label = document.createElement('label');
        label.className = 'consent-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'purpose';
        input.value = purpose.withdrawalId;
        const text = document.createElement('span');
        text.textContent = purpose.purpose_name || purposeNames[String(purpose.purpose_id)] || purpose.purpose_id;
        label.append(input, text);
        options.append(label);
      }
    }

    const checkedValues = name =>
      [...form.querySelectorAll(`input[name="${name}"]:checked`)]
        .map(input => input.value);

    const refresh = () => {
      send.disabled =
        busy ||
        sent ||
        (!isWallet && (checkedValues('purpose').length === 0 ||
          checkedValues('field').length === 0));
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

      const selectedIds = isWallet ? [walletWithdrawalPurpose.withdrawalId] : checkedValues('purpose');
      const fields = isWallet ? ['Email', 'Số điện thoại'] : checkedValues('field');
      const selected = eligiblePurposes.filter(item => selectedIds.includes(item.withdrawalId));

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
          selected.some(item => !item.purpose_name && !isWallet)
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
              id: isWallet ? 'serviceId-75998382781554004' : 'serviceId-75998382764827834',
              title: 'Sản phẩm/Dịch vụ',
              type: 5,
              answer: isWallet ? 'Liên kết dịch vụ thanh toán' : 'Ngân hàng số'
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
              answer: selected.map(item => isWallet ? walletWithdrawalPurpose.name : (item.purpose_name || purposeNames[String(item.purpose_id)])),
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
          isWallet ? withdrawalFormUrl : (C.WITHDRAWAL_URL || withdrawalFormUrl),
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
    refresh();
    dialog.showModal();
  }

  function openProductConsentDialog(type, subject, reload) {
    if (document.getElementById('reconsentDialog')) return;
    const group = C.CONSENTS[type];
    if (!group) return;
    const purposes = (subject.consents || []).flatMap(c => c.purposes || []);
    const configuredIds = D.ids(type).map(String);
    const statusById = new Map();
    for (const id of configuredIds) {
      const matches = purposes.filter(p => String(p.purpose_id) === id);
      if (matches.length !== 1) {
        message('consentMessage', `Không xác định được trạng thái đầy đủ của sản phẩm ${group.label}. Vui lòng cập nhật thông tin.`);
        return;
      }
      statusById.set(id, matches[0]);
    }
    const dialog = document.createElement('dialog');
    dialog.id = 'reconsentDialog';
    dialog.className = 'poc-dialog reconsent-dialog';
    const heading = document.createElement('h2');
    heading.textContent = `Cập nhật sự đồng ý – ${group.label}`;
    const intro = document.createElement('p');
    intro.textContent = 'Kiểm tra và cập nhật lựa chọn cho toàn bộ mục đích thuộc sản phẩm/dịch vụ này.';
    const form = document.createElement('form');
    const options = document.createElement('div'); options.className = 'reconsent-options';
    const inputsById = new Map();
    const requiredControls = [];

    for (const [key, config] of Object.entries(group.checkboxes)) {
      const section = document.createElement('section'); section.className = 'renew-product';
      const title = document.createElement('h3');
      title.textContent = config.required ? 'Mục đích bắt buộc' : 'Mục đích không bắt buộc';
      section.append(title);
      if (config.required) {
        const label = document.createElement('label'); label.className = 'consent-option';
        const master = document.createElement('input'); master.type = 'checkbox';
        master.checked = config.purposes.every(id => D.validPurpose(statusById.get(String(id))));
        master.disabled = master.checked;
        requiredControls.push(master);
        const description = document.createElement('span');
        description.textContent = `${config.label} (Đồng ý toàn bộ ${config.purposes.length} mục đích)`;
        label.append(master, description); section.append(label);
        const detail = document.createElement('ul'); detail.className = 'reconsent-required-list';
        for (const id of config.purposes) {
          const item = document.createElement('li');
          const p = statusById.get(String(id));
          item.textContent = p.purpose_name || purposeNames[String(id)] || 'Mục đích xử lý dữ liệu';
          detail.append(item);
          inputsById.set(String(id), master);
        }
        section.append(detail);
      } else {
        const allLabel = document.createElement('label'); allLabel.className = 'consent-option';
        const selectAll = document.createElement('input'); selectAll.type = 'checkbox';
        const allText = document.createElement('span'); allText.textContent = 'Chọn tất cả';
        allLabel.append(selectAll, allText); section.append(allLabel);
        const childInputs = [];
        for (const id of config.purposes) {
          const purpose = statusById.get(String(id));
          const label = document.createElement('label'); label.className = 'consent-option';
          const input = document.createElement('input'); input.type = 'checkbox';
          input.checked = D.validPurpose(purpose);
          // Đồng ý đang có hiệu lực chỉ được rút qua chức năng Rút lại sự đồng ý.
          input.disabled = input.checked;
          inputsById.set(String(id), input); childInputs.push(input);
          const labelText = document.createElement('span');
          labelText.textContent = purpose.purpose_name || purposeNames[String(id)] || 'Mục đích xử lý dữ liệu';
          label.append(input, labelText); section.append(label);
        }
        const syncAll = () => {
          const chosen = childInputs.filter(input => input.checked).length;
          selectAll.checked = chosen === childInputs.length;
          selectAll.indeterminate = chosen > 0 && chosen < childInputs.length;
        };
        selectAll.onchange = () => { childInputs.forEach(input => { if (!input.disabled) input.checked = selectAll.checked; }); syncAll(); };
        childInputs.forEach(input => input.addEventListener('change', syncAll));
        syncAll();
      }
      options.append(section);
    }
    const policy = document.createElement('button'); policy.className = 'text-link';
    policy.type = 'button'; policy.textContent = 'Xem chính sách xử lý dữ liệu cá nhân';
    policy.onclick = openPolicyDialog;
    const feedback = document.createElement('p'); feedback.className = 'api-message'; feedback.setAttribute('role', 'status');
    const actions = document.createElement('div'); actions.className = 'form-foot';
    const cancel = document.createElement('button'); cancel.className = 'btn btn-light';
    cancel.type = 'button'; cancel.textContent = 'Hủy'; cancel.onclick = () => dialog.close();
    const send = document.createElement('button'); send.className = 'btn btn-blue';
    send.type = 'submit'; send.textContent = 'Cập nhật sự đồng ý';
    actions.append(cancel, send); form.append(options, policy, feedback, actions);
    dialog.append(heading, intro, form);
    document.body.append(dialog); dialog.addEventListener('close', () => dialog.remove());
    let busy = false;
    form.onsubmit = async event => {
      event.preventDefault();
      if (busy) return;
      if (requiredControls.some(input => !input.checked)) {
        feedback.textContent = 'Cần đồng ý với toàn bộ nhóm mục đích bắt buộc để cập nhật sản phẩm này.';
        return;
      }
      busy = true; send.disabled = true; cancel.disabled = true; feedback.textContent = '';
      try {
        // Tải lại ngay trước khi gửi để tránh sử dụng thông tin khách hàng cũ.
        const freshSubject = D.selectSubject(await D.lookup(current.pnr));
        if (!freshSubject) throw Error('Không tìm thấy tài khoản để cập nhật sự đồng ý.');
        const currentPurposes = (freshSubject.consents || []).flatMap(c => c.purposes || []);
        for (const id of configuredIds) {
          if (currentPurposes.filter(p => String(p.purpose_id) === id).length !== 1) {
            throw Error('Danh sách mục đích thuộc sản phẩm đã thay đổi. Vui lòng tải lại thông tin.');
          }
        }
        const data = {
          sub_name: freshSubject.subject_name || subject.subject_name || '',
          sub_phone: freshSubject.subject_phone || subject.subject_phone || '',
          sub_email: freshSubject.subject_email || subject.subject_email || '',
          sub_dob: freshSubject.subject_dob || subject.subject_dob || '',
          sub_cid: freshSubject.subject_cid || subject.subject_cid || '',
          sub_nationality: freshSubject.subject_nationality || subject.subject_nationality || ''
        };
        const purposeChoices = Object.fromEntries(configuredIds.map(id => {
          const latest = currentPurposes.find(p => String(p.purpose_id) === id);
          // Không ghi đè consent đã đồng ý và còn hiệu lực bằng rejected.
          return [id, D.validPurpose(latest) || inputsById.get(id).checked];
        }));
        const values = Object.fromEntries(Object.entries(group.checkboxes).map(([key, box]) => [
          key, box.purposes.every(id => purposeChoices[String(id)])
        ]));
        const body = D.payload(type, data, current.pnr, values, 'CONSENT_RENEWAL', purposeChoices);
        // Toàn bộ mục đích thuộc sản phẩm: checked => agreed, unchecked => rejected.
        // Những mục đích đã agreed hợp lệ được tích sẵn khi mở form.
        await D.submit(type, body);
        dialog.close();
        await reload();
        message('consentMessage', `Đã cập nhật sự đồng ý cho sản phẩm ${group.label}.`);
      } catch (error) {
        feedback.textContent = error.message;
      } finally {
        busy = false; send.disabled = false; cancel.disabled = false;
      }
    };
    dialog.showModal();
  }

  if ($('consentList')) {
    if (!current) { location.replace('login.html'); return; }
    const load = async () => {
      $('refreshConsents').disabled = true;
      message('consentMessage', 'Đang tải…');
      $('consentList').replaceChildren();
      try {
        const subject = D.selectSubject(await D.lookup(current.pnr));
        if (!subject) throw Error('Không tìm thấy tài khoản.');
        // Rút lại trong từng sản phẩm. Chỉ các mục đích ngân hàng không bắt buộc
        // và duy nhất mục đích liên kết ví đã agreed còn hiệu lực mới được chọn.
        const eligibleForType = type => {
          const mapping = type === 'account_link'
            ? { [walletWithdrawalPurpose.purposeId]: walletWithdrawalPurpose.withdrawalId }
            : withdrawalPurposes;
          const map = new Map();
          for (const consent of subject.consents || []) {
            for (const purpose of consent.purposes || []) {
              const id = String(purpose.purpose_id);
              if (mapping[id] && D.validPurpose(purpose)) {
                map.set(id, {
                  ...purpose,
                  purpose_id: id,
                  withdrawalId: mapping[id],
                  purpose_name: type === 'account_link'
                    ? walletWithdrawalPurpose.name
                    : (purpose.purpose_name || purposeNames[id])
                });
              }
            }
          }
          return [...map.values()];
        };
        D.saveSession(current.pnr, subject);
        const accountNumber = current.pnr.startsWith(C.PNR_PREFIX) ? current.pnr.slice(C.PNR_PREFIX.length) : current.pnr;
        const customerName = $('customerName');
        if (customerName) customerName.textContent = subject.subject_name || 'Khách hàng Eximbank';
        message('customerSummary', `Tài khoản: ${accountNumber.replace(/.(?=.{4})/g, '•')} · Mã tham chiếu: ${current.pnr}`);
        let count = 0;
        const products = new Map();
        for (const consent of subject.consents || []) {
          const name = consent.product_name || 'Sản phẩm/dịch vụ chưa đặt tên';
          if (!products.has(name)) products.set(name, []);
          products.get(name).push(...(consent.purposes || []));
        }
        const filterButtons = [...document.querySelectorAll('[data-consent-filter]')];
        let activeFilter = filterButtons.find(button => button.classList.contains('is-active'))?.dataset.consentFilter || 'all';
        const records = [];
        let productIndex = 0;
        for (const [productName, productPurposes] of products) {
          const product = document.createElement('details');
          product.className = 'consent-product';
          product.open = productIndex === 0;
          productIndex++;
          const summary = document.createElement('summary');
          const heading = document.createElement('div'); heading.className = 'consent-product-heading';
          const symbol = document.createElement('span'); symbol.className = 'consent-product-icon'; symbol.setAttribute('aria-hidden', 'true');
          symbol.textContent = /liên kết|ví|đối tác|thanh toán/i.test(productName) ? '▣' : '▥';
          const labels = document.createElement('span'); labels.className = 'consent-product-labels';
          const productTitle = document.createElement('strong'); productTitle.textContent = productName;
          const tally = document.createElement('small'); tally.className = 'product-count'; tally.textContent = `${productPurposes.length} mục đích xử lý`;
          labels.append(productTitle, tally); heading.append(symbol, labels);
          const chevron = document.createElement('span'); chevron.className = 'consent-chevron'; chevron.textContent = '⌄'; chevron.setAttribute('aria-hidden', 'true');
          summary.append(heading, chevron); product.append(summary);
          const items = document.createElement('div'); items.className = 'consent-product-items';
          for (const purpose of productPurposes) {
            count++;
            const row = document.createElement('article'); row.className = 'consent-record';
            const title = document.createElement('strong');
            title.className = 'consent-record-title';
            const purposeId = String(purpose.purpose_id);
            const isRequired = Object.values(C.CONSENTS).some(group =>
              Object.values(group.checkboxes).some(config =>
                config.required &&
                config.purposes.some(id => String(id) === purposeId)
              )
            );

            const purposeName =
              purpose.purpose_name ||
              purposeNames[purposeId] ||
              'Mục đích xử lý dữ liệu';

            title.textContent = purposeName;

            if (isRequired) {
              const requiredLabel = document.createElement('span');
              requiredLabel.className = 'consent-required-label';
              requiredLabel.textContent = '(Bắt buộc)';
              title.appendChild(requiredLabel);
            }
            const status = document.createElement('span'); status.className = 'consent-status';
            const active = purpose.status === 'agreed' && D.validPurpose(purpose);
            row.dataset.consentState = active ? 'active' : 'inactive';
            if (active) { status.textContent = 'Đã đồng ý'; status.classList.add('is-active'); }
            else if (purpose.status === 'revoked') { status.textContent = 'Đã rút lại'; status.classList.add('is-withdrawn'); }
            else if (purpose.status === 'rejected') { status.textContent = 'Không đồng ý'; status.classList.add('is-inactive'); }
            else if (purpose.status === 'agreed') { status.textContent = 'Hết hiệu lực'; status.classList.add('is-expired'); }
            else { status.textContent = 'Không hiệu lực'; status.classList.add('is-inactive'); }
            const expiry = document.createElement('small'); expiry.className = 'consent-expiry';
            const rawExpiry = purpose.expired_time;
            const expiryDate = new Date(typeof rawExpiry === 'string' && /^\d+$/.test(rawExpiry.trim()) ? Number(rawExpiry) : rawExpiry);
            if (purpose.status === 'revoked') expiry.textContent = 'Thời hạn: Đã rút lại';
            else if (purpose.status === 'rejected') expiry.textContent = 'Thời hạn: Chưa đồng ý';
            else if (rawExpiry == null || rawExpiry === '' || Number.isNaN(expiryDate.getTime())) expiry.textContent = 'Thời hạn: Đến khi rút lại sự đồng ý';
            else expiry.textContent = `Thời hạn: ${expiryDate.toLocaleString('vi-VN')}`;
            const body = document.createElement('div'); body.className = 'consent-record-info'; body.append(title, expiry);
            row.append(body, status); items.append(row); records.push(row);
          }
          product.append(items);
          // Cập nhật sự đồng ý ngay trong từng sản phẩm, không còn nút chung cuối trang.
          const matchingTypes = Object.keys(C.CONSENTS).filter(type => {
            const ids = D.ids(type).map(String);
            return productPurposes.some(p => ids.includes(String(p.purpose_id)));
          });
          if (matchingTypes.length === 1) {
            const type = matchingTypes[0];
            const footer = document.createElement('div'); footer.className = 'consent-product-actions';
            const withdraw = document.createElement('button');
            withdraw.type = 'button'; withdraw.className = 'btn btn-line';
            withdraw.textContent = 'Rút lại sự đồng ý';
            const eligible = eligibleForType(type);
            withdraw.disabled = eligible.length === 0;
            withdraw.onclick = () => openWithdrawalForm(eligible, subject, type);
            const update = document.createElement('button'); update.type = 'button';
            update.className = 'btn btn-blue'; update.textContent = '↻ Cập nhật sự đồng ý';
            update.onclick = () => openProductConsentDialog(type, subject, load);
            footer.append(withdraw, update); product.append(footer);
          }
          $('consentList').append(product);
        }
        const applyFilter = () => {
          records.forEach(row => { row.hidden = activeFilter !== 'all' && row.dataset.consentState !== activeFilter; });
          [...$('consentList').querySelectorAll('.consent-product')].forEach(product => {
            const visible = [...product.querySelectorAll('.consent-record')].filter(row => !row.hidden).length;
            product.hidden = visible === 0;
          });
          filterButtons.forEach(button => {
            const selected = button.dataset.consentFilter === activeFilter;
            button.classList.toggle('is-active', selected);
            button.setAttribute('aria-pressed', String(selected));
          });
          const empty = $('consentEmptyState');
          if (empty) empty.remove();
          if (count && !records.some(row => !row.hidden)) {
            const note = document.createElement('p'); note.id = 'consentEmptyState'; note.className = 'consent-empty'; note.textContent = 'Không có mục đích ở trạng thái đã chọn.'; $('consentList').append(note);
          }
        };
        filterButtons.forEach(button => { button.onclick = () => { activeFilter = button.dataset.consentFilter; applyFilter(); }; });
        applyFilter();
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
    const reset = () => { message('walletMessage', ''); };
    $('walletPhone').addEventListener('input', reset);
    $('walletAccount').addEventListener('input', reset);
    if (current) {
      $('walletPhone').value = current.subject?.subject_phone || '';
      $('walletAccount').value = current.pnr.slice(C.PNR_PREFIX.length);
    }
    const confirmLink = (subject, code, phone, expired) => new Promise(resolve => {
      const modal = document.createElement('dialog'); modal.className = 'poc-dialog bank-authorization';
      const h = document.createElement('div'); h.className = 'bank-auth-head';
      const brand = document.createElement('strong'); brand.textContent = 'EXIMBANK';
      const subtitle = document.createElement('small'); subtitle.textContent = 'XÁC NHẬN LIÊN KẾT VÍ ĐIỆN TỬ'; h.append(brand, subtitle);
      const title = document.createElement('h2'); title.textContent = 'Cho phép liên kết tài khoản?';
      const desc = document.createElement('p'); desc.textContent = expired ? 'Sự đồng ý trước đó đã hết hiệu lực. Vui lòng xác nhận để tiếp tục.' : 'ShopeePay yêu cầu bạn xác nhận mục đích xử lý dữ liệu dưới đây.';
      const info = document.createElement('div'); info.className = 'bank-auth-account';
      const name = document.createElement('strong'); name.textContent = subject.subject_name || 'Khách hàng Eximbank';
      const number = document.createElement('small'); number.textContent = `Tài khoản Eximbank: ****${code.slice(-4)} · ShopeePay`;
      info.append(name, number);
      const purpose = document.createElement('div'); purpose.className = 'bank-auth-purpose';
      const purposeTitle = document.createElement('strong'); purposeTitle.textContent = purposeNames[C.CONSENTS.account_link.checkboxes.wallet_link.purposes[0]] || 'Liên kết và sử dụng dịch vụ đối tác';
      const purposeDesc = document.createElement('p'); purposeDesc.textContent = 'Cho phép xử lý thông tin tài khoản cần thiết để xác thực và thiết lập liên kết với ví điện tử.';
      purpose.append(purposeTitle, purposeDesc);
      const policy = document.createElement('button'); policy.className = 'text-link'; policy.type = 'button'; policy.textContent = 'Xem chính sách xử lý dữ liệu cá nhân'; policy.onclick = openPolicyDialog;
      const actions = document.createElement('div'); actions.className = 'form-foot';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-light'; cancel.textContent = 'Hủy';
      const agree = document.createElement('button'); agree.type = 'button'; agree.className = 'btn btn-blue'; agree.textContent = 'Đồng ý và liên kết';
      actions.append(cancel, agree); modal.append(h, title, desc, info, purpose, policy, actions); document.body.append(modal);
      let answered = false;
      const finish = value => { if (answered) return; answered = true; modal.close(); resolve(value) };
      cancel.onclick = () => finish(false); agree.onclick = () => finish(true);
      modal.addEventListener('cancel', () => finish(false)); modal.addEventListener('close', () => { modal.remove(); if (!answered) finish(false) });
      modal.showModal();
    });
    $('walletConfirm').onclick = async () => {
      if (busy) return;
      busy = true; demoExpired.disabled = true;
      $('walletConfirm').disabled = true; $('walletPhone').disabled = true; $('walletAccount').disabled = true;
      try {
        const phone = $('walletPhone').value.trim(), account = $('walletAccount').value.trim();
        if (!/^0\d{9}$/.test(phone)) throw Error('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.');
        if (!D.isAccountNumber(account)) throw Error('Vui lòng nhập đúng số tài khoản được cấp khi đăng ký.');
        const code = D.pnr(account);
        message('walletMessage', 'Đang kiểm tra sự đồng ý…');
        const subject = D.selectSubject(await D.lookup(code), phone);
        if (!subject) throw Error('Tài khoản không tồn tại. Vui lòng đăng ký mở tài khoản.');
        if (demoExpired.checked || !D.canLink(subject)) {
          const accepted = await confirmLink(subject, code, phone, demoExpired.checked);
          if (!accepted) { message('walletMessage', ''); return; }
          const data = { sub_name: subject.subject_name || '', sub_phone: subject.subject_phone || phone, sub_email: subject.subject_email || '', sub_dob: subject.subject_dob || '', sub_cid: subject.subject_cid || '', sub_nationality: subject.subject_nationality || '' };
          await D.submit('account_link', D.payload('account_link', data, code, { wallet_link: true }, 'WALLET_LINK'));
          demoExpired.checked = false;
        }
        message('walletMessage', '');
        $('walletPage').classList.add('hidden'); document.title = 'MARTI | Mua sắm trực tuyến';
        if (window.showPaymentResult) window.showPaymentResult(true, 'Thanh toán được mô phỏng sau khi xác nhận liên kết thành công.');
      } catch (error) {
        message('walletMessage', error.message);
        if (window.showPaymentResult) window.showPaymentResult(false, error.message);
      } finally { busy = false; demoExpired.disabled = false; $('walletConfirm').disabled = false; $('walletPhone').disabled = false; $('walletAccount').disabled = false; }
    };
  }
})();
