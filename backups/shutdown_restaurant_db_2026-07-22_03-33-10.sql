-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: restaurant_db
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ban_an`
--

DROP TABLE IF EXISTS `ban_an`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ban_an` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_ban` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_duong_dan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trang_thai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `ma_phien_hien_tai` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_khu_vuc` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ten_ban` (`ten_ban`),
  UNIQUE KEY `ma_duong_dan` (`ma_duong_dan`),
  KEY `fk_ban_khu_vuc` (`id_khu_vuc`),
  CONSTRAINT `fk_ban_khu_vuc` FOREIGN KEY (`id_khu_vuc`) REFERENCES `khu_vuc` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ban_an`
--

LOCK TABLES `ban_an` WRITE;
/*!40000 ALTER TABLE `ban_an` DISABLE KEYS */;
INSERT INTO `ban_an` VALUES (1,'Bàn 01','datmonban1','available','sess_bzdgx0sryk6_1784689260535',1),(2,'Bàn 02','datmonban2','available',NULL,1),(3,'Bàn 03','datmonban3','available','sess_aq9o8ozv25t_1784689376587',1),(4,'Bàn 04','datmonban4','available',NULL,2),(5,'Bàn 05','datmonban5','available','sess_zj0sozbict_1784517835461',2),(7,'Bàn 06','datmonban6','available','sess_428btso7p0t_1784554890989',2),(8,'Bàn 07','datmonban7','available',NULL,7),(9,'Bàn 08','datmonban8','available',NULL,3),(10,'Bàn 09','datmonban9','available',NULL,3),(11,'Bàn 10','datmonban10','available',NULL,3);
/*!40000 ALTER TABLE `ban_an` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chi_tiet_don_hang`
--

DROP TABLE IF EXISTS `chi_tiet_don_hang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chi_tiet_don_hang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_don_hang` int NOT NULL,
  `id_mon_an` int NOT NULL,
  `so_luong` int NOT NULL,
  `gia_ban` double NOT NULL,
  `trang_thai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cooking',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `ten_size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_don_hang` (`id_don_hang`),
  KEY `fk_mon_an` (`id_mon_an`),
  CONSTRAINT `chi_tiet_don_hang_ibfk_1` FOREIGN KEY (`id_don_hang`) REFERENCES `don_hang` (`id`),
  CONSTRAINT `fk_mon_an` FOREIGN KEY (`id_mon_an`) REFERENCES `thuc_don` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chi_tiet_don_hang`
--

LOCK TABLES `chi_tiet_don_hang` WRITE;
/*!40000 ALTER TABLE `chi_tiet_don_hang` DISABLE KEYS */;
INSERT INTO `chi_tiet_don_hang` VALUES (1,1,1,1,45000,'done','2026-07-16 21:02:40',NULL),(3,1,3,1,30000,'done','2026-07-16 21:02:40',NULL),(7,2,1,1,45000,'done','2026-07-16 21:03:27',NULL),(9,1,10,1,25000,'done','2026-07-16 21:03:55',NULL),(10,3,1,1,45000,'done','2026-07-16 21:07:48',NULL),(13,4,1,1,120000,'done','2026-07-17 08:22:28',NULL),(16,5,3,1,30000,'cooking','2026-07-17 08:39:19',NULL),(20,6,11,1,35000,'done','2026-07-17 09:58:41',NULL),(21,7,1,3,120000,'done','2026-07-17 09:58:48',NULL),(22,7,12,1,30000,'done','2026-07-17 09:58:48',NULL),(23,7,8,5,35000,'done','2026-07-17 09:58:48',NULL),(25,7,9,1,20000,'done','2026-07-17 09:58:48',NULL),(26,7,7,1,250000,'done','2026-07-17 09:58:48',NULL),(31,7,11,5,35000,'cooking','2026-07-17 09:58:48',NULL),(32,7,3,1,30000,'done','2026-07-17 09:59:26',NULL),(35,9,3,1,30000,'done','2026-07-20 10:29:24',NULL),(37,10,3,1,30000,'done','2026-07-20 10:30:11',NULL),(39,11,3,1,30000,'done','2026-07-20 20:52:51',NULL),(40,11,1,1,120000,'done','2026-07-20 20:53:36',NULL),(42,12,3,1,30000,'done','2026-07-20 21:07:55',NULL),(43,12,1,1,120000,'done','2026-07-20 21:07:55',NULL),(45,12,8,1,35000,'canceled','2026-07-20 21:15:36',NULL),(49,14,3,1,30000,'canceled','2026-07-20 21:43:17',NULL),(50,14,8,1,35000,'done','2026-07-20 21:43:17',NULL),(54,15,3,1,30000,'done','2026-07-20 21:50:51',NULL),(55,15,1,1,120000,'done','2026-07-20 21:50:51',NULL),(57,15,9,1,20000,'done','2026-07-20 22:00:42',NULL),(59,16,3,1,30000,'done','2026-07-20 22:06:28',NULL),(61,17,11,1,35000,'done','2026-07-20 22:10:54',NULL),(62,17,10,1,25000,'done','2026-07-20 22:10:54',NULL),(66,18,3,1,30000,'done','2026-07-20 22:19:56',NULL),(69,19,7,1,250000,'done','2026-07-20 22:31:40',NULL),(70,19,12,1,30000,'done','2026-07-20 22:35:11',NULL),(71,19,11,1,35000,'done','2026-07-20 22:35:11',NULL),(72,19,10,1,25000,'done','2026-07-20 22:35:11',NULL),(73,19,8,1,35000,'done','2026-07-20 22:35:11',NULL),(74,19,9,1,20000,'done','2026-07-20 22:35:11',NULL),(76,20,3,1,30000,'done','2026-07-20 22:58:10',NULL),(78,21,3,1,30000,'done','2026-07-20 23:12:55',NULL),(79,21,1,3,120000,'done','2026-07-20 23:12:55',NULL),(82,21,10,1,25000,'done','2026-07-20 23:12:56',NULL),(83,21,12,2,30000,'done','2026-07-20 23:12:56',NULL),(87,22,9,1,20000,'done','2026-07-20 23:21:08',NULL),(88,22,8,1,35000,'done','2026-07-20 23:21:08',NULL),(91,22,3,1,30000,'done','2026-07-20 23:21:08',NULL),(95,23,8,1,35000,'canceled','2026-07-20 23:27:52',NULL),(97,24,12,1,30000,'canceled','2026-07-20 23:35:49',NULL),(98,24,11,1,35000,'canceled','2026-07-20 23:35:49',NULL),(99,24,10,1,25000,'done','2026-07-20 23:41:51',NULL),(100,24,7,1,250000,'done','2026-07-20 23:41:51',NULL),(104,24,1,1,120000,'done','2026-07-20 23:41:51',NULL),(108,25,7,1,250000,'done','2026-07-20 23:45:45',NULL),(109,25,10,1,25000,'done','2026-07-20 23:45:45',NULL),(110,25,12,1,30000,'done','2026-07-20 23:45:45',NULL),(111,25,8,1,35000,'done','2026-07-20 23:45:45',NULL),(112,26,3,1,30000,'done','2026-07-20 23:45:57',NULL),(116,26,11,1,35000,'done','2026-07-20 23:45:57',NULL),(118,27,10,1,25000,'done','2026-07-20 23:51:35',NULL),(119,27,11,1,35000,'done','2026-07-20 23:51:35',NULL),(120,27,12,1,30000,'canceled','2026-07-20 23:51:35',NULL),(121,28,1,1,120000,'done','2026-07-21 14:32:54',NULL),(123,28,10,1,25000,'done','2026-07-21 14:32:54',NULL),(124,28,12,1,30000,'canceled','2026-07-21 14:32:54',NULL),(126,29,3,1,30000,'done','2026-07-21 16:17:45',NULL),(127,29,1,1,120000,'done','2026-07-21 16:17:45',NULL),(131,30,3,1,30000,'done','2026-07-21 16:18:05',NULL),(132,30,1,1,120000,'done','2026-07-21 16:18:05',NULL),(136,30,7,1,250000,'done','2026-07-21 16:18:05',NULL),(137,30,10,1,25000,'done','2026-07-21 16:18:05',NULL),(138,30,11,1,35000,'done','2026-07-21 16:18:05',NULL),(139,30,12,1,30000,'done','2026-07-21 16:18:05',NULL),(140,30,8,1,35000,'done','2026-07-21 16:18:05',NULL),(141,30,9,1,20000,'done','2026-07-21 16:18:05',NULL),(144,31,10,1,25000,'done','2026-07-21 22:25:06',NULL),(145,32,10,1,25000,'done','2026-07-21 23:32:25','Size M'),(146,32,10,2,35000,'done','2026-07-21 23:32:25','Size L'),(147,32,11,2,36000,'done','2026-07-21 23:32:48',NULL),(148,33,10,1,25000,'done','2026-07-21 23:33:26','Size M'),(149,33,3,1,30000,'done','2026-07-21 23:33:26',NULL),(150,33,9,1,20000,'done','2026-07-21 23:33:26',NULL),(151,32,10,1,25000,'done','2026-07-21 23:41:25','Size M'),(152,32,31,1,250000,'done','2026-07-21 23:48:56',NULL),(153,32,7,1,250000,'done','2026-07-21 23:48:56',NULL),(154,33,11,1,36000,'done','2026-07-21 23:49:39',NULL),(155,33,1,1,120000,'done','2026-07-21 23:49:39',NULL),(156,34,10,1,25000,'done','2026-07-22 00:02:23','Size M'),(157,35,11,1,36000,'done','2026-07-22 00:02:51',NULL),(158,36,10,1,35000,'done','2026-07-22 00:13:56','Size L'),(159,36,10,1,25000,'done','2026-07-22 00:13:56','Size M'),(160,36,11,1,36000,'done','2026-07-22 00:13:56',NULL),(161,36,3,1,30000,'done','2026-07-22 00:13:56',NULL);
/*!40000 ALTER TABLE `chi_tiet_don_hang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `danh_muc`
--

DROP TABLE IF EXISTS `danh_muc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danh_muc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_danh_muc` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten_danh_muc` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thu_tu` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ma_danh_muc` (`ma_danh_muc`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danh_muc`
--

LOCK TABLES `danh_muc` WRITE;
/*!40000 ALTER TABLE `danh_muc` DISABLE KEYS */;
INSERT INTO `danh_muc` VALUES (3,'drink','Đồ uống',0),(4,'dessert','Tráng miệng',0),(6,'hotpot','Lẩu',0),(8,'Seafood','Hải sản',0),(10,'Grilled food','Đồ nướng',0);
/*!40000 ALTER TABLE `danh_muc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `don_hang`
--

DROP TABLE IF EXISTS `don_hang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `don_hang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_ban` int NOT NULL,
  `ma_phien` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trang_thai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `tong_tien` double DEFAULT '0',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `id_ban` (`id_ban`),
  CONSTRAINT `don_hang_ibfk_1` FOREIGN KEY (`id_ban`) REFERENCES `ban_an` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `don_hang`
--

LOCK TABLES `don_hang` WRITE;
/*!40000 ALTER TABLE `don_hang` DISABLE KEYS */;
INSERT INTO `don_hang` VALUES (1,1,'sess_kybn7zeapq_1784210506373','paid',380000,'2026-07-16 21:02:40',NULL),(2,2,'sess_b2gyqr4orzb_1784210604441','paid',80000,'2026-07-16 21:03:27',NULL),(3,1,'sess_0ea9nfnfedd_1784210866207','paid',80000,'2026-07-16 21:07:48',NULL),(4,1,'sess_1ztkcdr0sor_1784250773856','paid',215000,'2026-07-17 08:22:28',NULL),(5,1,'sess_v5k0cgdkx2h_1784251375247','paid',100000,'2026-07-17 08:39:19',NULL),(6,1,'sess_keemistzg5t_1784257104273','paid',215000,'2026-07-17 09:58:41',NULL),(7,5,'sess_rqg0yqlg5pm_1784257025387','paid',2030000,'2026-07-17 09:58:48',NULL),(8,5,'sess_ckbv7ddbpwa_1784258516284','done',70000,'2026-07-17 10:22:35',NULL),(9,7,'sess_xhckvn9m7t_1784518159711','paid',65000,'2026-07-20 10:29:24',NULL),(10,7,'sess_05oj6hnp7dc5_1784518208091','paid',65000,'2026-07-20 10:30:11',NULL),(11,1,'sess_xk5tjdmmdbd_1784555567846','paid',185000,'2026-07-20 20:52:51',NULL),(12,1,'sess_uvsz1awb84e_1784556467867','paid',150000,'2026-07-20 21:07:55',NULL),(13,2,'sess_3mbgsgbk5u8_1784556982936','paid',35000,'2026-07-20 21:16:26',NULL),(14,1,'sess_8crpalwvin8_1784557716786','paid',190000,'2026-07-20 21:28:48',NULL),(15,1,'sess_ebrjt4w3ik_1784559031369','paid',205000,'2026-07-20 21:50:51',NULL),(16,1,'sess_pe2x2zhjysh_1784559945251','done',100000,'2026-07-20 22:06:28',''),(17,1,'sess_esyyom7p0nb_1784560235488','paid',95000,'2026-07-20 22:10:54',''),(18,2,'sess_grdhkd4gnys_1784560791034','paid',160000,'2026-07-20 22:19:56',''),(19,1,'sess_ebcz1qtixv_1784560736548','paid',395000,'2026-07-20 22:31:40',''),(20,1,'sess_wt8g54hcunq_1784563086804','paid',65000,'2026-07-20 22:58:10',''),(21,1,'sess_mx1wfyzmvmm_1784563953919','paid',870000,'2026-07-20 23:12:55',''),(22,1,'sess_i69no4y0a1q_1784564444179','paid',495000,'2026-07-20 23:21:08',''),(23,1,'sess_51vk64c86u8_1784564863399','paid',280000,'2026-07-20 23:27:52',''),(24,1,'sess_1ttb3g9vtl4_1784565345002','paid',595000,'2026-07-20 23:35:49',''),(25,9,'sess_6k1nj0u9dba_1784565938506','paid',375000,'2026-07-20 23:45:45',''),(26,8,'sess_ju5x27awl0d_1784565952348','paid',65000,'2026-07-20 23:45:57',''),(27,3,'sess_o7js17em0fp_1784566290474','paid',95000,'2026-07-20 23:51:35',''),(28,1,'sess_trki6zqjpp_1784619159934','paid',265000,'2026-07-21 14:32:54',''),(29,1,'sess_alwfpbxg9k7_1784625432201','paid',310000,'2026-07-21 16:17:45',''),(30,3,'sess_dbzaj9yhfb7_1784625418255','paid',990000,'2026-07-21 16:18:05','36'),(31,1,'sess_xkf27id0fj_1784647498381','paid',25000,'2026-07-21 22:25:06',''),(32,1,'sess_3siv9d2bev_1784651521169','paid',692000,'2026-07-21 23:32:25',''),(33,2,'sess_t9m8349t1be_1784651592226','paid',231000,'2026-07-21 23:33:26',''),(34,1,'sess_1s51ws8vffe_1784653336946','paid',25000,'2026-07-22 00:02:22',''),(35,2,'sess_i7px5nzfcrg_1784653353548','paid',36000,'2026-07-22 00:02:51',''),(36,11,'sess_src7foucyom_1784654024464','paid',126000,'2026-07-22 00:13:56','');
/*!40000 ALTER TABLE `don_hang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `khu_vuc`
--

DROP TABLE IF EXISTS `khu_vuc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `khu_vuc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_khu_vuc` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ten_khu_vuc` (`ten_khu_vuc`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `khu_vuc`
--

LOCK TABLES `khu_vuc` WRITE;
/*!40000 ALTER TABLE `khu_vuc` DISABLE KEYS */;
INSERT INTO `khu_vuc` VALUES (3,'Khu VIP'),(1,'Tầng 1'),(2,'Tầng 2'),(7,'Tầng 3');
/*!40000 ALTER TABLE `khu_vuc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tai_khoan`
--

DROP TABLE IF EXISTS `tai_khoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tai_khoan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_dang_nhap` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mat_khau` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vai_tro` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `ho_ten` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Chưa cập nhật',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ten_dang_nhap` (`ten_dang_nhap`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tai_khoan`
--

LOCK TABLES `tai_khoan` WRITE;
/*!40000 ALTER TABLE `tai_khoan` DISABLE KEYS */;
INSERT INTO `tai_khoan` VALUES (1,'admin','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','admin','Chưa cập nhật'),(2,'nam','$2b$10$FCOi93iIugdvHiDlOAoOhesgUCM4oFdtnQ3yWhgGdy.XrodwM1dKa','admin','Lê Nhật Nam'),(3,'thieu','$2b$10$6D05U39GBpA4vNQ.1L6AA.vUdL27Y4otVTYQrpJTh8Yj//Q6YUFGG','chef','Trần Duy Thiệu'),(4,'minh','$2b$10$/Ugo9HOUwHSmt958TaStdONXGSx49b6ZvlmXqRb.DTQdKKrJ/3Sxi','cashier','Trần Lê Thảo Minh'),(6,'chigzhen','$2b$10$yZNJ2Shd11puBpmJDAMqMO/ZoGtnKkp3Ujcifzy39rSblkwVSJUPy','admin','Võ Thị Thu Trinh');
/*!40000 ALTER TABLE `tai_khoan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thong_tin_nha_hang`
--

DROP TABLE IF EXISTS `thong_tin_nha_hang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thong_tin_nha_hang` (
  `id` int NOT NULL DEFAULT '1',
  `ten_nha_hang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia_chi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `so_dien_thoai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thong_tin_nha_hang`
--

LOCK TABLES `thong_tin_nha_hang` WRITE;
/*!40000 ALTER TABLE `thong_tin_nha_hang` DISABLE KEYS */;
INSERT INTO `thong_tin_nha_hang` VALUES (1,'Nhà Hàng Hải Sản','Đà Nẵng','0123456789');
/*!40000 ALTER TABLE `thong_tin_nha_hang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thuc_don`
--

DROP TABLE IF EXISTS `thuc_don`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thuc_don` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_mon` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gia_tien` double NOT NULL,
  `loai_mon` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `anh_minh_hoa` text COLLATE utf8mb4_unicode_ci,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `con_hang` tinyint NOT NULL DEFAULT '1',
  `so_luong` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thuc_don`
--

LOCK TABLES `thuc_don` WRITE;
/*!40000 ALTER TABLE `thuc_don` DISABLE KEYS */;
INSERT INTO `thuc_don` VALUES (1,'Súp Hải Sản Tóc Tiên',120000,'Seafood','https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=60','Súp sệt nóng hổi với hải sản băm, nấm và tóc tiên thơm ngon bổ dưỡng.',1,99),(3,'Khoai Tây Chiên Phô Mai',30000,'dessert','https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60','Khoai tây cọng chiên giòn lắc bột phô mai mặn ngọt béo ngậy.',1,98),(7,'Lẩu Thái Hải Sản Đậm Đà (2-3 người)',250000,'hotpot','https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&auto=format&fit=crop&q=60','Lẩu thái chua cay với mực, tôm, cá viên, bò Mỹ cuộn nấm kim châm và rau củ.',1,99),(8,'Chè Thái Sầu Riêng Đặc Biệt',36000,'dessert','https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&auto=format&fit=crop&q=60','Chè thái nhiều thạch, trái cây tươi kèm múi sầu riêng tươi ngon béo ngậy.',1,100),(9,'Bánh Flan Cốt Dừa Béo Ngậy',20000,'dessert','https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=60','Bánh flan mềm mịn ăn kèm đá bào, cà phê đắng nhẹ và nước cốt dừa.',1,99),(10,'Cà Phê Sữa Đá Sài Gòn',25000,'drink','https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60','Cà phê pha phin truyền thống thơm nồng kết hợp sữa đặc và đá viên.',1,91),(11,'Trà Đào Cam Sả Giải Nhiệt',36000,'drink','https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60','Hương trà thơm thanh khiết kết hợp vị đào ngọt ngào, cam chua nhẹ và sả thơm mát.',1,95),(12,'Nước Ép Dưa Hấu Nguyên Chất',30000,'drink','/uploads/1784214524847-7900430.png','Dưa hấu chín mọng ép lấy nước ngọt thanh tự nhiên, mát rượi.',1,100),(20,'Tôm hùm Alaska (2kg)',3000000,'Seafood','/uploads/1784626253882-289970049.jpg','',1,100),(21,'Bào ngư (1kg)',2000000,'Seafood','/uploads/1784626400800-771136334.webp','',1,50),(22,'Cua hoàng đế hấp',3600000,'Seafood','/uploads/1784626947730-286438741.jpg','',1,30),(23,'Ghẹ hấp ( 1 kg )',500000,'Seafood','/uploads/1784627124257-531937148.jpg','',1,45),(24,'Hàu nướng',150000,'Grilled food','/uploads/1784627288359-327153632.jpg','',1,50),(25,'Vây Cá Mập ( 1 bát )',20000000,'Seafood','/uploads/1784627314740-472422557.webp','',1,20),(26,'Cá Chìa Vôi',450000,'Seafood','/uploads/1784627406095-299980988.webp','',1,35),(27,'Tôm càng xanh nướng bơ tỏi ( 1kg )',900000,'Grilled food','/uploads/1784627441416-522273551.jpg','',1,35),(28,'Lẩu hải sản cao cấp (có tôm, mực, cá, nghêu xịn)',600000,'hotpot','/uploads/1784627564617-662760899.jpg','',1,35),(29,'Tôm Tít Cà Mau ( 1kg)',600000,'Seafood','/uploads/1784627615197-476195441.jpg','',1,45),(30,'Mực Hấp',200000,'Seafood','/uploads/1784627701208-129179766.jpg','',1,50),(31,'Salad hải sản',250000,'dessert','/uploads/1784627808697-442239900.jpg','',1,49),(32,'Hào Nướng Phô Mai',150000,'Grilled food','/uploads/1784627913817-980956277.jpg','',1,50),(33,'Cá Đuối Nướng',180000,'Grilled food','/uploads/1784628008734-159265952.jpg','',1,50),(34,'Chateau Mouton Rothschild 1945',2600000000,'drink','/uploads/1784628033001-590600165.jpg','',1,1);
/*!40000 ALTER TABLE `thuc_don` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thuc_don_size`
--

DROP TABLE IF EXISTS `thuc_don_size`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thuc_don_size` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_mon_an` int NOT NULL,
  `ten_size` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gia_tien` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_mon_an` (`id_mon_an`),
  CONSTRAINT `thuc_don_size_ibfk_1` FOREIGN KEY (`id_mon_an`) REFERENCES `thuc_don` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thuc_don_size`
--

LOCK TABLES `thuc_don_size` WRITE;
/*!40000 ALTER TABLE `thuc_don_size` DISABLE KEYS */;
INSERT INTO `thuc_don_size` VALUES (3,10,'Size M',25000),(4,10,'Size L',35000);
/*!40000 ALTER TABLE `thuc_don_size` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-22 10:33:11
