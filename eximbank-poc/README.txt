EXIMBANK POC — TÍCH HỢP CONSENT

1. CẤU HÌNH
Mở js/config.js:
- WS: điền workspace dùng chung cho hai API POST và GET.
- API_TOKEN: điền token Authorization nguyên văn. Không tự thêm Bearer.
- API_BASE_URL / IP: chỉnh địa chỉ API và IP được cho phép.
- CONSENTS.bank_service.checkboxes.account_service.purposes: điền list mục đích dịch vụ.
- CONSENTS.bank_service.checkboxes.offers.purposes: điền list mục đích tiếp thị.
  Ví dụ cú pháp list: ['PUR_00000', 'PUR_00001']. Không dùng lại một ID ở hai checkbox.
- account_link có sẵn PUR_00011. Mỗi checkbox có required để đổi bắt buộc/tùy chọn.
- isConsentSuccess: chỉnh theo response POST thực tế nếu cần. Hiện kiểm tra HTTP 2xx,
  JSON hợp lệ, không có success:false hoặc error. Chưa có mẫu response POST chính thức.

2. CHẠY
Giải nén giữ nguyên thư mục. Chạy HTTP server trong thư mục eximbank-poc, ví dụ:
  python -m http.server 8080
Mở http://localhost:8080/index.html
API cần cho phép CORS từ địa chỉ web chạy POC, các header Authorization,
X-Forwarded-For, Accept và các phương thức GET/POST/OPTIONS.

3. LUỒNG
- Đăng ký: kiểm tra PNR trùng trước khi xem lại và trước lần gửi đầu.
- Số tài khoản = số điện thoại. Tên đăng nhập/PNR = EXIMBANK + số điện thoại.
- sub_code rỗng, một chủ thể is_submitter:true. Ngày sinh chuyển DDMMYYYY.
- Checkbox có data-consent-type và data-consent-key. Hai nhóm gửi riêng.
- Chọn: agreed; không chọn: rejected. Các list ngân hàng trống sẽ chặn gửi.
- Nếu một API thành công, thử lại trong cùng màn hình chỉ gửi nhóm chưa thành công.
  Không tải lại trang khi đang xử lý dở. Timeout không chứng minh server chưa ghi nhận;
  cần kiểm tra dữ liệu trước khi gửi lại. API chưa cung cấp cơ chế idempotency.
- Đăng nhập bằng PNR, mật khẩu bất kỳ nhưng phải nhập. Tra cứu API để xác minh tài khoản.
- Phiên giả lập lưu sessionStorage của tab. Không lưu mật khẩu.
- Đã đăng nhập: ẩn Mở tài khoản, hiện Quản lý sự đồng ý và Đăng xuất.
- Quản lý: tra cứu lại API, hiển thị purpose/trạng thái/hạn; nút rút chưa hoạt động.
- Ví: nhập số điện thoại và số tài khoản trùng nhau, tra cứu trước mỗi lần liên kết.
  agreed + null = đến khi rút; agreed + hạn tương lai = hợp lệ.
  Nếu thiếu/không đồng ý/hết hạn: xin consent liên kết ví, POST rồi GET xác nhận lại.
  Không tìm thấy chủ thể: yêu cầu mở tài khoản trước. API lỗi: không liên kết.
- Liên kết ví là mô phỏng, không thực hiện giao dịch hoặc thanh toán thật.
- Trang tư vấn, cookie và DSR giữ cơ chế cũ, chưa bổ sung API ngoài phạm vi đã thống nhất.

4. TỆP CHÍNH
js/config.js: biến môi trường và danh sách purpose.
js/datatrust.js: GET/POST, tạo payload riêng, hiệu lực và phiên.
js/account-flows.js: đăng ký, đăng nhập, quản lý và consent liên kết ví.
login.html / consents.html: hai trang mới.

5. GIỚI HẠN TÍCH HỢP
Chưa gọi API thật vì WS và danh sách purpose ngân hàng chờ cấu hình.
Response GET phải trả purpose_id giống input và dữ liệu hiện hành, expired_time số mili giây hoặc null.
Nếu một PNR trả nhiều chủ thể, chọn đúng subject_phone; không tự lấy người đầu tiên.
API rút consent sẽ bổ sung sau. Thông tin có trong response GET được dùng khi xin lại consent;
trường không được API trả sẽ để rỗng, không tự tạo thông tin định danh.
