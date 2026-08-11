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
    // GET: Fetch all sellers
    // ============================================================
    if ($method === 'GET') {
        $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
        $sellerUserID = isset($_GET['userID']) ? intval($_GET['userID']) : 0;
        
        // Get single seller details
        if ($sellerUserID > 0) {
            $sql = "SELECT 
                        u.userID, u.name, u.email, u.phone, u.address, u.role,
                        sp.*
                    FROM user u
                    LEFT JOIN seller_profile sp ON u.userID = sp.userID
                    WHERE u.userID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$sellerUserID]);
            $seller = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$seller) {
                echo json_encode(['success' => false, 'message' => 'Seller not found']);
                exit();
            }
            
            // Get product count
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE sellerID = ?");
            $stmt->execute([$sellerUserID]);
            $productCount = $stmt->fetch(PDO::FETCH_ASSOC);
            $seller['product_count'] = intval($productCount['count']);
            
            // Get total sales (simplified - you can expand this)
            $seller['total_sales'] = 0;
            
            echo json_encode($seller);
            exit();
        }
        
        // Get all sellers
        $sql = "SELECT 
                    u.userID, u.name, u.email, u.phone, u.address, u.role,
                    sp.*
                FROM user u
                INNER JOIN seller_profile sp ON u.userID = sp.userID";
        
        if ($filter !== 'all') {
            $sql .= " WHERE sp.approval_status = ?";
        }
        
        $sql .= " ORDER BY sp.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        if ($filter !== 'all') {
            $stmt->execute([$filter]);
        } else {
            $stmt->execute();
        }
        $sellers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add product counts and sales for each seller
        foreach ($sellers as &$seller) {
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE sellerID = ?");
            $stmt->execute([$seller['userID']]);
            $count = $stmt->fetch(PDO::FETCH_ASSOC);
            $seller['product_count'] = intval($count['count']);
            $seller['total_sales'] = 0; // Simplified
        }
        
        echo json_encode($sellers);
        exit();
    }

    // ============================================================
    // POST: Suspend or restore seller
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $sellerUserID = intval($input['userID'] ?? 0);
        $action = $input['action'] ?? '';
        
        if (!$sellerUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }
        
        if (!in_array($action, ['suspend', 'restore'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            exit();
        }
        
        // Verify seller exists
        $stmt = $conn->prepare("SELECT userID FROM seller_profile WHERE userID = ?");
        $stmt->execute([$sellerUserID]);
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Seller not found']);
            exit();
        }
        
        if ($action === 'suspend') {
            $reason = trim($input['reason'] ?? 'No reason provided');
            
            // Update seller_profile status to suspended
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'suspended', rejected_reason = ? WHERE userID = ?");
            $stmt->execute([$reason, $sellerUserID]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller suspended successfully'
            ]);
        } else {
            // Restore - set back to approved
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'approved', rejected_reason = NULL WHERE userID = ?");
            $stmt->execute([$sellerUserID]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller restored successfully'
            ]);
        }
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Manage sellers PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Manage sellers error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>