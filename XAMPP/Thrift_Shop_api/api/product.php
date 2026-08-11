<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "mobile_migration";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["error" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

// Get parameters
$categoryID = isset($_GET['category']) ? intval($_GET['category']) : null;
$productID = isset($_GET['id']) ? intval($_GET['id']) : null;
$search = isset($_GET['search']) ? $_GET['search'] : null;

// ============================================================
// BUILD THE QUERY WITH VISIBILITY FILTERS
// ============================================================
$sql = "SELECT 
            p.*, 
            c.name as categoryName 
        FROM product p 
        LEFT JOIN categories c ON p.categoryID = c.categoryID 
        WHERE p.status = 'approved' 
        AND p.can_display = 1 
        AND p.seller_active = 1";

if ($categoryID) {
    $sql .= " AND p.categoryID = " . intval($categoryID);
}

if ($productID) {
    $sql .= " AND p.productID = " . intval($productID);
}

if ($search) {
    $search = $conn->real_escape_string($search);
    $sql .= " AND (p.name LIKE '%$search%' OR p.description LIKE '%$search%')";
}

$sql .= " ORDER BY p.created_at DESC";

// For debugging - log the query
error_log("Products query: " . $sql);

$result = $conn->query($sql);

if (!$result) {
    // Return error as JSON
    echo json_encode(["error" => "Query failed: " . $conn->error]);
    $conn->close();
    exit();
}

$products = [];
while ($row = $result->fetch_assoc()) {
    $products[] = [
        'productID' => intval($row['productID']),
        'name' => $row['name'],
        'description' => $row['description'],
        'price' => floatval($row['price']),
        'condition' => $row['condition'],
        'quantity' => intval($row['quantity']),
        'categoryID' => $row['categoryID'] ? intval($row['categoryID']) : null,
        'categoryName' => $row['categoryName'] ?? 'Uncategorized',
        'image' => $row['image_path'],
        'sellerID' => intval($row['sellerID']),
        'status' => $row['status'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'seller_active' => isset($row['seller_active']) ? intval($row['seller_active']) : 1,
        'can_display' => isset($row['can_display']) ? intval($row['can_display']) : 1
    ];
}

// If looking for a single product, return just that product
if ($productID && count($products) > 0) {
    echo json_encode($products[0]);
} else {
    echo json_encode($products);
}

$conn->close();
?>