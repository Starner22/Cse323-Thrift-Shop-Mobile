<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS");
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

    // Check if user is admin
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // ============================================================
    // GET: Fetch orders (all or specific)
    // ============================================================
    if ($method === 'GET') {
        $orderID = isset($_GET['orderID']) ? intval($_GET['orderID']) : 0;
        $status = isset($_GET['status']) ? $_GET['status'] : null;

        // ============================================================
        // GET: Specific order with details
        // ============================================================
        if ($orderID > 0) {
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

            // Get order items
            $itemSql = "SELECT 
                            oi.*,
                            p.name as product_name,
                            p.image_path
                        FROM orderitem oi
                        INNER JOIN product p ON oi.productID = p.productID
                        WHERE oi.orderID = ?";
            $itemStmt = $conn->prepare($itemSql);
            $itemStmt->execute([$orderID]);
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
        // GET: All orders with stats AND items
        // ============================================================
        $whereClause = "WHERE 1=1";
        $params = [];

        if ($status) {
            $whereClause .= " AND o.orderStatus = ?";
            $params[] = $status;
        }

        // Get all orders
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
                    o.shipping_phone,
                    o.payment_method,
                    o.payment_status,
                    u.name as buyer_name,
                    u.email as buyer_email,
                    (SELECT COUNT(*) FROM orderitem WHERE orderID = o.orderID) as item_count
                FROM `order` o
                INNER JOIN user u ON o.buyerID = u.userID
                " . $whereClause . "
                ORDER BY o.orderDate DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ✅ NEW: Get items for each order
        $formattedOrders = [];
        foreach ($orders as $order) {
            // Get items for this order
            $itemSql = "SELECT 
                            oi.orderItemID,
                            oi.productID,
                            oi.quantity,
                            oi.price_at_purchase,
                            p.name as product_name,
                            p.image_path
                        FROM orderitem oi
                        INNER JOIN product p ON oi.productID = p.productID
                        WHERE oi.orderID = ?";
            $itemStmt = $conn->prepare($itemSql);
            $itemStmt->execute([$order['orderID']]);
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

            $formattedOrders[] = [
                'orderID' => intval($order['orderID']),
                'buyerID' => intval($order['buyerID']),
                'buyer_name' => $order['buyer_name'],
                'buyer_email' => $order['buyer_email'],
                'totalPrice' => floatval($order['totalPrice']),
                'orderStatus' => $order['orderStatus'],
                'orderDate' => $order['orderDate'],
                'shipping_name' => $order['shipping_name'],
                'shipping_address' => $order['shipping_address'],
                'shipping_city' => $order['shipping_city'],
                'shipping_postal_code' => $order['shipping_postal_code'],
                'shipping_phone' => $order['shipping_phone'],
                'payment_method' => $order['payment_method'],
                'payment_status' => $order['payment_status'],
                'item_count' => intval($order['item_count']),
                'items' => $formattedItems  // ✅ ADDED: items array
            ];
        }

        // Calculate stats
        $statsSql = "SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN orderStatus = 'Pending' THEN 1 ELSE 0 END) as pending,
                        SUM(CASE WHEN orderStatus = 'Processing' THEN 1 ELSE 0 END) as processing,
                        SUM(CASE WHEN orderStatus = 'Shipped' THEN 1 ELSE 0 END) as shipped,
                        SUM(CASE WHEN orderStatus = 'Completed' THEN 1 ELSE 0 END) as completed,
                        SUM(CASE WHEN orderStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
                        SUM(CASE WHEN orderStatus = 'Completed' THEN totalPrice ELSE 0 END) as totalRevenue
                    FROM `order`";
        $statsStmt = $conn->query($statsSql);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

        // ✅ NEW: Calculate total products sold (from completed orders only)
        $productsSoldSql = "SELECT COALESCE(SUM(oi.quantity), 0) as total_products_sold
                            FROM orderitem oi
                            INNER JOIN `order` o ON oi.orderID = o.orderID
                            WHERE o.orderStatus = 'Completed'";
        $productsSoldStmt = $conn->query($productsSoldSql);
        $productsSold = $productsSoldStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $formattedOrders,
            'stats' => [
                'total' => intval($stats['total']),
                'pending' => intval($stats['pending']),
                'processing' => intval($stats['processing']),
                'shipped' => intval($stats['shipped']),
                'completed' => intval($stats['completed']),
                'cancelled' => intval($stats['cancelled']),
                'totalRevenue' => floatval($stats['totalRevenue']),
                'totalProductsSold' => intval($productsSold['total_products_sold'])  // ✅ ADDED
            ]
        ]);
        exit();
    }

    // ============================================================
    // PUT: Update order status or cancel order
    // ============================================================
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $orderID = intval($input['orderID'] ?? 0);
        $newStatus = $input['status'] ?? '';
        $reason = trim($input['reason'] ?? '');
        
        if (!$orderID) {
            echo json_encode(['success' => false, 'message' => 'Order ID required']);
            exit();
        }
        
        $allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'];
        if (!in_array($newStatus, $allowedStatuses)) {
            echo json_encode(['success' => false, 'message' => 'Invalid status']);
            exit();
        }

        // Get current order
        $stmt = $conn->prepare("SELECT orderID, orderStatus, payment_status FROM `order` WHERE orderID = ?");
        $stmt->execute([$orderID]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            echo json_encode(['success' => false, 'message' => 'Order not found']);
            exit();
        }

        $oldStatus = $order['orderStatus'];
        $oldPaymentStatus = $order['payment_status'];

        // Prevent invalid transitions
        $validTransitions = [
            'Pending' => ['Processing', 'Cancelled'],
            'Processing' => ['Shipped'],
            'Shipped' => ['Completed'],
            'Completed' => [],
            'Cancelled' => []
        ];

        if (!in_array($newStatus, $validTransitions[$oldStatus])) {
            echo json_encode([
                'success' => false, 
                'message' => "Cannot transition from '$oldStatus' to '$newStatus'"
            ]);
            exit();
        }

        // If cancelling, require reason
        if ($newStatus === 'Cancelled' && empty($reason)) {
            echo json_encode(['success' => false, 'message' => 'Reason is required for cancellation']);
            exit();
        }

        // Start transaction
        $conn->beginTransaction();

        try {
            // Determine new payment status
            $newPaymentStatus = $oldPaymentStatus;
            
            if ($newStatus === 'Completed') {
                // Order completed → Payment should be Paid
                $newPaymentStatus = 'Paid';
                
                // Get order items
                $stmt = $conn->prepare("SELECT productID, quantity FROM orderitem WHERE orderID = ?");
                $stmt->execute([$orderID]);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Update quantity_sold
                foreach ($items as $item) {
                    $stmt = $conn->prepare("UPDATE product SET quantity_sold = quantity_sold + ? WHERE productID = ?");
                    $stmt->execute([$item['quantity'], $item['productID']]);
                }

                // Set status and delivery_date
                $stmt = $conn->prepare("UPDATE `order` SET orderStatus = ?, payment_status = ?, delivery_date = NOW() WHERE orderID = ?");
                $stmt->execute([$newStatus, $newPaymentStatus, $orderID]);

            } elseif ($newStatus === 'Cancelled') {
                // Order cancelled → Payment should be Failed
                $newPaymentStatus = 'Failed';
                
                // Restore quantity
                $stmt = $conn->prepare("SELECT productID, quantity FROM orderitem WHERE orderID = ?");
                $stmt->execute([$orderID]);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($items as $item) {
                    $stmt = $conn->prepare("UPDATE product SET quantity = quantity + ? WHERE productID = ?");
                    $stmt->execute([$item['quantity'], $item['productID']]);
                }

                // Set status and payment status
                $stmt = $conn->prepare("UPDATE `order` SET orderStatus = ?, payment_status = ? WHERE orderID = ?");
                $stmt->execute([$newStatus, $newPaymentStatus, $orderID]);

                // Log cancellation reason
                error_log("Order $orderID cancelled by admin. Reason: $reason");

            } else {
                // Simple status update (Processing or Shipped)
                $stmt = $conn->prepare("UPDATE `order` SET orderStatus = ? WHERE orderID = ?");
                $stmt->execute([$newStatus, $orderID]);
            }

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Order updated successfully',
                'oldStatus' => $oldStatus,
                'newStatus' => $newStatus,
                'payment_status' => $newPaymentStatus
            ]);

        } catch (Exception $e) {
            $conn->rollback();
            error_log("Order update error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to update order: ' . $e->getMessage()]);
        }
        exit();
    }

    // ============================================================
    // DELETE: Cancel order (alternative to PUT with status=Cancelled)
    // ============================================================
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $orderID = intval($input['orderID'] ?? 0);
        $reason = trim($input['reason'] ?? '');
        
        if (!$orderID) {
            echo json_encode(['success' => false, 'message' => 'Order ID required']);
            exit();
        }

        if (empty($reason)) {
            echo json_encode(['success' => false, 'message' => 'Reason is required for cancellation']);
            exit();
        }

        // Get current order
        $stmt = $conn->prepare("SELECT orderID, orderStatus FROM `order` WHERE orderID = ?");
        $stmt->execute([$orderID]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            echo json_encode(['success' => false, 'message' => 'Order not found']);
            exit();
        }

        if ($order['orderStatus'] === 'Completed') {
            echo json_encode(['success' => false, 'message' => 'Completed orders cannot be cancelled']);
            exit();
        }

        if ($order['orderStatus'] === 'Cancelled') {
            echo json_encode(['success' => false, 'message' => 'Order is already cancelled']);
            exit();
        }

        // Start transaction
        $conn->beginTransaction();

        try {
            // Restore quantity
            $stmt = $conn->prepare("SELECT productID, quantity FROM orderitem WHERE orderID = ?");
            $stmt->execute([$orderID]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as $item) {
                $stmt = $conn->prepare("UPDATE product SET quantity = quantity + ? WHERE productID = ?");
                $stmt->execute([$item['quantity'], $item['productID']]);
            }

            // Update status
            $stmt = $conn->prepare("UPDATE `order` SET orderStatus = 'Cancelled' WHERE orderID = ?");
            $stmt->execute([$orderID]);

            $conn->commit();

            error_log("Order $orderID cancelled by admin $userID. Reason: $reason");

            echo json_encode([
                'success' => true,
                'message' => 'Order cancelled successfully'
            ]);

        } catch (Exception $e) {
            $conn->rollback();
            error_log("Order cancellation error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to cancel order: ' . $e->getMessage()]);
        }
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Admin manage order PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Admin manage order error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>