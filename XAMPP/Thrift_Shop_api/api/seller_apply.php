<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';
require_once __DIR__ . '/../helpers/seller_helper.php';

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

    $method = $_SERVER['REQUEST_METHOD'];

    // ========== GET: Check application status ==========
    if ($method === 'GET') {
        $result = isSeller($conn, $userID);
        
        if (!$result['isSeller']) {
            echo json_encode([
                'hasApplied' => false,
                'status' => null,
                'canEdit' => false,
                'message' => 'You have not applied to become a seller yet'
            ]);
        } else {
            $profile = getSellerProfile($conn, $userID);
            $canEdit = $result['status'] === 'rejected';
            
            echo json_encode([
                'hasApplied' => true,
                'status' => $result['status'],
                'canEdit' => $canEdit,
                'profile' => $profile,
                'message' => $result['status'] === 'pending' ? 'Your application is under review' :
                            ($result['status'] === 'approved' ? 'You are an approved seller!' : 
                            'Your application was rejected. Please edit and resubmit.')
            ]);
        }
        exit();
    }

    // ========== POST: Submit new application ==========
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $business_name = trim($input['business_name'] ?? '');
        $business_phone = trim($input['business_phone'] ?? '');
        
        if (empty($business_name)) {
            echo json_encode(['success' => false, 'message' => 'Business name is required']);
            exit();
        }
        
        if (empty($business_phone)) {
            echo json_encode(['success' => false, 'message' => 'Phone number is required']);
            exit();
        }
        
        // Check if user already applied
        $result = isSeller($conn, $userID);
        if ($result['isSeller']) {
            // If status is 'rejected', allow resubmission
            if ($result['status'] !== 'rejected') {
                echo json_encode([
                    'success' => false, 
                    'message' => 'You have already applied. Status: ' . $result['status']
                ]);
                exit();
            }
        }
        
        // Check if this is an update (existing rejected application)
        if ($result['isSeller'] && $result['status'] === 'rejected') {
            // UPDATE existing application
            $sql = "UPDATE seller_profile SET 
                        business_name = ?,
                        business_address = ?,
                        business_phone = ?,
                        business_email = ?,
                        tax_id = ?,
                        bank_account = ?,
                        approval_status = 'pending',
                        rejected_reason = NULL
                    WHERE userID = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $business_name,
                $input['business_address'] ?? null,
                $business_phone,
                $input['business_email'] ?? null,
                $input['tax_id'] ?? null,
                $input['bank_account'] ?? null,
                $userID
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Application resubmitted successfully! Please wait for approval.'
            ]);
        } else {
            // INSERT new application
            $sql = "INSERT INTO seller_profile (
                userID, business_name, business_address, business_phone, 
                business_email, tax_id, bank_account, approval_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $userID,
                $business_name,
                $input['business_address'] ?? null,
                $business_phone,
                $input['business_email'] ?? null,
                $input['tax_id'] ?? null,
                $input['bank_account'] ?? null
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Application submitted successfully! Please wait for approval.'
            ]);
        }
        exit();
    }

    // ========== PUT: Update application (alternative method) ==========
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Check if user has a rejected application
        $result = isSeller($conn, $userID);
        if (!$result['isSeller'] || $result['status'] !== 'rejected') {
            echo json_encode([
                'success' => false, 
                'message' => 'No rejected application found to update'
            ]);
            exit();
        }
        
        $business_name = trim($input['business_name'] ?? '');
        if (empty($business_name)) {
            echo json_encode(['success' => false, 'message' => 'Business name is required']);
            exit();
        }
        
        $sql = "UPDATE seller_profile SET 
                    business_name = ?,
                    business_address = ?,
                    business_phone = ?,
                    business_email = ?,
                    tax_id = ?,
                    bank_account = ?,
                    approval_status = 'pending',
                    rejected_reason = NULL
                WHERE userID = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $business_name,
            $input['business_address'] ?? null,
            $input['business_phone'] ?? null,
            $input['business_email'] ?? null,
            $input['tax_id'] ?? null,
            $input['bank_account'] ?? null,
            $userID
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Application updated and resubmitted for review!'
        ]);
        exit();
    }
    
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    
} catch (PDOException $e) {
    error_log("Seller apply PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Seller apply error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>