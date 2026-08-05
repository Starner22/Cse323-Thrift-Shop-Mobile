<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

    // Check if user is moderator or admin
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || ($user['role'] !== 'Moderator' && $user['role'] !== 'Admin')) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // ============================================================
    // GET: Fetch pending products
    // ============================================================
    if ($method === 'GET') {
        $sql = "SELECT 
                    p.*, 
                    c.name as categoryName,
                    u.name as sellerName,
                    u.email as sellerEmail
                FROM product p
                LEFT JOIN categories c ON p.categoryID = c.categoryID
                LEFT JOIN user u ON p.sellerID = u.userID
                WHERE p.status = 'pending'
                ORDER BY p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($products as &$product) {
            $product['price'] = floatval($product['price']);
            $product['quantity'] = intval($product['quantity']);
            $product['productID'] = intval($product['productID']);
            $product['sellerID'] = intval($product['sellerID']);
        }
        
        echo json_encode($products);
        exit();
    }

    // ============================================================
    // POST: Approve or reject product
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        $action = $input['action'] ?? '';
        $reason = $input['reason'] ?? null;
        
        if (!$productID) {
            echo json_encode(['success' => false, 'message' => 'Product ID required']);
            exit();
        }
        
        if (!in_array($action, ['approve', 'reject'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            exit();
        }
        
        // Verify product exists and is pending
        $stmt = $conn->prepare("SELECT productID, status FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }
        
        if ($product['status'] !== 'pending') {
            echo json_encode(['success' => false, 'message' => 'Product is not pending']);
            exit();
        }
        
        // Update status
        $newStatus = $action === 'approve' ? 'approved' : 'rejected';
        $stmt = $conn->prepare("UPDATE product SET status = ? WHERE productID = ?");
        $stmt->execute([$newStatus, $productID]);
        
        // If rejected, store reason
        if ($action === 'reject' && $reason) {
            // You can add a rejection_reason column later
            // For now, we'll log it
            error_log("Product $productID rejected. Reason: $reason");
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Product ' . ($action === 'approve' ? 'approved' : 'rejected'),
            'status' => $newStatus
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Pending products PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Pending products error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>