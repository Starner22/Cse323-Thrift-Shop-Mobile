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

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $name = isset($input['name']) ? trim($input['name']) : '';
    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    $role = isset($input['role']) ? $input['role'] : 'Buyer';
    
    // Validate required fields
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'All fields are required'
        ]);
        exit();
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        exit();
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 6 characters'
        ]);
        exit();
    }
    
    // Validate name length
    if (strlen($name) < 2) {
        echo json_encode([
            'success' => false,
            'message' => 'Name must be at least 2 characters'
        ]);
        exit();
    }
    
    // Get database connection using your Database class
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // Check if email exists
    $stmt = $conn->prepare("SELECT userID FROM user WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Email is already registered'
        ]);
        exit();
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert user
    $stmt = $conn->prepare("INSERT INTO user (name, email, password, role) VALUES (?, ?, ?, ?)");
    $result = $stmt->execute([$name, $email, $hashedPassword, $role]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful! Please login.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Registration failed'
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Register PDO error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Register error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>