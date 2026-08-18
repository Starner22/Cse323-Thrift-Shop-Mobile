<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';

try {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (empty($authHeader)) {
        $authHeader = isset($headers['authorization']) ? $headers['authorization'] : '';
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    $token = trim($token);
    
    if (empty($token)) {
        echo json_encode(['success' => false, 'message' => 'No token provided']);
        exit();
    }
    
    $payload = verifyJWT($token);
    if (!$payload) {
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit();
    }
    
    $userID = $payload['userID'];
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Check if user is seller
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Seller') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Seller access required.']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // ============================================================
    // GET: Fetch seller orders or specific order details
    // ============================================================
    if ($method === 'GET') {
        $orderID = isset($_GET['orderID']) ? intval($_GET['orderID']) : 0;
        $status = isset($_GET['status']) ? $_GET['status'] : null;

        // ============================================================
        // Get specific order details for seller
        // ============================================================
        if ($orderID > 0) {
            // Get order
            $sql = "SELECT 
                        o.*,
                        u.name as buyer_name,
                        u.email as buyer_email,
                        u.phone as buyer_phone
                    FROM `order` o
                    INNER JOIN user u ON o.buyerID = u.userID
                    WHERE o.orderID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$orderID]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$order) {
                echo json_encode(['success' => false, 'message' => 'Order not found']);
                exit();
            }

            // Verify seller owns at least one product in this order
            $checkSql = "SELECT COUNT(*) as count 
                         FROM orderitem oi
                         INNER JOIN product p ON oi.productID = p.productID
                         WHERE oi.orderID = ? AND p.sellerID = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([$orderID, $userID]);
            $check = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (intval($check['count']) === 0) {
                echo json_encode(['success' => false, 'message' => 'Order not found or does not contain your products']);
                exit();
            }

            // Get items for this order that belong to this seller
            $itemSql = "SELECT 
                            oi.orderItemID,
                            oi.productID,
                            oi.quantity,
                            oi.price_at_purchase,
                            p.name as product_name,
                            p.image_path
                        FROM orderitem oi
                        INNER JOIN product p ON oi.productID = p.productID
                        WHERE oi.orderID = ? AND p.sellerID = ?";
            $itemStmt = $conn->prepare($itemSql);
            $itemStmt->execute([$orderID, $userID]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

            $formattedItems = [];
            foreach ($items as $item) {
                $formattedItems[] = [
                    'orderItemID' => intval($item['orderItemID']),
                    'productID' => intval($item['productID']),
                    'product_name' => $item['product_name'],
                    'quantity' => intval($item['quantity']),
                    'price_at_purchase' => floatval($item['price_at_purchase']),
                    'image_path' => $item['image_path']
                ];
            }

            $order['orderID'] = intval($order['orderID']);
            $order['buyerID'] = intval($order['buyerID']);
            $order['totalPrice'] = floatval($order['totalPrice']);
            $order['items'] = $formattedItems;

            echo json_encode([
                'success' => true,
                'data' => $order
            ]);
            exit();
        }

        // ============================================================
        // Get all seller orders
        // ============================================================
        
        // First, get all product IDs for this seller
        $productSql = "SELECT productID FROM product WHERE sellerID = ?";
        $productStmt = $conn->prepare($productSql);
        $productStmt->execute([$userID]);
        $productIDs = $productStmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($productIDs)) {
            echo json_encode([
                'success' => true,
                'data' => [],
                'stats' => [
                    'totalOrders' => 0,
                    'totalRevenue' => 0,
                    'pending' => 0,
                    'processing' => 0,
                    'shipped' => 0,
                    'completed' => 0,
                    'cancelled' => 0
                ]
            ]);
            exit();
        }

        // Build placeholders for product IDs
        $placeholders = implode(',', array_fill(0, count($productIDs), '?'));

        // Get order IDs that contain seller's products
        $orderIdSql = "SELECT DISTINCT orderID FROM orderitem WHERE productID IN ($placeholders)";
        $orderIdStmt = $conn->prepare($orderIdSql);
        $orderIdStmt->execute($productIDs);
        $orderIDs = $orderIdStmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($orderIDs)) {
            echo json_encode([
                'success' => true,
                'data' => [],
                'stats' => [
                    'totalOrders' => 0,
                    'totalRevenue' => 0,
                    'pending' => 0,
                    'processing' => 0,
                    'shipped' => 0,
                    'completed' => 0,
                    'cancelled' => 0
                ]
            ]);
            exit();
        }

        $orderPlaceholders = implode(',', array_fill(0, count($orderIDs), '?'));

        // Build main query
        $sql = "SELECT 
                    o.orderID,
                    o.buyerID,
                    o.totalPrice,
                    o.orderStatus,
                    o.orderDate,
                    o.shipping_name,
                    o.shipping_address,
                    o.shipping_city,
                    o.shipping_postal_code,
                    u.name as buyer_name,
                    u.email as buyer_email,
                    (SELECT COUNT(*) FROM orderitem WHERE orderID = o.orderID) as item_count
                FROM `order` o
                INNER JOIN user u ON o.buyerID = u.userID
                WHERE o.orderID IN ($orderPlaceholders)";

        if ($status) {
            $sql .= " AND o.orderStatus = ?";
        }

        $sql .= " ORDER BY o.orderDate DESC";

        $stmt = $conn->prepare($sql);
        
        // Merge order IDs and status parameter
        $params = array_merge($orderIDs, $status ? [$status] : []);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get order items for each order
        $formattedOrders = [];
        foreach ($orders as $order) {
            // Get items for this order that belong to this seller
            $itemSql = "SELECT 
                            oi.orderItemID,
                            oi.productID,
                            oi.quantity,
                            oi.price_at_purchase,
                            p.name as product_name,
                            p.image_path
                        FROM orderitem oi
                        INNER JOIN product p ON oi.productID = p.productID
                        WHERE oi.orderID = ? AND p.sellerID = ?";
            $itemStmt = $conn->prepare($itemSql);
            $itemStmt->execute([$order['orderID'], $userID]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

            $formattedItems = [];
            foreach ($items as $item) {
                $formattedItems[] = [
                    'orderItemID' => intval($item['orderItemID']),
                    'productID' => intval($item['productID']),
                    'product_name' => $item['product_name'],
                    'quantity' => intval($item['quantity']),
                    'price_at_purchase' => floatval($item['price_at_purchase']),
                    'image_path' => $item['image_path']
                ];
            }

            // Calculate total for seller's items only
            $sellerTotal = 0;
            foreach ($formattedItems as $item) {
                $sellerTotal += $item['price_at_purchase'] * $item['quantity'];
            }

            $formattedOrders[] = [
                'orderID' => intval($order['orderID']),
                'buyerID' => intval($order['buyerID']),
                'buyer_name' => $order['buyer_name'],
                'buyer_email' => $order['buyer_email'],
                'totalPrice' => floatval($sellerTotal), // Only seller's items
                'orderStatus' => $order['orderStatus'],
                'orderDate' => $order['orderDate'],
                'shipping_name' => $order['shipping_name'],
                'shipping_address' => $order['shipping_address'],
                'shipping_city' => $order['shipping_city'],
                'shipping_postal_code' => $order['shipping_postal_code'],
                'item_count' => count($formattedItems),
                'items' => $formattedItems
            ];
        }

        // Calculate stats - ONLY COMPLETED orders count as revenue
        $stats = [
            'totalOrders' => count($formattedOrders),
            'totalRevenue' => 0,
            'pending' => 0,
            'processing' => 0,
            'shipped' => 0,
            'completed' => 0,
            'cancelled' => 0
        ];

        foreach ($formattedOrders as $order) {
            $statusKey = strtolower($order['orderStatus']);
            if (isset($stats[$statusKey])) {
                $stats[$statusKey]++;
            }
            // Only add to revenue if order is completed
            if ($order['orderStatus'] === 'Completed') {
                $stats['totalRevenue'] += $order['totalPrice'];
            }
        }

        echo json_encode([
            'success' => true,
            'data' => $formattedOrders,
            'stats' => $stats
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Seller sales PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Seller sales error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>