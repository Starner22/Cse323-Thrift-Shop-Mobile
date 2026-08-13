<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS");
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
    // GET: Fetch sellers with pagination, search, filter
    // ============================================================
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
        $sellerID = isset($_GET['sellerID']) ? intval($_GET['sellerID']) : 0;

        // If fetching a single seller
        if ($sellerID > 0) {
            $sql = "SELECT 
                        u.userID, u.name, u.email, u.phone, u.address, u.role, u.registration_date,
                        sp.sellerID, sp.business_name, sp.business_address, sp.business_phone, sp.business_email,
                        sp.tax_id, sp.bank_account, sp.approval_status, sp.rejected_reason, sp.approved_at, sp.created_at,
                        (SELECT COUNT(*) FROM product WHERE sellerID = u.userID AND status = 'approved') as approved_products,
                        (SELECT COUNT(*) FROM product WHERE sellerID = u.userID AND status = 'pending') as pending_products,
                        (SELECT COUNT(*) FROM product WHERE sellerID = u.userID AND status = 'rejected') as rejected_products,
                        (SELECT COUNT(*) FROM `order` WHERE sellerID = u.userID) as total_orders
                    FROM user u
                    INNER JOIN seller_profile sp ON u.userID = sp.userID
                    WHERE u.userID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$sellerID]);
            $sellerData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$sellerData) {
                echo json_encode(['success' => false, 'message' => 'Seller not found']);
                exit();
            }
            
            // Format response
            $sellerData['userID'] = intval($sellerData['userID']);
            $sellerData['sellerID'] = intval($sellerData['sellerID']);
            $sellerData['approved_products'] = intval($sellerData['approved_products']);
            $sellerData['pending_products'] = intval($sellerData['pending_products']);
            $sellerData['rejected_products'] = intval($sellerData['rejected_products']);
            $sellerData['total_orders'] = intval($sellerData['total_orders']);
            
            echo json_encode([
                'success' => true,
                'data' => $sellerData
            ]);
            exit();
        }

        // Build WHERE clause
        $whereClause = "WHERE sp.userID IS NOT NULL";
        $params = array();
        
        if (!empty($search)) {
            $whereClause .= " AND (u.name LIKE ? OR u.email LIKE ? OR sp.business_name LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if ($filter !== 'all' && in_array($filter, ['pending', 'approved', 'rejected', 'suspended'])) {
            $whereClause .= " AND sp.approval_status = ?";
            $params[] = $filter;
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total 
                     FROM user u 
                     INNER JOIN seller_profile sp ON u.userID = sp.userID 
                     " . $whereClause;
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($params);
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = intval($totalResult['total']);

        // Main query
        $sql = "SELECT 
                    u.userID, u.name, u.email, u.phone, u.role,
                    sp.business_name, sp.approval_status, sp.created_at,
                    (SELECT COUNT(*) FROM product WHERE sellerID = u.userID) as total_products,
                    (SELECT COUNT(*) FROM `order` WHERE sellerID = u.userID) as total_orders
                FROM user u
                INNER JOIN seller_profile sp ON u.userID = sp.userID
                " . $whereClause . "
                ORDER BY sp.created_at DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($offset);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $sellers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format response
        $formattedSellers = [];
        foreach ($sellers as $seller) {
            $formattedSellers[] = [
                'userID' => intval($seller['userID']),
                'name' => $seller['name'],
                'email' => $seller['email'],
                'phone' => $seller['phone'] ?? 'N/A',
                'business_name' => $seller['business_name'],
                'approval_status' => $seller['approval_status'],
                'total_products' => intval($seller['total_products']),
                'total_orders' => intval($seller['total_orders']),
                'created_at' => $seller['created_at']
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $formattedSellers,
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
    // POST: Approve, reject, suspend, restore seller
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        $action = $input['action'] ?? '';
        $reason = trim($input['reason'] ?? '');
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }
        
        if (!in_array($action, ['approve', 'reject', 'suspend', 'restore'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            exit();
        }

        // Verify seller exists
        $stmt = $conn->prepare("SELECT sp.userID, sp.approval_status, u.name, u.email FROM seller_profile sp INNER JOIN user u ON sp.userID = u.userID WHERE sp.userID = ?");
        $stmt->execute([$targetUserID]);
        $seller = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$seller) {
            echo json_encode(['success' => false, 'message' => 'Seller not found']);
            exit();
        }

        // Handle different actions
        if ($action === 'approve') {
            // Update seller_profile status
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'approved', approved_at = NOW(), rejected_reason = NULL WHERE userID = ?");
            $stmt->execute([$targetUserID]);
            
            // Update user role
            $stmt = $conn->prepare("UPDATE user SET role = 'Seller' WHERE userID = ?");
            $stmt->execute([$targetUserID]);
            
            logSellerAction($adminID, 'approve_seller', $targetUserID, null);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller approved successfully'
            ]);
            exit();
        }
        
        if ($action === 'reject') {
            if (empty($reason)) {
                echo json_encode(['success' => false, 'message' => 'Reason is required for rejection']);
                exit();
            }
            
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'rejected', rejected_reason = ? WHERE userID = ?");
            $stmt->execute([$reason, $targetUserID]);
            
            logSellerAction($adminID, 'reject_seller', $targetUserID, $reason);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller rejected'
            ]);
            exit();
        }
        
        if ($action === 'suspend') {
            if (empty($reason)) {
                echo json_encode(['success' => false, 'message' => 'Reason is required for suspension']);
                exit();
            }
            
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'suspended', rejected_reason = ? WHERE userID = ?");
            $stmt->execute([$reason, $targetUserID]);
            
            // Update user role to Buyer
            $stmt = $conn->prepare("UPDATE user SET role = 'Buyer' WHERE userID = ?");
            $stmt->execute([$targetUserID]);
            
            logSellerAction($adminID, 'suspend_seller', $targetUserID, $reason);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller suspended successfully'
            ]);
            exit();
        }
        
        if ($action === 'restore') {
            $stmt = $conn->prepare("UPDATE seller_profile SET approval_status = 'approved', rejected_reason = NULL WHERE userID = ?");
            $stmt->execute([$targetUserID]);
            
            // Update user role back to Seller
            $stmt = $conn->prepare("UPDATE user SET role = 'Seller' WHERE userID = ?");
            $stmt->execute([$targetUserID]);
            
            logSellerAction($adminID, 'restore_seller', $targetUserID, null);
            
            echo json_encode([
                'success' => true,
                'message' => 'Seller restored successfully'
            ]);
            exit();
        }
        
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        exit();
    }

    // ============================================================
    // PUT: Edit seller details
    // ============================================================
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserID = intval($input['userID'] ?? 0);
        
        if (!$targetUserID) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            exit();
        }

        // Verify seller exists
        $stmt = $conn->prepare("SELECT sp.userID FROM seller_profile sp WHERE sp.userID = ?");
        $stmt->execute([$targetUserID]);
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Seller not found']);
            exit();
        }

        $business_name = trim($input['business_name'] ?? '');
        $business_address = trim($input['business_address'] ?? '');
        $business_phone = trim($input['business_phone'] ?? '');
        $business_email = trim($input['business_email'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (empty($business_name)) {
            echo json_encode(['success' => false, 'message' => 'Business name is required']);
            exit();
        }

        // Update user phone
        if (!empty($phone)) {
            $stmt = $conn->prepare("UPDATE user SET phone = ? WHERE userID = ?");
            $stmt->execute([$phone, $targetUserID]);
        }

        // Update seller_profile
        $stmt = $conn->prepare("UPDATE seller_profile SET 
            business_name = ?,
            business_address = ?,
            business_phone = ?,
            business_email = ?
        WHERE userID = ?");
        $stmt->execute([$business_name, $business_address, $business_phone, $business_email, $targetUserID]);

        // Log the action
        $details = json_encode([
            'updated_fields' => array_keys(array_filter([
                'business_name' => $business_name,
                'business_address' => $business_address,
                'business_phone' => $business_phone,
                'business_email' => $business_email,
                'phone' => $phone
            ], function($v) { return !empty($v); }))
        ]);
        logSellerAction($adminID, 'edit_seller', $targetUserID, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Seller updated successfully'
        ]);
        exit();
    }

    // ============================================================
    // DELETE: Delete seller
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

        // Get seller info before deletion
        $stmt = $conn->prepare("SELECT u.userID, u.name, u.email, sp.business_name FROM user u INNER JOIN seller_profile sp ON u.userID = sp.userID WHERE u.userID = ?");
        $stmt->execute([$targetUserID]);
        $seller = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$seller) {
            echo json_encode(['success' => false, 'message' => 'Seller not found']);
            exit();
        }

        // Check if seller has products and orders
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE sellerID = ?");
        $stmt->execute([$targetUserID]);
        $productCount = $stmt->fetch(PDO::FETCH_ASSOC);
        $hasProducts = intval($productCount['count']) > 0;

        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM `order` WHERE sellerID = ?");
        $stmt->execute([$targetUserID]);
        $orderCount = $stmt->fetch(PDO::FETCH_ASSOC);
        $hasOrders = intval($orderCount['count']) > 0;

        // Delete user (cascade will handle related records)
        $stmt = $conn->prepare("DELETE FROM user WHERE userID = ?");
        $stmt->execute([$targetUserID]);

        // Log the action
        $details = json_encode([
            'deleted_seller' => $seller['name'],
            'business_name' => $seller['business_name'],
            'email' => $seller['email'],
            'had_products' => $hasProducts,
            'had_orders' => $hasOrders
        ]);
        logSellerAction($adminID, 'delete_seller', $targetUserID, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Seller deleted successfully',
            'had_products' => $hasProducts,
            'had_orders' => $hasOrders
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Admin manage sellers PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Admin manage sellers error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>