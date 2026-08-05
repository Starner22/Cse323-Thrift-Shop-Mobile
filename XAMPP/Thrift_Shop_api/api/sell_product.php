<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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

    // Check if user is a seller
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Seller') {
        echo json_encode(['success' => false, 'message' => 'Only sellers can list products']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        exit();
    }

    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $categoryID = intval($input['categoryID'] ?? 0);
    $condition = $input['condition'] ?? 'Normal';
    $price = floatval($input['price'] ?? 0);
    $quantity = intval($input['quantity'] ?? 1);
    $imageBase64 = $input['image'] ?? null;
    $location = $input['location'] ?? null;

    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Product name is required']);
        exit();
    }

    if (empty($description)) {
        echo json_encode(['success' => false, 'message' => 'Description is required']);
        exit();
    }

    if ($categoryID <= 0) {
        echo json_encode(['success' => false, 'message' => 'Category is required']);
        exit();
    }

    if ($price <= 0) {
        echo json_encode(['success' => false, 'message' => 'Valid price is required']);
        exit();
    }

    if ($quantity < 1) {
        echo json_encode(['success' => false, 'message' => 'Quantity must be at least 1']);
        exit();
    }

    // Handle image upload
    $imagePath = null;
    if ($imageBase64) {
        $imageData = base64_decode(preg_replace('#^data:image/[^;]+;base64,#', '', $imageBase64));
        if ($imageData) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $filename = 'product_' . time() . '_' . uniqid() . '.jpg';
            $filepath = $uploadDir . $filename;
            
            if (file_put_contents($filepath, $imageData)) {
                $imagePath = 'uploads/' . $filename;
            }
        }
    }

    $sql = "INSERT INTO product (name, description, price, `condition`, quantity, categoryID, image_path, sellerID, status, location) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $name,
        $description,
        $price,
        $condition,
        $quantity,
        $categoryID,
        $imagePath,
        $userID,
        $location
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Product submitted for review',
        'productID' => $conn->lastInsertId()
    ]);

} catch (PDOException $e) {
    error_log("Create product PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Create product error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>