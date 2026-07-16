-- TẠO CƠ SỞ DỮ LIỆU
CREATE DATABASE IF NOT EXISTS restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_db;

-- 1. BẢNG TÀI KHOẢN (Quản trị)
CREATE TABLE IF NOT EXISTS tai_khoan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_dang_nhap VARCHAR(255) UNIQUE NOT NULL,
  mat_khau VARCHAR(255) NOT NULL,
  vai_tro VARCHAR(50) DEFAULT 'admin'
);

-- 2. BẢNG BÀN ĂN
CREATE TABLE IF NOT EXISTS ban_an (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_ban VARCHAR(255) UNIQUE NOT NULL,
  ma_duong_dan VARCHAR(255) UNIQUE NOT NULL,
  trang_thai VARCHAR(50) NOT NULL DEFAULT 'available',
  ma_phien_hien_tai VARCHAR(255)
);

-- 3. BẢNG THỰC ĐƠN
CREATE TABLE IF NOT EXISTS thuc_don (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_mon VARCHAR(255) NOT NULL,
  gia_tien DOUBLE NOT NULL,
  loai_mon VARCHAR(50) NOT NULL,
  anh_minh_hoa TEXT,
  mo_ta TEXT,
  con_hang TINYINT NOT NULL DEFAULT 1
);

-- 4. BẢNG ĐƠN HÀNG
CREATE TABLE IF NOT EXISTS don_hang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ban INT NOT NULL,
  ma_phien VARCHAR(255) NOT NULL,
  trang_thai VARCHAR(50) NOT NULL DEFAULT 'pending',
  tong_tien DOUBLE DEFAULT 0,
  ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_ban) REFERENCES ban_an(id)
);

-- 5. BẢNG CHI TIẾT ĐƠN HÀNG
CREATE TABLE IF NOT EXISTS chi_tiet_don_hang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_don_hang INT NOT NULL,
  id_mon_an INT NOT NULL,
  so_luong INT NOT NULL,
  gia_ban DOUBLE NOT NULL,
  trang_thai VARCHAR(50) NOT NULL DEFAULT 'cooking',
  ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_don_hang) REFERENCES don_hang(id),
  FOREIGN KEY (id_mon_an) REFERENCES thuc_don(id)
);


-- ======================================================================
-- NẠP DỮ LIỆU MẪU (SEED DATA)
-- ======================================================================

-- Dữ liệu tài khoản Admin mặc định
INSERT IGNORE INTO tai_khoan (ten_dang_nhap, mat_khau, vai_tro) VALUES 
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin');


-- Dữ liệu bàn ăn mẫu
INSERT IGNORE INTO ban_an (ten_ban, ma_duong_dan, trang_thai) VALUES 
('Bàn 01', 'datmonban1', 'available'),
('Bàn 02', 'datmonban2', 'available'),
('Bàn 03', 'datmonban3', 'available'),
('Bàn 04', 'datmonban4', 'available'),
('Bàn 05', 'datmonban5', 'available');


-- Dữ liệu món ăn mẫu
INSERT IGNORE INTO thuc_don (ten_mon, gia_tien, loai_mon, anh_minh_hoa, mo_ta, con_hang) VALUES 
('Súp Hải Sản Tóc Tiên', 45000, 'appetizer', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=60', 'Súp sệt nóng hổi với hải sản băm, nấm và tóc tiên thơm ngon bổ dưỡng.', 1),
('Gỏi Cuốn Tôm Thịt (3 cái)', 35000, 'appetizer', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=60', 'Bánh tráng cuốn tôm tươi, ba chỉ heo, bún tươi, rau sống kèm tương đen đậu phộng.', 1),
('Khoai Tây Chiên Phô Mai', 30000, 'appetizer', 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60', 'Khoai tây cọng chiên giòn lắc bột phô mai mặn ngọt béo ngậy.', 1),
('Phở Bò Tái Lăn Đặc Biệt', 60000, 'main', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60', 'Phở bò Hà Nội truyền thống với thịt bò xào lăn tỏi gừng thơm nức mũi.', 1),
('Cơm Tấm Sườn Nướng Đặc Biệt', 65000, 'main', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=60', 'Cơm tấm dẻo thơm ăn kèm sườn bì chả, mỡ hành nước mắm chua ngọt đặc trưng.', 1),
('Bò Lúc Lắc Khoai Tây Chiên', 120000, 'main', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&auto=format&fit=crop&q=60', 'Thịt bò phi lê cắt khối vuông xào lửa lớn sốt tiêu đen kèm khoai tây chiên.', 1),
('Lẩu Thái Hải Sản Đậm Đà (2-3 người)', 250000, 'main', 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&auto=format&fit=crop&q=60', 'Lẩu thái chua cay với mực, tôm, cá viên, bò Mỹ cuộn nấm kim châm và rau củ.', 1),
('Chè Thái Sầu Riêng Đặc Biệt', 35000, 'dessert', 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&auto=format&fit=crop&q=60', 'Chè thái nhiều thạch, trái cây tươi kèm múi sầu riêng tươi ngon béo ngậy.', 1),
('Bánh Flan Cốt Dừa Béo Ngậy', 20000, 'dessert', 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=60', 'Bánh flan mềm mịn ăn kèm đá bào, cà phê đắng nhẹ và nước cốt dừa.', 1),
('Cà Phê Sữa Đá Sài Gòn', 25000, 'drink', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', 'Cà phê pha phin truyền thống thơm nồng kết hợp sữa đặc và đá viên.', 1),
('Trà Đào Cam Sả Giải Nhiệt', 35000, 'drink', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', 'Hương trà thơm thanh khiết kết hợp vị đào ngọt ngào, cam chua nhẹ và sả thơm mát.', 1),
('Nước Ép Dưa Hấu Nguyên Chất', 30000, 'drink', 'https://images.unsplash.com/photo-1589733901241-5e56478f444f?w=500&auto=format&fit=crop&q=60', 'Dưa hấu chín mọng ép lấy nước ngọt thanh tự nhiên, mát rượi.', 1);
