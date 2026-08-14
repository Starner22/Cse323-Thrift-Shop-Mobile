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

    // ============================================================
    // GET: Fetch categories with product counts
    // ============================================================
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $categoryID = isset($_GET['categoryID']) ? intval($_GET['categoryID']) : 0;

        // ============================================================
        // Get single category
        // ============================================================
        if ($categoryID > 0) {
            $sql = "SELECT 
                        c.categoryID, c.name, c.image_path, c.created_at,
                        (SELECT COUNT(*) FROM product WHERE categoryID = c.categoryID) as product_count
                    FROM categories c
                    WHERE c.categoryID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$categoryID]);
            $category = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$category) {
                echo json_encode(['success' => false, 'message' => 'Category not found']);
                exit();
            }
            
            $category['categoryID'] = intval($category['categoryID']);
            $category['product_count'] = intval($category['product_count']);
            
            echo json_encode([
                'success' => true,
                'data' => $category
            ]);
            exit();
        }

        // ============================================================
        // Get all categories with counts
        // ============================================================
        $whereClause = "WHERE 1=1";
        $params = [];

        if (!empty($search)) {
            $whereClause .= " AND c.name LIKE ?";
            $params[] = "%$search%";
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM categories c " . $whereClause;
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($params);
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = intval($totalResult['total']);

        // Main query
        $sql = "SELECT 
                    c.categoryID, c.name, c.image_path, c.created_at,
                    (SELECT COUNT(*) FROM product WHERE categoryID = c.categoryID) as product_count
                FROM categories c
                " . $whereClause . "
                ORDER BY c.name ASC
                LIMIT " . intval($limit) . " OFFSET " . intval($offset);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedCategories = [];
        foreach ($categories as $category) {
            $formattedCategories[] = [
                'categoryID' => intval($category['categoryID']),
                'name' => $category['name'],
                'image_path' => $category['image_path'],
                'created_at' => $category['created_at'],
                'product_count' => intval($category['product_count'])
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $formattedCategories,
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
    // POST: Add new category
    // ============================================================
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = trim($input['name'] ?? '');
        $imageBase64 = $input['image'] ?? null;
        
        if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Category name is required']);
            exit();
        }

        // Check if category name already exists
        $stmt = $conn->prepare("SELECT categoryID FROM categories WHERE name = ?");
        $stmt->execute([$name]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Category name already exists']);
            exit();
        }

        // Handle image upload
        $imagePath = null;
        if ($imageBase64) {
            $imageData = base64_decode(preg_replace('#^data:image/[^;]+;base64,#', '', $imageBase64));
            if ($imageData) {
                $uploadDir = __DIR__ . '/../uploads/categories/';
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                
                $filename = 'category_' . time() . '_' . uniqid() . '.jpg';
                $filepath = $uploadDir . $filename;
                
                if (file_put_contents($filepath, $imageData)) {
                    $imagePath = 'uploads/categories/' . $filename;
                }
            }
        }

        // Insert category
        $sql = "INSERT INTO categories (name, image_path) VALUES (?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$name, $imagePath]);
        
        $newCategoryID = $conn->lastInsertId();

        // Log the action
        $details = json_encode([
            'added_category' => $name,
            'image_uploaded' => $imagePath ? true : false
        ]);
        logModeratorAction($adminID, 'add_category', null, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Category added successfully',
            'categoryID' => $newCategoryID
        ]);
        exit();
    }

    // ============================================================
    // PUT: Update category
    // ============================================================
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $categoryID = intval($input['categoryID'] ?? 0);
        
        if (!$categoryID) {
            echo json_encode(['success' => false, 'message' => 'Category ID required']);
            exit();
        }

        // Verify category exists
        $stmt = $conn->prepare("SELECT categoryID, name, image_path FROM categories WHERE categoryID = ?");
        $stmt->execute([$categoryID]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$category) {
            echo json_encode(['success' => false, 'message' => 'Category not found']);
            exit();
        }

        $name = trim($input['name'] ?? '');
        $imageBase64 = $input['image'] ?? null;
        
        if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Category name is required']);
            exit();
        }

        // Check if name already exists (excluding this category)
        $stmt = $conn->prepare("SELECT categoryID FROM categories WHERE name = ? AND categoryID != ?");
        $stmt->execute([$name, $categoryID]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Category name already exists']);
            exit();
        }

        // Handle image upload
        $imagePath = $category['image_path'];
        if ($imageBase64) {
            // Delete old image if exists
            if ($imagePath && file_exists(__DIR__ . '/../' . $imagePath)) {
                unlink(__DIR__ . '/../' . $imagePath);
            }
            
            $imageData = base64_decode(preg_replace('#^data:image/[^;]+;base64,#', '', $imageBase64));
            if ($imageData) {
                $uploadDir = __DIR__ . '/../uploads/categories/';
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                
                $filename = 'category_' . time() . '_' . uniqid() . '.jpg';
                $filepath = $uploadDir . $filename;
                
                if (file_put_contents($filepath, $imageData)) {
                    $imagePath = 'uploads/categories/' . $filename;
                }
            }
        }

        // Update category
        $sql = "UPDATE categories SET name = ?, image_path = ? WHERE categoryID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$name, $imagePath, $categoryID]);

        // Log the action
        $details = json_encode([
            'updated_category' => $name,
            'old_name' => $category['name'],
            'image_updated' => $imageBase64 ? true : false
        ]);
        logModeratorAction($adminID, 'edit_category', null, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Category updated successfully'
        ]);
        exit();
    }

    // ============================================================
    // DELETE: Delete category
    // ============================================================
    if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $categoryID = intval($input['categoryID'] ?? 0);
        
        if (!$categoryID) {
            echo json_encode(['success' => false, 'message' => 'Category ID required']);
            exit();
        }

        // Verify category exists
        $stmt = $conn->prepare("SELECT categoryID, name, image_path FROM categories WHERE categoryID = ?");
        $stmt->execute([$categoryID]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$category) {
            echo json_encode(['success' => false, 'message' => 'Category not found']);
            exit();
        }

        // Check if products exist in this category
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE categoryID = ?");
        $stmt->execute([$categoryID]);
        $productCount = $stmt->fetch(PDO::FETCH_ASSOC);
        $hasProducts = intval($productCount['count']) > 0;

        if ($hasProducts) {
            echo json_encode([
                'success' => false, 
                'message' => 'Cannot delete category. It has ' . $productCount['count'] . ' products assigned to it. Please reassign or delete the products first.'
            ]);
            exit();
        }

        // Delete image file if exists
        if ($category['image_path'] && file_exists(__DIR__ . '/../' . $category['image_path'])) {
            unlink(__DIR__ . '/../' . $category['image_path']);
        }

        // Delete category
        $stmt = $conn->prepare("DELETE FROM categories WHERE categoryID = ?");
        $stmt->execute([$categoryID]);

        // Log the action
        $details = json_encode([
            'deleted_category' => $category['name']
        ]);
        logModeratorAction($adminID, 'delete_category', null, $details);

        echo json_encode([
            'success' => true,
            'message' => 'Category deleted successfully'
        ]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (PDOException $e) {
    error_log("Admin manage category PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Admin manage category error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>