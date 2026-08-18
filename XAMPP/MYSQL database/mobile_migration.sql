-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 18, 2026 at 02:01 PM
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
-- Database: `mobile_migration`
--

-- --------------------------------------------------------

--
-- Table structure for table `cart`
--

CREATE TABLE `cart` (
  `cartID` int(11) NOT NULL,
  `buyerID` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cart`
--

INSERT INTO `cart` (`cartID`, `buyerID`, `created_at`) VALUES
(1, 1, '2025-08-13 20:10:00'),
(4, 5, '2025-08-13 22:20:49'),
(6, 7, '2026-07-27 12:46:04'),
(7, 8, '2026-08-05 11:53:30'),
(8, 9, '2026-08-05 16:47:13');

-- --------------------------------------------------------

--
-- Table structure for table `cartitem`
--

CREATE TABLE `cartitem` (
  `cartItemID` int(11) NOT NULL,
  `cartID` int(11) NOT NULL,
  `productID` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `categoryID` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`categoryID`, `name`, `image_path`) VALUES
(4, 'Electronics', 'uploads/1.jpg'),
(5, 'Clothing & Apparel', 'uploads/1.jpg'),
(6, 'Home & Garden', 'uploads/1.jpg'),
(7, 'Furniture', 'uploads/1.jpg'),
(8, 'Books, Movies & Music', 'uploads/1.jpg'),
(9, 'Sporting Goods', 'uploads/1.jpg'),
(10, 'Toys & Hobbies', 'uploads/1.jpg'),
(11, 'Kitchenware', 'uploads/1.jpg'),
(12, 'Automotive', 'uploads/1.jpg'),
(13, 'Health & Beauty', 'uploads/1.jpg'),
(14, 'Jewelry & Watches', 'uploads/1.jpg'),
(15, 'Pet Supplies', 'uploads/1.jpg'),
(16, 'Musical Instruments', 'uploads/1.jpg'),
(17, 'Crafts & DIY Supplies', 'uploads/1.jpg'),
(18, 'Baby & Kids', 'uploads/1.jpg'),
(19, 'Vintage & Collectibles', 'uploads/1.jpg'),
(20, 'Appliances', 'uploads/1.jpg'),
(21, 'Tools & Hardware', 'uploads/1.jpg'),
(22, 'Art Supplies', 'uploads/1.jpg'),
(23, 'Office Supplies', 'uploads/1.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `moderation_history`
--

CREATE TABLE `moderation_history` (
  `historyID` int(11) NOT NULL,
  `moderatorID` int(11) NOT NULL,
  `targetUserID` int(11) DEFAULT NULL,
  `targetProductID` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `action_category` varchar(30) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `moderation_history`
--

INSERT INTO `moderation_history` (`historyID`, `moderatorID`, `targetUserID`, `targetProductID`, `action`, `action_category`, `details`, `ip_address`, `created_at`) VALUES
(1, 9, 8, NULL, 'suspend_seller', 'seller', 'Abb', '192.168.0.100', '2026-08-11 16:12:58'),
(2, 9, 8, NULL, 'restore_seller', 'seller', NULL, '192.168.0.100', '2026-08-11 16:13:31'),
(3, 9, NULL, 68, 'hide_product', 'product', NULL, '192.168.0.100', '2026-08-11 16:13:47'),
(4, 9, NULL, 68, 'show_product', 'product', NULL, '192.168.0.100', '2026-08-11 16:14:00'),
(5, 9, NULL, 68, 'edit_product', 'product', '{\"updated_fields\":[\"name\",\"description\",\"price\",\"quantity\",\"condition\"]}', '192.168.0.100', '2026-08-11 16:14:11'),
(6, 9, NULL, 68, 'edit_product', 'product', '{\"updated_fields\":[\"name\",\"description\",\"price\",\"quantity\",\"condition\"]}', '192.168.0.100', '2026-08-11 16:14:12'),
(7, 9, NULL, 68, 'hide_product', 'product', NULL, '192.168.0.100', '2026-08-11 16:14:41'),
(8, 9, NULL, 68, 'edit_product', 'product', '{\"updated_fields\":[\"name\",\"description\",\"price\",\"quantity\",\"condition\"]}', '192.168.0.100', '2026-08-11 16:15:00'),
(9, 9, NULL, 68, 'show_product', 'product', NULL, '172.20.142.47', '2026-08-13 05:12:58'),
(10, 9, NULL, NULL, 'edit_user', 'user', '{\"updated_fields\":[\"name\",\"email\",\"phone\",\"role\"]}', '172.20.142.47', '2026-08-13 08:11:41'),
(12, 9, 8, NULL, 'edit_seller', 'seller', '{\"updated_fields\":[\"business_name\",\"phone\"]}', '172.20.142.47', '2026-08-13 09:40:49'),
(13, 9, 7, NULL, 'suspend_seller', 'seller', 'Did', '172.20.142.47', '2026-08-13 09:41:24'),
(14, 9, 7, NULL, 'restore_seller', 'seller', NULL, '172.20.142.47', '2026-08-13 09:41:48'),
(15, 10, 9, NULL, 'update_permissions', 'moderator', '{\"updated_permissions\":{\"can_moderate_sellers\":true,\"can_moderate_products\":true,\"can_approve_new_sellers\":false,\"can_approve_new_products\":true,\"can_manage_reports\":true,\"can_view_analytics\":true},\"moderator\":\"Moderator_No.1\"}', '172.20.11.28', '2026-08-15 04:26:04'),
(16, 10, NULL, 46, 'hide_product', 'product', NULL, '172.20.11.28', '2026-08-15 04:26:24'),
(17, 10, NULL, 46, 'show_product', 'product', NULL, '172.20.11.28', '2026-08-15 04:26:27'),
(18, 10, NULL, 46, 'delete_product', 'product', NULL, '192.168.0.102', '2026-08-18 11:49:17');

-- --------------------------------------------------------

--
-- Table structure for table `order`
--

CREATE TABLE `order` (
  `orderID` int(11) NOT NULL,
  `buyerID` int(11) NOT NULL,
  `totalPrice` decimal(10,2) NOT NULL,
  `orderStatus` enum('Pending','Processing','Shipped','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `delivery_date` timestamp NULL DEFAULT NULL,
  `shipping_name` varchar(255) NOT NULL,
  `shipping_address` text NOT NULL,
  `shipping_city` varchar(255) NOT NULL,
  `shipping_postal_code` varchar(20) NOT NULL,
  `shipping_phone` varchar(20) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'COD',
  `payment_status` enum('Pending','Paid','Failed') DEFAULT 'Pending',
  `orderDate` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order`
--

INSERT INTO `order` (`orderID`, `buyerID`, `totalPrice`, `orderStatus`, `delivery_date`, `shipping_name`, `shipping_address`, `shipping_city`, `shipping_postal_code`, `shipping_phone`, `payment_method`, `payment_status`, `orderDate`) VALUES
(1, 1, 10000.00, 'Cancelled', NULL, '', '', '', '', NULL, 'COD', 'Pending', '2025-08-13 22:17:19'),
(2, 5, 5000.00, 'Cancelled', NULL, '', '', '', '', NULL, 'COD', 'Pending', '2025-08-13 22:28:14'),
(3, 5, 10000.00, 'Shipped', NULL, 'Abdul', 'dhaka', 'dhaka', '1321', NULL, 'COD', 'Pending', '2025-08-13 23:09:19'),
(5, 1, 100.00, 'Pending', NULL, 'mahee', 'bashundhara', 'dhaka', '1229', NULL, 'COD', 'Pending', '2025-08-13 23:26:23'),
(6, 1, 200.00, 'Shipped', NULL, 'Mogee', 'asdasd', 'asdasd', '2132', NULL, 'COD', 'Pending', '2025-08-14 00:01:46'),
(8, 8, 195.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:03:48'),
(9, 8, 405.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:05:00'),
(10, 8, 405.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:05:05'),
(11, 8, 405.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:10:54'),
(12, 8, 375.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:15:49'),
(13, 8, 75.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:18:09'),
(14, 8, 75.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:18:29'),
(15, 8, 60.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:19:36'),
(16, 8, 75.00, 'Cancelled', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Failed', '2026-08-18 05:21:01'),
(17, 8, 30.00, 'Completed', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Paid', '2026-08-18 05:41:21'),
(18, 8, 40.00, 'Completed', '2026-08-18 10:00:56', 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Paid', '2026-08-18 05:41:31'),
(19, 8, 20.00, 'Processing', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 05:41:40'),
(20, 8, 50.00, 'Completed', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Paid', '2026-08-18 05:44:47'),
(21, 7, 75.00, 'Completed', '2026-08-18 06:23:24', 'Seller_No.1', 'Hi chi', 'Chi GM', '1236', '', 'COD', 'Pending', '2026-08-18 05:55:17'),
(22, 8, 20.00, 'Pending', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 10:02:57'),
(23, 8, 280.00, 'Pending', NULL, 'Buyer_No.1', '9u2', 'Vigs', '3844', '', 'COD', 'Pending', '2026-08-18 10:04:15');

-- --------------------------------------------------------

--
-- Table structure for table `orderitem`
--

CREATE TABLE `orderitem` (
  `orderItemID` int(11) NOT NULL,
  `orderID` int(11) NOT NULL,
  `productID` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price_at_purchase` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orderitem`
--

INSERT INTO `orderitem` (`orderItemID`, `orderID`, `productID`, `quantity`, `price_at_purchase`) VALUES
(8, 8, 46, 1, 75.00),
(9, 8, 47, 1, 120.00),
(10, 9, 49, 1, 45.00),
(11, 9, 47, 3, 120.00),
(12, 10, 49, 1, 45.00),
(13, 10, 47, 3, 120.00),
(14, 11, 49, 1, 45.00),
(15, 11, 47, 3, 120.00),
(16, 12, 46, 5, 75.00),
(17, 13, 46, 1, 75.00),
(18, 14, 46, 1, 75.00),
(19, 15, 68, 6, 10.00),
(20, 16, 46, 1, 75.00),
(21, 17, 68, 3, 10.00),
(22, 18, 68, 4, 10.00),
(23, 19, 68, 2, 10.00),
(24, 20, 68, 5, 10.00),
(25, 21, 46, 1, 75.00),
(26, 22, 68, 2, 10.00),
(27, 23, 48, 1, 80.00),
(28, 23, 46, 2, 75.00),
(29, 23, 68, 5, 10.00);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `paymentID` int(11) NOT NULL,
  `orderID` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `payment_status` varchar(50) NOT NULL DEFAULT 'completed',
  `transaction_id` varchar(255) DEFAULT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`paymentID`, `orderID`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `payment_date`) VALUES
(1, 3, 10000.00, 'Credit Card', 'completed', 'txn_689d1b1ff3fde', '2025-08-13 23:09:19'),
(3, 5, 100.00, 'Credit Card', 'completed', 'txn_689d1f1fc234c', '2025-08-13 23:26:23'),
(4, 6, 200.00, 'Credit Card', 'completed', 'txn_689d276a67c33', '2025-08-14 00:01:46');

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `productID` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `condition` enum('Excellent','Good','Normal','Subpar') DEFAULT 'Normal',
  `quantity` int(11) UNSIGNED NOT NULL DEFAULT 1,
  `quantity_sold` int(11) DEFAULT 0,
  `categoryID` int(11) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `sellerID` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `location` varchar(255) DEFAULT NULL,
  `can_display` tinyint(1) DEFAULT 0,
  `seller_active` tinyint(1) DEFAULT 1,
  `is_deleted` tinyint(1) DEFAULT 0,
  `moderation_notes` text DEFAULT NULL,
  `seller_notes` text DEFAULT NULL,
  `last_moderated_at` timestamp NULL DEFAULT NULL,
  `seller_updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`productID`, `name`, `description`, `price`, `condition`, `quantity`, `quantity_sold`, `categoryID`, `image_path`, `sellerID`, `status`, `created_at`, `updated_at`, `location`, `can_display`, `seller_active`, `is_deleted`, `moderation_notes`, `seller_notes`, `last_moderated_at`, `seller_updated_at`) VALUES
(46, 'Vintage Leather Jacket', 'A classic leather jacket in good condition.', 75.00, 'Normal', 7, 1, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-18 11:49:17', NULL, 1, 1, 1, NULL, NULL, '2026-08-15 04:26:27', NULL),
(47, 'Acoustic Guitar', 'Well-maintained acoustic guitar, perfect for beginners.', 120.00, 'Excellent', 11, 0, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-18 05:15:32', NULL, 1, 1, 0, NULL, NULL, '2026-08-11 05:24:33', NULL),
(48, 'Used Computer Monitor', 'A 24-inch monitor with minor signs of wear.', 80.00, 'Normal', 10, 0, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-18 10:04:15', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(49, 'Antique Wooden Chair', 'A sturdy wooden chair with a unique design.', 45.00, 'Subpar', 11, 0, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-18 05:15:29', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(50, 'Complete Series DVD Set', 'The complete series of a popular TV show.', 25.00, 'Good', 11, 0, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(51, 'Exercise Bike', 'A well-functioning exercise bike for home workouts.', 150.00, 'Good', 11, 0, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(52, 'Board Game Collection', 'A lot of assorted board games, some new, some used.', 30.00, 'Normal', 12, 0, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(53, 'Cast Iron Skillet', 'A seasoned cast iron skillet, ready to use.', 20.00, 'Good', 12, 0, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(54, 'Car Floor Mats (Set)', 'A set of used but clean car floor mats.', 15.00, 'Normal', 12, 0, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(55, 'Handheld Blender', 'A powerful handheld blender with all accessories.', 35.00, 'Excellent', 12, 0, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(56, 'Digital Camera', 'A compact digital camera with a memory card.', 90.00, 'Good', 4, 0, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(57, 'Silver Necklace', 'A delicate silver chain necklace.', 50.00, 'Excellent', 4, 0, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(58, 'Hardcover Book Set', 'A collection of classic literature in hardcover.', 40.00, 'Good', 4, 0, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(59, 'Dog Carrier Crate', 'A small dog carrier, perfect for vet visits.', 25.00, 'Normal', 5, 0, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(60, 'Art Easel', 'A portable wooden art easel with some paint stains.', 30.00, 'Normal', 6, 0, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(61, 'Wireless Mouse', 'A used wireless mouse with a USB receiver.', 10.00, 'Good', 5, 0, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(62, 'T-Shirt Lot', 'A bundle of assorted men\'s t-shirts.', 20.00, 'Good', 5, 0, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(63, 'Desk Lamp', 'A modern desk lamp with an adjustable neck.', 18.00, 'Excellent', 5, 0, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(64, 'Vintage Tea Set', 'A decorative tea set with floral patterns.', 60.00, 'Good', 5, 0, 8, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(65, 'Power Drill Kit', 'A power drill with a variety of bits and a carrying case.', 55.00, 'Good', 6, 0, 8, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2026-08-08 00:20:11', NULL, 1, 1, 0, NULL, NULL, NULL, NULL),
(68, 'Hahaha', 'Hshsdhfbdhfbb', 10.00, 'Good', 9, 4, 20, 'uploads/product_1786427835_6a7ab9bbb79be.jpg', 7, 'approved', '2026-08-11 05:57:15', '2026-08-18 10:04:15', NULL, 1, 1, 0, NULL, NULL, '2026-08-13 05:12:58', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `seller_profile`
--

CREATE TABLE `seller_profile` (
  `sellerID` int(11) NOT NULL,
  `userID` int(11) NOT NULL,
  `business_name` varchar(255) NOT NULL,
  `business_address` text DEFAULT NULL,
  `business_phone` varchar(20) DEFAULT NULL,
  `business_email` varchar(255) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `bank_account` varchar(100) DEFAULT NULL,
  `id_card_path` varchar(255) DEFAULT NULL,
  `business_license_path` varchar(255) DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected','suspended') DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `seller_profile`
--

INSERT INTO `seller_profile` (`sellerID`, `userID`, `business_name`, `business_address`, `business_phone`, `business_email`, `tax_id`, `bank_account`, `id_card_path`, `business_license_path`, `approval_status`, `approved_at`, `rejected_reason`, `created_at`, `updated_at`) VALUES
(1, 7, 'Lisetsd', 'Asdfghaf', '01714079347', 'a@a.com', '123456678', '12344567891', NULL, NULL, 'approved', NULL, NULL, '2026-08-05 01:36:40', '2026-08-13 09:41:48');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `userID` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Moderator','Seller','Buyer') NOT NULL DEFAULT 'Buyer',
  `registration_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `auth_token` varchar(255) DEFAULT NULL,
  `can_moderate_sellers` tinyint(1) DEFAULT 0,
  `can_moderate_products` tinyint(1) DEFAULT 0,
  `can_approve_new_sellers` tinyint(1) DEFAULT 0,
  `can_approve_new_products` tinyint(1) DEFAULT 0,
  `can_manage_reports` tinyint(1) DEFAULT 0,
  `can_view_analytics` tinyint(1) DEFAULT 0,
  `can_manage_moderators` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`userID`, `name`, `email`, `phone`, `address`, `password`, `role`, `registration_date`, `auth_token`, `can_moderate_sellers`, `can_moderate_products`, `can_approve_new_sellers`, `can_approve_new_products`, `can_manage_reports`, `can_view_analytics`, `can_manage_moderators`) VALUES
(1, 'Mahee', 'mahee@mahee.com', NULL, NULL, '$2y$10$hPpkGhku7bcaRTrRfba.Wun9j/71zTwW/9D6RVBTS3KyXgsiCUKOS', 'Buyer', '2025-08-13 20:10:00', NULL, 0, 0, 0, 0, 0, 0, 0),
(3, 'admin', 'admin@shop.com', NULL, NULL, '$2y$10$tZJsb8sEUXU7jI7ygqLDh.FpcZtnIf1F.ADcz7fPQKkqV0mn7.auq', 'Admin', '2025-08-13 20:26:22', NULL, 0, 0, 0, 0, 0, 0, 0),
(4, 'Seller', 'seller@shop.com', NULL, NULL, '$2y$10$JSj3rfVEPYM0QRp9mVFLmOZpWI6/WAggzAVKH100jdULjLcl5Ud.S', 'Seller', '2025-08-13 22:19:31', NULL, 0, 0, 0, 0, 0, 0, 0),
(5, 'buyer', 'buyer@shop.com', NULL, NULL, '$2y$10$JZ5/V0QujlSKwBozZQrCmOjLljm2A4XW4C6u.AJPeDTk3oqjqaY1W', 'Buyer', '2025-08-13 22:20:49', NULL, 0, 0, 0, 0, 0, 0, 0),
(7, 'Seller_No.1', 's@s.com', '', '', '$2y$10$JON.qMMPViApSMT3G2Dq0eJ5aZ04m.G43mZDVgjKRReCZ4elL6Exu', 'Seller', '2026-07-27 12:46:04', 'ed99dad332f4b7f385e18fe4f3937af3be02fdeff1baa7f2a6070a32052a7e64', 0, 0, 0, 0, 0, 0, 0),
(8, 'Buyer_No.1', 'b@b.com', 'N/A', NULL, '$2y$10$BLDz4F5ym3Kg8JIPLjh0yuEE5gr/ckAggRvCBT7Hv4NXCejz6BQK2', 'Buyer', '2026-08-05 11:53:20', NULL, 0, 0, 0, 0, 0, 0, 0),
(9, 'Moderator_No.1', 'm@m.com', NULL, NULL, '$2y$10$h6RfUbPm404jEjz0IkGVUuOJouQ01thFxMQJ9JP7uQUrJNQBCzoxu', 'Moderator', '2026-08-05 16:41:10', NULL, 1, 1, 0, 1, 1, 1, 0),
(10, 'Admin_No.1', 'a@a.com', NULL, NULL, '$2y$10$gCyTiw8xcvkr8Ap1YptWW.zDf.ftUy8hYDd/jTRax1PFIlc6bZ6Ga', 'Admin', '2026-08-15 04:24:33', NULL, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `user_addresses`
--

CREATE TABLE `user_addresses` (
  `addressID` int(11) NOT NULL,
  `userID` int(11) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) NOT NULL,
  `country` varchar(100) DEFAULT 'Bangladesh',
  `phone` varchar(20) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_addresses`
--

INSERT INTO `user_addresses` (`addressID`, `userID`, `address`, `city`, `state`, `postal_code`, `country`, `phone`, `is_default`, `created_at`, `updated_at`) VALUES
(2, 8, '9u2', 'Vigs', 'Chi', '3844', 'Bangladesh', '', 1, '2026-08-11 13:20:52', '2026-08-11 13:27:18'),
(4, 8, 'So chi', 'Svsbsh', 'Gsshd', '1212', 'Bangladesh', '', 0, '2026-08-18 05:20:46', '2026-08-18 05:20:46'),
(5, 7, 'Hi chi', 'Chi GM', 'Thhv', '1236', 'Bangladesh', '', 1, '2026-08-18 05:55:14', '2026-08-18 05:55:14');

-- --------------------------------------------------------

--
-- Table structure for table `wishlist`
--

CREATE TABLE `wishlist` (
  `wishlistID` int(11) NOT NULL,
  `buyerID` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `wishlist`
--

INSERT INTO `wishlist` (`wishlistID`, `buyerID`, `created_at`) VALUES
(1, 1, '2025-08-13 20:10:00'),
(2, 5, '2025-08-13 22:20:49'),
(4, 7, '2026-07-27 12:46:04'),
(5, 8, '2026-08-18 05:24:40');

-- --------------------------------------------------------

--
-- Table structure for table `wishlistitem`
--

CREATE TABLE `wishlistitem` (
  `wishlistItemID` int(11) NOT NULL,
  `wishlistID` int(11) NOT NULL,
  `productID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `wishlistitem`
--

INSERT INTO `wishlistitem` (`wishlistItemID`, `wishlistID`, `productID`) VALUES
(7, 4, 46),
(5, 4, 47),
(4, 4, 49),
(6, 5, 49);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`cartID`),
  ADD UNIQUE KEY `buyerID` (`buyerID`);

--
-- Indexes for table `cartitem`
--
ALTER TABLE `cartitem`
  ADD PRIMARY KEY (`cartItemID`),
  ADD UNIQUE KEY `cartID` (`cartID`,`productID`),
  ADD KEY `productID` (`productID`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`categoryID`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `moderation_history`
--
ALTER TABLE `moderation_history`
  ADD PRIMARY KEY (`historyID`),
  ADD KEY `moderatorID` (`moderatorID`),
  ADD KEY `targetUserID` (`targetUserID`),
  ADD KEY `targetProductID` (`targetProductID`);

--
-- Indexes for table `order`
--
ALTER TABLE `order`
  ADD PRIMARY KEY (`orderID`),
  ADD KEY `buyerID` (`buyerID`);

--
-- Indexes for table `orderitem`
--
ALTER TABLE `orderitem`
  ADD PRIMARY KEY (`orderItemID`),
  ADD KEY `orderID` (`orderID`),
  ADD KEY `productID` (`productID`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`paymentID`),
  ADD KEY `orderID` (`orderID`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`productID`),
  ADD KEY `sellerID` (`sellerID`),
  ADD KEY `categoryID` (`categoryID`);

--
-- Indexes for table `seller_profile`
--
ALTER TABLE `seller_profile`
  ADD PRIMARY KEY (`sellerID`),
  ADD UNIQUE KEY `userID` (`userID`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`userID`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_addresses`
--
ALTER TABLE `user_addresses`
  ADD PRIMARY KEY (`addressID`),
  ADD KEY `idx_user_default` (`userID`,`is_default`);

--
-- Indexes for table `wishlist`
--
ALTER TABLE `wishlist`
  ADD PRIMARY KEY (`wishlistID`),
  ADD UNIQUE KEY `buyerID` (`buyerID`);

--
-- Indexes for table `wishlistitem`
--
ALTER TABLE `wishlistitem`
  ADD PRIMARY KEY (`wishlistItemID`),
  ADD UNIQUE KEY `wishlistID` (`wishlistID`,`productID`),
  ADD KEY `productID` (`productID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cart`
--
ALTER TABLE `cart`
  MODIFY `cartID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `cartitem`
--
ALTER TABLE `cartitem`
  MODIFY `cartItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `categoryID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `moderation_history`
--
ALTER TABLE `moderation_history`
  MODIFY `historyID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `order`
--
ALTER TABLE `order`
  MODIFY `orderID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `orderitem`
--
ALTER TABLE `orderitem`
  MODIFY `orderItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `paymentID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `productID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `seller_profile`
--
ALTER TABLE `seller_profile`
  MODIFY `sellerID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `userID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `user_addresses`
--
ALTER TABLE `user_addresses`
  MODIFY `addressID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `wishlist`
--
ALTER TABLE `wishlist`
  MODIFY `wishlistID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `wishlistitem`
--
ALTER TABLE `wishlistitem`
  MODIFY `wishlistItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cart`
--
ALTER TABLE `cart`
  ADD CONSTRAINT `cart_ibfk_1` FOREIGN KEY (`buyerID`) REFERENCES `user` (`userID`) ON DELETE CASCADE;

--
-- Constraints for table `cartitem`
--
ALTER TABLE `cartitem`
  ADD CONSTRAINT `cartitem_ibfk_1` FOREIGN KEY (`cartID`) REFERENCES `cart` (`cartID`) ON DELETE CASCADE,
  ADD CONSTRAINT `cartitem_ibfk_2` FOREIGN KEY (`productID`) REFERENCES `product` (`productID`) ON DELETE CASCADE;

--
-- Constraints for table `moderation_history`
--
ALTER TABLE `moderation_history`
  ADD CONSTRAINT `moderation_history_ibfk_1` FOREIGN KEY (`moderatorID`) REFERENCES `user` (`userID`) ON DELETE CASCADE,
  ADD CONSTRAINT `moderation_history_ibfk_2` FOREIGN KEY (`targetUserID`) REFERENCES `user` (`userID`) ON DELETE SET NULL,
  ADD CONSTRAINT `moderation_history_ibfk_3` FOREIGN KEY (`targetProductID`) REFERENCES `product` (`productID`) ON DELETE SET NULL;

--
-- Constraints for table `order`
--
ALTER TABLE `order`
  ADD CONSTRAINT `order_ibfk_1` FOREIGN KEY (`buyerID`) REFERENCES `user` (`userID`) ON DELETE CASCADE;

--
-- Constraints for table `orderitem`
--
ALTER TABLE `orderitem`
  ADD CONSTRAINT `orderitem_ibfk_1` FOREIGN KEY (`orderID`) REFERENCES `order` (`orderID`) ON DELETE CASCADE,
  ADD CONSTRAINT `orderitem_ibfk_2` FOREIGN KEY (`productID`) REFERENCES `product` (`productID`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`orderID`) REFERENCES `order` (`orderID`) ON DELETE CASCADE;

--
-- Constraints for table `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `product_ibfk_1` FOREIGN KEY (`sellerID`) REFERENCES `user` (`userID`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_ibfk_2` FOREIGN KEY (`categoryID`) REFERENCES `categories` (`categoryID`) ON DELETE SET NULL;

--
-- Constraints for table `seller_profile`
--
ALTER TABLE `seller_profile`
  ADD CONSTRAINT `seller_profile_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `user` (`userID`) ON DELETE CASCADE;

--
-- Constraints for table `user_addresses`
--
ALTER TABLE `user_addresses`
  ADD CONSTRAINT `user_addresses_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `user` (`userID`) ON DELETE CASCADE;

--
-- Constraints for table `wishlist`
--
ALTER TABLE `wishlist`
  ADD CONSTRAINT `wishlist_ibfk_1` FOREIGN KEY (`buyerID`) REFERENCES `user` (`userID`) ON DELETE CASCADE;

--
-- Constraints for table `wishlistitem`
--
ALTER TABLE `wishlistitem`
  ADD CONSTRAINT `wishlistitem_ibfk_1` FOREIGN KEY (`wishlistID`) REFERENCES `wishlist` (`wishlistID`) ON DELETE CASCADE,
  ADD CONSTRAINT `wishlistitem_ibfk_2` FOREIGN KEY (`productID`) REFERENCES `product` (`productID`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
