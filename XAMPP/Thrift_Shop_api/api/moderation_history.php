<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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

    
    // Build query based on role
    
    $isAdmin = ($user['role'] === 'Admin');
    
    $sql = "SELECT 
                historyID,
                moderatorID,
                targetUserID,
                targetProductID,
                action,
                action_category,
                details,
                ip_address,
                created_at
            FROM moderation_history";
    
    // If not admin, only show their own actions
    if (!$isAdmin) {
        $sql .= " WHERE moderatorID = ?";
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT 50";
    
    $stmt = $conn->prepare($sql);
    if (!$isAdmin) {
        $stmt->execute([$userID]);
    } else {
        $stmt->execute();
    }
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format response
    $formattedHistory = [];
    foreach ($history as $row) {
        // Get moderator name
        $modName = 'Unknown';
        $modRole = 'Unknown';
        if ($row['moderatorID']) {
            $stmt2 = $conn->prepare("SELECT name, role FROM user WHERE userID = ?");
            $stmt2->execute([$row['moderatorID']]);
            $mod = $stmt2->fetch(PDO::FETCH_ASSOC);
            if ($mod) {
                $modName = $mod['name'];
                $modRole = $mod['role'];
            }
        }
        
        // Get target user info
        $targetUser = null;
        if ($row['targetUserID']) {
            $stmt2 = $conn->prepare("SELECT userID, name, role FROM user WHERE userID = ?");
            $stmt2->execute([$row['targetUserID']]);
            $target = $stmt2->fetch(PDO::FETCH_ASSOC);
            if ($target) {
                $targetUser = [
                    'userID' => intval($target['userID']),
                    'name' => $target['name'],
                    'role' => $target['role']
                ];
            } else {
                $targetUser = [
                    'userID' => intval($row['targetUserID']),
                    'name' => 'Deleted User',
                    'role' => 'Unknown'
                ];
            }
        }
        
        // Get target product info
        $targetProduct = null;
        if ($row['targetProductID']) {
            $stmt2 = $conn->prepare("SELECT productID, name FROM product WHERE productID = ?");
            $stmt2->execute([$row['targetProductID']]);
            $product = $stmt2->fetch(PDO::FETCH_ASSOC);
            if ($product) {
                $targetProduct = [
                    'productID' => intval($product['productID']),
                    'name' => $product['name']
                ];
            } else {
                $targetProduct = [
                    'productID' => intval($row['targetProductID']),
                    'name' => 'Deleted Product'
                ];
            }
        }
        
        $entry = [
            'historyID' => intval($row['historyID']),
            'action' => $row['action'],
            'action_category' => $row['action_category'],
            'details' => $row['details'],
            'ip_address' => $row['ip_address'],
            'created_at' => $row['created_at'],
            'moderator' => [
                'userID' => $row['moderatorID'] ? intval($row['moderatorID']) : null,
                'name' => $modName,
                'role' => $modRole
            ],
            'target_user' => $targetUser,
            'target_product' => $targetProduct
        ];
        $formattedHistory[] = $entry;
    }

    echo json_encode([
        'success' => true,
        'data' => $formattedHistory,
        'pagination' => [
            'total' => count($formattedHistory),
            'limit' => 50,
            'offset' => 0
        ],
        'isAdmin' => $isAdmin
    ]);

} catch (PDOException $e) {
    error_log("Moderation history PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Moderation history error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>