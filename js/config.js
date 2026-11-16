// Chỉnh cấu hình tại đây. Không điền purpose giả: các list trống sẽ chặn gửi.
window.POC_CONFIG = {
  MIDDLEWARE_BASE_URL: 'https://ws-token-controller.onrender.com',
  WS: '72902157445621861', // Điền workspace dùng chung cho GET và hai POST
  PNR_PREFIX: '',
  TIMEOUT_MS: 20000,
  CONSENTS: {
    bank_service: {
      productId: '042954f0-6a0b-4098-8676-c91d5df5d2ae',
      label: 'Dịch vụ ngân hàng',
      checkboxes: {
        account_service: {label: 'Tôi đồng ý để Eximbank xử lý thông tin cá nhân nhằm tiếp nhận và thực hiện yêu cầu mở tài khoản, cung cấp dịch vụ liên quan.', required: true, purposes: ['PUR_00000','PUR_00001','PUR_00002','PUR_00003','PUR_00004']},
        offers: {label: 'Tôi đồng ý nhận thông tin về sản phẩm, dịch vụ và chương trình ưu đãi của Eximbank.', required: false, purposes: ['PUR_00005','PUR_00007','PUR_00008','PUR_00009','PUR_00010']},
      }
    },
    account_link: {
      productId: '1aca2b1c-f896-47bd-83a0-e2b5274d0fec',
      label: 'Liên kết tài khoản',
      checkboxes: {
        wallet_link: {label: 'Tôi đồng ý để Eximbank sử dụng thông tin cá nhân phục vụ liên kết tài khoản với ví điện tử.', required: false, purposes: ['PUR_00011']}
      }
    }
  },
  isConsentSuccess: body => body?.success !== false && !body?.error
};
