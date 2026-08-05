<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, DELETE, OPTIONS");
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

    // ============================================================
    // GET: Fetch seller's products
    // ============================================================
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $status = isset($_GET['status']) ? $_GET['status'] : null;
        
        $sql = "SELECT 
                    p.*, 
                    c.name as categoryName
                FROM product p
                LEFT JOIN categories c ON p.categoryID = c.categoryID
                WHERE p.sellerID = ?";
        
        if ($status) {
            $sql .= " AND p.status = ?";
        }
        
        $sql .= " ORDER BY p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        if ($status) {
            $stmt->execute([$userID, $status]);
        } else {
            $stmt->execute([$userID]);
        }
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up data
        foreach ($products as &$product) {
            $product['price'] = floatval($product['price']);
            $product['quantity'] = intval($product['quantity']);
            $product['productID'] = intval($product['productID']);
            $product['categoryID'] = $product['categoryID'] ? intval($product['categoryID']) : null;
        }
        
        echo json_encode($products);
        exit();
    }

    // ============================================================
    // DELETE: Delete a product
    // ============================================================
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        
        if (!$productID) {
            echo json_encode(['success' => false, 'message' => 'Product ID required']);
            exit();
        }
        
        // Verify product belongs to this seller
        $stmt = $conn->prepare("SELECT sellerID, image_path FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }
        
        if ($product['sellerID'] != $userID) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit();
        }
        
        // Delete image file if exists
        if ($product['image_path']) {
            $imagePath = __DIR__ . '/../' . $product['image_path'];
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }
        
        // Delete product
        $stmt = $conn->prepare("DELETE FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Product deleted successfully'
        ]);
        exit();
    }

    // PUT: update
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $productID = intval($input['productID'] ?? 0);
        
        if (!$productID) {
            echo json_encode(['success' => false, 'message' => 'Product ID required']);
            exit();
        }
        
        // Verify product belongs to this seller
        $stmt = $conn->prepare("SELECT sellerID, status FROM product WHERE productID = ?");
        $stmt->execute([$productID]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }
        
        if ($product['sellerID'] != $userID) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit();
        }
        
        // Validate fields
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $categoryID = intval($input['categoryID'] ?? 0);
        $condition = $input['condition'] ?? 'Normal';
        $price = floatval($input['price'] ?? 0);
        $quantity = intval($input['quantity'] ?? 1);
        $imageBase64 = $input['image'] ?? null;
        
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
        
        // Handle image upload if new image provided
        $imagePath = null;
        if ($imageBase64) {
            // Delete old image if exists
            if ($product['image_path']) {
                $oldImagePath = __DIR__ . '/../' . $product['image_path'];
                if (file_exists($oldImagePath)) {
                    unlink($oldImagePath);
                }
            }
            
            // Save new image
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
        
        // Build update query
        $updates = [];
        $params = [];
        
        $updates[] = "name = ?";
        $params[] = $name;
        
        $updates[] = "description = ?";
        $params[] = $description;
        
        $updates[] = "categoryID = ?";
        $params[] = $categoryID;
        
        $updates[] = "`condition` = ?";
        $params[] = $condition;
        
        $updates[] = "price = ?";
        $params[] = $price;
        
        $updates[] = "quantity = ?";
        $params[] = $quantity;
        
        if ($imagePath) {
            $updates[] = "image_path = ?";
            $params[] = $imagePath;
        }
        
        // Reset status to pending for re-approval
        $updates[] = "status = 'pending'";
        $params[] = $productID;
        
        $sql = "UPDATE product SET " . implode(", ", $updates) . " WHERE productID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Product updated and submitted for re-approval'
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Seller products PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Seller products error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>