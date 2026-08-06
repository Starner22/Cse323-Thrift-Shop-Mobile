-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 06, 2026 at 04:33 AM
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
(5, 6, '2025-08-14 00:08:31'),
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

--
-- Dumping data for table `cartitem`
--

INSERT INTO `cartitem` (`cartItemID`, `cartID`, `productID`, `quantity`) VALUES
(12, 7, 47, 1),
(13, 7, 46, 1),
(14, 6, 47, 2);

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
-- Table structure for table `order`
--

CREATE TABLE `order` (
  `orderID` int(11) NOT NULL,
  `buyerID` int(11) NOT NULL,
  `totalPrice` decimal(10,2) NOT NULL,
  `orderStatus` enum('Pending','Processing','Shipped','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `shipping_name` varchar(255) NOT NULL,
  `shipping_address` text NOT NULL,
  `shipping_city` varchar(255) NOT NULL,
  `shipping_postal_code` varchar(20) NOT NULL,
  `orderDate` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order`
--

INSERT INTO `order` (`orderID`, `buyerID`, `totalPrice`, `orderStatus`, `shipping_name`, `shipping_address`, `shipping_city`, `shipping_postal_code`, `orderDate`) VALUES
(1, 1, 10000.00, 'Cancelled', '', '', '', '', '2025-08-13 22:17:19'),
(2, 5, 5000.00, 'Cancelled', '', '', '', '', '2025-08-13 22:28:14'),
(3, 5, 10000.00, 'Shipped', 'Abdul', 'dhaka', 'dhaka', '1321', '2025-08-13 23:09:19'),
(4, 5, 5000.00, 'Completed', 'abdul', 'adasd', 'asdasd', '1233', '2025-08-13 23:12:59'),
(5, 1, 100.00, 'Pending', 'mahee', 'bashundhara', 'dhaka', '1229', '2025-08-13 23:26:23'),
(6, 1, 200.00, 'Shipped', 'Mogee', 'asdasd', 'asdasd', '2132', '2025-08-14 00:01:46'),
(7, 6, 200.00, 'Completed', 'ASDASD', 'ASdfS', 'asd', '123123132', '2025-08-14 00:16:25');

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

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_resets`
--

INSERT INTO `password_resets` (`id`, `email`, `token`, `expires_at`) VALUES
(1, 'mahee@mahee.com', '009001d4e930a5af34b6a10793bb7de6b833203ec2a5c841b1853b958d92694abf440d2bb0bd611b0788abeece6558bd243c', '2025-08-14 02:45:15'),
(2, 'mahee@mahee.com', 'f7f2cc3654697895935ade5208085015c85429012b276d5668b49dcf4a9e9ba2df4a31cea8b7ab8bb607cd146fcc77922856', '2025-08-14 02:45:43'),
(3, 'mahee@mahee.com', 'e560798d64a22a87b73bf59937cceb9068c599479f3506a01fc029d95f802fe3c8f29c7777d7a92f7a1475fec919e8babd45', '2025-08-14 02:46:45');

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
(2, 4, 5000.00, 'PayPal', 'completed', 'txn_689d1bfbc0552', '2025-08-13 23:12:59'),
(3, 5, 100.00, 'Credit Card', 'completed', 'txn_689d1f1fc234c', '2025-08-13 23:26:23'),
(4, 6, 200.00, 'Credit Card', 'completed', 'txn_689d276a67c33', '2025-08-14 00:01:46'),
(5, 7, 200.00, 'CreditCardStrategy', 'completed', 'cc_689d2ad97fb16', '2025-08-14 00:16:25');

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
  `categoryID` int(11) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `sellerID` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `location` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`productID`, `name`, `description`, `price`, `condition`, `quantity`, `categoryID`, `image_path`, `sellerID`, `status`, `created_at`, `updated_at`, `location`) VALUES
(46, 'Vintage Leather Jacket', 'A classic leather jacket in good condition.', 75.00, 'Good', 11, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(47, 'Acoustic Guitar', 'Well-maintained acoustic guitar, perfect for beginners.', 120.00, 'Excellent', 11, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(48, 'Used Computer Monitor', 'A 24-inch monitor with minor signs of wear.', 80.00, 'Normal', 11, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(49, 'Antique Wooden Chair', 'A sturdy wooden chair with a unique design.', 45.00, 'Subpar', 11, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(50, 'Complete Series DVD Set', 'The complete series of a popular TV show.', 25.00, 'Good', 11, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(51, 'Exercise Bike', 'A well-functioning exercise bike for home workouts.', 150.00, 'Good', 11, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(52, 'Board Game Collection', 'A lot of assorted board games, some new, some used.', 30.00, 'Normal', 12, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(53, 'Cast Iron Skillet', 'A seasoned cast iron skillet, ready to use.', 20.00, 'Good', 12, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(54, 'Car Floor Mats (Set)', 'A set of used but clean car floor mats.', 15.00, 'Normal', 12, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(55, 'Handheld Blender', 'A powerful handheld blender with all accessories.', 35.00, 'Excellent', 12, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(56, 'Digital Camera', 'A compact digital camera with a memory card.', 90.00, 'Good', 4, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(57, 'Silver Necklace', 'A delicate silver chain necklace.', 50.00, 'Excellent', 4, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(58, 'Hardcover Book Set', 'A collection of classic literature in hardcover.', 40.00, 'Good', 4, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(59, 'Dog Carrier Crate', 'A small dog carrier, perfect for vet visits.', 25.00, 'Normal', 5, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(60, 'Art Easel', 'A portable wooden art easel with some paint stains.', 30.00, 'Normal', 6, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(61, 'Wireless Mouse', 'A used wireless mouse with a USB receiver.', 10.00, 'Good', 5, 7, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(62, 'T-Shirt Lot', 'A bundle of assorted men\'s t-shirts.', 20.00, 'Good', 5, 5, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(63, 'Desk Lamp', 'A modern desk lamp with an adjustable neck.', 18.00, 'Excellent', 5, 6, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(64, 'Vintage Tea Set', 'A decorative tea set with floral patterns.', 60.00, 'Good', 5, 8, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(65, 'Power Drill Kit', 'A power drill with a variety of bits and a carrying case.', 55.00, 'Good', 6, 8, 'uploads/1.jpg', 4, 'approved', '2025-08-20 16:53:44', '2025-08-20 16:53:44', NULL),
(67, 'Duidin', 'Gdhdebryfbd', 2.00, 'Normal', 11, 22, 'uploads/product_1785947032_6a73639857566.jpg', 7, 'pending', '2026-08-05 16:23:52', '2026-08-05 17:42:45', NULL);

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
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `seller_profile`
--

INSERT INTO `seller_profile` (`sellerID`, `userID`, `business_name`, `business_address`, `business_phone`, `business_email`, `tax_id`, `bank_account`, `id_card_path`, `business_license_path`, `approval_status`, `approved_at`, `rejected_reason`, `created_at`, `updated_at`) VALUES
(1, 7, 'Lisetsd', 'Asdfghaf', '01714079347', 'a@a.com', '123456678', '12344567891', NULL, NULL, 'approved', NULL, NULL, '2026-08-05 01:36:40', '2026-08-05 14:30:10'),
(2, 8, 'Liset Corp', '', '01819248208', '', '', '', NULL, NULL, 'approved', '2026-08-06 01:36:51', NULL, '2026-08-06 01:33:12', '2026-08-06 01:36:51');

-- --------------------------------------------------------

--
-- Table structure for table `supportticket`
--

CREATE TABLE `supportticket` (
  `ticketID` int(11) NOT NULL,
  `userID` int(11) NOT NULL,
  `issueDescription` text NOT NULL,
  `status` enum('Open','In Progress','Closed') NOT NULL DEFAULT 'Open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `supportticket`
--

INSERT INTO `supportticket` (`ticketID`, `userID`, `issueDescription`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'I have no products', 'Closed', '2025-08-13 20:19:43', '2025-08-13 22:51:18');

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
  `auth_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`userID`, `name`, `email`, `phone`, `address`, `password`, `role`, `registration_date`, `auth_token`) VALUES
(1, 'Mahee', 'mahee@mahee.com', NULL, NULL, '$2y$10$hPpkGhku7bcaRTrRfba.Wun9j/71zTwW/9D6RVBTS3KyXgsiCUKOS', 'Buyer', '2025-08-13 20:10:00', NULL),
(3, 'admin', 'admin@shop.com', NULL, NULL, '$2y$10$tZJsb8sEUXU7jI7ygqLDh.FpcZtnIf1F.ADcz7fPQKkqV0mn7.auq', 'Admin', '2025-08-13 20:26:22', NULL),
(4, 'Seller', 'seller@shop.com', NULL, NULL, '$2y$10$JSj3rfVEPYM0QRp9mVFLmOZpWI6/WAggzAVKH100jdULjLcl5Ud.S', 'Seller', '2025-08-13 22:19:31', NULL),
(5, 'buyer', 'buyer@shop.com', NULL, NULL, '$2y$10$JZ5/V0QujlSKwBozZQrCmOjLljm2A4XW4C6u.AJPeDTk3oqjqaY1W', 'Buyer', '2025-08-13 22:20:49', NULL),
(6, 'Sohee', 'sohee@sohee.com', NULL, NULL, '$2y$10$/mYEo2oBym1rwXZ03AKOUe.Sp2l5XoinAzORb03EbVaL4luJ2wbxu', 'Buyer', '2025-08-14 00:08:31', NULL),
(7, 'Seller_No.1', 's@s.com', '', '', '$2y$10$JON.qMMPViApSMT3G2Dq0eJ5aZ04m.G43mZDVgjKRReCZ4elL6Exu', 'Seller', '2026-07-27 12:46:04', 'ed99dad332f4b7f385e18fe4f3937af3be02fdeff1baa7f2a6070a32052a7e64'),
(8, 'Buyer_No.1', 'b@b.com', NULL, NULL, '$2y$10$BLDz4F5ym3Kg8JIPLjh0yuEE5gr/ckAggRvCBT7Hv4NXCejz6BQK2', 'Seller', '2026-08-05 11:53:20', NULL),
(9, 'Moderator_No.1', 'm@m.com', NULL, NULL, '$2y$10$h6RfUbPm404jEjz0IkGVUuOJouQ01thFxMQJ9JP7uQUrJNQBCzoxu', 'Moderator', '2026-08-05 16:41:10', NULL);

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
(3, 6, '2025-08-14 00:08:31'),
(4, 7, '2026-07-27 12:46:04');

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
(5, 4, 47),
(4, 4, 49);

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
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `email` (`email`);

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
-- Indexes for table `supportticket`
--
ALTER TABLE `supportticket`
  ADD PRIMARY KEY (`ticketID`),
  ADD KEY `userID` (`userID`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`userID`),
  ADD UNIQUE KEY `email` (`email`);

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
  MODIFY `cartItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `categoryID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `order`
--
ALTER TABLE `order`
  MODIFY `orderID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `orderitem`
--
ALTER TABLE `orderitem`
  MODIFY `orderItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `paymentID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `productID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=68;

--
-- AUTO_INCREMENT for table `seller_profile`
--
ALTER TABLE `seller_profile`
  MODIFY `sellerID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `supportticket`
--
ALTER TABLE `supportticket`
  MODIFY `ticketID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `userID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `wishlist`
--
ALTER TABLE `wishlist`
  MODIFY `wishlistID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `wishlistitem`
--
ALTER TABLE `wishlistitem`
  MODIFY `wishlistItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

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
-- Constraints for table `supportticket`
--
ALTER TABLE `supportticket`
  ADD CONSTRAINT `supportticket_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `user` (`userID`) ON DELETE CASCADE;

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
