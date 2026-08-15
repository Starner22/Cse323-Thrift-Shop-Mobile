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
    
    $adminID = $payload['userID'];
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Check if user is admin
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$adminID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    
    // GET: Fetch products with stats, search, filter
    
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status = isset($_GET['status']) ? $_GET['status'] : '';
        $categoryID = isset($_GET['category']) ? intval($_GET['category']) : 0;
        $sellerID = isset($_GET['sellerID']) ? intval($_GET['sellerID']) : 0;
        $productID = isset($_GET['productID']) ? intval($_GET['productID']) : 0;

        // Get single product
        if ($productID > 0) {
            $sql = "SELECT 
                        p.*, 
                        c.name as categoryName,
                        u.name as sellerName,
                        u.email as sellerEmail
                    FROM product p
                    LEFT JOIN categories c ON p.categoryID = c.categoryID
                    LEFT JOIN user u ON p.sellerID = u.userID
                    WHERE p.productID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$productID]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                echo json_encode(['success' => false, 'message' => 'Product not found']);
                exit();
            }
            
            $product['productID'] = intval($product['productID']);
            $product['price'] = floatval($product['price']);
            $product['quantity'] = intval($product['quantity']);
            $product['sellerID'] = intval($product['sellerID']);
            $product['can_display'] = intval($product['can_display'] ?? 0);
            $product['seller_active'] = intval($product['seller_active'] ?? 1);
            
            echo json_encode([
                'success' => true,
                'data' => $product
            ]);
            exit();
        }

        // Get product stats
        $statsSql = "SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
                    FROM product";
        $statsStmt = $conn->query($statsSql);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
        
        $stats['total'] = intval($stats['total']);
        $stats['approved'] = intval($stats['approved']);
        $stats['pending'] = intval($stats['pending']);
        $stats['rejected'] = intval($stats['rejected']);

        // Build product list query
        $whereClause = "WHERE 1=1";
        $params = [];
        
        if (!empty($search)) {
            $whereClause .= " AND (p.name LIKE ? OR p.description LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if (!empty($status) && in_array($status, ['pending', 'approved', 'rejected'])) {
            $whereClause .= " AND p.status = ?";
            $params[] = $status;
        }
        
        if ($categoryID > 0) {
            $whereClause .= " AND p.categoryID = ?";
            $params[] = $categoryID;
        }
        
        if ($sellerID > 0) {
            $whereClause .= " AND p.sellerID = ?";
            $params[] = $sellerID;
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM product p " . $whereClause;
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($params);
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = intval($totalResult['total']);

        // Main query
        $sql = "SELECT 
                    p.productID, p.name, p.description, p.price, p.condition, 
                    p.quantity, p.categoryID, p.image_path, p.status, p.created_at,
                    p.can_display, p.seller_active, p.moderation_notes,
                    c.name as categoryName,
                    u.name as sellerName,
                    u.email as sellerEmail
                FROM product p
                LEFT JOIN categories c ON p.categoryID = c.categoryID
                LEFT JOIN user u ON p.sellerID = u.userID
                " . $whereClause . "
                ORDER BY p.created_at DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($offset);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedProducts = [];
        foreach ($products as $product) {
            $formattedProducts[] = [
                'productID' => intval($product['productID']),
                'name' => $product['name'],
                'description' => $product['description'],
                'price' => floatval($product['price']),
                'condition' => $product['condition'],
                'quantity' => intval($product['quantity']),
                'categoryID' => $product['categoryID'] ? intval($product['categoryID']) : null,
                'categoryName' => $product['categoryName'] ?? 'Uncategorized',
                'image_path' => $product['image_path'],
                'status' => $product['status'],
                'created_at' => $product['created_at'],
                'can_display' => intval($product['can_display'] ?? 0),
                'seller_active' => intval($product['seller_active'] ?? 1),
                'sellerName' => $product['sellerName'] ?? 'Unknown Seller',
                'sellerEmail' => $product['sellerEmail'] ?? 'N/A',
                'moderation_notes' => $product['moderation_notes']
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $formattedProducts,
            'stats' => $stats,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $totalCount,
                'totalPages' => $totalCount > 0 ? ceil($totalCount / $limit) : 1
            ]
        ]);
        exit();
    }

    
    // POST: Update product status (approve/reject/hide/show/delete)
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        $action = $input['action'] ?? '';
        $reason = trim($input['reason'] ?? '');
        
        if (!$productID) {
            echo json_encode(['success' => false, 'message' => 'Product ID required']);
            exit();
        }
        
        if (!in_array($action, ['approve', 'reject', 'hide', 'show', 'delete'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            exit();
        }

        $stmt = $conn->prepare("SELECT p.productID, p.status, p.name, u.name as sellerName FROM product p LEFT JOIN user u ON p.sellerID = u.userID WHERE p.productID = ?");
        $stmt->execute([$productID]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }

        if ($action === 'approve') {
            $stmt = $conn->prepare("UPDATE product SET status = 'approved' WHERE productID = ?");
            $stmt->execute([$productID]);
            logProductAction($adminID, 'approve_product', $productID, null);
            echo json_encode(['success' => true, 'message' => 'Product approved successfully']);
            exit();
        }
        
        if ($action === 'reject') {
            if (empty($reason)) {
                echo json_encode(['success' => false, 'message' => 'Reason is required for rejection']);
                exit();
            }
            $stmt = $conn->prepare("UPDATE product SET status = 'rejected', moderation_notes = ? WHERE productID = ?");
            $stmt->execute([$reason, $productID]);
            logProductAction($adminID, 'reject_product', $productID, $reason);
            echo json_encode(['success' => true, 'message' => 'Product rejected']);
            exit();
        }
        
        if ($action === 'hide') {
            $stmt = $conn->prepare("UPDATE product SET can_display = 0, last_moderated_at = NOW() WHERE productID = ?");
            $stmt->execute([$productID]);
            logProductAction($adminID, 'hide_product', $productID, null);
            echo json_encode(['success' => true, 'message' => 'Product hidden successfully']);
            exit();
        }
        
        if ($action === 'show') {
            $stmt = $conn->prepare("UPDATE product SET can_display = 1, last_moderated_at = NOW() WHERE productID = ?");
            $stmt->execute([$productID]);
            logProductAction($adminID, 'show_product', $productID, null);
            echo json_encode(['success' => true, 'message' => 'Product shown successfully']);
            exit();
        }
        
        if ($action === 'delete') {
            $stmt = $conn->prepare("SELECT image_path FROM product WHERE productID = ?");
            $stmt->execute([$productID]);
            $imagePath = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($imagePath && $imagePath['image_path']) {
                $filePath = __DIR__ . '/../' . $imagePath['image_path'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }
            $stmt = $conn->prepare("DELETE FROM product WHERE productID = ?");
            $stmt->execute([$productID]);
            logProductAction($adminID, 'delete_product', $productID, null);
            echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
            exit();
        }
        
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        exit();
    }

    
    // PUT: Edit product details WITH DETAILED LOGGING
    
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        
        if (!$productID) {
            echo json_encode(['success' => false, 'message' => 'Product ID required']);
            exit();
        }

        $stmt = $conn->prepare("SELECT productID, name FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }

        // Get old values before update
        $stmt = $conn->prepare("SELECT name, description, price, quantity, `condition`, categoryID, status FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        $oldData = $stmt->fetch(PDO::FETCH_ASSOC);

        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $price = floatval($input['price'] ?? 0);
        $quantity = intval($input['quantity'] ?? 0);
        $condition = $input['condition'] ?? 'Normal';
        $categoryID = intval($input['categoryID'] ?? 0);
        $status = $input['status'] ?? '';
        
        if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Product name is required']);
            exit();
        }
        
        if ($price <= 0) {
            echo json_encode(['success' => false, 'message' => 'Valid price is required']);
            exit();
        }

        $updates = [];
        $params = [];

        $updates[] = "name = ?";
        $params[] = $name;

        $updates[] = "description = ?";
        $params[] = $description;

        $updates[] = "price = ?";
        $params[] = $price;

        $updates[] = "quantity = ?";
        $params[] = $quantity;

        $updates[] = "`condition` = ?";
        $params[] = $condition;

        if ($categoryID > 0) {
            $updates[] = "categoryID = ?";
            $params[] = $categoryID;
        }

        if (!empty($status) && in_array($status, ['pending', 'approved', 'rejected'])) {
            $updates[] = "status = ?";
            $params[] = $status;
        }

        $updates[] = "last_moderated_at = NOW()";
        $params[] = $productID;

        $sql = "UPDATE product SET " . implode(", ", $updates) . " WHERE productID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        // Get new values after update
        $newData = [
            'name' => $name,
            'description' => $description,
            'price' => $price,
            'quantity' => $quantity,
            'condition' => $condition,
            'categoryID' => $categoryID,
            'status' => $status ?? $oldData['status']
        ];

        // Log with detailed changes
        require_once __DIR__ . '/../helpers/log_helper.php';
        logProductEdit($adminID, $productID, $oldData, $newData);

        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully'
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Admin manage product PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Admin manage product error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>