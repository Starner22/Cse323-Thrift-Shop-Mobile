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

    // Check if user is admin
    $stmt = $conn->prepare("SELECT role FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get date filters
        $fromDate = isset($_GET['from_date']) ? $_GET['from_date'] : '';
        $toDate = isset($_GET['to_date']) ? $_GET['to_date'] : '';
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

        // Build WHERE clause
        $whereClause = "WHERE 1=1";
        $params = [];

        if (!empty($fromDate)) {
            $whereClause .= " AND DATE(mh.created_at) >= ?";
            $params[] = $fromDate;
        }

        if (!empty($toDate)) {
            $whereClause .= " AND DATE(mh.created_at) <= ?";
            $params[] = $toDate;
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM moderation_history mh " . $whereClause;
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($params);
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = intval($totalResult['total']);

        // Main query with all details
        $sql = "SELECT 
                    mh.historyID,
                    mh.moderatorID,
                    mh.targetUserID,
                    mh.targetProductID,
                    mh.action,
                    mh.action_category,
                    mh.details,
                    mh.ip_address,
                    mh.created_at,
                    u.name as moderator_name,
                    u.role as moderator_role,
                    tu.name as target_user_name,
                    tu.role as target_user_role,
                    p.name as target_product_name
                FROM moderation_history mh
                LEFT JOIN user u ON mh.moderatorID = u.userID
                LEFT JOIN user tu ON mh.targetUserID = tu.userID
                LEFT JOIN product p ON mh.targetProductID = p.productID
                " . $whereClause . "
                ORDER BY mh.created_at DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($offset);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format the response
        $formattedHistory = [];
        foreach ($history as $row) {
            $formattedHistory[] = [
                'historyID' => intval($row['historyID']),
                'moderatorID' => $row['moderatorID'] ? intval($row['moderatorID']) : null,
                'moderator_name' => $row['moderator_name'] ?? 'Unknown',
                'moderator_role' => $row['moderator_role'] ?? 'Unknown',
                'targetUserID' => $row['targetUserID'] ? intval($row['targetUserID']) : null,
                'target_user_name' => $row['target_user_name'] ?? null,
                'target_user_role' => $row['target_user_role'] ?? null,
                'targetProductID' => $row['targetProductID'] ? intval($row['targetProductID']) : null,
                'target_product_name' => $row['target_product_name'] ?? null,
                'action' => $row['action'],
                'action_category' => $row['action_category'],
                'details' => $row['details'],
                'ip_address' => $row['ip_address'],
                'created_at' => $row['created_at'],
                // Also include nested objects for compatibility with frontend
                'moderator' => [
                    'userID' => $row['moderatorID'] ? intval($row['moderatorID']) : null,
                    'name' => $row['moderator_name'] ?? 'Unknown',
                    'role' => $row['moderator_role'] ?? 'Unknown'
                ],
                'target_user' => $row['targetUserID'] ? [
                    'userID' => intval($row['targetUserID']),
                    'name' => $row['target_user_name'] ?? 'Deleted User',
                    'role' => $row['target_user_role'] ?? 'Unknown'
                ] : null,
                'target_product' => $row['targetProductID'] ? [
                    'productID' => intval($row['targetProductID']),
                    'name' => $row['target_product_name'] ?? 'Deleted Product'
                ] : null
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $formattedHistory,
            'pagination' => [
                'total' => $totalCount,
                'limit' => $limit,
                'offset' => $offset,
                'totalPages' => $totalCount > 0 ? ceil($totalCount / $limit) : 1
            ]
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Admin moderation history PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Admin moderation history error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>