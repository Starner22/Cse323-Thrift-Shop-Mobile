<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';
require_once __DIR__ . '/../helpers/log_helper.php';

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

    $method = $_SERVER['REQUEST_METHOD'];

    // ============================================================
    // GET: Fetch orders (buyer or admin)
    // ============================================================
    if ($method === 'GET') {
        $orderID = isset($_GET['orderID']) ? intval($_GET['orderID']) : 0;
        $role = isset($_GET['role']) ? $_GET['role'] : '';

        // Get specific order details
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

            // Format items
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

        // Get all orders for the current user
        $sql = "SELECT 
                    o.orderID, o.totalPrice, o.orderStatus, o.orderDate,
                    o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_postal_code,
                    (SELECT COUNT(*) FROM orderitem WHERE orderID = o.orderID) as item_count
                FROM `order` o
                WHERE o.buyerID = ?
                ORDER BY o.orderDate DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$userID]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($orders as &$order) {
            $order['orderID'] = intval($order['orderID']);
            $order['totalPrice'] = floatval($order['totalPrice']);
            $order['item_count'] = intval($order['item_count']);
        }

        echo json_encode([
            'success' => true,
            'data' => $orders
        ]);
        exit();
    }

    // ============================================================
    // POST: Create new order (checkout)
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $addressID = intval($input['addressID'] ?? 0);
        $shipping_name = trim($input['shipping_name'] ?? '');
        $shipping_address = trim($input['shipping_address'] ?? '');
        $shipping_city = trim($input['shipping_city'] ?? '');
        $shipping_postal_code = trim($input['shipping_postal_code'] ?? '');
        $shipping_phone = trim($input['shipping_phone'] ?? '');
        $payment_method = $input['payment_method'] ?? 'COD';
        $cartItems = $input['cartItems'] ?? [];

        // Validate
        if (empty($cartItems)) {
            echo json_encode(['success' => false, 'message' => 'Cart is empty']);
            exit();
        }

        if (empty($shipping_name) || empty($shipping_address) || empty($shipping_city) || empty($shipping_postal_code)) {
            echo json_encode(['success' => false, 'message' => 'Shipping details are required']);
            exit();
        }

        // Calculate total price
        $totalPrice = 0;
        $itemsData = [];
        $sellerID = null;

        foreach ($cartItems as $item) {
            $productID = intval($item['productID']);
            $quantity = intval($item['quantity']);
            $price = floatval($item['price']);
            
            // Check stock
            $stmt = $conn->prepare("SELECT quantity, sellerID FROM product WHERE productID = ?");
            $stmt->execute([$productID]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                echo json_encode(['success' => false, 'message' => 'Product not found']);
                exit();
            }
            
            if ($product['quantity'] < $quantity) {
                echo json_encode(['success' => false, 'message' => 'Not enough stock for product']);
                exit();
            }
            
            $subtotal = $price * $quantity;
            $totalPrice += $subtotal;
            
            $itemsData[] = [
                'productID' => $productID,
                'quantity' => $quantity,
                'price_at_purchase' => $price,
                'sellerID' => $product['sellerID']
            ];
            
            if ($sellerID === null) {
                $sellerID = $product['sellerID'];
            }
        }

        // Start transaction
        $conn->beginTransaction();

        try {
            // Create order with new fields
            $sql = "INSERT INTO `order` (
                        buyerID, totalPrice, orderStatus, 
                        shipping_name, shipping_address, shipping_city, shipping_postal_code, 
                        shipping_phone, payment_method, payment_status
                    ) VALUES (?, ?, 'Pending', ?, ?, ?, ?, ?, ?, 'Pending')";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $userID,
                $totalPrice,
                $shipping_name,
                $shipping_address,
                $shipping_city,
                $shipping_postal_code,
                $shipping_phone,
                $payment_method
            ]);
            
            $orderID = $conn->lastInsertId();

            // Add order items and deduct stock
            foreach ($itemsData as $item) {
                $sql = "INSERT INTO orderitem (orderID, productID, quantity, price_at_purchase) VALUES (?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    $orderID,
                    $item['productID'],
                    $item['quantity'],
                    $item['price_at_purchase']
                ]);

                $sql = "UPDATE product SET quantity = quantity - ? WHERE productID = ?";
                $stmt = $conn->prepare($sql);
                $stmt->execute([$item['quantity'], $item['productID']]);
            }

            // Clear cart
            $sql = "DELETE FROM cartitem WHERE cartID = (SELECT cartID FROM cart WHERE buyerID = ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$userID]);

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Order placed successfully',
                'orderID' => $orderID,
                'totalPrice' => $totalPrice
            ]);

        } catch (Exception $e) {
            $conn->rollback();
            error_log("Order creation error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to place order: ' . $e->getMessage()]);
        }
        exit();
    }

    // ============================================================
    // DELETE: Cancel order
    // ============================================================
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $orderID = intval($input['orderID'] ?? 0);
        
        if (!$orderID) {
            echo json_encode(['success' => false, 'message' => 'Order ID required']);
            exit();
        }

        // Check order belongs to user and is pending
        $stmt = $conn->prepare("SELECT orderID, orderStatus FROM `order` WHERE orderID = ? AND buyerID = ?");
        $stmt->execute([$orderID, $userID]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            echo json_encode(['success' => false, 'message' => 'Order not found']);
            exit();
        }

        if ($order['orderStatus'] !== 'Pending') {
            echo json_encode(['success' => false, 'message' => 'Only pending orders can be cancelled']);
            exit();
        }

        // Get order items to restore stock
        $stmt = $conn->prepare("SELECT productID, quantity FROM orderitem WHERE orderID = ?");
        $stmt->execute([$orderID]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Start transaction
        $conn->beginTransaction();

        try {
            // Restore stock
            foreach ($items as $item) {
                $stmt = $conn->prepare("UPDATE product SET quantity = quantity + ? WHERE productID = ?");
                $stmt->execute([$item['quantity'], $item['productID']]);
            }

            // Update order status
            $stmt = $conn->prepare("UPDATE `order` SET orderStatus = 'Cancelled' WHERE orderID = ?");
            $stmt->execute([$orderID]);

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Order cancelled successfully'
            ]);

        } catch (Exception $e) {
            $conn->rollback();
            error_log("Order cancellation error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to cancel order']);
        }
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Checkout PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Checkout error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>