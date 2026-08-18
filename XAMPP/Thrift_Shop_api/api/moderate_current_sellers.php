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

    // Check if user is moderator or admin
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || ($user['role'] !== 'Moderator' && $user['role'] !== 'Admin')) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    
    // GET: Fetch all sellers
    
    if ($method === 'GET') {
        $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
        
        // Get all sellers with revenue from completed orders
        $sql = "SELECT 
                    u.userID, 
                    u.name, 
                    u.email, 
                    u.phone, 
                    u.address, 
                    u.role,
                    sp.sellerID,
                    sp.business_name,
                    sp.business_address,
                    sp.business_phone,
                    sp.business_email,
                    sp.tax_id,
                    sp.bank_account,
                    sp.approval_status,
                    sp.rejected_reason,
                    sp.created_at,
                    sp.updated_at,
                    (SELECT COUNT(*) FROM product WHERE sellerID = u.userID) as product_count,
                    (SELECT COUNT(*) FROM `order` o 
                    JOIN orderitem oi ON o.orderID = oi.orderID 
                    WHERE oi.productID IN (SELECT productID FROM product WHERE sellerID = u.userID) 
                    AND o.orderStatus = 'Completed') as total_orders,
                    (SELECT SUM(oi.price_at_purchase * oi.quantity) 
                    FROM `order` o 
                    JOIN orderitem oi ON o.orderID = oi.orderID 
                    WHERE oi.productID IN (SELECT productID FROM product WHERE sellerID = u.userID) 
                    AND o.orderStatus = 'Completed') as total_revenue
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
        
        // Format response
        $formattedSellers = [];
        foreach ($sellers as $seller) {
            $formattedSellers[] = [
                'userID' => intval($seller['userID']),
                'name' => $seller['name'],
                'email' => $seller['email'],
                'phone' => $seller['phone'] ?? 'N/A',
                'business_name' => $seller['business_name'],
                'approval_status' => $seller['approval_status'],
                'product_count' => intval($seller['product_count'] ?? 0),
                'total_orders' => intval($seller['total_orders'] ?? 0),
                'total_revenue' => floatval($seller['total_revenue'] ?? 0),
                'created_at' => $seller['created_at']
            ];
        }
        
        echo json_encode($formattedSellers);
        exit();
    }

    
    // POST: Suspend or restore seller
    
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
            
            require_once __DIR__ . '/../helpers/log_helper.php';
            logSellerAction($userID, 'suspend_seller', $sellerUserID, $reason);

            echo json_encode([
                'success' => true,
                'message' => 'Seller suspended successfully'
            ]);
        } else {
            // Restore - set back to approved
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'approved', rejected_reason = NULL WHERE userID = ?");
            $stmt->execute([$sellerUserID]);

            require_once __DIR__ . '/../helpers/log_helper.php';
            logSellerAction($userID, 'restore_seller', $sellerUserID, null);            
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller restored successfully'
            ]);
        }
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Moderate current sellers PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Moderate current sellers error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>