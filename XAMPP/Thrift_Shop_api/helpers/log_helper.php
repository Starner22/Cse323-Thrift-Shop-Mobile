<?php
/**
 * Moderation Logging Helper
 * Centralized logging for all moderator/admin actions
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Main logging function
 * 
 * @param int $moderatorID - Who performed the action
 * @param string $action - The action performed (e.g., 'approve_seller', 'hide_product')
 * @param string $category - The category (e.g., 'seller', 'product', 'user', 'moderator')
 * @param int|null $targetUserID - Target user (if applicable)
 * @param int|null $targetProductID - Target product (if applicable)
 * @param string|null $details - Additional details (JSON or text)
 * @param string|null $ipAddress - IP address of the moderator
 * @return int|false - The historyID or false on failure
 */
function logModerationAction($moderatorID, $action, $category, $targetUserID = null, $targetProductID = null, $details = null, $ipAddress = null) {
    try {
        // Get database connection
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        // If no IP provided, get from server
        if ($ipAddress === null) {
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        }
        
        // Insert into moderation_history
        $sql = "INSERT INTO moderation_history 
                (moderatorID, targetUserID, targetProductID, action, action_category, details, ip_address) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $moderatorID,
            $targetUserID,
            $targetProductID,
            $action,
            $category,
            $details,
            $ipAddress
        ]);
        
        return $conn->lastInsertId();
        
    } catch (PDOException $e) {
        error_log("Log moderation action PDO error: " . $e->getMessage());
        return false;
    } catch (Exception $e) {
        error_log("Log moderation action error: " . $e->getMessage());
        return false;
    }
}

function logSellerAction($moderatorID, $action, $targetUserID, $details = null) {
    $validActions = ['approve_seller', 'reject_seller', 'suspend_seller', 'restore_seller', 'delete_seller', 'edit_seller'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid seller action: $action");
        return false;
    }
    
    if (is_array($details)) {
        $details = json_encode($details);
    }
    
    return logModerationAction($moderatorID, $action, 'seller', $targetUserID, null, $details);
}

function logProductAction($moderatorID, $action, $targetProductID, $details = null) {
    $validActions = ['approve_product', 'reject_product', 'hide_product', 'show_product', 'delete_product', 'edit_product', 'add_note'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid product action: $action");
        return false;
    }

    if (is_array($details)) {
        $details = json_encode($details);
    }
    
    return logModerationAction($moderatorID, $action, 'product', null, $targetProductID, $details);
}

function logUserAction($moderatorID, $action, $targetUserID, $details = null) {
    $validActions = ['delete_user', 'edit_user', 'suspend_user', 'restore_user'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid user action: $action");
        return false;
    }
    return logModerationAction($moderatorID, $action, 'user', $targetUserID, null, $details);
}

function logModeratorAction($moderatorID, $action, $targetUserID, $details = null) {
    $validActions = ['add_moderator', 'remove_moderator', 'edit_moderator', 'update_permissions'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid moderator action: $action");
        return false;
    }
    return logModerationAction($moderatorID, $action, 'moderator', $targetUserID, null, $details);
}

function getActionLabel($action) {
    $labels = [
        // Seller actions
        'approve_seller' => 'Approved Seller',
        'reject_seller' => 'Rejected Seller',
        'suspend_seller' => 'Suspended Seller',
        'restore_seller' => 'Restored Seller',
        'delete_seller' => 'Deleted Seller',
        'edit_seller' => 'Edited Seller Details',
        
        // Product actions
        'approve_product' => 'Approved Product',
        'reject_product' => 'Rejected Product',
        'hide_product' => 'Hidden Product',
        'show_product' => 'Showed Product',
        'delete_product' => 'Deleted Product',
        'edit_product' => 'Edited Product Details',
        'add_note' => 'Added Moderation Note',
        
        // User actions
        'delete_user' => 'Deleted User',
        'edit_user' => 'Edited User Details',
        'suspend_user' => 'Suspended User',
        'restore_user' => 'Restored User',
        
        // Moderator actions
        'add_moderator' => 'Added Moderator',
        'remove_moderator' => 'Removed Moderator',
        'edit_moderator' => 'Edited Moderator',
        'update_permissions' => 'Updated Permissions'
    ];
    
    return $labels[$action] ?? ucfirst(str_replace('_', ' ', $action));
}

function getActionColor($action) {
    $colors = [
        // Approvals - Green
        'approve_seller' => '#4CAF50',
        'approve_product' => '#4CAF50',
        'add_moderator' => '#4CAF50',
        'restore_seller' => '#4CAF50',
        'restore_user' => '#4CAF50',
        'show_product' => '#4CAF50',
        
        // Rejections/Deletions - Red
        'reject_seller' => '#FF6B6B',
        'reject_product' => '#FF6B6B',
        'delete_seller' => '#FF6B6B',
        'delete_product' => '#FF6B6B',
        'delete_user' => '#FF6B6B',
        'remove_moderator' => '#FF6B6B',
        'suspend_seller' => '#FF6B6B',
        'suspend_user' => '#FF6B6B',
        'hide_product' => '#FF6B6B',
        
        // Edits - Blue/Orange
        'edit_seller' => '#3498DB',
        'edit_product' => '#3498DB',
        'edit_user' => '#3498DB',
        'edit_moderator' => '#3498DB',
        'update_permissions' => '#FF9800',
        'add_note' => '#9C27B0'
    ];
    
    return $colors[$action] ?? '#999';
}
?>