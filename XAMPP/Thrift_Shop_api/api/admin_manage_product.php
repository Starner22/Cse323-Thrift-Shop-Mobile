<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';
require_once __DIR__ . '/../helpers/log_helper.php';

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
    
    $adminID = $payload['userID'];
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Check if user is admin
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$adminID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // ============================================================
    // GET: Fetch users (with pagination, search, filter)
    // ============================================================
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $role = isset($_GET['role']) ? $_GET['role'] : '';
        $userID = isset($_GET['userID']) ? intval($_GET['userID']) : 0;

        // If fetching a single user
        if ($userID > 0) {
            $sql = "SELECT 
                        u.userID, u.name, u.email, u.phone, u.address, u.role, u.registration_date,
                        (SELECT address FROM user_addresses WHERE userID = u.userID AND is_default = 1 LIMIT 1) as default_address
                    FROM user u
                    WHERE u.userID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$userID]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$userData) {
                echo json_encode(['success' => false, 'message' => 'User not found']);
                exit();
            }
            
            $userData['userID'] = intval($userData['userID']);
            
            echo json_encode([
                'success' => true,
                'data' => $userData
            ]);
            exit();
        }

        // Build the WHERE clause
        $whereClause = "WHERE u.role IN ('Buyer', 'Seller')";
        $params = array();
        
        if (!empty($search)) {
            $whereClause .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if (!empty($role) && ($role === 'Buyer' || $role === 'Seller')) {
            $whereClause .= " AND u.role = ?";
            $params[] = $role;
        }

        // Get total count - use a separate simple query
        $countSql = "SELECT COUNT(*) as total FROM user u " . $whereClause;
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($params);
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = intval($totalResult['total']);

        // Main query
        $sql = "SELECT 
                    u.userID, u.name, u.email, u.phone, u.role, u.registration_date,
                    (SELECT COUNT(*) FROM product WHERE sellerID = u.userID) as product_count,
                    (SELECT COUNT(*) FROM `order` WHERE buyerID = u.userID) as order_count
                FROM user u 
                " . $whereClause . " 
                ORDER BY u.registration_date DESC 
                LIMIT " . intval($limit) . " OFFSET " . intval($offset);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format response
        $formattedUsers = [];
        foreach ($users as $user) {
            $formattedUsers[] = [
                'userID' => intval($user['userID']),
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'] ?? 'N/A',
                'role' => $user['role'],
                'registration_date' => $user['registration_date'],
                'product_count' => intval($user['product_count']),
                'order_count' => intval($user['order_count'])
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $formattedUsers,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $totalCount,
                'totalPages' => $totalCount > 0 ? ceil($totalCount / $limit) : 1
            ]
        ]);
        exit();
    }

    // ============================================================
    // PUT: Update user
    // ============================================================
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        // Prevent admin from editing themselves
        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot edit your own account through User Management']);
            exit();
        }

        // Verify user exists and is Buyer or Seller
        $stmt = $conn->prepare("SELECT userID, role FROM user WHERE userID = ? AND role IN ('Buyer', 'Seller')");
        $stmt->execute([$targetUserID]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'User not found or not a buyer/seller']);
            exit();
        }

        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $role = $input['role'] ?? '';

        if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Name is required']);
            exit();
        }

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Valid email is required']);
            exit();
        }

        // Build update query
        $updates = [];
        $params = [];

        $updates[] = "name = ?";
        $params[] = $name;

        $updates[] = "email = ?";
        $params[] = $email;

        if (!empty($phone)) {
            $updates[] = "phone = ?";
            $params[] = $phone;
        }

        if (!empty($role) && in_array($role, ['Buyer', 'Seller'])) {
            $updates[] = "role = ?";
            $params[] = $role;
        }

        $params[] = $targetUserID;
        $sql = "UPDATE user SET " . implode(", ", $updates) . " WHERE userID = ?";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        // Log the action
        $details = json_encode([
            'updated_fields' => array_keys(array_filter([
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'role' => $role
            ], function($v) { return !empty($v); }))
        ]);
        logUserAction($adminID, 'edit_user', $targetUserID, $details);

        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully'
        ]);
        exit();
    }

    // ============================================================
    // DELETE: Delete user
    // ============================================================
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        // Prevent admin from deleting themselves
        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete your own account']);
            exit();
        }

        // Get user info before deletion
        $stmt = $conn->prepare("SELECT userID, name, email, role FROM user WHERE userID = ? AND role IN ('Buyer', 'Seller')");
        $stmt->execute([$targetUserID]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'User not found or not a buyer/seller']);
            exit();
        }

        // Check if user has products
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE sellerID = ?");
        $stmt->execute([$targetUserID]);
        $productCount = $stmt->fetch(PDO::FETCH_ASSOC);
        $hasProducts = intval($productCount['count']) > 0;

        // Check if user has orders
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM `order` WHERE buyerID = ?");
        $stmt->execute([$targetUserID]);
        $orderCount = $stmt->fetch(PDO::FETCH_ASSOC);
        $hasOrders = intval($orderCount['count']) > 0;

        // Delete user
        $stmt = $conn->prepare("DELETE FROM user WHERE userID = ?");
        $stmt->execute([$targetUserID]);

        // Log the action
        $details = json_encode([
            'deleted_user' => $targetUser['name'],
            'email' => $targetUser['email'],
            'role' => $targetUser['role'],
            'had_products' => $hasProducts,
            'had_orders' => $hasOrders
        ]);
        logUserAction($adminID, 'delete_user', $targetUserID, $details);

        $response = [
            'success' => true,
            'message' => 'User deleted successfully',
            'was_seller' => $targetUser['role'] === 'Seller',
            'had_products' => $hasProducts,
            'had_orders' => $hasOrders
        ];

        echo json_encode($response);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Admin users PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Admin users error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>