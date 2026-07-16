# Glow Bites - Hệ Thống Đặt Món Bằng Mã QR (QR Order System)

Đây là hệ thống phần mềm quản lý nhà hàng tự động hóa bằng cách cho phép khách hàng tự đặt món tại bàn qua việc quét mã QR. Ứng dụng cung cấp các giao diện chuyên biệt cho từng vai trò trong nhà hàng: **Khách hàng**, **Thu ngân**, **Đầu bếp**, và **Quản lý**, tất cả đều được đồng bộ hóa theo thời gian thực (Real-time) thông qua WebSocket.

---

## 🌟 Các tính năng nổi bật
1. **Khách hàng (Customer View):**
   - Quét mã QR tại bàn để vào thực đơn.
   - Giao diện mượt mà: Các nhóm món được ghim tiêu đề, tự động cuộn đến nhóm món khi chọn, thanh cuộn tự động theo dõi vị trí lướt (ScrollSpy).
   - Đặt món, gọi nhân viên hỗ trợ, xem các món đã đặt và gửi yêu cầu thanh toán mà không cần gọi phục vụ.
2. **Quản lý (Admin Dashboard):**
   - Bảng điều khiển (Overview): Theo dõi tổng doanh thu, số lượng đơn, và tỷ lệ lấp đầy bàn theo thời gian thực.
   - Quản lý Thực đơn (Menu Management): Thêm, sửa, xoá món ăn. Hỗ trợ giao diện Kéo & Thả (Drag & Drop) để tải ảnh món ăn lên máy chủ.
   - Quản lý Phòng/Bàn: Xem trạng thái từng bàn (đang trống, đang phục vụ, chờ thanh toán).
3. **Thu ngân (Cashier):**
   - Giám sát toàn bộ sơ đồ bàn.
   - Nhận thông báo "Chờ thanh toán" nhấp nháy đỏ từ các bàn. 
   - Kiểm tra hoá đơn và xác nhận thanh toán để giải phóng bàn.
4. **Đầu bếp (Kitchen):**
   - Nhận các đơn đặt món theo thời gian thực ngay khi khách bấm đặt.
   - Cập nhật trạng thái "Đã nấu xong", thông báo sẽ được gửi ngược lại cho màn hình của khách hàng.

---

## 🚀 Hướng dẫn cài đặt

Dự án yêu cầu máy tính của bạn phải có sẵn **Node.js** và **MySQL/XAMPP**.

### Bước 1: Chuẩn bị cơ sở dữ liệu
1. Đảm bảo dịch vụ MySQL (ví dụ qua XAMPP) đang được bật.
2. Mở terminal tại thư mục dự án và cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Chạy file seed để khởi tạo CSDL, tự động tạo các bảng và dữ liệu mẫu:
   ```bash
   node seed.js
   ```
   *(Tài khoản quản lý mặc định được tạo ra là: **admin** / **admin**)*

### Bước 2: Khởi động máy chủ
Sau khi cài đặt xong, khởi động server bằng lệnh:
```bash
node server.js
```
Nếu thành công, terminal sẽ hiện thông báo `Server is running on http://localhost:3000`.

---

## 🎮 Cách sử dụng (Luồng làm việc)

### 1. Dành cho Khách hàng
- Truy cập: **[http://localhost:3000/](http://localhost:3000/)**
- Do bạn đang chạy trên máy tính, hệ thống sẽ cung cấp một **Màn hình giả lập quét QR**. Bạn hãy nhấn vào một bàn bất kỳ (VD: Bàn 1) để đóng vai khách hàng ngồi tại bàn đó.
- Lướt xem menu, thêm món vào giỏ hàng và ấn nút "Xác nhận đặt món".

### 2. Dành cho Quản lý / Chủ quán
- Truy cập: **[http://localhost:3000/login.html](http://localhost:3000/login.html)**
- Đăng nhập bằng tài khoản: Tên đăng nhập: `admin` | Mật khẩu: `admin`
- Sau khi đăng nhập, bạn sẽ được đưa tới trang **Quản lý (`quan-ly.html`)**. Tại đây bạn có thể thêm bớt món ăn hoặc xem doanh thu.

### 3. Dành cho Đầu bếp
- Truy cập: **[http://localhost:3000/dau-bep.html](http://localhost:3000/dau-bep.html)**
- Khi khách đặt món, màn hình này sẽ hiện danh sách các món cần nấu. Bếp trưởng ấn "Xong" khi hoàn thành.

### 4. Dành cho Thu ngân
- Truy cập: **[http://localhost:3000/thu-ngan.html](http://localhost:3000/thu-ngan.html)**
- Theo dõi các bàn đang có khách. Khi khách ấn "Yêu cầu thanh toán" trên điện thoại, bàn bên màn hình thu ngân sẽ nhấp nháy đỏ.
- Thu ngân ấn vào bàn, xem hoá đơn và ấn "Xác nhận đã thanh toán" để hoàn tất quy trình phục vụ.

---

## 🛠 Cấu trúc thư mục (Tech Stack)
- **Backend:** Node.js, Express.js. API RESTful cho quản lý, xử lý file upload với Multer.
- **Realtime:** `ws` (WebSocket) dùng để bắn tín hiệu Đặt món, Nấu xong, Gọi thanh toán giữa các bên.
- **Database:** MySQL (Sử dụng thư viện `mysql2` dạng Promise).
- **Frontend:** Vanilla HTML/CSS/JS thuần, không dùng Framework UI, giao diện Glassmorphism độc đáo. File được lưu trong thư mục `public/`.
