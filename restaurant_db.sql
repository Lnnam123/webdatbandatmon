-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 20, 2026 at 05:12 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `restaurant_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `ban_an`
--

CREATE TABLE `ban_an` (
  `id` int(11) NOT NULL,
  `ten_ban` varchar(255) NOT NULL,
  `ma_duong_dan` varchar(255) NOT NULL,
  `trang_thai` varchar(50) NOT NULL DEFAULT 'available',
  `ma_phien_hien_tai` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ban_an`
--

INSERT INTO `ban_an` (`id`, `ten_ban`, `ma_duong_dan`, `trang_thai`, `ma_phien_hien_tai`) VALUES
(1, 'Bàn 01', 'datmonban1', 'serving', 'sess_esyyom7p0nb_1784560235488'),
(2, 'Bàn 02', 'datmonban2', 'available', NULL),
(3, 'Bàn 03', 'datmonban3', 'available', NULL),
(4, 'Bàn 04', 'datmonban4', 'available', NULL),
(5, 'Bàn 05', 'datmonban5', 'available', 'sess_zj0sozbict_1784517835461'),
(7, 'Bàn 06', 'datmonban6', 'available', 'sess_428btso7p0t_1784554890989');

-- --------------------------------------------------------

--
-- Table structure for table `chi_tiet_don_hang`
--

CREATE TABLE `chi_tiet_don_hang` (
  `id` int(11) NOT NULL,
  `id_don_hang` int(11) NOT NULL,
  `id_mon_an` int(11) NOT NULL,
  `so_luong` int(11) NOT NULL,
  `gia_ban` double NOT NULL,
  `trang_thai` varchar(50) NOT NULL DEFAULT 'cooking',
  `ngay_tao` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chi_tiet_don_hang`
--

INSERT INTO `chi_tiet_don_hang` (`id`, `id_don_hang`, `id_mon_an`, `so_luong`, `gia_ban`, `trang_thai`, `ngay_tao`) VALUES
(1, 1, 1, 1, 45000, 'done', '2026-07-16 21:02:40'),
(2, 1, 2, 1, 35000, 'done', '2026-07-16 21:02:40'),
(3, 1, 3, 1, 30000, 'done', '2026-07-16 21:02:40'),
(4, 1, 4, 1, 60000, 'done', '2026-07-16 21:02:40'),
(5, 1, 5, 1, 65000, 'done', '2026-07-16 21:02:40'),
(6, 1, 6, 1, 120000, 'done', '2026-07-16 21:02:40'),
(7, 2, 1, 1, 45000, 'done', '2026-07-16 21:03:27'),
(8, 2, 2, 1, 35000, 'done', '2026-07-16 21:03:27'),
(9, 1, 10, 1, 25000, 'done', '2026-07-16 21:03:55'),
(10, 3, 1, 1, 45000, 'done', '2026-07-16 21:07:48'),
(11, 3, 2, 1, 35000, 'done', '2026-07-16 21:07:48'),
(12, 4, 2, 1, 35000, 'done', '2026-07-17 08:22:28'),
(13, 4, 1, 1, 120000, 'done', '2026-07-17 08:22:28'),
(14, 4, 4, 1, 60000, 'done', '2026-07-17 08:22:28'),
(15, 5, 2, 1, 35000, 'cooking', '2026-07-17 08:39:19'),
(16, 5, 3, 1, 30000, 'cooking', '2026-07-17 08:39:19'),
(17, 5, 2, 1, 35000, 'cooking', '2026-07-17 09:27:43'),
(18, 6, 4, 1, 60000, 'done', '2026-07-17 09:58:41'),
(19, 6, 6, 1, 120000, 'done', '2026-07-17 09:58:41'),
(20, 6, 11, 1, 35000, 'done', '2026-07-17 09:58:41'),
(21, 7, 1, 3, 120000, 'done', '2026-07-17 09:58:48'),
(22, 7, 12, 1, 30000, 'done', '2026-07-17 09:58:48'),
(23, 7, 8, 5, 35000, 'done', '2026-07-17 09:58:48'),
(24, 7, 16, 5, 45000, 'done', '2026-07-17 09:58:48'),
(25, 7, 9, 1, 20000, 'done', '2026-07-17 09:58:48'),
(26, 7, 7, 1, 250000, 'done', '2026-07-17 09:58:48'),
(27, 7, 6, 1, 120000, 'cooking', '2026-07-17 09:58:48'),
(28, 7, 2, 8, 35000, 'cooking', '2026-07-17 09:58:48'),
(29, 7, 5, 1, 65000, 'cooking', '2026-07-17 09:58:48'),
(30, 7, 4, 5, 60000, 'cooking', '2026-07-17 09:58:48'),
(31, 7, 11, 5, 35000, 'cooking', '2026-07-17 09:58:48'),
(32, 7, 3, 1, 30000, 'done', '2026-07-17 09:59:26'),
(33, 8, 2, 2, 35000, 'done', '2026-07-17 10:22:35'),
(34, 9, 2, 1, 35000, 'done', '2026-07-20 10:29:24'),
(35, 9, 3, 1, 30000, 'done', '2026-07-20 10:29:24'),
(36, 10, 2, 1, 35000, 'cooking', '2026-07-20 10:30:11'),
(37, 10, 3, 1, 30000, 'done', '2026-07-20 10:30:11'),
(38, 11, 2, 1, 35000, 'done', '2026-07-20 20:52:51'),
(39, 11, 3, 1, 30000, 'done', '2026-07-20 20:52:51'),
(40, 11, 1, 1, 120000, 'done', '2026-07-20 20:53:36'),
(41, 12, 2, 1, 35000, 'done', '2026-07-20 21:07:55'),
(42, 12, 3, 1, 30000, 'done', '2026-07-20 21:07:55'),
(43, 12, 1, 1, 120000, 'done', '2026-07-20 21:07:55'),
(44, 12, 2, 1, 35000, 'canceled', '2026-07-20 21:10:54'),
(45, 12, 8, 1, 35000, 'canceled', '2026-07-20 21:15:36'),
(46, 13, 2, 1, 35000, 'done', '2026-07-20 21:16:26'),
(47, 14, 17, 1, 120000, 'canceled', '2026-07-20 21:28:48'),
(48, 14, 16, 1, 45000, 'canceled', '2026-07-20 21:28:48'),
(49, 14, 3, 1, 30000, 'canceled', '2026-07-20 21:43:17'),
(50, 14, 8, 1, 35000, 'done', '2026-07-20 21:43:17'),
(51, 14, 17, 1, 120000, 'done', '2026-07-20 21:43:17'),
(52, 14, 2, 1, 35000, 'done', '2026-07-20 21:44:27'),
(53, 15, 2, 1, 35000, 'done', '2026-07-20 21:50:51'),
(54, 15, 3, 1, 30000, 'done', '2026-07-20 21:50:51'),
(55, 15, 1, 1, 120000, 'done', '2026-07-20 21:50:51'),
(56, 15, 4, 1, 60000, 'canceled', '2026-07-20 21:50:51'),
(57, 15, 9, 1, 20000, 'done', '2026-07-20 22:00:42'),
(58, 16, 2, 1, 35000, 'done', '2026-07-20 22:06:28'),
(59, 16, 3, 1, 30000, 'done', '2026-07-20 22:06:28'),
(60, 16, 2, 1, 35000, 'done', '2026-07-20 22:07:47'),
(61, 17, 11, 1, 35000, 'done', '2026-07-20 22:10:54'),
(62, 17, 10, 1, 25000, 'done', '2026-07-20 22:10:54');

-- --------------------------------------------------------

--
-- Table structure for table `danh_muc`
--

CREATE TABLE `danh_muc` (
  `id` int(11) NOT NULL,
  `ma_danh_muc` varchar(50) NOT NULL,
  `ten_danh_muc` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `danh_muc`
--

INSERT INTO `danh_muc` (`id`, `ma_danh_muc`, `ten_danh_muc`) VALUES
(1, 'appetizer', 'Đồ ăn'),
(2, 'main', 'Món chính'),
(3, 'drink', 'Đồ uống'),
(4, 'dessert', 'Tráng miệng'),
(5, 'banhmi', 'Bánh Mì'),
(6, 'hotpot', 'Lẩu');

-- --------------------------------------------------------

--
-- Table structure for table `don_hang`
--

CREATE TABLE `don_hang` (
  `id` int(11) NOT NULL,
  `id_ban` int(11) NOT NULL,
  `ma_phien` varchar(255) NOT NULL,
  `trang_thai` varchar(50) NOT NULL DEFAULT 'pending',
  `tong_tien` double DEFAULT 0,
  `ngay_tao` datetime DEFAULT current_timestamp(),
  `ghi_chu` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `don_hang`
--

INSERT INTO `don_hang` (`id`, `id_ban`, `ma_phien`, `trang_thai`, `tong_tien`, `ngay_tao`, `ghi_chu`) VALUES
(1, 1, 'sess_kybn7zeapq_1784210506373', 'paid', 380000, '2026-07-16 21:02:40', NULL),
(2, 2, 'sess_b2gyqr4orzb_1784210604441', 'paid', 80000, '2026-07-16 21:03:27', NULL),
(3, 1, 'sess_0ea9nfnfedd_1784210866207', 'paid', 80000, '2026-07-16 21:07:48', NULL),
(4, 1, 'sess_1ztkcdr0sor_1784250773856', 'paid', 215000, '2026-07-17 08:22:28', NULL),
(5, 1, 'sess_v5k0cgdkx2h_1784251375247', 'paid', 100000, '2026-07-17 08:39:19', NULL),
(6, 1, 'sess_keemistzg5t_1784257104273', 'paid', 215000, '2026-07-17 09:58:41', NULL),
(7, 5, 'sess_rqg0yqlg5pm_1784257025387', 'paid', 2030000, '2026-07-17 09:58:48', NULL),
(8, 5, 'sess_ckbv7ddbpwa_1784258516284', 'done', 70000, '2026-07-17 10:22:35', NULL),
(9, 7, 'sess_xhckvn9m7t_1784518159711', 'paid', 65000, '2026-07-20 10:29:24', NULL),
(10, 7, 'sess_05oj6hnp7dc5_1784518208091', 'paid', 65000, '2026-07-20 10:30:11', NULL),
(11, 1, 'sess_xk5tjdmmdbd_1784555567846', 'paid', 185000, '2026-07-20 20:52:51', NULL),
(12, 1, 'sess_uvsz1awb84e_1784556467867', 'paid', 150000, '2026-07-20 21:07:55', NULL),
(13, 2, 'sess_3mbgsgbk5u8_1784556982936', 'paid', 35000, '2026-07-20 21:16:26', NULL),
(14, 1, 'sess_8crpalwvin8_1784557716786', 'paid', 190000, '2026-07-20 21:28:48', NULL),
(15, 1, 'sess_ebrjt4w3ik_1784559031369', 'paid', 205000, '2026-07-20 21:50:51', NULL),
(16, 1, 'sess_pe2x2zhjysh_1784559945251', 'done', 100000, '2026-07-20 22:06:28', ''),
(17, 1, 'sess_esyyom7p0nb_1784560235488', 'done', 60000, '2026-07-20 22:10:54', '');

-- --------------------------------------------------------

--
-- Table structure for table `tai_khoan`
--

CREATE TABLE `tai_khoan` (
  `id` int(11) NOT NULL,
  `ten_dang_nhap` varchar(255) NOT NULL,
  `mat_khau` varchar(255) NOT NULL,
  `vai_tro` varchar(50) DEFAULT 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tai_khoan`
--

INSERT INTO `tai_khoan` (`id`, `ten_dang_nhap`, `mat_khau`, `vai_tro`) VALUES
(1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
(2, 'nam', '$2b$10$FCOi93iIugdvHiDlOAoOhesgUCM4oFdtnQ3yWhgGdy.XrodwM1dKa', 'admin'),
(3, 'thieu', '$2b$10$KmmMFRUkQa5gKFDyFk6yQ.DqspeMuZcWq9oj9CdJ0F3V0PvkaGSHS', 'cashier');

-- --------------------------------------------------------

--
-- Table structure for table `thuc_don`
--

CREATE TABLE `thuc_don` (
  `id` int(11) NOT NULL,
  `ten_mon` varchar(255) NOT NULL,
  `gia_tien` double NOT NULL,
  `loai_mon` varchar(50) NOT NULL,
  `anh_minh_hoa` text DEFAULT NULL,
  `mo_ta` text DEFAULT NULL,
  `con_hang` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `thuc_don`
--

INSERT INTO `thuc_don` (`id`, `ten_mon`, `gia_tien`, `loai_mon`, `anh_minh_hoa`, `mo_ta`, `con_hang`) VALUES
(1, 'Súp Hải Sản Tóc Tiên', 120000, 'main', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=60', 'Súp sệt nóng hổi với hải sản băm, nấm và tóc tiên thơm ngon bổ dưỡng.', 1),
(2, 'Gỏi Cuốn Tôm Thịt (3 cái)', 35000, 'appetizer', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=60', 'Bánh tráng cuốn tôm tươi, ba chỉ heo, bún tươi, rau sống kèm tương đen đậu phộng.', 1),
(3, 'Khoai Tây Chiên Phô Mai', 30000, 'appetizer', 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60', 'Khoai tây cọng chiên giòn lắc bột phô mai mặn ngọt béo ngậy.', 1),
(4, 'Phở Bò Tái Lăn Đặc Biệt', 60000, 'main', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60', 'Phở bò Hà Nội truyền thống với thịt bò xào lăn tỏi gừng thơm nức mũi.', 1),
(5, 'Cơm Tấm Sườn Nướng Đặc Biệt', 65000, 'main', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=60', 'Cơm tấm dẻo thơm ăn kèm sườn bì chả, mỡ hành nước mắm chua ngọt đặc trưng.', 1),
(6, 'Bò Lúc Lắc Khoai Tây Chiên', 120000, 'main', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&auto=format&fit=crop&q=60', 'Thịt bò phi lê cắt khối vuông xào lửa lớn sốt tiêu đen kèm khoai tây chiên.', 1),
(7, 'Lẩu Thái Hải Sản Đậm Đà (2-3 người)', 250000, 'main', 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&auto=format&fit=crop&q=60', 'Lẩu thái chua cay với mực, tôm, cá viên, bò Mỹ cuộn nấm kim châm và rau củ.', 1),
(8, 'Chè Thái Sầu Riêng Đặc Biệt', 35000, 'dessert', 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&auto=format&fit=crop&q=60', 'Chè thái nhiều thạch, trái cây tươi kèm múi sầu riêng tươi ngon béo ngậy.', 1),
(9, 'Bánh Flan Cốt Dừa Béo Ngậy', 20000, 'dessert', 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=60', 'Bánh flan mềm mịn ăn kèm đá bào, cà phê đắng nhẹ và nước cốt dừa.', 1),
(10, 'Cà Phê Sữa Đá Sài Gòn', 25000, 'drink', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', 'Cà phê pha phin truyền thống thơm nồng kết hợp sữa đặc và đá viên.', 1),
(11, 'Trà Đào Cam Sả Giải Nhiệt', 35000, 'drink', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', 'Hương trà thơm thanh khiết kết hợp vị đào ngọt ngào, cam chua nhẹ và sả thơm mát.', 1),
(12, 'Nước Ép Dưa Hấu Nguyên Chất', 30000, 'drink', '/uploads/1784214524847-7900430.png', 'Dưa hấu chín mọng ép lấy nước ngọt thanh tự nhiên, mát rượi.', 1),
(16, 'Bánh Mì Bơ Tỏi', 45000, 'banhmi', '/uploads/1784215094775-513227601.jpg', '', 1),
(17, 'Lẩu bò', 120000, 'hotpot', '/uploads/1784257366503-767741867.webp', '', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ban_an`
--
ALTER TABLE `ban_an`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ten_ban` (`ten_ban`),
  ADD UNIQUE KEY `ma_duong_dan` (`ma_duong_dan`);

--
-- Indexes for table `chi_tiet_don_hang`
--
ALTER TABLE `chi_tiet_don_hang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_don_hang` (`id_don_hang`),
  ADD KEY `fk_mon_an` (`id_mon_an`);

--
-- Indexes for table `danh_muc`
--
ALTER TABLE `danh_muc`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ma_danh_muc` (`ma_danh_muc`);

--
-- Indexes for table `don_hang`
--
ALTER TABLE `don_hang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_ban` (`id_ban`);

--
-- Indexes for table `tai_khoan`
--
ALTER TABLE `tai_khoan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ten_dang_nhap` (`ten_dang_nhap`);

--
-- Indexes for table `thuc_don`
--
ALTER TABLE `thuc_don`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ban_an`
--
ALTER TABLE `ban_an`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `chi_tiet_don_hang`
--
ALTER TABLE `chi_tiet_don_hang`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `danh_muc`
--
ALTER TABLE `danh_muc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `don_hang`
--
ALTER TABLE `don_hang`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `tai_khoan`
--
ALTER TABLE `tai_khoan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `thuc_don`
--
ALTER TABLE `thuc_don`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chi_tiet_don_hang`
--
ALTER TABLE `chi_tiet_don_hang`
  ADD CONSTRAINT `chi_tiet_don_hang_ibfk_1` FOREIGN KEY (`id_don_hang`) REFERENCES `don_hang` (`id`),
  ADD CONSTRAINT `fk_mon_an` FOREIGN KEY (`id_mon_an`) REFERENCES `thuc_don` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `don_hang`
--
ALTER TABLE `don_hang`
  ADD CONSTRAINT `don_hang_ibfk_1` FOREIGN KEY (`id_ban`) REFERENCES `ban_an` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
