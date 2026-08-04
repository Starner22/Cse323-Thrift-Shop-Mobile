<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../helpers/jwt_helper.php';

try {
    // Get token from Authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    // If Authorization header not found, check for 'authorization' (lowercase)
    if (empty($authHeader)) {
        $authHeader = isset($headers['authorization']) ? $headers['authorization'] : '';
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    $token = trim($token);
    
    if (empty($token)) {
        echo json_encode([
            'valid' => false,
            'message' => 'No token provided'
        ]);
        exit();
    }
    
    // Verify token
    $payload = verifyJWT($token);
    
    if ($payload) {
        echo json_encode([
            'valid' => true,
            'user' => [
                'userID' => $payload['userID'],
                'name' => $payload['name'],
                'email' => $payload['email'],
                'role' => $payload['role']
            ]
        ]);
    } else {
        echo json_encode([
            'valid' => false,
            'message' => 'Invalid or expired token'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Verify error: " . $e->getMessage());
    echo json_encode([
        'valid' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>