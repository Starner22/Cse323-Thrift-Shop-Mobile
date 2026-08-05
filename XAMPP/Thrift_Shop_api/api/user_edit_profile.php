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

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        exit();
    }

    // Build update query
    $updates = [];
    $params = [];
    
    if (isset($input['name']) && !empty($input['name'])) {
        $updates[] = "name = ?";
        $params[] = $input['name'];
    }
    
    if (isset($input['email']) && !empty($input['email'])) {
        $updates[] = "email = ?";
        $params[] = $input['email'];
    }
    
    if (isset($input['phone'])) {
        $updates[] = "phone = ?";
        $params[] = $input['phone'];
    }
    
    if (isset($input['address'])) {
        $updates[] = "address = ?";
        $params[] = $input['address'];
    }
    
    // Handle password change
    if (isset($input['newPassword']) && !empty($input['newPassword'])) {
        if (!isset($input['currentPassword']) || empty($input['currentPassword'])) {
            echo json_encode(['success' => false, 'message' => 'Current password is required']);
            exit();
        }
        
        // Verify current password
        $stmt = $conn->prepare("SELECT password FROM user WHERE userID = ?");
        $stmt->execute([$userID]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!password_verify($input['currentPassword'], $user['password'])) {
            echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
            exit();
        }
        
        $updates[] = "password = ?";
        $params[] = password_hash($input['newPassword'], PASSWORD_DEFAULT);
    }
    
    if (empty($updates)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }
    
    $params[] = $userID;
    $sql = "UPDATE user SET " . implode(", ", $updates) . " WHERE userID = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully'
    ]);
    
} catch (PDOException $e) {
    error_log("Update profile PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Update profile error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>