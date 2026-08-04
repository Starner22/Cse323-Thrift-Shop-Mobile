<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include your existing Database class
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';

try {
    // Get input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    
    // Validate required fields
    if (empty($email) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'Email and password are required'
        ]);
        exit();
    }
    
    // Get database connection using your Database class
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // Query user
    $stmt = $conn->prepare("SELECT userID, name, email, password, role FROM user WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }
    
    // Generate JWT Token
    $payload = [
        'userID' => intval($user['userID']),
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role']
    ];
    
    $token = generateJWT($payload);
    
    // Return response
    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'userID' => intval($user['userID']),
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Login PDO error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>