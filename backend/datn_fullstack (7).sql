-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Máy chủ: localhost:3306
-- Thời gian đã tạo: Th10 22, 2025 lúc 10:14 AM
-- Phiên bản máy phục vụ: 8.0.30
-- Phiên bản PHP: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `datn_fullstack`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `address_book`
--

CREATE TABLE `address_book` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `recipient_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commune` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `address_book`
--

INSERT INTO `address_book` (`id`, `user_id`, `recipient_name`, `phone`, `city`, `district`, `commune`, `village`, `notes`, `created_at`, `updated_at`, `is_default`) VALUES
(2, 42, 'Tuấn Anh', '0395656428', '02', '024', '00946', 'ádass', 'ádasd', '2025-10-30 07:01:08', '2025-11-11 16:35:33', 0),
(3, 42, 'Phương Linh', '0395656428', '02', '027', '00772', 'ádádasd', 'ád', '2025-10-30 07:03:00', '2025-11-11 16:35:33', 0),
(4, 42, 'Phương Linh', '0395656428', '38', '406', '16447', 'Nhà số 9', 'â', '2025-10-30 19:38:19', '2025-11-11 16:35:33', 1),
(5, 34, 'Phương Linh 2', '0395656428', '02', '026', '00715', 'Nhà 2', 'Đối diện cây Mai', '2025-11-17 07:07:49', '2025-11-17 07:07:51', 1),
(6, 34, 'Tuan ANH', '0395656428', '01', '006', '00178', 'So 9', NULL, '2025-11-19 02:45:21', '2025-11-19 02:45:21', 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `attributes`
--

CREATE TABLE `attributes` (
  `id` int UNSIGNED NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `attributes`
--

INSERT INTO `attributes` (`id`, `type`, `value`, `created_at`, `updated_at`, `deleted_at`) VALUES
(30, 'Size', '36', '2025-10-28 09:49:43', '2025-10-28 09:49:43', NULL),
(31, 'Size', '37', '2025-10-28 09:49:50', '2025-10-28 09:49:50', NULL),
(32, 'Size', '38', '2025-10-28 09:49:58', '2025-10-28 09:49:58', NULL),
(33, 'Size', '39', '2025-10-28 09:50:05', '2025-10-28 09:50:05', NULL),
(34, 'Size', '40', '2025-10-28 09:50:10', '2025-10-28 09:50:10', NULL),
(35, 'Size', '41', '2025-10-28 09:50:15', '2025-10-28 09:50:15', NULL),
(36, 'Size', '42', '2025-10-28 09:50:27', '2025-10-28 09:50:27', NULL),
(37, 'Size', '43', '2025-10-28 09:50:32', '2025-10-28 09:50:32', NULL),
(38, 'Size', '44', '2025-10-28 09:50:37', '2025-10-28 09:50:37', NULL),
(39, 'Color', 'Đen', '2025-10-28 09:50:51', '2025-10-28 09:50:51', NULL),
(40, 'Color', 'Đỏ', '2025-10-28 09:51:00', '2025-10-28 09:51:00', NULL),
(41, 'Color', 'Trắng', '2025-10-28 09:51:09', '2025-10-28 09:51:09', NULL),
(42, 'Color', 'Hồng', '2025-10-28 10:07:33', '2025-10-28 10:07:33', NULL),
(43, 'Color', 'Trắng xanh', '2025-10-28 10:09:54', '2025-10-28 10:09:54', NULL),
(44, 'Color', 'Trắng', '2025-10-28 10:11:49', '2025-10-28 10:11:49', NULL),
(45, 'Color', 'Xanh đen', '2025-10-28 10:12:23', '2025-10-28 10:12:23', NULL),
(46, 'Color', 'Trắng đen', '2025-10-28 10:17:24', '2025-10-28 10:17:24', NULL),
(47, 'Size', '39', '2025-11-13 10:54:59', '2025-11-13 10:57:20', '2025-11-13 10:57:20'),
(48, 'Size', '39', '2025-11-13 10:57:11', '2025-11-13 10:57:17', '2025-11-13 10:57:17'),
(49, 'Color', 'Nâu', '2025-11-14 08:27:21', '2025-11-14 08:27:21', NULL),
(50, 'Color', 'Trắng nâu', '2025-11-14 08:27:52', '2025-11-14 08:27:52', NULL),
(51, 'Color', 'Trắng xám', '2025-11-14 08:28:30', '2025-11-14 08:28:30', NULL),
(52, 'Color', 'Xám', '2025-11-14 12:06:55', '2025-11-14 12:06:55', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `carts`
--

CREATE TABLE `carts` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `carts`
--

INSERT INTO `carts` (`id`, `user_id`, `updated_at`) VALUES
(1, 34, '2025-10-29 01:15:26'),
(2, 42, '2025-10-29 01:36:35');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `cart_items`
--

CREATE TABLE `cart_items` (
  `id` int UNSIGNED NOT NULL,
  `cart_id` int UNSIGNED NOT NULL,
  `variant_id` int UNSIGNED NOT NULL,
  `quantity` int UNSIGNED DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `cart_items`
--

INSERT INTO `cart_items` (`id`, `cart_id`, `variant_id`, `quantity`, `created_at`) VALUES
(59, 2, 116, 1, '2025-11-18 13:52:55'),
(60, 2, 114, 1, '2025-11-18 21:32:05'),
(64, 1, 117, 1, '2025-11-19 09:48:03'),
(66, 2, 138, 1, '2025-11-22 17:00:54');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `categories`
--

CREATE TABLE `categories` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `categories`
--

INSERT INTO `categories` (`id`, `name`, `image`, `created_at`, `updated_at`, `deleted_at`) VALUES
(36, 'Nike', 'storage/img/category/1761639350_69007bb66a5e6.png', '2025-10-21 06:19:26', '2025-10-28 08:15:50', NULL),
(37, 'Adidas', 'storage/img/category/1761027582_68f725fe40053.jpg', '2025-10-21 06:19:42', '2025-10-28 08:15:25', NULL),
(38, 'Puma', 'storage/img/category/1761027591_68f726074fd7a.png', '2025-10-21 06:19:51', '2025-10-21 06:19:51', NULL),
(39, 'Converse', 'storage/img/category/1761027606_68f726163f6b9.png', '2025-10-21 06:20:06', '2025-10-21 06:20:06', NULL),
(40, 'Vans', 'storage/img/category/1761027615_68f7261f122fe.png', '2025-10-21 06:20:15', '2025-10-21 06:20:15', NULL),
(41, 'Reebok', 'storage/img/category/1761027628_68f7262c4e44b.png', '2025-10-21 06:20:28', '2025-10-28 08:13:28', NULL),
(42, 'Mezzy', 'storage/img/category/1760983360_68f6794034c62.jpg', '2025-10-20 15:24:32', '2025-10-21 06:17:07', '2025-10-21 06:17:07'),
(43, 'Văn Đìnha', 'storage/img/category/1760982308_68f67524ab31a.jpg', '2025-10-20 17:45:08', '2025-10-21 06:17:05', '2025-10-21 06:17:05'),
(45, 'Adidas', 'storage/img/category/1761027582_68f725fe40053.jpg', '2025-10-21 06:19:42', '2025-10-28 08:13:37', '2025-10-28 08:13:37'),
(50, 'ádsa', NULL, '2025-10-28 08:18:12', '2025-10-28 08:18:17', '2025-10-28 08:18:17');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `coupons`
--

CREATE TABLE `coupons` (
  `id` int UNSIGNED NOT NULL,
  `code` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_type` enum('percent','fixed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_value` decimal(13,0) NOT NULL,
  `min_purchase` decimal(13,0) DEFAULT NULL,
  `max_discount` decimal(13,0) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `usage_limit` int UNSIGNED DEFAULT NULL,
  `used_count` int UNSIGNED NOT NULL DEFAULT '0',
  `limit_per_user` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `coupons`
--

INSERT INTO `coupons` (`id`, `code`, `discount_type`, `discount_value`, `min_purchase`, `max_discount`, `start_date`, `end_date`, `is_active`, `usage_limit`, `used_count`, `limit_per_user`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'I4NNA3VRM', 'percent', 20, 200000, 150000, '2025-11-01 04:00:00', '2025-11-02 04:00:00', 1, NULL, 0, 1, '2025-11-01 11:00:09', '2025-11-03 18:29:56', NULL),
(2, 'RMO0SCPIR', 'percent', 14, 200000, 20000, '2025-11-28 21:00:00', '2025-11-30 05:00:00', 1, 100, 31, 1, '2025-11-02 17:05:32', '2025-11-19 02:45:54', NULL),
(3, 'APPEOTV7O', 'percent', 50, 1400000, 900000, '2025-11-01 14:00:00', '2025-11-12 14:00:00', 1, 1, 0, 1, '2025-11-03 11:32:44', '2025-11-03 11:37:22', NULL),
(4, 'N9AOOG57O', 'percent', 20, 1000000, 200000, '2025-11-08 00:00:00', '2025-11-22 00:00:00', 1, 10, 0, 1, '2025-11-19 03:12:53', '2025-11-19 03:12:53', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `coupon_user_usages`
--

CREATE TABLE `coupon_user_usages` (
  `id` int UNSIGNED NOT NULL,
  `coupon_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `used_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint UNSIGNED NOT NULL,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint UNSIGNED NOT NULL,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint UNSIGNED NOT NULL,
  `reserved_at` int UNSIGNED DEFAULT NULL,
  `available_at` int UNSIGNED NOT NULL,
  `created_at` int UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `migrations`
--

CREATE TABLE `migrations` (
  `id` int UNSIGNED NOT NULL,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `orders`
--

CREATE TABLE `orders` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `sku` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coupon_id` int DEFAULT NULL,
  `coupon_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(13,2) DEFAULT '0.00',
  `discount_amount` decimal(13,2) DEFAULT '0.00',
  `final_amount` decimal(13,2) DEFAULT '0.00',
  `payment_status` enum('unpaid','paid','refunded','failed','refund_processing') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `payment_method` enum('cod','vnpay') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `sku`, `coupon_id`, `coupon_code`, `total_amount`, `discount_amount`, `final_amount`, `payment_status`, `payment_method`, `paid_at`, `note`, `created_at`, `updated_at`, `deleted_at`) VALUES
(153, 42, '4AF028EF6', 2, 'RMO0SCPIR', 6240000.00, 20000.00, 6220000.00, 'refunded', 'vnpay', '2025-11-18 17:35:24', 'mua tết', '2025-11-18 10:31:12', '2025-11-18 16:34:23', NULL),
(154, 42, '65683C75D', NULL, NULL, 520000.00, 0.00, 520000.00, 'unpaid', 'cod', NULL, NULL, '2025-11-18 12:24:08', '2025-11-18 12:24:08', NULL),
(155, 42, '84167B777', NULL, NULL, 520000.00, 0.00, 520000.00, 'paid', 'cod', NULL, NULL, '2025-11-18 14:35:02', '2025-11-18 17:22:50', NULL),
(156, 42, 'B24420F14', 2, 'RMO0SCPIR', 2200000.00, 20000.00, 2180000.00, 'refund_processing', 'vnpay', '2025-11-19 00:52:25', 'ádasd', '2025-11-18 17:52:04', '2025-11-18 17:53:06', NULL),
(157, 42, 'B2BC5270C', NULL, NULL, 520000.00, 0.00, 520000.00, 'paid', 'cod', NULL, NULL, '2025-11-18 17:54:04', '2025-11-18 17:55:12', NULL),
(158, 34, '0A271DEB6', 2, 'RMO0SCPIR', 520000.00, 20000.00, 500000.00, 'paid', 'vnpay', '2025-11-19 07:36:59', NULL, '2025-11-19 00:07:03', '2025-11-19 00:37:04', NULL),
(159, 34, '0B8CC6FDC', 2, 'RMO0SCPIR', 520000.00, 20000.00, 500000.00, 'paid', 'cod', NULL, NULL, '2025-11-19 00:13:00', '2025-11-19 00:13:50', NULL),
(160, 34, '11915EB18', 2, 'RMO0SCPIR', 550000.00, 20000.00, 530000.00, 'paid', 'cod', NULL, NULL, '2025-11-19 00:38:41', '2025-11-19 00:39:05', NULL),
(161, 34, '19D3E0C04', 2, 'RMO0SCPIR', 3600000.00, 20000.00, 3580000.00, 'unpaid', 'cod', NULL, NULL, '2025-11-19 01:13:55', '2025-11-19 01:13:55', NULL),
(162, 34, '2F621BDDA', 2, 'RMO0SCPIR', 680000.00, 20000.00, 660000.00, 'unpaid', 'vnpay', NULL, NULL, '2025-11-19 02:45:54', '2025-11-19 02:45:54', NULL),
(163, 34, '2FF1C22E7', NULL, NULL, 2690000.00, 0.00, 2690000.00, 'unpaid', 'cod', NULL, NULL, '2025-11-19 02:48:17', '2025-11-19 02:48:17', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_cancel_logs`
--

CREATE TABLE `order_cancel_logs` (
  `id` int UNSIGNED NOT NULL,
  `order_id` int UNSIGNED NOT NULL,
  `cancelled_by` enum('user','admin','system') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `order_cancel_logs`
--

INSERT INTO `order_cancel_logs` (`id`, `order_id`, `cancelled_by`, `reason`, `note`, `created_at`) VALUES
(11, 153, 'user', 'sdasaddsasdasdasad', 'Đơn hàng bị hủy bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-18 18:24:56'),
(12, 153, 'user', 'aggasgdasggsadgasgd', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-18 18:39:34'),
(13, 153, 'user', 'sdafdsaadssdasad', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-18 18:41:04'),
(14, 153, 'user', 'ádsasaddsasadsad', 'Đơn hàng bị hủy bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-18 18:41:41'),
(15, 153, 'user', 'fgfdfggfdfgdfg', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-18 19:12:22'),
(16, 153, 'user', 'dsfdfsdfsdfsd', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-18 22:26:36'),
(17, 155, 'user', 'ádasdsadasd', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-18 22:37:43'),
(18, 156, 'user', 'hết tiền', 'Đơn hàng bị hủy bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-19 00:53:06'),
(19, 157, 'user', 'tôi muốn hoàn hàng', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình Tuấn Anh', '2025-11-19 00:57:38'),
(20, 159, 'user', 'ádadasdasdas', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình', '2025-11-19 07:14:01'),
(21, 160, 'user', 'ádsdsad', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình', '2025-11-19 07:40:41'),
(22, 158, 'user', 'adasdasdasdasdasd', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình', '2025-11-19 07:58:56'),
(23, 163, 'user', 'sdfdsfs', 'Yêu cầu hoàn hàng bởi khách hàng: Văn Đình', '2025-11-19 10:02:03');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_items`
--

CREATE TABLE `order_items` (
  `id` int UNSIGNED NOT NULL,
  `order_id` int UNSIGNED NOT NULL,
  `product_id` int UNSIGNED NOT NULL,
  `variant_id` int UNSIGNED DEFAULT NULL,
  `product_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL,
  `price` decimal(13,2) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `variant_id`, `product_image`, `product_name`, `size`, `color`, `quantity`, `price`, `created_at`, `updated_at`) VALUES
(173, 153, 72, 114, 'storage/img/product/9ecbc68a-412d-4a69-9da4-f99e880e0097.jpg', 'Giày Trung', '36', 'Đen', 12, 520000.00, '2025-11-18 10:31:12', '2025-11-18 10:31:12'),
(174, 154, 72, 114, 'storage/img/product/9ecbc68a-412d-4a69-9da4-f99e880e0097.jpg', 'Giày Trung', '36', 'Đen', 1, 520000.00, '2025-11-18 12:24:08', '2025-11-18 12:24:08'),
(175, 155, 72, 115, 'storage/img/product/d225cda9-1c51-4e92-80e8-134925446253.jpg', 'Giày Trung', '37', 'Đen', 1, 520000.00, '2025-11-18 14:35:02', '2025-11-18 14:35:02'),
(176, 156, 71, 111, 'storage/img/product/b81be1d9-c61e-4869-9af1-dc3a318e39f6.jpg', 'Atiba', '36', 'Nâu', 4, 550000.00, '2025-11-18 17:52:04', '2025-11-18 17:52:04'),
(177, 157, 72, 115, 'storage/img/product/d225cda9-1c51-4e92-80e8-134925446253.jpg', 'Giày Trung', '37', 'Đen', 1, 520000.00, '2025-11-18 17:54:04', '2025-11-18 17:54:04'),
(178, 158, 72, 114, 'storage/img/product/9ecbc68a-412d-4a69-9da4-f99e880e0097.jpg', 'Giày Trung', '36', 'Đen', 1, 520000.00, '2025-11-19 00:07:03', '2025-11-19 00:07:03'),
(179, 159, 72, 114, 'storage/img/product/9ecbc68a-412d-4a69-9da4-f99e880e0097.jpg', 'Giày Trung', '36', 'Đen', 1, 520000.00, '2025-11-19 00:13:00', '2025-11-19 00:13:00'),
(180, 160, 71, 111, 'storage/img/product/b81be1d9-c61e-4869-9af1-dc3a318e39f6.jpg', 'Atiba', '36', 'Nâu', 1, 550000.00, '2025-11-19 00:38:41', '2025-11-19 00:38:41'),
(181, 161, 74, 125, 'storage/img/product/8b524c5b-6d9b-4d09-a187-c1609e0049f6.jpg', 'Jocdan Bản Mới', '36', 'Trắng xám', 1, 3600000.00, '2025-11-19 01:13:55', '2025-11-19 01:13:55'),
(182, 162, 70, 107, 'storage/img/product/2a5f18c7-a035-451a-baa9-c01d32c110e4.jpg', 'Giày 2025', '36', 'Đen', 1, 340000.00, '2025-11-19 02:45:54', '2025-11-19 02:45:54'),
(183, 162, 70, 108, 'storage/img/product/41b8d9e6-5024-4076-ad87-2fd95e13b12f.jpg', 'Giày 2025', '36', 'Trắng nâu', 1, 340000.00, '2025-11-19 02:45:54', '2025-11-19 02:45:54'),
(184, 163, 71, 112, 'storage/img/product/aa0065d7-ff40-4ef5-b435-0833699646e8.jpg', 'Atiba', '36', 'Đen', 1, 540000.00, '2025-11-19 02:48:17', '2025-11-19 02:48:17'),
(185, 163, 73, 121, 'storage/img/product/7622b2fe-1901-49b9-8864-4786dd0a6228.jpg', 'Nike Full Đủ Mẫu', '36', 'Trắng xám', 1, 2150000.00, '2025-11-19 02:48:17', '2025-11-19 02:48:17');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `id` int UNSIGNED NOT NULL,
  `order_id` int UNSIGNED NOT NULL,
  `payment_method` enum('cod','vnpay') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(13,2) NOT NULL,
  `status` enum('pending','success','failed','refunded','refund_processing') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `payment_transactions`
--

INSERT INTO `payment_transactions` (`id`, `order_id`, `payment_method`, `transaction_code`, `amount`, `status`, `paid_at`, `created_at`, `updated_at`) VALUES
(132, 153, 'vnpay', '15269034', 6220000.00, 'refunded', '2025-11-18 17:35:24', '2025-11-18 10:35:30', '2025-11-18 16:34:23'),
(133, 156, 'vnpay', '15269688', 2180000.00, 'success', '2025-11-19 00:52:25', '2025-11-18 17:52:30', '2025-11-18 17:52:30'),
(134, 158, 'vnpay', '15269831', 500000.00, 'success', '2025-11-19 07:36:59', '2025-11-19 00:37:04', '2025-11-19 00:37:04');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint UNSIGNED NOT NULL,
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(117, 'App\\Models\\User', 8, 'auth_token', '6e5767e5d289b4ba1df06bb41d6081aa8f070f60f98ddcbf2484edd30d922567', '[\"*\"]', NULL, NULL, '2025-10-08 03:26:09', '2025-10-08 03:26:09'),
(118, 'App\\Models\\User', 9, 'auth_token', '0d4292141029f4a6f27dc2f50bea13597b4c7aec58f80e2ddc145281e28bcf07', '[\"*\"]', NULL, NULL, '2025-10-08 03:29:22', '2025-10-08 03:29:22'),
(119, 'App\\Models\\User', 10, 'auth_token', '907fb48398840f759dee86e16c34da1e3d1b2db21be4af145f6ef1e74d82fd27', '[\"*\"]', NULL, NULL, '2025-10-08 09:16:29', '2025-10-08 09:16:29'),
(120, 'App\\Models\\User', 11, 'auth_token', '59cdfa02f6a34d62306dceef354c9128e8066cd49899d4211a87f501737a9ff1', '[\"*\"]', NULL, NULL, '2025-10-08 09:16:48', '2025-10-08 09:16:48'),
(121, 'App\\Models\\User', 12, 'auth_token', '025c7938e7738116202046083d8f9a67dae7d75ffdac69420bd5df4425b8a4ab', '[\"*\"]', NULL, NULL, '2025-10-08 09:21:14', '2025-10-08 09:21:14'),
(149, 'App\\Models\\User', 22, 'auth_token', 'a1d71bd2c84a37379cae9b2ced8a6ee724a00607b5f440be0c1fec983a871691', '[\"*\"]', '2025-10-13 11:52:33', NULL, '2025-10-13 11:26:54', '2025-10-13 11:52:33'),
(170, 'App\\Models\\User', 26, 'auth_token', 'fb9b08fd6a9bc4da1580cafff9957908dc5b8752a8d57af885b7554d5b1b78e8', '[\"*\"]', NULL, NULL, '2025-10-14 03:55:49', '2025-10-14 03:55:49'),
(171, 'App\\Models\\User', 3, 'auth_token', 'fcb0a9fd4e86f360fde48c6fdb846ae77396ba647972f7c1540f14505af02b74', '[\"*\"]', NULL, NULL, '2025-10-14 04:01:17', '2025-10-14 04:01:17'),
(173, 'App\\Models\\User', 27, 'auth_token', '7af72793334100707676133d776aebcf645d28f84142ffebfccd712d65d18233', '[\"*\"]', NULL, NULL, '2025-10-14 04:01:47', '2025-10-14 04:01:47'),
(175, 'App\\Models\\User', 28, 'auth_token', 'f3cf8960aacd9f2fc3a7b0b0e83cbdabdeb83a36edbbab3661d61f5602a07af9', '[\"*\"]', NULL, NULL, '2025-10-14 04:07:47', '2025-10-14 04:07:47'),
(177, 'App\\Models\\User', 29, 'auth_token', 'aa641162634d26104d146ad2ac681020bb089e038ddc9f0685d2db1c187a64ce', '[\"*\"]', NULL, NULL, '2025-10-14 04:08:46', '2025-10-14 04:08:46'),
(178, 'App\\Models\\User', 30, 'auth_token', '5b299ff4ac7eff043f64da6abaf0defcb3a58b4b60eeffcdbc50f21394cedaa3', '[\"*\"]', NULL, NULL, '2025-10-14 04:11:10', '2025-10-14 04:11:10'),
(179, 'App\\Models\\User', 31, 'auth_token', '4dcbf127af3cd87c802ca2cf3b6acfb707a207176e14846e5e360298066018ce', '[\"*\"]', NULL, NULL, '2025-10-14 04:36:40', '2025-10-14 04:36:40'),
(189, 'App\\Models\\User', 35, 'auth_token', '0bb7c6cd23280362bc5149a40ab071700fa31457810d76cc439cd75e0cf9dbd6', '[\"*\"]', NULL, NULL, '2025-10-14 22:55:03', '2025-10-14 22:55:03'),
(193, 'App\\Models\\User', 38, 'auth_token', 'd93dd47123ca9240ac55259beeef58c02edb312bc00a2eafaa85948cf96e932e', '[\"*\"]', NULL, NULL, '2025-10-14 23:11:17', '2025-10-14 23:11:17'),
(196, 'App\\Models\\User', 41, 'auth_token', '9aea3297aab1a6023bbaf6adcaa54c7fbabd73b3b8b4234ccc6415c3404f9b85', '[\"*\"]', NULL, NULL, '2025-10-14 23:38:18', '2025-10-14 23:38:18'),
(326, 'App\\Models\\User', 34, 'auth_token', 'df4f74c29927bd223010540eaaffa39eda50a41632d7ec3ee521278e6266f52f', '[\"*\"]', '2025-11-18 20:15:15', NULL, '2025-11-18 19:42:04', '2025-11-18 20:15:15'),
(327, 'App\\Models\\User', 42, 'auth_token', 'eb2064e4216dbd0788780364f3ac8c781bd9e85bb2c4eb63ad69c650a7f3ceb5', '[\"*\"]', '2025-11-22 03:05:08', NULL, '2025-11-21 09:20:53', '2025-11-22 03:05:08');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `products`
--

CREATE TABLE `products` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` int UNSIGNED DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `origin` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `images` json DEFAULT NULL,
  `variation_status` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `products`
--

INSERT INTO `products` (`id`, `name`, `sku`, `category_id`, `description`, `origin`, `brand`, `image`, `images`, `variation_status`, `created_at`, `updated_at`, `deleted_at`) VALUES
(43, 'Reebok', 'A2GNFRX3R', 37, 'Giày là một vật dụng đi vào bàn chân con người để bảo vệ và làm êm chân trong khi thực hiện các hoạt động khác nhau. Mặc dù bàn chân con người có thể thích nghi với nhiều loại địa hình và điều kiện khí hậu khác nhau, nhưng nó vẫn rất dễ bị tổn thương, và giày giúp bảo vệ bàn chân.', 'China', 'Nike 1', 'storage/img/product/1e538434-dfcf-45ab-b11a-ee41439e65e0.jpg', NULL, 1, '2025-11-11 16:50:42', '2025-11-19 00:36:33', NULL),
(44, 'Reebok', '5UWJ8SHJV', 37, 'Giày là một vật dụng đi vào bàn chân con người để bảo vệ và làm êm chân trong khi thực hiện các hoạt động khác nhau. Mặc dù bàn chân con người có thể thích nghi với nhiều loại địa hình và điều kiện khí hậu khác nhau, nhưng nó vẫn rất dễ bị tổn thương, và giày giúp bảo vệ bàn chân.', 'China', 'Nike 1', 'storage/img/product/2fd3f681-1b64-4e84-be5f-90eacdcbfef7.jpg', NULL, 1, '2025-11-11 16:52:59', '2025-11-11 16:53:33', NULL),
(45, 'Văn Đình', 'KS42VH0DF', 37, 'Giày là một vật dụng đi vào bàn chân con người để bảo vệ và làm êm chân trong khi thực hiện các hoạt động khác nhau. Mặc dù bàn chân con người có thể thích nghi với nhiều loại địa hình và điều kiện khí hậu khác nhau, nhưng nó vẫn rất dễ bị tổn thương, và giày giúp bảo vệ bàn chân.', 'China', 'Jordan 2', 'storage/img/product/b9ae066f-2525-4a61-ac84-0baa170b517b.jpg', NULL, 1, '2025-11-11 17:00:42', '2025-11-11 17:00:42', NULL),
(46, 'Văn Đình Tuấn Anh', 'VHN1AVWVF', 37, 'ádasd', 'China', 'Nike 1', 'storage/img/product/4e9db498-fffb-431d-bcac-e40a45036663.jpg', NULL, 1, '2025-11-11 17:23:50', '2025-11-11 17:23:50', NULL),
(47, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/0d4c29ea-290f-4b79-9eff-4b64c3fcda41.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:28:11', NULL),
(48, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/43821444-0e44-4d4c-8343-1a30b46be9f4.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:31:46', NULL),
(49, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/8f1f06a2-6b16-4e41-b840-53b2781f4196.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:27:17', NULL),
(50, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/fce58762-888c-433b-958c-7c8d3febd38d.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:29:02', NULL),
(51, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/ea50f283-63f1-4c48-85ae-1d8edae68ea6.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:28:19', NULL),
(53, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/d438253e-139e-4885-ad02-9e5b7a506cb3.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:29:03', NULL),
(54, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/0f1a0258-6bf9-4f67-ac76-29067df94612.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:28:16', NULL),
(55, 'Giày Adidas 2018', 'W2YJQ5U8H', 37, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Adidas', 'storage/img/product/980b6544-f85d-4d11-af4c-7c86a05cd2da.jpg', NULL, 0, '2025-11-12 09:58:45', '2025-11-19 01:28:24', NULL),
(69, 'Nike Hàng Hiệu', 'PX2B9TGAB', 36, 'Nếu bạn đang kinh doanh hoặc làm content marketing về giày dép thì hãy tham khảo những mẫu content hay về giày dép mà ABC Digi gợi ý dưới đây. Ý tưởng và các mẫu content có sẵn sẽ giúp content của bạn thu hút khán giả, từ đó gia tăng chuyển đổi cho doanh nghiệp.', 'Anh', 'Nike Amedica', 'storage/img/product/763d3342-a25c-4b51-a14e-16088e0d946f.jpg', NULL, 1, '2025-11-14 08:29:48', '2025-11-14 08:29:48', NULL),
(70, 'Giày 2025', '72392092P', 36, '. Nếu bạn đang kinh doanh hoặc làm content marketing về giày dép thì hãy tham khảo những mẫu content hay về giày dép mà ABC Digi gợi ý dưới đây. Ý tưởng và các mẫu content có sẵn sẽ giúp content của bạn thu hút khán giả, từ đó gia tăng chuyển đổi cho doanh nghiệp.', 'China', 'Hàng Nhập', 'storage/img/product/487a6389-b91f-4c36-b597-cb0a336f5ef4.jpg', '[\"storage/img/product/2421ae02-00e2-40c1-a9e9-f59322b9a137.jpg\", \"storage/img/product/4797d348-d8d4-453e-99df-35cf9fcf71d4.jpg\", \"storage/img/product/189a7e26-4db1-401f-b6e2-e9b20a47612b.jpg\"]', 1, '2025-11-14 11:21:20', '2025-11-14 11:41:35', NULL),
(71, 'Atiba', 'CUB197FEZ', 37, 'Nếu bạn đang kinh doanh hoặc làm content marketing', 'China', 'Nike 1', 'storage/img/product/3fdb0da0-2488-4514-8e46-a15265c9e6e2.jpg', '[\"storage/img/product/49bdf312-542d-4b03-bcfd-374d8f0609a9.jpg\", \"storage/img/product/2e680d82-6715-4b7d-b115-370bf8e3873d.jpg\", \"storage/img/product/4bf96403-d8ec-41d5-bc03-9efd59cda72b.jpg\", \"storage/img/product/cebf193e-9763-4817-87b0-4f67c2c0f18a.jpg\", \"storage/img/product/11d0b83f-b066-4c22-b3b7-a115895c8118.jpg\", \"storage/img/product/1c422d5f-ed27-4299-aae2-df0d9bb6ebad.jpg\"]', 1, '2025-11-14 12:07:49', '2025-11-14 12:44:12', NULL),
(72, 'Giày Trung', 'ZJQ0OEDPQ', 36, NULL, 'China', 'Jordan 2', 'storage/img/product/6acba4d8-87b8-4a13-8d34-fa41e005ddbc.jpg', '[\"storage/img/product/3a1119de-d254-4b2a-ae65-7b788e725a98.jpg\", \"storage/img/product/a86fc80e-20b2-47ca-947c-ad9d5cb03cf0.jpg\", \"storage/img/product/15d766af-21c1-4b61-817a-d08da2170031.jpg\", \"storage/img/product/e9808275-de1e-4584-b931-92888d2fdfd1.jpg\", \"storage/img/product/e90f16bd-f838-42a3-8946-7170bde67578.jpg\"]', 1, '2025-11-18 06:32:46', '2025-11-18 06:33:02', NULL),
(73, 'Nike Full Đủ Mẫu', 'J6OMW0H8P', 36, 'Một trong những sản phẩm làm nên thương hiệu của Giày Mansa chính là mẫu giày nam công sở vân cá chép. Mẫu giày này chinh phục ngay cả những cả những khách hàng khó tính ngay từ cái nhìn đầu tiên từ trong thiết kế, form dáng đến chất liệu. Ngay khi mang đôi giày lên chân bạn sẽ cảm thấy sự êm ái, ôm chân, toát lên vẻ thanh lịch, sang trọng đẳng cấp như một quý ông thành đạt.', 'China', 'Anh', 'storage/img/product/79ea3c59-2b44-4a91-8712-202218b1de0f.jpg', '[\"storage/img/product/73d8a237-adc2-4725-8c1d-59d439d6b773.jpg\", \"storage/img/product/943775e4-2774-4acb-aaf2-4ab1199019ae.jpg\", \"storage/img/product/7858ed9f-7c70-4e44-847a-e8cf3a00a9c3.jpg\", \"storage/img/product/6a7cbb5a-3c67-4065-bcb8-a8d89afc667d.jpg\"]', 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(74, 'Jocdan Bản Mới', '6FQEZKSVX', 36, 'Một trong những sản phẩm làm nên thương hiệu của Giày Mansa chính là mẫu giày nam công sở vân cá chép. Mẫu giày này chinh phục ngay cả những cả những khách hàng khó tính ngay từ cái nhìn đầu tiên từ trong thiết kế, form dáng đến chất liệu. Ngay khi mang đôi giày lên chân bạn sẽ cảm thấy sự êm ái, ôm chân, toát lên vẻ thanh lịch, sang trọng đẳng cấp như một quý ông thành đạt.', 'Mỹ', 'Nga', 'storage/img/product/56c49822-5363-4ee0-ac8f-145f6045af70.jpg', '[\"storage/img/product/3b13fe7b-367c-4b9a-9d53-c975f91cb681.jpg\", \"storage/img/product/aa2c5806-71c0-432a-89e1-70fcc0b468d5.jpg\", \"storage/img/product/73f75e1a-13ed-4c3b-99ca-4075d5fd5511.jpg\"]', 1, '2025-11-19 00:30:30', '2025-11-19 00:30:30', NULL),
(75, 'PickBolll New 2025', 'YX5QROQID', 41, 'Giày dép luôn là món phụ kiện quan trọng không thể thiếu trong cuộc sống. Để giúp bạn thu hút khách hàng và tăng tỷ lệ chốt đơn, mình đã tổng hợp 25+ mẫu content hay về giày dép. Hãy cùng mình khám phá và áp dụng những ý tưởng này nhé!', 'China', 'Hàng Nhập', 'storage/img/product/066c4e92-219b-47b4-a625-1bd04ed08238.jpg', '[\"storage/img/product/e3376f8e-8913-4fa3-bfe4-84ae9b4ad271.jpg\", \"storage/img/product/3c61f658-d08a-400e-bcfc-66dc6f7be4dc.jpg\", \"storage/img/product/30f0d731-f488-4296-9558-ecc1915689cb.jpg\"]', 1, '2025-11-19 01:36:59', '2025-11-19 01:36:59', NULL),
(76, 'Thương Hiệu Nga', '06C38FU0V', 38, 'Một trong những sản phẩm làm nên thương hiệu của Giày Mansa chính là mẫu giày nam công sở vân cá chép. Mẫu giày này chinh phục ngay cả những cả những khách hàng khó tính ngay từ cái nhìn đầu tiên từ trong thiết kế, form dáng đến chất liệu. Ngay khi mang đôi giày lên chân bạn sẽ cảm thấy sự êm ái, ôm chân, toát lên vẻ thanh lịch, sang trọng đẳng cấp như một quý ông thành đạt.', 'Anh', 'Nike 1', 'storage/img/product/880cbf0e-49b1-4237-9429-dafb00bf35b0.jpg', '[\"storage/img/product/a401e0c3-e665-4faa-90b7-70eab1f06729.jpg\", \"storage/img/product/879dcb32-76a0-4639-80df-0c5711d78040.jpg\", \"storage/img/product/a6aa0570-4bae-4668-bb0b-ffd5090afe0f.jpg\", \"storage/img/product/ec96e43a-fe70-41cc-8242-b70a564d4ca9.jpg\", \"storage/img/product/6f2cdbdc-eaef-4b0c-a1a8-4e414962fde6.jpg\", \"storage/img/product/9a7a0820-511c-4b76-8f55-6ff416edceca.jpg\", \"storage/img/product/355a78d8-aa21-4608-808c-9bdb28784ec3.jpg\", \"storage/img/product/23147160-6ede-486c-bd29-495c2a5eadc7.jpg\"]', 1, '2025-11-19 01:39:01', '2025-11-19 01:41:19', NULL),
(77, 'Thể Thao Bản Mới 2025', 'BSC102RL3', 40, 'Một trong những sản phẩm làm nên thương hiệu của Giày Mansa chính là mẫu giày nam công sở vân cá chép. Mẫu giày này chinh phục ngay cả những cả những khách hàng khó tính ngay từ cái nhìn đầu tiên từ trong thiết kế, form dáng đến chất liệu. Ngay khi mang đôi giày lên chân bạn sẽ cảm thấy sự êm ái, ôm chân, toát lên vẻ thanh lịch, sang trọng đẳng cấp như một quý ông thành đạt.', 'China', 'Jordan 2', 'storage/img/product/b3249bbe-26cb-41d8-b57e-dac185c16d9f.jpg', '[\"storage/img/product/bf9a5e49-5901-432c-9687-2a797db5df4a.jpg\", \"storage/img/product/16b7a80d-970a-479d-ae54-e848b2dc9d8d.jpg\", \"storage/img/product/166a1020-7ffe-48b2-94d5-909678c0eced.jpg\", \"storage/img/product/7c5d3da3-d251-4317-883e-4511287ccf8e.jpg\", \"storage/img/product/32d31b83-5fce-41c3-a5ff-c5f3201a42c5.jpg\", \"storage/img/product/d3e82689-64d8-4952-8fc0-2cf28b62dc5b.jpg\"]', 1, '2025-11-19 01:39:03', '2025-11-19 01:41:18', NULL),
(78, 'NewBe sneaker', '3NMIGJUPA', 41, 'Một trong những sản phẩm làm nên thương hiệu của Giày Mansa chính là mẫu giày nam công sở vân cá chép. Mẫu giày này chinh phục ngay cả những cả những khách hàng khó tính ngay từ cái nhìn đầu tiên từ trong thiết kế, form dáng đến chất liệu. Ngay khi mang đôi giày lên chân bạn sẽ cảm thấy sự êm ái, ôm chân, toát lên vẻ thanh lịch, sang trọng đẳng cấp như một quý ông thành đạt.', 'Mỹ', 'Nike 1', 'storage/img/product/4bf18d2e-f099-462c-9746-6c23e896b06a.jpg', '[\"storage/img/product/5a966bda-56e8-4807-8031-5e0ff149c688.jpg\", \"storage/img/product/5652405b-5178-488f-bd9f-05c10831c546.jpg\", \"storage/img/product/09274ff2-3dff-485b-bacf-7275fb7f11eb.jpg\"]', 1, '2025-11-19 01:41:09', '2025-11-19 01:41:09', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_reviews`
--

CREATE TABLE `product_reviews` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `product_id` int UNSIGNED NOT NULL,
  `order_id` int UNSIGNED DEFAULT NULL,
  `rating` int NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int UNSIGNED DEFAULT NULL,
  `comment_time` datetime NOT NULL
) ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_variants`
--

CREATE TABLE `product_variants` (
  `id` int UNSIGNED NOT NULL,
  `product_id` int UNSIGNED NOT NULL,
  `size_id` int UNSIGNED DEFAULT NULL,
  `color_id` int UNSIGNED DEFAULT NULL,
  `sku` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(13,2) DEFAULT NULL,
  `discount_price` decimal(13,2) DEFAULT NULL,
  `quantity_sold` int DEFAULT '0',
  `stock_quantity` int DEFAULT '0',
  `is_available` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `product_variants`
--

INSERT INTO `product_variants` (`id`, `product_id`, `size_id`, `color_id`, `sku`, `image`, `price`, `discount_price`, `quantity_sold`, `stock_quantity`, `is_available`, `created_at`, `updated_at`, `deleted_at`) VALUES
(91, 43, 30, 42, 'BHNABE181', 'storage/img/product/6178404c-00b1-40c0-aa4c-a87e2eab800c.jpg', 400000.00, 240000.00, NULL, 200, 1, '2025-11-11 16:50:42', '2025-11-11 16:50:42', NULL),
(92, 44, 33, 40, 'A4JK10EJ1', 'storage/img/product/87429449-5a22-4f16-a64c-ad04be71ea81.jpg', 400000.00, 350000.00, NULL, 120, 1, '2025-11-11 16:52:59', '2025-11-11 16:52:59', NULL),
(93, 44, 33, 43, 'O2KH2L7LK', 'storage/img/product/ba7949cb-1644-42ef-99f3-120b459684d0.jpg', 400000.00, 350000.00, NULL, 120, 1, '2025-11-11 16:52:59', '2025-11-11 16:52:59', NULL),
(94, 44, 33, 46, 'ZQY725M0T', 'storage/img/product/30e9333a-a997-421b-8ae8-c0c74dde1ae2.jpg', 400000.00, 310000.00, NULL, 118, 1, '2025-11-11 16:52:59', '2025-11-17 08:49:20', NULL),
(95, 44, 33, 39, 'OL22T1E40', 'storage/img/product/d9aaa707-1aaf-4706-83f1-712b87fcd82b.jpg', 400000.00, 310000.00, NULL, 120, 1, '2025-11-11 16:52:59', '2025-11-11 16:52:59', NULL),
(96, 44, 33, 42, 'GB7QTPJVQ', NULL, 400000.00, 310000.00, NULL, 120, 1, '2025-11-11 16:52:59', '2025-11-11 16:52:59', NULL),
(97, 45, 30, 46, 'S4E7N56QC', 'storage/img/product/f0d027f6-ec5e-44e8-b880-3f9de3a7f6cc.jpg', 320000.00, 300000.00, NULL, 230, 1, '2025-11-11 17:00:42', '2025-11-11 17:00:42', NULL),
(98, 46, 30, 43, 'TBQFTBMS1', 'storage/img/product/378cbae3-fa4c-4dba-8d70-3b88cfd5229e.jpg', 500000.00, 430000.00, NULL, 0, 0, '2025-11-11 17:23:50', '2025-11-12 00:42:54', NULL),
(99, 46, 31, 40, 'EWO7OWJVP', 'storage/img/product/378cbae3-fa4c-4dba-8d70-3b88cfd5229e.jpg', 500000.00, 430000.00, NULL, 100, 1, '2025-11-11 17:37:02', '2025-11-11 17:40:51', NULL),
(100, 69, 30, 50, 'L2HEPEKRH', 'storage/img/product/ffd785d4-b8ca-45fe-9f99-da3f5280174f.jpg', 600000.00, NULL, NULL, 240, 1, '2025-11-14 08:29:48', '2025-11-14 08:29:48', NULL),
(101, 69, 31, 50, 'DWG2P8RWW', 'storage/img/product/e80179e9-f813-4765-bdf3-92acb58bba20.jpg', 600000.00, NULL, NULL, 240, 1, '2025-11-14 08:29:48', '2025-11-14 08:29:48', NULL),
(102, 69, 32, 50, 'JIMRFNBUC', 'storage/img/product/16802570-0304-4abb-b429-a8cf266f5ff4.jpg', 600000.00, NULL, NULL, 240, 1, '2025-11-14 08:29:48', '2025-11-14 08:29:48', NULL),
(103, 69, 33, 50, '60JWL872K', 'storage/img/product/658e6072-6203-4f85-a5cb-c2e48328dde8.jpg', 600000.00, NULL, NULL, 240, 1, '2025-11-14 08:29:48', '2025-11-14 08:29:48', NULL),
(104, 69, 34, 50, 'QEPD5081V', 'storage/img/product/55bb1ecc-cf66-4483-bcaa-42292026f480.jpg', 600000.00, NULL, NULL, 240, 1, '2025-11-14 08:29:48', '2025-11-14 08:29:48', NULL),
(105, 69, 30, 43, 'QXOYUS8DR', 'storage/img/product/a3148a14-32f9-46c0-b6e1-bdac0ea6361f.jpg', 600000.00, 560000.00, NULL, 131, 1, '2025-11-14 08:29:48', '2025-11-17 08:49:20', NULL),
(106, 69, 30, 43, 'G1RN1MZJW', 'storage/img/product/e16eb629-6223-4742-b734-75bf9aa84cb4.jpg', 600000.00, 560000.00, NULL, 140, 1, '2025-11-14 08:29:48', '2025-11-14 08:29:48', NULL),
(107, 70, 30, 39, 'IH7QXGWV9', 'storage/img/product/2a5f18c7-a035-451a-baa9-c01d32c110e4.jpg', 500000.00, 340000.00, NULL, 192, 1, '2025-11-14 11:21:20', '2025-11-19 02:45:54', NULL),
(108, 70, 30, 50, 'D552S24EI', 'storage/img/product/41b8d9e6-5024-4076-ad87-2fd95e13b12f.jpg', 500000.00, 340000.00, NULL, 195, 1, '2025-11-14 11:21:20', '2025-11-19 02:45:54', NULL),
(109, 70, 30, 43, 'EIMP39MJ6', 'storage/img/product/292068d3-c8a4-4800-b9a2-fb53569fda74.jpg', 500000.00, 330000.00, NULL, 180, 1, '2025-11-14 11:21:20', '2025-11-17 10:59:12', NULL),
(110, 70, 31, 50, 'XMNUSWC5X', 'storage/img/product/c4ce1890-466f-4d22-a824-76dba245e555.jpg', 500000.00, 340000.00, NULL, 196, 1, '2025-11-14 11:41:35', '2025-11-17 08:49:20', NULL),
(111, 71, 30, 49, 'B497ZZC5Z', 'storage/img/product/b81be1d9-c61e-4869-9af1-dc3a318e39f6.jpg', 700000.00, 550000.00, 24, 164, 1, '2025-11-14 12:07:49', '2025-11-19 00:40:41', NULL),
(112, 71, 30, 39, 'IUJ9C3J7V', 'storage/img/product/aa0065d7-ff40-4ef5-b435-0833699646e8.jpg', 700000.00, 540000.00, 22, 127, 1, '2025-11-14 12:07:49', '2025-11-19 03:02:02', NULL),
(113, 71, 31, 39, 'IUR623AVD', 'storage/img/product/eaab6565-69f6-435d-b8e1-8563eb69c0ee.jpg', 2000000.00, 1600000.00, NULL, 165, 1, '2025-11-14 12:07:49', '2025-11-15 12:43:45', NULL),
(114, 72, 30, 39, 'S6T3LCROW', 'storage/img/product/9ecbc68a-412d-4a69-9da4-f99e880e0097.jpg', 600000.00, 520000.00, -83, 370, 1, '2025-11-18 06:32:46', '2025-11-19 00:58:56', NULL),
(115, 72, 31, 39, 'Z7EWYJ710', 'storage/img/product/d225cda9-1c51-4e92-80e8-134925446253.jpg', 600000.00, 520000.00, 0, 300, 1, '2025-11-18 06:32:46', '2025-11-18 17:57:38', NULL),
(116, 72, 30, 49, 'LM0J9JEA1', 'storage/img/product/98389600-5201-4375-b912-563c17618e86.jpg', 600000.00, 510000.00, 0, 240, 1, '2025-11-18 06:32:46', '2025-11-18 06:32:46', NULL),
(117, 73, 30, 40, 'BQSY3NNVE', 'storage/img/product/3837d782-ed48-4113-832e-2a584446a979.jpg', 2500000.00, 2100000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(118, 73, 31, 40, 'HJQ9THC50', 'storage/img/product/9a1de312-1d11-4e95-97e1-aeba7c583736.jpg', 2500000.00, 2100000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(119, 73, 32, 40, 'JCDPDQ395', 'storage/img/product/4f12b58d-db9f-4fd4-adb0-5b67379775e3.jpg', 2500000.00, 2100000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(120, 73, 33, 40, 'G1LXKLEP1', 'storage/img/product/1edc4f8e-6d0f-42b0-a256-197a71f492f8.jpg', 2500000.00, 2100000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(121, 73, 30, 51, 'NCCGGMKZV', 'storage/img/product/7622b2fe-1901-49b9-8864-4786dd0a6228.jpg', 2500000.00, 2150000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 03:02:03', NULL),
(122, 73, 31, 51, 'N1VA9HXI3', 'storage/img/product/9ff4f114-f801-4dd4-92bb-92886c07f2cc.jpg', 2500000.00, 2150000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(123, 73, 32, 51, '7N46QUCFS', 'storage/img/product/86cb3ea3-6650-4a5e-bbeb-6b926e2ecd6d.jpg', 2500000.00, 2150000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(124, 73, 30, 52, 'VBZ4D8ZN9', 'storage/img/product/91d47163-f443-4f80-b498-4aa1e03121a9.jpg', 2500000.00, 2150000.00, 0, 400, 1, '2025-11-19 00:28:36', '2025-11-19 00:28:36', NULL),
(125, 74, 30, 51, 'WWZDQXEH6', 'storage/img/product/8b524c5b-6d9b-4d09-a187-c1609e0049f6.jpg', 4000000.00, 3600000.00, 1, 199, 1, '2025-11-19 00:30:30', '2025-11-19 01:13:55', NULL),
(126, 74, 31, 51, 'B8L6GJGXF', 'storage/img/product/66b0bb3e-c3ab-4d30-9d25-1ddc701879ee.jpg', 4000000.00, 3600000.00, 0, 200, 1, '2025-11-19 00:30:30', '2025-11-19 00:30:30', NULL),
(127, 74, 31, 40, 'DDIV7XOVH', 'storage/img/product/74c479bf-2672-49ea-992c-c45084669a7f.jpg', 4000000.00, 3600000.00, 0, 200, 1, '2025-11-19 00:30:30', '2025-11-19 00:30:30', NULL),
(128, 74, 30, 40, 'FTENLIQF7', 'storage/img/product/52313026-5dfc-4a99-94ef-6a2bb355fdd8.jpg', 4000000.00, 3600000.00, 0, 200, 1, '2025-11-19 00:30:30', '2025-11-19 00:30:30', NULL),
(129, 74, 30, 52, 'X0UIZOR80', 'storage/img/product/93cabcd8-a0fd-4a9f-a43f-9ef57d380519.jpg', 4000000.00, 3600000.00, 0, 200, 1, '2025-11-19 00:30:30', '2025-11-19 00:30:30', NULL),
(130, 74, 31, 52, 'HQ3AXVJAI', 'storage/img/product/c8be4d56-71b2-4530-a07a-8ba2a8487a43.jpg', 4000000.00, 3600000.00, 0, 200, 1, '2025-11-19 00:30:30', '2025-11-19 00:30:30', NULL),
(131, 75, 30, 39, '7FK2HBT2D', 'storage/img/product/9e8307c0-e3cb-48b3-867a-0e686c9e7f94.jpg', 1600000.00, 1300000.00, 0, 400, 1, '2025-11-19 01:36:59', '2025-11-19 01:36:59', NULL),
(132, 75, 30, 52, 'JH6ZEUO0L', 'storage/img/product/a8708d97-7806-4ecb-9c84-cf181145558a.jpg', 1600000.00, 1300000.00, 0, 400, 1, '2025-11-19 01:36:59', '2025-11-19 01:36:59', NULL),
(133, 75, 30, 49, 'KTVTD4AY7', 'storage/img/product/bc862435-f734-4ece-9b99-18417db86dee.jpg', 1600000.00, 1300000.00, 0, 400, 1, '2025-11-19 01:36:59', '2025-11-19 01:36:59', NULL),
(134, 75, 31, 49, 'I8FO7E0TQ', 'storage/img/product/1293018a-eb4a-4d70-9098-ec0a0e74f056.jpg', 1600000.00, 1300000.00, 0, 400, 1, '2025-11-19 01:36:59', '2025-11-19 01:36:59', NULL),
(135, 77, 30, 43, 'ZJJ832D4Y', 'storage/img/product/0995b271-4592-479a-9c89-89e212a0ad93.jpg', 1900000.00, 1500000.00, 0, 600, 1, '2025-11-19 01:41:08', '2025-11-19 01:41:18', '2025-11-19 01:41:18'),
(136, 77, 30, 50, 'G3IDSGYWC', 'storage/img/product/72075c08-297f-408f-bebf-9268ef52e749.jpg', 1900000.00, 1700000.00, 0, 600, 1, '2025-11-19 01:41:08', '2025-11-19 01:41:18', '2025-11-19 01:41:18'),
(137, 77, 30, 51, 'FAR2X3TIJ', 'storage/img/product/689ba1c8-72d9-40ff-bfbe-819da1cd03e5.jpg', 1900000.00, 1700000.00, 0, 600, 1, '2025-11-19 01:41:08', '2025-11-19 01:41:18', '2025-11-19 01:41:18'),
(138, 78, 30, 39, '4TF0M2RPN', 'storage/img/product/95ec6fb6-3fc4-4892-a437-e619b044c033.jpg', 5000000.00, 4700000.00, 0, 100, 1, '2025-11-19 01:41:09', '2025-11-19 01:41:09', NULL),
(139, 76, 30, 49, 'RLNS6JFJE', 'storage/img/product/b6495afd-1a5e-44a8-a141-0b998fd3e8b1.jpg', 6000000.00, 5700000.00, 0, 30, 1, '2025-11-19 01:41:12', '2025-11-19 01:41:19', '2025-11-19 01:41:19'),
(140, 77, 30, 43, 'ZJJ832D4Y', 'storage/img/product/3804ef4c-5dea-4980-bcc6-9f3bed9d9ba9.jpg', 1900000.00, 1500000.00, 0, 600, 1, '2025-11-19 01:41:18', '2025-11-19 01:41:18', NULL),
(141, 77, 30, 50, 'G3IDSGYWC', 'storage/img/product/6ca2ccee-4145-42aa-aab5-a86ef0b48df9.jpg', 1900000.00, 1700000.00, 0, 600, 1, '2025-11-19 01:41:18', '2025-11-19 01:41:18', NULL),
(142, 77, 30, 51, 'FAR2X3TIJ', 'storage/img/product/3c402667-3f9a-4f02-b109-95d781c1d850.jpg', 1900000.00, 1700000.00, 0, 600, 1, '2025-11-19 01:41:18', '2025-11-19 01:41:18', NULL),
(143, 76, 30, 49, 'RLNS6JFJE', 'storage/img/product/b9cd5d42-0337-4207-8678-b535a30f8313.jpg', 6000000.00, 5700000.00, 0, 30, 1, '2025-11-19 01:41:19', '2025-11-19 01:41:19', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `return_requests`
--

CREATE TABLE `return_requests` (
  `id` int UNSIGNED NOT NULL,
  `order_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `refund_amount` decimal(13,2) DEFAULT '0.00',
  `requested_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('11497DKQXaNiSSNezzosBJXCXh0ijn96ZVI2R8Ha', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiN2cydHc4eTNyN2JwUzVoTTFVM0hHQmRrc2FKZnR4ZGRLZk0zZ2xWeiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6MjE6Imh0dHA6Ly8xMjcuMC4wLjE6ODAwMSI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1760001062),
('p3zBCCwXmbp18hTKLAtbfdnvpKWIRSeSvfCu0NMV', 3, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'YTo1OntzOjY6Il90b2tlbiI7czo0MDoiZnJkOWdSSzJ3djcxSTJ0ZU9rT0FkRlczNDFiSHRrU2xBc2ltMjVSayI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDU6Imh0dHA6Ly8xMjcuMC4wLjE6ODAwMC9hZG1pbi9hdHRyaWJ1dGVzL2NyZWF0ZSI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjM7czo0OiJhdXRoIjthOjE6e3M6MjE6InBhc3N3b3JkX2NvbmZpcm1lZF9hdCI7aToxNzU4NTEzODMyO319', 1758538055),
('pUMRGPU3s4IVw71XAysLpJIm9qqBCvhOjKwmi5nK', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoia3FaWVV4OEtXajV0UGZsQU5CRTNCTFVFMkVuQTBnUFNwQ3hHYUNOcCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6MjE6Imh0dHA6Ly8xMjcuMC4wLjE6ODAwMCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1759999368),
('Wtnu8Sdpc3c9tCFkSP52OHes14w80y7zDTQzkkqY', 3, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'YTo2OntzOjY6Il90b2tlbiI7czo0MDoiUFhxSGdMaTY5OU1OMVowQmFwaTUzb091d0t0OGhWQ3NFak9hU2RaNCI7czozOiJ1cmwiO2E6MDp7fXM6OToiX3ByZXZpb3VzIjthOjE6e3M6MzoidXJsIjtzOjM4OiJodHRwOi8vMTI3LjAuMC4xOjgwMDAvYWRtaW4vYXR0cmlidXRlcyI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjM7czo0OiJhdXRoIjthOjE6e3M6MjE6InBhc3N3b3JkX2NvbmZpcm1lZF9hdCI7aToxNzU4NTQ4MzMxO319', 1758548336);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `shipping`
--

CREATE TABLE `shipping` (
  `id` int UNSIGNED NOT NULL,
  `order_id` int UNSIGNED NOT NULL,
  `sku` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `shipping_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `shipping_status` enum('pending','in_transit','delivered','failed','returned','none','nodone','evaluated','return_processing','return_fail') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reason_admin` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commune` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `shipping`
--

INSERT INTO `shipping` (`id`, `order_id`, `sku`, `shipping_name`, `shipping_phone`, `shipping_status`, `transfer_image`, `reason`, `reason_admin`, `city`, `district`, `commune`, `village`, `notes`) VALUES
(88, 153, '8Q9DH3GOY', 'Phương Linh', '0395656428', 'returned', 'storage/img/transfers/1763486513_691cab31a7dda.jpg', 'dsfdfsdfsdfsd', 'ádasdádasdas', '38', '406', '16447', 'Nhà số 9', 'â'),
(89, 154, 'LFVRPLZXK', 'Phương Linh', '0395656428', 'pending', NULL, 'ádasdsa', NULL, '38', '406', '16447', 'Nhà số 9', 'â'),
(90, 155, 'FMOZGTW2D', 'Phương Linh', '0395656428', 'delivered', 'storage/img/transfers/1763486560_691cab600648d.jpg', 'ádasdsadasd', 'ok chuyên khoan', '38', '406', '16447', 'Nhà số 9', 'â'),
(91, 156, 'WH04GOTXP', 'Phương Linh', '0395656428', 'none', NULL, 'hết tiền', NULL, '38', '406', '16447', 'Nhà số 9', 'â'),
(92, 157, 'K8KTAIKX5', 'Phương Linh', '0395656428', 'return_processing', NULL, 'tôi muốn hoàn hàng', NULL, '38', '406', '16447', 'Nhà số 9', 'â'),
(93, 158, '3WGLBZ6IH', 'Phương Linh 2', '0395656428', 'pending', NULL, 'adasdasdasdasdasd', NULL, '02', '026', '00715', 'Nhà 2', 'Đối diện cây Mai'),
(94, 159, 'M0UYAPVZ7', 'Phương Linh 2', '0395656428', 'return_processing', NULL, 'ádadasdasdas', NULL, '02', '026', '00715', 'Nhà 2', 'Đối diện cây Mai'),
(95, 160, 'HHDXW339N', 'Phương Linh 2', '0395656428', 'return_processing', NULL, 'ádsdsad', NULL, '02', '026', '00715', 'Nhà 2', 'Đối diện cây Mai'),
(96, 161, '6JJL3YJIB', 'Phương Linh 2', '0395656428', 'pending', NULL, NULL, NULL, '02', '026', '00715', 'Nhà 2', 'Đối diện cây Mai'),
(97, 162, 'PXKROFGYB', 'Tuan ANH', '0395656428', 'pending', NULL, NULL, NULL, '01', '006', '00178', 'So 9', NULL),
(98, 163, 'GTQLRZKRU', 'Phương Linh 2', '0395656428', 'return_fail', 'storage/img/transfers/1763757252_6920ccc4c66a1.jpg', 'sdfdsfs', 'ádasd', '02', '026', '00715', 'Nhà 2', 'Đối diện cây Mai');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED DEFAULT NULL,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('open','in_progress','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('user','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `email_verified_at` datetime DEFAULT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bank_account_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `name`, `password`, `role`, `email`, `image`, `phone`, `google_id`, `status`, `email_verified_at`, `remember_token`, `created_at`, `updated_at`, `bank_account_number`, `bank_name`, `bank_account_name`) VALUES
(34, 'Văn Đình', '$2y$12$SFSJHn1V8OBJ1gXa4JRvSejRt2O5S2WiE8a5Mdmyw74GD5n37Bb7a', 'user', 'tuananhdubai429@gmail.com', NULL, '0395656428', NULL, 'active', NULL, NULL, '2025-10-14 14:25:14', '2025-11-19 10:14:17', '', '', ''),
(42, 'Văn Đình Tuấn Anh', '$2y$12$dVK4SigKHeRtKMGtpUlPyeFSoTka6iY/Wg41u7K1E89LpR9laPnOG', 'admin', 'tuananhdubai428@gmail.com', 'storage/img/avatar/1762879010_691366227afb5.jpeg', '0395656420', '103143503571716861796', 'inactive', NULL, NULL, '2025-10-15 07:17:30', '2025-11-21 20:16:09', '0395656428', 'MbBank', 'Văn Đình Tuấn Anh'),
(48, 'Phương Chi', '$2y$12$Sccm9x4P71cnNw/Wdc3ileBXZhPqUdA.FWbGG1TH7Nf49B/otn.5C', 'user', 'tuananhdubai410@gmail.com', NULL, '0395656410', NULL, 'active', NULL, NULL, '2025-11-21 20:17:23', '2025-11-21 20:17:23', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_likes`
--

CREATE TABLE `user_likes` (
  `user_id` int UNSIGNED NOT NULL,
  `product_id` int UNSIGNED NOT NULL,
  `liked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `address_book`
--
ALTER TABLE `address_book`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_address_user` (`user_id`);

--
-- Chỉ mục cho bảng `attributes`
--
ALTER TABLE `attributes`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`);

--
-- Chỉ mục cho bảng `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`);

--
-- Chỉ mục cho bảng `carts`
--
ALTER TABLE `carts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cart_user` (`user_id`);

--
-- Chỉ mục cho bảng `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cart_id` (`cart_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Chỉ mục cho bảng `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code_unique` (`code`);

--
-- Chỉ mục cho bảng `coupon_user_usages`
--
ALTER TABLE `coupon_user_usages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `coupon_user_unique` (`coupon_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Chỉ mục cho bảng `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Chỉ mục cho bảng `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orders_user` (`user_id`);

--
-- Chỉ mục cho bảng `order_cancel_logs`
--
ALTER TABLE `order_cancel_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cancel_order` (`order_id`);

--
-- Chỉ mục cho bảng `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_item_order` (`order_id`),
  ADD KEY `fk_item_product` (`product_id`),
  ADD KEY `fk_item_variant` (`variant_id`);

--
-- Chỉ mục cho bảng `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_payment_order` (`order_id`);

--
-- Chỉ mục cho bảng `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  ADD KEY `personal_access_tokens_expires_at_index` (`expires_at`);

--
-- Chỉ mục cho bảng `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_product_category` (`category_id`);

--
-- Chỉ mục cho bảng `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `idx_user_product_order` (`user_id`,`product_id`,`order_id`),
  ADD KEY `idx_product` (`product_id`),
  ADD KEY `idx_order` (`order_id`);

--
-- Chỉ mục cho bảng `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_variant_product` (`product_id`),
  ADD KEY `fk_variant_size` (`size_id`),
  ADD KEY `fk_variant_color` (`color_id`);

--
-- Chỉ mục cho bảng `return_requests`
--
ALTER TABLE `return_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_return_order` (`order_id`),
  ADD KEY `fk_return_user` (`user_id`);

--
-- Chỉ mục cho bảng `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Chỉ mục cho bảng `shipping`
--
ALTER TABLE `shipping`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_shipping_order` (`order_id`);

--
-- Chỉ mục cho bảng `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ticket_user` (`user_id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`name`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Chỉ mục cho bảng `user_likes`
--
ALTER TABLE `user_likes`
  ADD PRIMARY KEY (`user_id`,`product_id`),
  ADD KEY `product_id` (`product_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `address_book`
--
ALTER TABLE `address_book`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `attributes`
--
ALTER TABLE `attributes`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT cho bảng `carts`
--
ALTER TABLE `carts`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT cho bảng `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT cho bảng `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `coupon_user_usages`
--
ALTER TABLE `coupon_user_usages`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=164;

--
-- AUTO_INCREMENT cho bảng `order_cancel_logs`
--
ALTER TABLE `order_cancel_logs`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT cho bảng `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=186;

--
-- AUTO_INCREMENT cho bảng `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=135;

--
-- AUTO_INCREMENT cho bảng `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=328;

--
-- AUTO_INCREMENT cho bảng `products`
--
ALTER TABLE `products`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT cho bảng `product_reviews`
--
ALTER TABLE `product_reviews`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=144;

--
-- AUTO_INCREMENT cho bảng `return_requests`
--
ALTER TABLE `return_requests`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `shipping`
--
ALTER TABLE `shipping`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=99;

--
-- AUTO_INCREMENT cho bảng `support_tickets`
--
ALTER TABLE `support_tickets`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- Ràng buộc đối với các bảng kết xuất
--

--
-- Ràng buộc cho bảng `address_book`
--
ALTER TABLE `address_book`
  ADD CONSTRAINT `fk_address_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `carts`
--
ALTER TABLE `carts`
  ADD CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `coupon_user_usages`
--
ALTER TABLE `coupon_user_usages`
  ADD CONSTRAINT `coupon_user_usages_ibfk_1` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `coupon_user_usages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `order_cancel_logs`
--
ALTER TABLE `order_cancel_logs`
  ADD CONSTRAINT `fk_cancel_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_item_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_item_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL;

--
-- Ràng buộc cho bảng `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `fk_payment_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Ràng buộc cho bảng `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD CONSTRAINT `product_reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_reviews_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_reviews_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_reviews_ibfk_4` FOREIGN KEY (`parent_id`) REFERENCES `product_reviews` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `fk_variant_color` FOREIGN KEY (`color_id`) REFERENCES `attributes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_variant_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_variant_size` FOREIGN KEY (`size_id`) REFERENCES `attributes` (`id`) ON DELETE SET NULL;

--
-- Ràng buộc cho bảng `return_requests`
--
ALTER TABLE `return_requests`
  ADD CONSTRAINT `fk_return_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `shipping`
--
ALTER TABLE `shipping`
  ADD CONSTRAINT `fk_shipping_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD CONSTRAINT `fk_ticket_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ràng buộc cho bảng `user_likes`
--
ALTER TABLE `user_likes`
  ADD CONSTRAINT `user_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_likes_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
