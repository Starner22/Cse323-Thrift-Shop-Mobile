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

// Check if we want all categories or just 6
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : null;
$includeCount = isset($_GET['count']) ? $_GET['count'] === 'true' : false;

// ============================================================
// BUILD THE QUERY WITH ALL VISIBILITY FILTERS
// ============================================================
$sql = "SELECT 
            c.categoryID, 
            c.name, 
            c.image_path,
            COUNT(p.productID) as product_count
        FROM categories c
        LEFT JOIN product p ON c.categoryID = p.categoryID 
            AND p.status = 'approved' 
            AND p.can_display = 1 
            AND p.seller_active = 1
        GROUP BY c.categoryID
        ORDER BY c.name";

if ($limit) {
    $sql .= " LIMIT " . intval($limit);
}

$result = $conn->query($sql);

if (!$result) {
    echo json_encode(["error" => "Query failed: " . $conn->error]);
    exit();
}

$categories = [];
while ($row = $result->fetch_assoc()) {
    $category = [
        'id' => intval($row['categoryID']),
        'name' => $row['name'],
        'image' => $row['image_path'],
        'productCount' => intval($row['product_count'])
    ];
    $categories[] = $category;
}

echo json_encode($categories);

$conn->close();
?>