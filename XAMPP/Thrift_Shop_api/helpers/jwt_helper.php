<?php
require_once __DIR__ . '/../config/jwt_config.php';


function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

// generate tokens

function generateJWT($payload) {
    // Header
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = base64UrlEncode($header);
    
    // Payload (add expiration)
    $payload['exp'] = time() + JWT_EXPIRY;
    $base64UrlPayload = base64UrlEncode(json_encode($payload));
    
    // Signature
    $signature = hash_hmac('sha256', 
        $base64UrlHeader . '.' . $base64UrlPayload, 
        JWT_SECRET, 
        true
    );
    $base64UrlSignature = base64UrlEncode($signature);
    
    // Complete token
    return $base64UrlHeader . '.' . $base64UrlPayload . '.' . $base64UrlSignature;
}


function verifyJWT($token) {
    // Split token
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    
    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
    
    // Verify signature
    $signature = base64UrlDecode($base64UrlSignature);
    $expectedSignature = hash_hmac('sha256', 
        $base64UrlHeader . '.' . $base64UrlPayload, 
        JWT_SECRET, 
        true
    );
    
    if ($signature !== $expectedSignature) {
        return null; // Invalid signature - token tampered with
    }
    
    // Decode payload
    $payload = json_decode(base64UrlDecode($base64UrlPayload), true);
    
    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null; // Token expired
    }
    
    return $payload;
}


function getUserIdFromToken($token) {
    $payload = verifyJWT($token);
    return $payload ? $payload['userID'] : null;
}


function getUserRoleFromToken($token) {
    $payload = verifyJWT($token);
    return $payload ? $payload['role'] : null;
}
?>