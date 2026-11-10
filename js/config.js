// Chỉnh cấu hình tại đây. Không điền purpose giả: các list trống sẽ chặn gửi.
window.POC_CONFIG = {
  API_BASE_URL: 'https://apis-demo.datatrust.one',
  WS: '72902157445621861', // Điền workspace dùng chung cho GET và hai POST
  API_TOKEN: 'eyJraWQiOiIxLTg3ZTg5Y2JlLTJkNzYtNDE3NC1hOTY2LWI2NTk2MThlNDg5YSIsImFsZyI6IlJTNTEyIiwidHlwIjoiSldUIn0.eyJpc3MiOiJEYXRhIFRydXN0IEludGVyZ3JhdGlvbiAtIDEiLCJzdWIiOiJUb2tlbiBBY2Nlc3MgSW50ZWdyYXRpb24iLCJleHAiOjE4MjU3NTQyMzAsIm5iZiI6MTc5NDIxODIyMCwiaWF0IjoxNzk0MjE4MjIwLCJzY29wZXMiOnsiYXBpcyI6WyJ3cml0ZSIsInJlYWQiLCJkZWxldGUiXX0sInVzZXJJZCI6IjE5ODA4Mjg1ODAiLCJ3b3Jrc3BhY2VJZCI6IjcyOTAyMTU3NDQ1NjIxODYxIn0.p3CfAwtnlODy4aKinnK4lt7isquN29cVAZE2CdY4qv3LRkQH4tpfEZrGevKVTOT7PVkj7CoCLRVXISN0oBoTZU27l3pCC50rE43-KRJ_yrtKrY_bSdrN1qnimrRQP_RhJoNpVOk2WydG_eEE9dpZ3LuC63Zigj4YQUv42ux_ZHQ', // Authorization: token nguyên văn, không tự thêm Bearer
  IP: '10.10.10.25',
  PNR_PREFIX: '',
  TIMEOUT_MS: 20000,
  STATUS_PATH: '/{WS}/integration/consent-status',
  CONSENTS: {
    bank_service: {
      path: '/{WS}/integration/consent/042954f0-6a0b-4098-8676-c91d5df5d2ae',
      label: 'Dịch vụ ngân hàng',
      checkboxes: {
        account_service: {label: 'Tôi đồng ý để Eximbank xử lý thông tin cá nhân nhằm tiếp nhận và thực hiện yêu cầu mở tài khoản, cung cấp dịch vụ liên quan.', required: true, purposes: ['PUR_00000','PUR_00001','PUR_00002','PUR_00003','PUR_00004']},
        offers: {label: 'Tôi đồng ý nhận thông tin về sản phẩm, dịch vụ và chương trình ưu đãi của Eximbank.', required: false, purposes: ['PUR_00005','PUR_00007','PUR_00008','PUR_00009','PUR_00010']},
      }
    },
    account_link: {
      path: '/{WS}/integration/consent/1aca2b1c-f896-47bd-83a0-e2b5274d0fec',
      label: 'Liên kết tài khoản',
      checkboxes: {
        wallet_link: {label: 'Tôi đồng ý để Eximbank sử dụng thông tin cá nhân phục vụ liên kết tài khoản với ví điện tử.', required: false, purposes: ['PUR_00011']}
      }
    }
  },
  // Chưa có response POST chính thức: chấp nhận HTTP 2xx, trừ success:false/error.
  // Sửa hàm này nếu API dùng quy tắc khác.
  isConsentSuccess: body => body?.success !== false && !body?.error
};
