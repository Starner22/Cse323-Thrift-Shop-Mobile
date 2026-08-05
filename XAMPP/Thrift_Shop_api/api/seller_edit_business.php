<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';
require_once __DIR__ . '/../helpers/seller_helper.php';

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

    // Check if user is a seller
    $sellerInfo = isSeller($conn, $userID);
    if (!$sellerInfo['isSeller']) {
        echo json_encode(['success' => false, 'message' => 'You are not a seller']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        exit();
    }

    // Build update query - ALWAYS reset status to pending when any field changes
    $updates = [];
    $params = [];
    
    if (isset($input['business_name']) && !empty($input['business_name'])) {
        $updates[] = "business_name = ?";
        $params[] = $input['business_name'];
    }
    
    if (isset($input['business_address'])) {
        $updates[] = "business_address = ?";
        $params[] = $input['business_address'];
    }
    
    if (isset($input['business_phone']) && !empty($input['business_phone'])) {
        $updates[] = "business_phone = ?";
        $params[] = $input['business_phone'];
    }
    
    if (isset($input['business_email'])) {
        $updates[] = "business_email = ?";
        $params[] = $input['business_email'];
    }
    
    if (isset($input['tax_id'])) {
        $updates[] = "tax_id = ?";
        $params[] = $input['tax_id'];
    }
    
    if (isset($input['bank_account'])) {
        $updates[] = "bank_account = ?";
        $params[] = $input['bank_account'];
    }
    
    if (empty($updates)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }
    
    // IMPORTANT: Reset approval_status to pending and clear rejected_reason
    $updates[] = "approval_status = 'pending'";
    $updates[] = "rejected_reason = NULL";
    $updates[] = "approved_at = NULL";
    $updates[] = "updated_at = CURRENT_TIMESTAMP()";
    
    $params[] = $userID;
    $sql = "UPDATE seller_profile SET " . implode(", ", $updates) . " WHERE userID = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode([
        'success' => true,
        'message' => 'Business profile updated! Changes are now pending review.'
    ]);
    
} catch (PDOException $e) {
    error_log("Update seller profile PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Update seller profile error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>