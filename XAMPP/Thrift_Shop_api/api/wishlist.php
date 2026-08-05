<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';

try {
    // Get token from Authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (empty($authHeader)) {
        $authHeader = isset($headers['authorization']) ? $headers['authorization'] : '';
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    $token = trim($token);
    
    if (empty($token)) {
        echo json_encode(['error' => 'No token provided']);
        exit();
    }
    
    // Verify token and get user ID
    $payload = verifyJWT($token);
    if (!$payload) {
        echo json_encode(['error' => 'Invalid or expired token']);
        exit();
    }
    
    $userID = $payload['userID'];
    $db = Database::getInstance();
    $conn = $db->getConnection();

    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetWishlist($conn, $userID);
            break;
            
        case 'POST':
            handleAddToWishlist($conn, $userID);
            break;
            
        case 'DELETE':
            handleRemoveFromWishlist($conn, $userID);
            break;
            
        default:
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
    
} catch (PDOException $e) {
    error_log("Wishlist PDO error: " . $e->getMessage());
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Wishlist error: " . $e->getMessage());
    echo json_encode(['error' => $e->getMessage()]);
}


function handleGetWishlist($conn, $userID) {
    try {
        // First, check if user has a wishlist
        $stmt = $conn->prepare("SELECT wishlistID FROM wishlist WHERE buyerID = ?");
        $stmt->execute([$userID]);
        $wishlist = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$wishlist) {
            
            echo json_encode([]);
            return;
        }
        
        $wishlistID = $wishlist['wishlistID'];
        
        
        $sql = "
            SELECT 
                wi.wishlistItemID,
                wi.productID,
                p.name,
                p.price,
                p.condition,
                p.quantity,
                p.image_path as image
            FROM wishlistitem wi
            INNER JOIN product p ON wi.productID = p.productID
            WHERE wi.wishlistID = ?
            ORDER BY wi.wishlistItemID DESC
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$wishlistID]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the response
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'wishlistItemID' => intval($item['wishlistItemID']),
                'productID' => intval($item['productID']),
                'name' => $item['name'],
                'price' => floatval($item['price']),
                'condition' => $item['condition'],
                'quantity' => intval($item['quantity']),
                'image' => $item['image']
            ];
        }
        
        echo json_encode($result);
        
    } catch (PDOException $e) {
        error_log("Get wishlist error: " . $e->getMessage());
        echo json_encode(['error' => 'Failed to fetch wishlist']);
    }
}


function handleAddToWishlist($conn, $userID) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['productId'])) {
            echo json_encode(['error' => 'Product ID required']);
            return;
        }
        
        $productID = intval($input['productId']);
        
        // Check if product exists
        $stmt = $conn->prepare("SELECT productID FROM product WHERE productID = ? AND status = 'approved'");
        $stmt->execute([$productID]);
        if ($stmt->rowCount() === 0) {
            echo json_encode(['error' => 'Product not found']);
            return;
        }
        
        // Check if user has a wishlist, if not create one
        $stmt = $conn->prepare("SELECT wishlistID FROM wishlist WHERE buyerID = ?");
        $stmt->execute([$userID]);
        $wishlist = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$wishlist) {
            // Create wishlist
            $stmt = $conn->prepare("INSERT INTO wishlist (buyerID) VALUES (?)");
            $stmt->execute([$userID]);
            $wishlistID = $conn->lastInsertId();
        } else {
            $wishlistID = $wishlist['wishlistID'];
        }
        
        // Check if product is already in wishlist
        $stmt = $conn->prepare("SELECT wishlistItemID FROM wishlistitem WHERE wishlistID = ? AND productID = ?");
        $stmt->execute([$wishlistID, $productID]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['error' => 'Product already in wishlist']);
            return;
        }
        
        // Add to wishlist
        $stmt = $conn->prepare("INSERT INTO wishlistitem (wishlistID, productID) VALUES (?, ?)");
        $stmt->execute([$wishlistID, $productID]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Product added to wishlist'
        ]);
        
    } catch (PDOException $e) {
        error_log("Add to wishlist error: " . $e->getMessage());
        echo json_encode(['error' => 'Failed to add to wishlist']);
    }
}

function handleRemoveFromWishlist($conn, $userID) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['wishlistItemId'])) {
            echo json_encode(['error' => 'Wishlist item ID required']);
            return;
        }
        
        $wishlistItemID = intval($input['wishlistItemId']);
        
        // Verify the item belongs to this user
        $sql = "
            SELECT wi.wishlistItemID 
            FROM wishlistitem wi
            INNER JOIN wishlist w ON wi.wishlistID = w.wishlistID
            WHERE wi.wishlistItemID = ? AND w.buyerID = ?
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$wishlistItemID, $userID]);
        
        if ($stmt->rowCount() === 0) {
            echo json_encode(['error' => 'Item not found in your wishlist']);
            return;
        }
        
        // Remove from wishlist
        $stmt = $conn->prepare("DELETE FROM wishlistitem WHERE wishlistItemID = ?");
        $stmt->execute([$wishlistItemID]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Product removed from wishlist'
        ]);
        
    } catch (PDOException $e) {
        error_log("Remove from wishlist error: " . $e->getMessage());
        echo json_encode(['error' => 'Failed to remove from wishlist']);
    }
}

function isProductInWishlist($conn, $userID, $productID) {
    try {
        $stmt = $conn->prepare("
            SELECT wi.wishlistItemID 
            FROM wishlistitem wi
            INNER JOIN wishlist w ON wi.wishlistID = w.wishlistID
            WHERE w.buyerID = ? AND wi.productID = ?
        ");
        $stmt->execute([$userID, $productID]);
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        return false;
    }
}
?>