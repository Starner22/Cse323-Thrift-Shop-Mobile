<?php
function isSeller($conn, $userID) {
    $stmt = $conn->prepare("SELECT sellerID, approval_status FROM seller_profile WHERE userID = ?");
    $stmt->execute([$userID]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result) return ['isSeller' => false, 'status' => null];
    
    return [
        'isSeller' => true,
        'status' => $result['approval_status']
    ];
}

function canSell($conn, $userID) {
    $result = isSeller($conn, $userID);
    return $result['isSeller'] && $result['status'] === 'approved';
}

function getSellerProfile($conn, $userID) {
    $stmt = $conn->prepare("SELECT * FROM seller_profile WHERE userID = ?");
    $stmt->execute([$userID]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}
?>