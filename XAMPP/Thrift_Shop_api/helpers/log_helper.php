<?php
/**
 * Moderation Logging Helper
 * Centralized logging for all moderator/admin actions
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Main logging function - logs any moderation action
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
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        if ($ipAddress === null) {
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        }
        
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

/**
 * Log product edit with detailed changes
 */
function logProductEdit($moderatorID, $productID, $oldData, $newData) {
    $updatedFields = [];
    $changes = [];
    
    // Define fields to compare
    $fields = ['name', 'description', 'price', 'quantity', 'condition', 'categoryID', 'status'];
    foreach ($fields as $field) {
        $oldVal = $oldData[$field] ?? null;
        $newVal = $newData[$field] ?? null;
        
        // Convert to string for comparison
        if ($oldVal != $newVal) {
            $updatedFields[] = $field;
            $changes[] = [
                'field' => $field,
                'old' => $oldVal,
                'new' => $newVal
            ];
        }
    }
    
    if (empty($updatedFields)) {
        return logProductAction($moderatorID, 'edit_product', $productID, 'No changes made');
    }
    
    // Create a readable summary
    $summary = 'Updated: ' . implode(', ', $updatedFields);
    $details = [
        'summary' => $summary,
        'changes' => $changes,
        'updated_fields' => $updatedFields
    ];
    
    return logProductAction($moderatorID, 'edit_product', $productID, json_encode($details));
}

/**
 * Log seller edit with detailed changes
 */
function logSellerEdit($moderatorID, $targetUserID, $oldData, $newData) {
    $updatedFields = [];
    $changes = [];
    
    $fields = ['business_name', 'business_address', 'business_phone', 'business_email', 'phone'];
    foreach ($fields as $field) {
        $oldVal = $oldData[$field] ?? null;
        $newVal = $newData[$field] ?? null;
        
        if ($oldVal != $newVal) {
            $updatedFields[] = $field;
            $changes[] = [
                'field' => $field,
                'old' => $oldVal,
                'new' => $newVal
            ];
        }
    }
    
    if (empty($updatedFields)) {
        return logSellerAction($moderatorID, 'edit_seller', $targetUserID, 'No changes made');
    }
    
    $summary = 'Updated: ' . implode(', ', $updatedFields);
    $details = [
        'summary' => $summary,
        'changes' => $changes,
        'updated_fields' => $updatedFields
    ];
    
    return logSellerAction($moderatorID, 'edit_seller', $targetUserID, json_encode($details));
}

/**
 * Log moderator edit with detailed changes
 */
function logModeratorEdit($moderatorID, $targetUserID, $oldData, $newData) {
    $updatedFields = [];
    $changes = [];
    
    $fields = ['name', 'email', 'phone'];
    foreach ($fields as $field) {
        $oldVal = $oldData[$field] ?? null;
        $newVal = $newData[$field] ?? null;
        
        if ($oldVal != $newVal) {
            $updatedFields[] = $field;
            $changes[] = [
                'field' => $field,
                'old' => $oldVal,
                'new' => $newVal
            ];
        }
    }
    
    if (empty($updatedFields)) {
        return logModeratorAction($moderatorID, 'edit_moderator', $targetUserID, 'No changes made');
    }
    
    $summary = 'Updated: ' . implode(', ', $updatedFields);
    $details = [
        'summary' => $summary,
        'changes' => $changes,
        'updated_fields' => $updatedFields
    ];
    
    return logModeratorAction($moderatorID, 'edit_moderator', $targetUserID, json_encode($details));
}

/**
 * Log seller actions
 */
function logSellerAction($moderatorID, $action, $targetUserID, $details = null) {
    $validActions = ['approve_seller', 'reject_seller', 'suspend_seller', 'restore_seller', 'delete_seller', 'edit_seller'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid seller action: $action");
        return false;
    }
    return logModerationAction($moderatorID, $action, 'seller', $targetUserID, null, $details);
}

/**
 * Log product actions
 */
function logProductAction($moderatorID, $action, $targetProductID, $details = null) {
    $validActions = ['approve_product', 'reject_product', 'hide_product', 'show_product', 'delete_product', 'edit_product', 'add_note'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid product action: $action");
        return false;
    }
    return logModerationAction($moderatorID, $action, 'product', null, $targetProductID, $details);
}

/**
 * Log user actions
 */
function logUserAction($moderatorID, $action, $targetUserID, $details = null) {
    $validActions = ['delete_user', 'edit_user', 'suspend_user', 'restore_user'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid user action: $action");
        return false;
    }
    return logModerationAction($moderatorID, $action, 'user', $targetUserID, null, $details);
}

/**
 * Log moderator actions
 */
function logModeratorAction($moderatorID, $action, $targetUserID, $details = null) {
    $validActions = ['add_moderator', 'remove_moderator', 'edit_moderator', 'update_permissions'];
    if (!in_array($action, $validActions)) {
        error_log("Invalid moderator action: $action");
        return false;
    }
    return logModerationAction($moderatorID, $action, 'moderator', $targetUserID, null, $details);
}

/**
 * Format details for display (human readable)
 */
function formatDetailsForDisplay($action, $details) {
    if (!$details) return null;
    
    $data = json_decode($details, true);
    if (!$data) return $details;
    
    // If there's a summary, use it
    if (isset($data['summary'])) {
        return $data['summary'];
    }
    
    // Handle edit actions with changes
    if (strpos($action, 'edit_') === 0) {
        if (isset($data['updated_fields'])) {
            return 'Updated: ' . implode(', ', $data['updated_fields']);
        }
        if (isset($data['old_values']) && isset($data['new_values'])) {
            $changes = [];
            foreach ($data['new_values'] as $field => $value) {
                $old = $data['old_values'][$field] ?? 'N/A';
                $changes[] = "$field: '$old' → '$value'";
            }
            return 'Changes: ' . implode(', ', $changes);
        }
    }
    
    // Handle reject/suspend
    if (in_array($action, ['reject_seller', 'reject_product', 'suspend_seller'])) {
        if (isset($data['reason'])) {
            return 'Reason: ' . $data['reason'];
        }
        if (is_string($data)) {
            return 'Reason: ' . $data;
        }
    }
    
    // Handle add_note
    if ($action === 'add_note') {
        if (isset($data['note'])) {
            return 'Note: ' . $data['note'];
        }
        if (is_string($data)) {
            return 'Note: ' . $data;
        }
    }
    
    return json_encode($data);
}

/**
 * Get human-readable action labels
 */
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

/**
 * Get action color for UI
 */
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