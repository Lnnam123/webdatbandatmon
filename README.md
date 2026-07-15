# Glow Bites - Hệ Thống Đặt Món Bằng Mã QR (QR Order System)

Đây là hệ thống đặt món tại bàn dành cho nhà hàng thông qua việc quét mã QR. Ứng dụng cung cấp 3 giao diện chính dành cho: **Khách hàng**, **Thu ngân**, và **Đầu bếp**, được kết nối thời gian thực thông qua WebSocket.

## 🚀 Hướng dẫn cài đặt và chạy ứng dụng

Đảm bảo bạn đã cài đặt **Node.js** trên máy tính.

**Bước 1: Cài đặt các thư viện cần thiết**
Mở terminal/command prompt tại thư mục gốc của dự án (nơi chứa file `server.js`) và chạy lệnh sau để tải các gói phụ thuộc:
```bash
npm install
```

**Bước 2: Khởi động Server**
Tiếp tục trong terminal, chạy lệnh:
```bash
node server.js
```
Nếu thành công, terminal sẽ hiển thị thông báo: `Server is running on http://localhost:3000`

**Bước 3: Trải nghiệm ứng dụng**
Mở trình duyệt web và truy cập vào các đường dẫn sau để trải nghiệm từng luồng:

- **Dành cho Khách hàng (Menu):** [http://localhost:3000/](http://localhost:3000/) hoặc [http://localhost:3000/thuc-don.html](http://localhost:3000/thuc-don.html)
  - Khách hàng sẽ thấy màn hình chào mừng.
  - Bấm vào biểu tượng các bàn (giả lập thao tác quét QR) để vào xem thực đơn và đặt món.
  
- **Dành cho Đầu bếp:** [http://localhost:3000/dau-bep.html](http://localhost:3000/dau-bep.html)
  - Bếp sẽ thấy danh sách các món ăn khách hàng vừa đặt theo thứ tự thời gian thực. Bếp có thể đánh dấu "Hoàn thành" khi nấu xong.

- **Dành cho Thu ngân:** [http://localhost:3000/thu-ngan.html](http://localhost:3000/thu-ngan.html)
  - Quản lý sơ đồ toàn bộ các bàn trong quán.
  - Xem bàn nào đang trống, bàn nào đang phục vụ, và bàn nào đang nhấp nháy đỏ chờ thanh toán. Thu ngân có thể bấm vào bàn để in hoá đơn và duyệt thanh toán.

## 📂 Cấu trúc thư mục

- `server.js`: Chứa logic xử lý server Node.js, Express REST API, và cấu hình WebSocket realtime.
- `database.js`: Kết nối và truy vấn với cơ sở dữ liệu SQLite (lưu trữ Menu, Bàn, Đơn hàng).
- `public/`: Thư mục chứa giao diện HTML/CSS/JS.
  - `thuc-don.html`: Giao diện chính quét mã QR và chọn món cho Khách hàng.
  - `thu-ngan.html`: Giao diện duyệt hoá đơn và tính tiền cho Thu ngân.
  - `dau-bep.html`: Giao diện theo dõi danh sách món ăn cần nấu cho Bếp.
  - `app.js`: Logic xử lý giao diện Khách hàng.
  - `style.css`: Các thiết lập về giao diện, màu sắc, hiệu ứng (Light Mode hiện đại).
- `restaurant.db`: Cơ sở dữ liệu SQLite tự động tạo.
