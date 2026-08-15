<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
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

    $method = $_SERVER['REQUEST_METHOD'];

    
    // GET: Fetch all addresses for user
    
    if ($method === 'GET') {
        $stmt = $conn->prepare("SELECT * FROM user_addresses WHERE userID = ? ORDER BY is_default DESC, created_at DESC");
        $stmt->execute([$userID]);
        $addresses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($addresses as &$addr) {
            $addr['addressID'] = intval($addr['addressID']);
            $addr['is_default'] = intval($addr['is_default']);
        }
        
        echo json_encode([
            'success' => true,
            'addresses' => $addresses
        ]);
        exit();
    }

    
    // POST: Add new address
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $address = trim($input['address'] ?? '');
        $city = trim($input['city'] ?? '');
        $state = trim($input['state'] ?? '');
        $postal_code = trim($input['postal_code'] ?? '');
        $country = trim($input['country'] ?? 'Bangladesh');
        $phone = trim($input['phone'] ?? '');
        $is_default = isset($input['is_default']) ? intval($input['is_default']) : 0;
        
        // Validation
        if (empty($address) || empty($city) || empty($postal_code)) {
            echo json_encode(['success' => false, 'message' => 'Address, city, and postal code are required']);
            exit();
        }
        
        // Check if this is the first address
        $stmt = $conn->prepare("SELECT COUNT(*) FROM user_addresses WHERE userID = ?");
        $stmt->execute([$userID]);
        $count = $stmt->fetchColumn();
        
        // If first address, force it to be default
        if ($count == 0) {
            $is_default = 1;
        }
        
        // If setting as default, reset all others
        if ($is_default == 1) {
            $stmt = $conn->prepare("UPDATE user_addresses SET is_default = 0 WHERE userID = ?");
            $stmt->execute([$userID]);
        }
        
        $stmt = $conn->prepare("INSERT INTO user_addresses (userID, address, city, state, postal_code, country, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userID, $address, $city, $state, $postal_code, $country, $phone, $is_default]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Address added successfully',
            'addressID' => $conn->lastInsertId()
        ]);
        exit();
    }

    
    // PUT: Update address
    
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $addressID = intval($input['addressID'] ?? 0);
        
        if (!$addressID) {
            echo json_encode(['success' => false, 'message' => 'Address ID required']);
            exit();
        }
        
        // Verify address belongs to user
        $stmt = $conn->prepare("SELECT addressID FROM user_addresses WHERE addressID = ? AND userID = ?");
        $stmt->execute([$addressID, $userID]);
        if ($stmt->rowCount() === 0) {
            echo json_encode(['success' => false, 'message' => 'Address not found']);
            exit();
        }
        
        $address = trim($input['address'] ?? '');
        $city = trim($input['city'] ?? '');
        $state = trim($input['state'] ?? '');
        $postal_code = trim($input['postal_code'] ?? '');
        $country = trim($input['country'] ?? 'Bangladesh');
        $phone = trim($input['phone'] ?? '');
        $is_default = isset($input['is_default']) ? intval($input['is_default']) : 0;
        
        if (empty($address) || empty($city) || empty($postal_code)) {
            echo json_encode(['success' => false, 'message' => 'Address, city, and postal code are required']);
            exit();
        }
        
        // If setting as default, reset all others
        if ($is_default == 1) {
            $stmt = $conn->prepare("UPDATE user_addresses SET is_default = 0 WHERE userID = ?");
            $stmt->execute([$userID]);
        }
        
        $stmt = $conn->prepare("UPDATE user_addresses SET address = ?, city = ?, state = ?, postal_code = ?, country = ?, phone = ?, is_default = ? WHERE addressID = ?");
        $stmt->execute([$address, $city, $state, $postal_code, $country, $phone, $is_default, $addressID]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Address updated successfully'
        ]);
        exit();
    }

    
    // DELETE: Remove address
    
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $addressID = intval($input['addressID'] ?? 0);
        
        if (!$addressID) {
            echo json_encode(['success' => false, 'message' => 'Address ID required']);
            exit();
        }
        
        // Verify address belongs to user
        $stmt = $conn->prepare("SELECT addressID, is_default FROM user_addresses WHERE addressID = ? AND userID = ?");
        $stmt->execute([$addressID, $userID]);
        $address = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$address) {
            echo json_encode(['success' => false, 'message' => 'Address not found']);
            exit();
        }
        
        // Check if this is the only address
        $stmt = $conn->prepare("SELECT COUNT(*) FROM user_addresses WHERE userID = ?");
        $stmt->execute([$userID]);
        $count = $stmt->fetchColumn();
        
        if ($count <= 1) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete the only address. Add a new one first.']);
            exit();
        }
        
        // If deleting the default address, set another as default
        if ($address['is_default'] == 1) {
            $stmt = $conn->prepare("UPDATE user_addresses SET is_default = 1 WHERE userID = ? AND addressID != ? LIMIT 1");
            $stmt->execute([$userID, $addressID]);
        }
        
        $stmt = $conn->prepare("DELETE FROM user_addresses WHERE addressID = ?");
        $stmt->execute([$addressID]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Address deleted successfully'
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Address PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Address error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>