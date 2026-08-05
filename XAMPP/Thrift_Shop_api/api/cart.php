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

try {
    // Get authenticated user
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
    // 1. GET: Fetch cart items
    // ============================================================
    if ($method === 'GET') {
        // Get or create cart for user
        $stmt = $conn->prepare("SELECT cartID FROM cart WHERE buyerID = ?");
        $stmt->execute([$userID]);
        $cart = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cart) {
            // Create cart
            $stmt = $conn->prepare("INSERT INTO cart (buyerID) VALUES (?)");
            $stmt->execute([$userID]);
            $cartID = $conn->lastInsertId();
        } else {
            $cartID = $cart['cartID'];
        }
        
        // Get cart items with product details
        $stmt = $conn->prepare("
            SELECT 
                ci.cartItemID, ci.productID, ci.quantity,
                p.name, p.price, p.image_path as image,
                p.condition, p.quantity as stock_quantity
            FROM cartitem ci
            JOIN product p ON ci.productID = p.productID
            WHERE ci.cartID = ?
            ORDER BY ci.cartItemID DESC
        ");
        $stmt->execute([$cartID]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $items = [];
        $totalItems = 0;
        $totalPrice = 0;
        
        foreach ($results as $row) {
            $subtotal = floatval($row['price']) * intval($row['quantity']);
            $items[] = [
                'cartItemID' => intval($row['cartItemID']),
                'productID' => intval($row['productID']),
                'name' => $row['name'],
                'price' => floatval($row['price']),
                'quantity' => intval($row['quantity']),
                'subtotal' => floatval($subtotal),
                'image' => $row['image'],
                'condition' => $row['condition'],
                'stock' => intval($row['stock_quantity']),
                'inStock' => $row['stock_quantity'] >= $row['quantity']
            ];
            $totalItems += intval($row['quantity']);
            $totalPrice += $subtotal;
        }
        
        echo json_encode([
            'success' => true,
            'cartID' => intval($cartID),
            'items' => $items,
            'totalItems' => $totalItems,
            'totalPrice' => floatval($totalPrice)
        ]);
        exit();
    }

    // ============================================================
    // 2. POST: Add item to cart
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        $quantity = intval($input['quantity'] ?? 1);
        
        if (!$productID || $quantity < 1) {
            echo json_encode(['success' => false, 'message' => 'Invalid product or quantity']);
            exit();
        }
        
        // Check if product exists and has stock
        $stmt = $conn->prepare("SELECT productID, quantity, price, status FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }
        
        if ($product['status'] !== 'approved') {
            echo json_encode(['success' => false, 'message' => 'Product not available']);
            exit();
        }
        
        if ($product['quantity'] < $quantity) {
            echo json_encode([
                'success' => false, 
                'message' => 'Not enough stock. Available: ' . $product['quantity']
            ]);
            exit();
        }
        
        // Get or create cart
        $stmt = $conn->prepare("SELECT cartID FROM cart WHERE buyerID = ?");
        $stmt->execute([$userID]);
        $cart = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cart) {
            $stmt = $conn->prepare("INSERT INTO cart (buyerID) VALUES (?)");
            $stmt->execute([$userID]);
            $cartID = $conn->lastInsertId();
        } else {
            $cartID = $cart['cartID'];
        }
        
        // Add to cartitem with ON DUPLICATE KEY UPDATE
        $stmt = $conn->prepare("
            INSERT INTO cartitem (cartID, productID, quantity) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
        ");
        $stmt->execute([$cartID, $productID, $quantity, $quantity]);
        
        // Get updated cart count
        $stmt = $conn->prepare("SELECT SUM(quantity) as count FROM cartitem WHERE cartID = ?");
        $stmt->execute([$cartID]);
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Added to cart',
            'cartID' => intval($cartID),
            'cartCount' => intval($count['count'] ?? 0)
        ]);
        exit();
    }

    // ============================================================
    // 3. PUT: Update quantity (or remove if quantity = 0)
    // ============================================================
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $cartItemID = intval($input['cartItemID'] ?? 0);
        $quantity = intval($input['quantity'] ?? 0);
        
        if (!$cartItemID) {
            echo json_encode(['success' => false, 'message' => 'Invalid cart item']);
            exit();
        }
        
        // Verify item belongs to this user
        $stmt = $conn->prepare("
            SELECT ci.cartItemID, ci.productID, ci.quantity, p.quantity as stock
            FROM cartitem ci
            JOIN cart c ON ci.cartID = c.cartID
            JOIN product p ON ci.productID = p.productID
            WHERE ci.cartItemID = ? AND c.buyerID = ?
        ");
        $stmt->execute([$cartItemID, $userID]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$item) {
            echo json_encode(['success' => false, 'message' => 'Item not found']);
            exit();
        }
        
        // If quantity is 0, remove item
        if ($quantity === 0) {
            $stmt = $conn->prepare("DELETE FROM cartitem WHERE cartItemID = ?");
            $stmt->execute([$cartItemID]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Item removed from cart'
            ]);
            exit();
        }
        
        // Check stock
        if ($item['stock'] < $quantity) {
            echo json_encode([
                'success' => false, 
                'message' => 'Not enough stock. Available: ' . $item['stock']
            ]);
            exit();
        }
        
        // Update quantity
        $stmt = $conn->prepare("UPDATE cartitem SET quantity = ? WHERE cartItemID = ?");
        $stmt->execute([$quantity, $cartItemID]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Cart updated'
        ]);
        exit();
    }

    // ============================================================
    // 4. DELETE: Remove item from cart
    // ============================================================
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $cartItemID = intval($input['cartItemID'] ?? 0);
        
        if (!$cartItemID) {
            echo json_encode(['success' => false, 'message' => 'Invalid cart item']);
            exit();
        }
        
        // Verify item belongs to this user
        $stmt = $conn->prepare("
            SELECT ci.cartItemID
            FROM cartitem ci
            JOIN cart c ON ci.cartID = c.cartID
            WHERE ci.cartItemID = ? AND c.buyerID = ?
        ");
        $stmt->execute([$cartItemID, $userID]);
        
        if ($stmt->rowCount() === 0) {
            echo json_encode(['success' => false, 'message' => 'Item not found']);
            exit();
        }
        
        $stmt = $conn->prepare("DELETE FROM cartitem WHERE cartItemID = ?");
        $stmt->execute([$cartItemID]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Item removed from cart'
        ]);
        exit();
    }

    // ============================================================
    // 5. Method not allowed
    // ============================================================
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
    exit();

} catch (PDOException $e) {
    error_log("Cart PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Cart error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>