<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
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

    
    // GET: Fetch moderators with pagination, search, filter
    
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $permissionFilter = isset($_GET['permission']) ? $_GET['permission'] : '';
        $moderatorID = isset($_GET['moderatorID']) ? intval($_GET['moderatorID']) : 0;

        // Fetch single moderator
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
            
            $moderatorData['userID'] = intval($moderatorData['userID']);
            $moderatorData['can_moderate_sellers'] = intval($moderatorData['can_moderate_sellers']);
            $moderatorData['can_moderate_products'] = intval($moderatorData['can_moderate_products']);
            $moderatorData['can_approve_new_sellers'] = intval($moderatorData['can_approve_new_sellers']);
            $moderatorData['can_approve_new_products'] = intval($moderatorData['can_approve_new_products']);
            $moderatorData['can_manage_reports'] = intval($moderatorData['can_manage_reports']);
            $moderatorData['can_view_analytics'] = intval($moderatorData['can_view_analytics']);
            $moderatorData['total_actions'] = intval($moderatorData['total_actions']);
            
            echo json_encode([
                'success' => true,
                'data' => $moderatorData
            ]);
            exit();
        }

        // Fetch all moderators
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
        
        $can_moderate_sellers = isset($permissions['can_moderate_sellers']) && $permissions['can_moderate_sellers'] === true ? 1 : 0;
        $can_moderate_products = isset($permissions['can_moderate_products']) && $permissions['can_moderate_products'] === true ? 1 : 0;
        $can_approve_new_sellers = isset($permissions['can_approve_new_sellers']) && $permissions['can_approve_new_sellers'] === true ? 1 : 0;
        $can_approve_new_products = isset($permissions['can_approve_new_products']) && $permissions['can_approve_new_products'] === true ? 1 : 0;
        $can_manage_reports = isset($permissions['can_manage_reports']) && $permissions['can_manage_reports'] === true ? 1 : 0;
        $can_view_analytics = isset($permissions['can_view_analytics']) && $permissions['can_view_analytics'] === true ? 1 : 0;
        
        $sql = "UPDATE user SET 
                can_moderate_sellers = ?,
                can_moderate_products = ?,
                can_approve_new_sellers = ?,
                can_approve_new_products = ?,
                can_manage_reports = ?,
                can_view_analytics = ?
                WHERE userID = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $can_moderate_sellers, $can_moderate_products,
            $can_approve_new_sellers, $can_approve_new_products,
            $can_manage_reports, $can_view_analytics,
            $targetUserID
        ]);
        
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

    
    // PATCH: Update moderator details WITH DETAILED LOGGING
    
    if ($method === 'PATCH') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot edit your own account through this page']);
            exit();
        }

        $stmt = $conn->prepare("SELECT userID, name, email, phone, role FROM user WHERE userID = ? AND role = 'Moderator'");
        $stmt->execute([$targetUserID]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'Moderator not found']);
            exit();
        }

        // Get old values before update
        $stmt = $conn->prepare("SELECT name, email, phone FROM user WHERE userID = ?");
        $stmt->execute([$targetUserID]);
        $oldData = $stmt->fetch(PDO::FETCH_ASSOC);

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
        $stmt->execute($params);

        // Get new values after update
        $newData = [
            'name' => $name,
            'email' => $email,
            'phone' => $phone
        ];

        // Log with detailed changes
        require_once __DIR__ . '/../helpers/log_helper.php';
        logModeratorEdit($adminID, $targetUserID, $oldData, $newData);

        echo json_encode([
            'success' => true,
            'message' => 'Moderator details updated successfully'
        ]);
        exit();
    }

    
    // DELETE: Remove moderator
    
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

        // Get moderator info before deletion
        $stmt = $conn->prepare("SELECT userID, name, email, role FROM user WHERE userID = ? AND role = 'Moderator'");
        $stmt->execute([$targetUserID]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'Moderator not found']);
            exit();
        }

        // Check if they have any moderation history (keep it, but we'll log the deletion)
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM moderation_history WHERE moderatorID = ?");
        $stmt->execute([$targetUserID]);
        $historyCount = $stmt->fetch(PDO::FETCH_ASSOC);

        // HARD DELETE the user
        $stmt = $conn->prepare("DELETE FROM user WHERE userID = ?");
        $stmt->execute([$targetUserID]);

        // Log the action
        $details = json_encode([
            'deleted_moderator' => $targetUser['name'],
            'email' => $targetUser['email'],
            'had_moderation_history' => intval($historyCount['count']) > 0
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