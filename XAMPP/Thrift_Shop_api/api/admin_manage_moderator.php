<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

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

    // GET: Fetch moderators
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $permissionFilter = isset($_GET['permission']) ? $_GET['permission'] : '';
        $moderatorID = isset($_GET['moderatorID']) ? intval($_GET['moderatorID']) : 0;

        // If fetching a single moderator
        if ($moderatorID > 0) {
            $sql = "SELECT 
                        u.userID, u.name, u.email, u.phone, u.role, u.registration_date,
                        u.can_moderate_sellers, u.can_moderate_products, 
                        u.can_approve_new_sellers, u.can_approve_new_products,
                        u.can_manage_reports, u.can_view_analytics,
                        (SELECT COUNT(*) FROM moderation_history WHERE moderatorID = u.userID) as total_actions,
                        (SELECT MAX(created_at) FROM moderation_history WHERE moderatorID = u.userID) as last_action
                    FROM user u
                    WHERE u.userID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$moderatorID]);
            $moderatorData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$moderatorData) {
                echo json_encode(['success' => false, 'message' => 'Moderator not found']);
                exit();
            }
            
            // Format the response with explicit permissions
            $response = [
                'userID' => intval($moderatorData['userID']),
                'name' => $moderatorData['name'],
                'email' => $moderatorData['email'],
                'phone' => $moderatorData['phone'] ?? null,
                'role' => $moderatorData['role'],
                'registration_date' => $moderatorData['registration_date'],
                'permissions' => [
                    'can_moderate_sellers' => intval($moderatorData['can_moderate_sellers'] ?? 0),
                    'can_moderate_products' => intval($moderatorData['can_moderate_products'] ?? 0),
                    'can_approve_new_sellers' => intval($moderatorData['can_approve_new_sellers'] ?? 0),
                    'can_approve_new_products' => intval($moderatorData['can_approve_new_products'] ?? 0),
                    'can_manage_reports' => intval($moderatorData['can_manage_reports'] ?? 0),
                    'can_view_analytics' => intval($moderatorData['can_view_analytics'] ?? 0)
                ],
                'total_actions' => intval($moderatorData['total_actions'] ?? 0),
                'last_action' => $moderatorData['last_action']
            ];
            
            echo json_encode([
                'success' => true,
                'data' => $response
            ]);
            exit();
        }

        $whereClause = "WHERE u.role = 'Moderator'";
        $params = array();
        
        if (!empty($search)) {
            $whereClause .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if (!empty($permissionFilter)) {
            $validPermissions = ['can_moderate_sellers', 'can_moderate_products', 'can_approve_new_sellers', 
                                 'can_approve_new_products', 'can_manage_reports', 'can_view_analytics'];
            if (in_array($permissionFilter, $validPermissions)) {
                $whereClause .= " AND u.$permissionFilter = 1";
            }
        }

        $countSql = "SELECT COUNT(*) as total FROM user u " . $whereClause;
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($params);
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = intval($totalResult['total']);

        $sql = "SELECT 
                    u.userID, u.name, u.email, u.phone, u.role, u.registration_date,
                    u.can_moderate_sellers, u.can_moderate_products, 
                    u.can_approve_new_sellers, u.can_approve_new_products,
                    u.can_manage_reports, u.can_view_analytics,
                    (SELECT COUNT(*) FROM moderation_history WHERE moderatorID = u.userID) as total_actions,
                    (SELECT MAX(created_at) FROM moderation_history WHERE moderatorID = u.userID) as last_action
                FROM user u
                " . $whereClause . "
                ORDER BY u.registration_date DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($offset);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $moderators = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedModerators = [];
        foreach ($moderators as $mod) {
            $formattedModerators[] = [
                'userID' => intval($mod['userID']),
                'name' => $mod['name'],
                'email' => $mod['email'],
                'phone' => $mod['phone'] ?? 'N/A',
                'role' => $mod['role'],
                'registration_date' => $mod['registration_date'],
                'permissions' => [
                    'can_moderate_sellers' => intval($mod['can_moderate_sellers']),
                    'can_moderate_products' => intval($mod['can_moderate_products']),
                    'can_approve_new_sellers' => intval($mod['can_approve_new_sellers']),
                    'can_approve_new_products' => intval($mod['can_approve_new_products']),
                    'can_manage_reports' => intval($mod['can_manage_reports']),
                    'can_view_analytics' => intval($mod['can_view_analytics'])
                ],
                'total_actions' => intval($mod['total_actions']),
                'last_action' => $mod['last_action']
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $formattedModerators,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $totalCount,
                'totalPages' => $totalCount > 0 ? ceil($totalCount / $limit) : 1
            ]
        ]);
        exit();
    }

    // POST: Add new moderator
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $password = trim($input['password'] ?? '');
        $permissions = $input['permissions'] ?? [];
        
        if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Name is required']);
            exit();
        }
        
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Valid email is required']);
            exit();
        }
        
        if (empty($password) || strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
            exit();
        }
        
        $stmt = $conn->prepare("SELECT userID FROM user WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Email already registered']);
            exit();
        }
        
        $can_moderate_sellers = isset($permissions['can_moderate_sellers']) && $permissions['can_moderate_sellers'] === true ? 1 : 0;
        $can_moderate_products = isset($permissions['can_moderate_products']) && $permissions['can_moderate_products'] === true ? 1 : 0;
        $can_approve_new_sellers = isset($permissions['can_approve_new_sellers']) && $permissions['can_approve_new_sellers'] === true ? 1 : 0;
        $can_approve_new_products = isset($permissions['can_approve_new_products']) && $permissions['can_approve_new_products'] === true ? 1 : 0;
        $can_manage_reports = isset($permissions['can_manage_reports']) && $permissions['can_manage_reports'] === true ? 1 : 0;
        $can_view_analytics = isset($permissions['can_view_analytics']) && $permissions['can_view_analytics'] === true ? 1 : 0;
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        $sql = "INSERT INTO user (name, email, password, role, 
                can_moderate_sellers, can_moderate_products, 
                can_approve_new_sellers, can_approve_new_products,
                can_manage_reports, can_view_analytics) 
                VALUES (?, ?, ?, 'Moderator', ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $name, $email, $hashedPassword,
            $can_moderate_sellers, $can_moderate_products,
            $can_approve_new_sellers, $can_approve_new_products,
            $can_manage_reports, $can_view_analytics
        ]);
        
        $newUserID = $conn->lastInsertId();
        
        $details = json_encode([
            'added_moderator' => $name,
            'email' => $email,
            'permissions' => $permissions
        ]);
        logModeratorAction($adminID, 'add_moderator', $newUserID, $details);
        
        echo json_encode([
            'success' => true,
            'message' => 'Moderator added successfully',
            'userID' => $newUserID
        ]);
        exit();
    }

    // PUT: Update moderator permissions
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        error_log("=== PUT Request ===");
        error_log("Input: " . print_r($input, true));
        
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot edit your own permissions through this page']);
            exit();
        }

        $stmt = $conn->prepare("SELECT userID, name, role FROM user WHERE userID = ? AND role = 'Moderator'");
        $stmt->execute([$targetUserID]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'Moderator not found']);
            exit();
        }

        $permissions = $input['permissions'] ?? [];
        error_log("Permissions from request: " . print_r($permissions, true));
        
        $can_moderate_sellers = isset($permissions['can_moderate_sellers']) && $permissions['can_moderate_sellers'] === true ? 1 : 0;
        $can_moderate_products = isset($permissions['can_moderate_products']) && $permissions['can_moderate_products'] === true ? 1 : 0;
        $can_approve_new_sellers = isset($permissions['can_approve_new_sellers']) && $permissions['can_approve_new_sellers'] === true ? 1 : 0;
        $can_approve_new_products = isset($permissions['can_approve_new_products']) && $permissions['can_approve_new_products'] === true ? 1 : 0;
        $can_manage_reports = isset($permissions['can_manage_reports']) && $permissions['can_manage_reports'] === true ? 1 : 0;
        $can_view_analytics = isset($permissions['can_view_analytics']) && $permissions['can_view_analytics'] === true ? 1 : 0;
        
        error_log("Values to update: can_moderate_sellers=$can_moderate_sellers, can_moderate_products=$can_moderate_products");
        
        $sql = "UPDATE user SET 
                can_moderate_sellers = ?,
                can_moderate_products = ?,
                can_approve_new_sellers = ?,
                can_approve_new_products = ?,
                can_manage_reports = ?,
                can_view_analytics = ?
                WHERE userID = ?";
        
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute([
            $can_moderate_sellers, $can_moderate_products,
            $can_approve_new_sellers, $can_approve_new_products,
            $can_manage_reports, $can_view_analytics,
            $targetUserID
        ]);
        
        error_log("Update result: " . ($result ? 'SUCCESS' : 'FAILED'));
        error_log("Rows affected: " . $stmt->rowCount());
        
        $details = json_encode([
            'updated_permissions' => $permissions,
            'moderator' => $targetUser['name']
        ]);
        logModeratorAction($adminID, 'update_permissions', $targetUserID, $details);
        
        echo json_encode([
            'success' => true,
            'message' => 'Permissions updated successfully'
        ]);
        exit();
    }

    // PATCH: Update moderator details
    if ($method === 'PATCH') {
        $input = json_decode(file_get_contents('php://input'), true);
        error_log("=== PATCH Request ===");
        error_log("Input: " . print_r($input, true));
        
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        // Prevent admin from editing themselves
        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot edit your own account through this page']);
            exit();
        }

        // Verify user exists and is Moderator
        $stmt = $conn->prepare("SELECT userID, name, email, phone, role FROM user WHERE userID = ? AND role = 'Moderator'");
        $stmt->execute([$targetUserID]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'Moderator not found']);
            exit();
        }

        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $password = trim($input['password'] ?? '');

        $updates = [];
        $params = [];

        if (!empty($name)) {
            $updates[] = "name = ?";
            $params[] = $name;
        }

        if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            // Check if email exists for another user
            $stmt = $conn->prepare("SELECT userID FROM user WHERE email = ? AND userID != ?");
            $stmt->execute([$email, $targetUserID]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Email already in use']);
                exit();
            }
            $updates[] = "email = ?";
            $params[] = $email;
        }

        if (!empty($phone)) {
            $updates[] = "phone = ?";
            $params[] = $phone;
        }

        if (!empty($password) && strlen($password) >= 6) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $updates[] = "password = ?";
            $params[] = $hashedPassword;
        } elseif (!empty($password) && strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
            exit();
        }

        if (empty($updates)) {
            echo json_encode(['success' => false, 'message' => 'No fields to update']);
            exit();
        }

        $params[] = $targetUserID;
        $sql = "UPDATE user SET " . implode(", ", $updates) . " WHERE userID = ?";
        
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute($params);
        
        error_log("Update result: " . ($result ? 'SUCCESS' : 'FAILED'));
        error_log("Rows affected: " . $stmt->rowCount());

        // Log the action
        $details = json_encode([
            'updated_fields' => array_keys(array_filter([
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => !empty($password)
            ])),
            'moderator' => $targetUser['name']
        ]);
        logModeratorAction($adminID, 'edit_moderator', $targetUserID, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Moderator details updated successfully'
        ]);
        exit();
    }

    // DELETE: Remove moderators from system
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete your own account']);
            exit();
        }

        // Verify user exists and is Moderator
        $stmt = $conn->prepare("SELECT userID, name, email, role FROM user WHERE userID = ? AND role = 'Moderator'");
        $stmt->execute([$targetUserID]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'Moderator not found']);
            exit();
        }

        // Check if user has any orders or products (should be 0 for moderators)
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE sellerID = ?");
        $stmt->execute([$targetUserID]);
        $productCount = $stmt->fetch(PDO::FETCH_ASSOC);
        $hasProducts = intval($productCount['count']) > 0;

        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM `order` WHERE buyerID = ?");
        $stmt->execute([$targetUserID]);
        $orderCount = $stmt->fetch(PDO::FETCH_ASSOC);
        $hasOrders = intval($orderCount['count']) > 0;

        // If they have products/orders, they might have been a seller/buyer before
        // Give a warning but allow deletion with cascade
        if ($hasProducts || $hasOrders) {
            // Log the warning
            error_log("WARNING: Deleting moderator {$targetUser['name']} who has $productCount[count] products and $orderCount[count] orders");
        }

        // DELETE THE USER - Cascade will handle related records
        $stmt = $conn->prepare("DELETE FROM user WHERE userID = ?");
        $stmt->execute([$targetUserID]);

        // Log the action
        $details = json_encode([
            'deleted_moderator' => $targetUser['name'],
            'email' => $targetUser['email'],
            'had_products' => $hasProducts,
            'had_orders' => $hasOrders
        ]);
        logModeratorAction($adminID, 'remove_moderator', $targetUserID, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Moderator removed successfully'
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Admin manage moderators PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Admin manage moderators error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>