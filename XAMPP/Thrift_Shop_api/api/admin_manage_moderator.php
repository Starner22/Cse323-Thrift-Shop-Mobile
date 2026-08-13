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
    $stmt = $conn->prepare("SELECT role, can_manage_moderators FROM user WHERE userID = ?");
    $stmt->execute([$adminID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Admin' || $user['can_manage_moderators'] != 1) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin with manage moderators permission required.']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // ============================================================
    // GET: Fetch moderators with pagination and search
    // ============================================================
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $moderatorID = isset($_GET['moderatorID']) ? intval($_GET['moderatorID']) : 0;

        // If fetching a single moderator
        if ($moderatorID > 0) {
            $sql = "SELECT 
                        u.userID, u.name, u.email, u.role, u.registration_date,
                        u.can_moderate_products,
                        u.can_moderate_sellers,
                        u.can_approve_new_products,
                        u.can_approve_new_sellers,
                        u.can_view_analytics,
                        (SELECT COUNT(*) FROM moderation_history WHERE moderatorID = u.userID) as total_actions,
                        (SELECT MAX(created_at) FROM moderation_history WHERE moderatorID = u.userID) as last_action
                    FROM user u
                    WHERE u.userID = ? AND u.role = 'Moderator'";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$moderatorID]);
            $moderator = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$moderator) {
                echo json_encode(['success' => false, 'message' => 'Moderator not found']);
                exit();
            }
            
            // Get recent actions
            $stmt = $conn->prepare("SELECT action, action_category, created_at FROM moderation_history WHERE moderatorID = ? ORDER BY created_at DESC LIMIT 5");
            $stmt->execute([$moderatorID]);
            $recentActions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $moderator['userID'] = intval($moderator['userID']);
            $moderator['total_actions'] = intval($moderator['total_actions'] ?? 0);
            $moderator['can_moderate_products'] = intval($moderator['can_moderate_products'] ?? 0);
            $moderator['can_moderate_sellers'] = intval($moderator['can_moderate_sellers'] ?? 0);
            $moderator['can_approve_new_products'] = intval($moderator['can_approve_new_products'] ?? 0);
            $moderator['can_approve_new_sellers'] = intval($moderator['can_approve_new_sellers'] ?? 0);
            $moderator['can_view_analytics'] = intval($moderator['can_view_analytics'] ?? 0);
            
            echo json_encode([
                'success' => true,
                'data' => $moderator,
                'recent_actions' => $recentActions
            ]);
            exit();
        }

        // Build query for list
        $whereClause = "WHERE u.role = 'Moderator'";
        $params = array();
        
        if (!empty($search)) {
            $whereClause .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM user u " . $whereClause;
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($params);
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = intval($totalResult['total']);

        // Main query with permissions
        $sql = "SELECT 
                    u.userID, u.name, u.email, u.role, u.registration_date,
                    u.can_moderate_products,
                    u.can_moderate_sellers,
                    u.can_approve_new_products,
                    u.can_approve_new_sellers,
                    u.can_view_analytics,
                    (SELECT COUNT(*) FROM moderation_history WHERE moderatorID = u.userID) as total_actions
                FROM user u
                " . $whereClause . "
                ORDER BY u.registration_date DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($offset);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $moderators = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format response
        $formattedModerators = [];
        foreach ($moderators as $mod) {
            $formattedModerators[] = [
                'userID' => intval($mod['userID']),
                'name' => $mod['name'],
                'email' => $mod['email'],
                'role' => $mod['role'],
                'registration_date' => $mod['registration_date'],
                'total_actions' => intval($mod['total_actions'] ?? 0),
                'permissions' => [
                    'can_moderate_products' => intval($mod['can_moderate_products'] ?? 0),
                    'can_moderate_sellers' => intval($mod['can_moderate_sellers'] ?? 0),
                    'can_approve_new_products' => intval($mod['can_approve_new_products'] ?? 0),
                    'can_approve_new_sellers' => intval($mod['can_approve_new_sellers'] ?? 0),
                    'can_view_analytics' => intval($mod['can_view_analytics'] ?? 0)
                ]
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

    // ============================================================
    // POST: Add moderator (promote existing user)
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        $permissions = $input['permissions'] ?? [];
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        // Check if user exists and is not already a moderator or admin
        $stmt = $conn->prepare("SELECT userID, role, name, email FROM user WHERE userID = ? AND role IN ('Buyer', 'Seller')");
        $stmt->execute([$targetUserID]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'User not found or already has a privileged role']);
            exit();
        }

        // Set permissions (default to 0)
        $can_moderate_products = isset($permissions['can_moderate_products']) ? 1 : 0;
        $can_moderate_sellers = isset($permissions['can_moderate_sellers']) ? 1 : 0;
        $can_approve_new_products = isset($permissions['can_approve_new_products']) ? 1 : 0;
        $can_approve_new_sellers = isset($permissions['can_approve_new_sellers']) ? 1 : 0;
        $can_view_analytics = isset($permissions['can_view_analytics']) ? 1 : 0;

        // Update user to moderator with permissions
        $sql = "UPDATE user SET 
                    role = 'Moderator',
                    can_moderate_products = ?,
                    can_moderate_sellers = ?,
                    can_approve_new_products = ?,
                    can_approve_new_sellers = ?,
                    can_view_analytics = ?
                WHERE userID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $can_moderate_products,
            $can_moderate_sellers,
            $can_approve_new_products,
            $can_approve_new_sellers,
            $can_view_analytics,
            $targetUserID
        ]);

        // Log the action
        $details = json_encode([
            'new_moderator' => $user['name'],
            'email' => $user['email'],
            'permissions' => [
                'moderate_products' => $can_moderate_products,
                'moderate_sellers' => $can_moderate_sellers,
                'approve_new_products' => $can_approve_new_products,
                'approve_new_sellers' => $can_approve_new_sellers,
                'view_analytics' => $can_view_analytics
            ]
        ]);
        logModeratorAction($adminID, 'add_moderator', $targetUserID, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Moderator added successfully'
        ]);
        exit();
    }

    // ============================================================
    // PUT: Update moderator permissions
    // ============================================================
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        $permissions = $input['permissions'] ?? [];
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        // Prevent admin from modifying themselves
        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot modify your own permissions']);
            exit();
        }

        // Verify user is a moderator
        $stmt = $conn->prepare("SELECT userID, name, email FROM user WHERE userID = ? AND role = 'Moderator'");
        $stmt->execute([$targetUserID]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'Moderator not found']);
            exit();
        }

        // Set permissions
        $can_moderate_products = isset($permissions['can_moderate_products']) ? 1 : 0;
        $can_moderate_sellers = isset($permissions['can_moderate_sellers']) ? 1 : 0;
        $can_approve_new_products = isset($permissions['can_approve_new_products']) ? 1 : 0;
        $can_approve_new_sellers = isset($permissions['can_approve_new_sellers']) ? 1 : 0;
        $can_view_analytics = isset($permissions['can_view_analytics']) ? 1 : 0;

        // Update permissions
        $sql = "UPDATE user SET 
                    can_moderate_products = ?,
                    can_moderate_sellers = ?,
                    can_approve_new_products = ?,
                    can_approve_new_sellers = ?,
                    can_view_analytics = ?
                WHERE userID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $can_moderate_products,
            $can_moderate_sellers,
            $can_approve_new_products,
            $can_approve_new_sellers,
            $can_view_analytics,
            $targetUserID
        ]);

        // Log the action
        $details = json_encode([
            'updated_permissions' => [
                'moderate_products' => $can_moderate_products,
                'moderate_sellers' => $can_moderate_sellers,
                'approve_new_products' => $can_approve_new_products,
                'approve_new_sellers' => $can_approve_new_sellers,
                'view_analytics' => $can_view_analytics
            ]
        ]);
        logModeratorAction($adminID, 'update_permissions', $targetUserID, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Permissions updated successfully'
        ]);
        exit();
    }

    // ============================================================
    // DELETE: Remove moderator (demote to Buyer)
    // ============================================================
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        // Prevent admin from removing themselves
        if ($targetUserID == $adminID) {
            echo json_encode(['success' => false, 'message' => 'Cannot remove yourself as moderator']);
            exit();
        }

        // Verify user is a moderator
        $stmt = $conn->prepare("SELECT userID, name, email FROM user WHERE userID = ? AND role = 'Moderator'");
        $stmt->execute([$targetUserID]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'Moderator not found']);
            exit();
        }

        // Demote to Buyer and remove permissions
        $sql = "UPDATE user SET 
                    role = 'Buyer',
                    can_moderate_products = 0,
                    can_moderate_sellers = 0,
                    can_approve_new_products = 0,
                    can_approve_new_sellers = 0,
                    can_view_analytics = 0
                WHERE userID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$targetUserID]);

        // Log the action
        $details = json_encode([
            'removed_moderator' => $user['name'],
            'email' => $user['email']
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