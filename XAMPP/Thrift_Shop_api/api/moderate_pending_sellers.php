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
    // GET: Fetch pending seller applications
    // ============================================================
    if ($method === 'GET') {
        $sql = "SELECT 
                    u.userID,
                    u.name,
                    u.email,
                    u.phone,
                    u.address,
                    u.registration_date as created_at,
                    sp.business_name,
                    sp.business_address,
                    sp.business_phone,
                    sp.business_email,
                    sp.tax_id,
                    sp.bank_account
                FROM seller_profile sp
                INNER JOIN user u ON sp.userID = u.userID
                WHERE sp.approval_status = 'pending'
                ORDER BY sp.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $sellers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($sellers);
        exit();
    }

    // ============================================================
    // POST: Approve or reject seller application
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $sellerUserID = intval($input['userID'] ?? 0);
        $action = $input['action'] ?? '';
        $reason = $input['reason'] ?? null;
        
        if (!$sellerUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }
        
        if (!in_array($action, ['approve', 'reject'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            exit();
        }
        
        // Verify seller exists and is pending
        $stmt = $conn->prepare("SELECT userID, approval_status FROM seller_profile WHERE userID = ?");
        $stmt->execute([$sellerUserID]);
        $seller = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$seller) {
            echo json_encode(['success' => false, 'message' => 'Seller not found']);
            exit();
        }
        
        if ($seller['approval_status'] !== 'pending') {
            echo json_encode(['success' => false, 'message' => 'Seller application is not pending']);
            exit();
        }
        
        if ($action === 'approve') {
            // Update seller_profile status
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'approved', approved_at = NOW() WHERE userID = ?");
            $stmt->execute([$sellerUserID]);
            
            // Update user role to Seller
            $stmt = $conn->prepare("UPDATE user SET role = 'Seller' WHERE userID = ?");
            $stmt->execute([$sellerUserID]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller approved successfully'
            ]);
        } else {
            // Reject - update status only, keep role as Buyer
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'rejected', rejected_reason = ? WHERE userID = ?");
            $stmt->execute([$reason, $sellerUserID]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller rejected'
            ]);
        }
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Pending sellers PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Pending sellers error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>