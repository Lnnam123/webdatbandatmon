# 🍽️ Hệ Thống Đặt Bàn & Gọi Món Nhà Hàng (QR Order System)

Ứng dụng web quản lý nhà hàng theo thời gian thực, cho phép khách hàng quét mã QR để đặt món, nhà bếp nhận và xử lý đơn hàng, và thu ngân quản lý thanh toán — tất cả đồng bộ tức thì qua WebSocket.

---

## 🚀 Tính Năng Nổi Bật

### 👤 Dành cho Khách Hàng (Giao diện Đặt Món)
- Quét **mã QR** tại bàn để vào thực đơn riêng của bàn đó
- Xem thực đơn, thêm/xóa món vào giỏ hàng, ghi ghi chú
- Xem **"Món đã gọi"** với trạng thái thời gian thực (Chờ xác nhận → Đang chế biến → Đã phục vụ / Đã hủy)
- Nhận thông báo tức thì khi món ăn hoàn thành hoặc bị hủy
- Tự động hiển thị màn hình **chờ thanh toán** khi thu ngân chốt đơn

### 🍳 Dành cho Nhà Bếp (Giao diện Đầu Bếp)
- Nhận đơn món mới ngay khi thu ngân xác nhận
- Cập nhật trạng thái từng món: **Nấu xong** hoặc **Hủy món** (kèm lý do)
- Màn hình tự động làm mới theo thời gian thực

### 💵 Dành cho Thu Ngân (Giao diện POS)
- Quản lý toàn bộ **sơ đồ bàn** (trống / đang phục vụ / chờ thanh toán)
- **Xác nhận gọi món** từ QR của khách để chuyển sang bếp
- Theo dõi từng món theo trạng thái, chỉnh sửa số lượng, hủy món
- Tính **tổng tiền thông minh** (loại trừ món đã hủy)
- In hóa đơn PDF trực tiếp từ trình duyệt
- Nhận thông báo tức thì khi bếp hoàn thành món
- Hiển thị **họ và tên** nhân viên đang đăng nhập

### 🔧 Dành cho Quản Lý (Giao diện Admin)
- Quản lý **thực đơn**: thêm, sửa, xóa món, upload ảnh
- Quản lý **danh mục** món ăn
- Quản lý **bàn ăn** và mã QR
- Quản lý **nhân viên**: thêm, sửa, xóa tài khoản (kèm họ tên, phân quyền)
- Cập nhật **thông tin nhà hàng** (tên, địa chỉ, số điện thoại) — tự động hiển thị trên hóa đơn
- Xem **thống kê tổng quan**

---

## 🛠️ Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|---|---|
| **Backend** | Node.js + Express.js |
| **Database** | MySQL / MariaDB (`mysql2`) |
| **Realtime** | WebSocket (`ws`) |
| **Xác thực** | JWT (`jsonwebtoken`) + Bcrypt (`bcryptjs`) |
| **Upload ảnh** | Multer |
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript |
| **In hóa đơn** | html2pdf.js |

---

## 📁 Cấu Trúc Thư Mục

```
webdatbandatmon/
├── server.js             # Server chính: Express + WebSocket
├── api.js                # Toàn bộ REST API endpoints
├── database.js           # Các hàm tương tác với MySQL
├── restaurant_db.sql     # File xuất cơ sở dữ liệu (MySQL dump)
├── seed.js               # Script tạo dữ liệu mẫu
├── package.json
└── public/
    ├── dat-mon.html       # Giao diện Khách Hàng (đặt món qua QR)
    ├── app.js             # Logic JS cho trang đặt món
    ├── style.css          # CSS chung cho đặt món
    ├── dau-bep.html       # Giao diện Nhà Bếp
    ├── thu-ngan.html      # Giao diện Thu Ngân (POS)
    ├── thu-ngan.js        # Logic JS cho POS
    ├── thu-ngan.css       # CSS cho POS
    ├── quan-ly.html       # Giao diện Quản Lý (Admin)
    ├── quan-ly.js         # Logic JS cho admin
    ├── quan-ly.css        # CSS cho admin
    ├── login.html         # Trang đăng nhập nhân viên
    ├── login.js           # Logic đăng nhập
    ├── login.css
    └── uploads/           # Ảnh món ăn được upload lên
```

---

## ⚙️ Hướng Dẫn Cài Đặt & Chạy

### Yêu Cầu Hệ Thống
- **Node.js** v18 trở lên
- **MySQL** hoặc **MariaDB** (khuyến nghị XAMPP/WAMP)

### Bước 1 — Clone dự án
```bash
git clone <repository-url>
cd webdatbandatmon
```

### Bước 2 — Cài đặt thư viện
```bash
npm install
```

### Bước 3 — Tạo cơ sở dữ liệu MySQL

1. Mở **phpMyAdmin** (hoặc MySQL client)
2. Tạo database mới tên `restaurant_db`
3. Import file `restaurant_db.sql` vào database vừa tạo

### Bước 4 — Cấu hình kết nối Database

Mở file `database.js` và sửa thông tin kết nối MySQL của bạn:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',       // username MySQL của bạn
  password: '',       // password MySQL của bạn
  database: 'restaurant_db',
  ...
});
```

### Bước 5 — Khởi chạy Server
```bash
node server.js
# hoặc
npm start
```

Server sẽ khởi động tại:
```
http://localhost:3000
```

---

## 🌐 Các Đường Dẫn Chính

| Đường dẫn | Mô tả | Truy cập |
|---|---|---|
| `/login.html` | Trang đăng nhập nhân viên | Nhân viên |
| `/thu-ngan.html` | Giao diện Thu Ngân (POS) | Thu ngân / Admin |
| `/dau-bep.html` | Màn hình Nhà Bếp | Đầu bếp |
| `/quan-ly.html` | Trang Quản Lý | Admin |
| `/datmonban1` | Khách hàng quét QR Bàn 01 | Khách hàng |
| `/datmonban2` | Khách hàng quét QR Bàn 02 | Khách hàng |

> **Lưu ý:** Mỗi bàn có một đường dẫn QR riêng, được cấu hình trong phần Quản Lý.

---

## 👥 Phân Quyền Tài Khoản

| Role | Truy cập |
|---|---|
| `admin` | Toàn bộ hệ thống (Quản lý + Thu ngân + Bếp) |
| `cashier` | Giao diện Thu Ngân |
| `chef` | Giao diện Nhà Bếp |

Tài khoản mặc định sau khi import SQL:
- **Username:** `admin` / **Password:** `admin123`

---

## 📡 Luồng Hoạt Động

```
Khách hàng quét QR
       │
       ▼
  [Đặt món] ──────────────────────────────►  Thu ngân nhận thông báo
                                                      │
                                             [Xác nhận gọi món]
                                                      │
                                                      ▼
                                               Nhà Bếp nhận đơn
                                                      │
                                    ┌─────────────────┴─────────────────┐
                              [Nấu xong]                           [Hủy món]
                                    │                                   │
                                    ▼                                   ▼
                        Khách hàng nhận thông báo          Khách hàng nhận thông báo
                        "Món đã được phục vụ"              "Món đã bị hủy + lý do"
                                    │                                   │
                                    └───────────────┬───────────────────┘
                                                    ▼
                                      Thu ngân chốt đơn → In hóa đơn
                                                    │
                                             [Thanh toán]
                                                    │
                                                    ▼
                                           Bàn được giải phóng
```

---

## 🗄️ Cấu Trúc Cơ Sở Dữ Liệu

| Bảng | Mô tả |
|---|---|
| `ban_an` | Thông tin bàn ăn, trạng thái, mã QR, session token |
| `thuc_don` | Danh sách món ăn (tên, giá, loại, ảnh, mô tả) |
| `danh_muc` | Danh mục món ăn |
| `don_hang` | Đơn hàng theo từng phiên bàn |
| `chi_tiet_don_hang` | Chi tiết từng món trong đơn hàng |
| `nguoi_dung` | Tài khoản nhân viên (username, password, vai trò, họ tên) |
| `thong_tin_nha_hang` | Thông tin nhà hàng (tên, địa chỉ, SĐT) hiển thị trên hóa đơn |

---

## 📱 Kết Nối Từ Điện Thoại (Cùng WiFi)

Để khách hàng có thể quét QR từ điện thoại thật, hãy:

1. Đảm bảo máy tính và điện thoại **kết nối cùng một mạng WiFi**
2. Xem địa chỉ IP của máy tính (ví dụ: `192.168.1.5`)
3. Trên điện thoại, truy cập: `http://192.168.1.5:3000/datmonban1`
4. Hoặc tạo mã QR từ URL trên và để khách hàng quét

---

## 📝 License

[MIT](LICENSE)
