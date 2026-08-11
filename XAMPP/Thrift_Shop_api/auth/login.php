<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);  
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    
    if (empty($email) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'Email and password are required'
        ]);
        exit();
    }

    $db = Database::getInstance();
    $conn = $db->getConnection();

    $stmt = $conn->prepare("
        SELECT userID, name, email, password, role, 
               can_moderate_sellers, 
               can_moderate_products, 
               can_approve_new_sellers, 
               can_approve_new_products,
               can_manage_reports, 
               can_view_analytics, 
               can_manage_moderators 
        FROM user 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }
    
    $permissions = [
        'can_moderate_sellers' => intval($user['can_moderate_sellers'] ?? 0),
        'can_moderate_products' => intval($user['can_moderate_products'] ?? 0),
        'can_approve_new_sellers' => intval($user['can_approve_new_sellers'] ?? 0),
        'can_approve_new_products' => intval($user['can_approve_new_products'] ?? 0),
        'can_manage_reports' => intval($user['can_manage_reports'] ?? 0),
        'can_view_analytics' => intval($user['can_view_analytics'] ?? 0),
        'can_manage_moderators' => intval($user['can_manage_moderators'] ?? 0)
    ];
    
    // Debug log
    error_log("Login permissions for user {$user['email']}: " . print_r($permissions, true));
    
    $payload = [
        'userID' => intval($user['userID']),
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'permissions' => $permissions
    ];
    
    $token = generateJWT($payload);
    
    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'userID' => intval($user['userID']),
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'permissions' => $permissions
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Login PDO error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>