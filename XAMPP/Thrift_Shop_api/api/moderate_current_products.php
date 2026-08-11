<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS");
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
    // GET: Fetch all products for moderation
    // ============================================================
    if ($method === 'GET') {
        $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
        
        $sql = "SELECT 
                    p.*, 
                    c.name as categoryName,
                    u.name as sellerName,
                    u.email as sellerEmail
                FROM product p
                LEFT JOIN categories c ON p.categoryID = c.categoryID
                LEFT JOIN user u ON p.sellerID = u.userID";
        
        if ($filter !== 'all') {
            switch ($filter) {
                case 'visible':
                    $sql .= " WHERE p.can_display = 1 AND p.seller_active = 1";
                    break;
                case 'hidden_by_mod':
                    $sql .= " WHERE p.can_display = 0";
                    break;
                case 'hidden_by_seller':
                    $sql .= " WHERE p.seller_active = 0";
                    break;
                case 'pending':
                    $sql .= " WHERE p.status = 'pending'";
                    break;
                case 'rejected':
                    $sql .= " WHERE p.status = 'rejected'";
                    break;
                default:
                    // all - no filter
                    break;
            }
        }
        
        $sql .= " ORDER BY p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($products as &$product) {
            $product['price'] = floatval($product['price']);
            $product['quantity'] = intval($product['quantity']);
            $product['productID'] = intval($product['productID']);
            $product['sellerID'] = intval($product['sellerID']);
            $product['can_display'] = intval($product['can_display'] ?? 0);
            $product['seller_active'] = intval($product['seller_active'] ?? 1);
        }
        
        echo json_encode($products);
        exit();
    }

    // ============================================================
    // PUT: Update product visibility or details
    // ============================================================
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        $action = $input['action'] ?? '';
        
        if (!$productID) {
            echo json_encode(['success' => false, 'message' => 'Product ID required']);
            exit();
        }
        
        // Verify product exists
        $stmt = $conn->prepare("SELECT productID FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }
        
        if ($action === 'toggle_display') {
            $canDisplay = intval($input['canDisplay'] ?? 0);
            $stmt = $conn->prepare("UPDATE product SET can_display = ?, last_moderated_at = NOW() WHERE productID = ?");
            $stmt->execute([$canDisplay, $productID]);

            require_once __DIR__ . '/../helpers/log_helper.php';
            $actionName = $canDisplay ? 'show_product' : 'hide_product';
            logProductAction($userID, $actionName, $productID, null);

            
            echo json_encode([
                'success' => true,
                'message' => $canDisplay ? 'Product is now visible' : 'Product is now hidden',
                'can_display' => $canDisplay
            ]);
            exit();
        }
        
        if ($action === 'update_details') {
            $name = trim($input['name'] ?? '');
            $description = trim($input['description'] ?? '');
            $price = floatval($input['price'] ?? 0);
            $quantity = intval($input['quantity'] ?? 0);
            $condition = $input['condition'] ?? 'Normal';
            
            if (empty($name)) {
                echo json_encode(['success' => false, 'message' => 'Name is required']);
                exit();
            }
            
            if ($price <= 0) {
                echo json_encode(['success' => false, 'message' => 'Valid price is required']);
                exit();
            }
            
            $stmt = $conn->prepare("UPDATE product SET name = ?, description = ?, price = ?, quantity = ?, `condition` = ?, last_moderated_at = NOW() WHERE productID = ?");
            $stmt->execute([$name, $description, $price, $quantity, $condition, $productID]);
            
            require_once __DIR__ . '/../helpers/log_helper.php';
            $details = json_encode(['updated_fields' => ['name', 'description', 'price', 'quantity', 'condition']]);
            logProductAction($userID, 'edit_product', $productID, $details);
            
            echo json_encode([
                'success' => true,
                'message' => 'Product updated successfully'
            ]);
            exit();
        }
        
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        exit();
    }

    // ============================================================
    // POST: Add moderation note
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        $note = trim($input['note'] ?? '');
        $action = $input['action'] ?? '';
        
        if ($action === 'add_note') {
            if (!$productID) {
                echo json_encode(['success' => false, 'message' => 'Product ID required']);
                exit();
            }
            
            if (empty($note)) {
                echo json_encode(['success' => false, 'message' => 'Note is required']);
                exit();
            }
            
            $stmt = $conn->prepare("UPDATE product SET moderation_notes = ?, last_moderated_at = NOW() WHERE productID = ?");
            $stmt->execute([$note, $productID]);
            
            require_once __DIR__ . '/../helpers/log_helper.php';
            logProductAction($userID, 'add_note', $productID, $note);


            echo json_encode(['success' => true,'message' => 'Note added successfully']);
            exit();
        }
        
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Moderate products PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Moderate products error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>