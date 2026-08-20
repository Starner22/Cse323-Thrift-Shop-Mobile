<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt_helper.php';
require_once __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = isset($input['email']) ? trim($input['email']) : null;
    $fromDate = isset($input['fromDate']) ? trim($input['fromDate']) : null;
    $toDate = isset($input['toDate']) ? trim($input['toDate']) : null;
    $actionFilter = isset($input['action']) ? trim($input['action']) : '';
    
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Verify Admin Role
    $stmt = $conn->prepare("SELECT role, name, email FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['role'] !== 'Admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
        exit();
    }

    // Build Query Constraints
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

    if (!empty($actionFilter)) {
        $whereClause .= " AND mh.action_category = ?";
        $params[] = $actionFilter;
    }

    // Fetch Moderation Logs
    $sql = "
        SELECT 
            mh.historyID,
            mh.action,
            mh.action_category,
            mh.details,
            mh.ip_address,
            mh.created_at,
            u.name as moderator_name,
            tu.name as target_user_name,
            tu.role as target_user_role,
            p.name as target_product_name
        FROM moderation_history mh
        LEFT JOIN user u ON mh.moderatorID = u.userID
        LEFT JOIN user tu ON mh.targetUserID = tu.userID
        LEFT JOIN product p ON mh.targetProductID = p.productID
        {$whereClause}
        ORDER BY mh.created_at DESC
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($history)) {
        echo json_encode(['success' => false, 'message' => 'No moderation history found']);
        exit();
    }

    // Calculate Summary Stats
    $actionStats = [];
    $moderatorStats = [];
    foreach ($history as $record) {
        $action = $record['action'];
        $moderator = $record['moderator_name'] ?? 'Unknown';
        $actionStats[$action] = ($actionStats[$action] ?? 0) + 1;
        $moderatorStats[$moderator] = ($moderatorStats[$moderator] ?? 0) + 1;
    }

    //  FIX 1 & 2: Pre-calculate values for use in HTML
    $uniqueActions = count($actionStats);
    $uniqueModerators = count($moderatorStats);

    // Render HTML PDF Payload
    $html = generateModerationPDF($history, $actionStats, $moderatorStats, [
        'fromDate' => $fromDate,
        'toDate' => $toDate,
        'actionFilter' => $actionFilter,
        'totalRecords' => count($history),
        'adminName' => $user['name'],
        'adminEmail' => $user['email'],
        'date' => date('F d, Y'),
        'uniqueActions' => $uniqueActions,
        'uniqueModerators' => $uniqueModerators
    ]);

    $options = new Options();
    $options->set('defaultFont', 'Helvetica');
    $options->set('isHtml5ParserEnabled', true);

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'landscape');
    $dompdf->render();
    
    $pdfOutput = $dompdf->output();
    $fileName = "Moderation_History_Report_" . date('Y-m-d') . ".pdf";

    // Setup Dispatcher Mailer
    $toEmail = $email ?? $user['email'];
    $fromEmail = 'mahdinmuhammad02@gmail.com';
    $fromName = 'Thrift Store';
    
    $subject = "Moderation History Report - " . date('F d, Y');
    $message = "
        <html>
        <body style='font-family: Arial, sans-serif; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #6C5CE7; margin-bottom: 5px;'>🛡️ Moderation History Report</h2>
                <p>Hello " . htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') . ",</p>
                <p>The moderation history report you requested is generated and attached to this email.</p>
                
                <table width='100%' cellpadding='8' cellspacing='0' style='background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; margin: 15px 0;'>
                    <tr>
                        <td><strong>Total Records:</strong></td>
                        <td style='text-align: right;'>" . count($history) . "</td>
                    </tr>
                    <tr>
                        <td><strong>Date Range:</strong></td>
                        <td style='text-align: right;'>" . ($fromDate ?: 'All') . " to " . ($toDate ?: 'All') . "</td>
                    </tr>
                    <tr>
                        <td><strong>Generated By:</strong></td>
                        <td style='text-align: right;'>" . htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') . "</td>
                    </tr>
                </table>
                
                <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
                <p style='font-size: 11px; color: #999;'>Generated on: " . date('F d, Y H:i:s') . "</p>
            </div>
        </body>
        </html>
    ";

    $emailSent = sendEmailWithAttachment($fromEmail, $fromName, $toEmail, $user['name'], $subject, $message, $pdfOutput, $fileName);

    if ($emailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'Moderation history report sent to your email',
            'email' => $toEmail
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to send email. Please try again.'
        ]);
    }

} catch (PDOException $e) {
    error_log("PDO Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Moderation Export Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function formatDetails($details, $action) {
    if (empty($details)) {
        return 'N/A';
    }
    
    $data = json_decode($details, true);
    
    if ($data === null) {
        // Not JSON, return as is (but truncate if too long)
        return strlen($details) > 50 ? substr($details, 0, 50) . '...' : $details;
    }
    
    // Handle different action types
    if (isset($data['summary']) && !empty($data['summary'])) {
        // Use summary if available
        return $data['summary'];
    }
    
    if (isset($data['reason']) && !empty($data['reason'])) {
        return 'Reason: ' . $data['reason'];
    }
    
    if (isset($data['updated_fields']) && is_array($data['updated_fields'])) {
        return 'Updated: ' . implode(', ', $data['updated_fields']);
    }
    
    if (isset($data['updated_permissions'])) {
        return 'Updated permissions';
    }
    
    if (isset($data['added_moderator'])) {
        return 'Added: ' . $data['added_moderator'];
    }
    
    if (isset($data['deleted_moderator'])) {
        return 'Removed: ' . $data['deleted_moderator'];
    }
    
    if (isset($data['deleted_user'])) {
        return 'Deleted: ' . $data['deleted_user'];
    }
    
    if (isset($data['note']) && !empty($data['note'])) {
        return 'Note: ' . $data['note'];
    }
    
    // Fallback: convert to readable string
    $readable = [];
    foreach ($data as $key => $value) {
        if (is_string($value) && !empty($value)) {
            $readable[] = ucfirst(str_replace('_', ' ', $key)) . ': ' . $value;
        }
    }
    
    if (!empty($readable)) {
        $result = implode(', ', $readable);
        return strlen($result) > 60 ? substr($result, 0, 60) . '...' : $result;
    }
    
    return 'N/A';
}

function generateModerationPDF($history, $actionStats, $moderatorStats, $summary) {
    $rows = '';
    $counter = 1;
    
    foreach ($history as $record) {
        $moderatorName = $record['moderator_name'] ?? 'Unknown';
        
        // Build target name
        if ($record['target_user_name']) {
            $targetName = $record['target_user_name'];
            if ($record['target_user_role']) {
                $targetName .= ' (' . $record['target_user_role'] . ')';
            }
        } elseif ($record['target_product_name']) {
            $targetName = $record['target_product_name'] . ' (Product)';
        } else {
            $targetName = 'N/A';
        }
        
        $actionLabel = ucwords(str_replace('_', ' ', $record['action']));
        
        //  FIX 3: Use formatted details
        $details = formatDetails($record['details'], $record['action']);
        
        $createdAt = date('Y-m-d H:i', strtotime($record['created_at']));
        
        $rows .= "
            <tr>
                <td style='text-align: center; color: #777;'>{$counter}</td>
                <td>" . htmlspecialchars($moderatorName, ENT_QUOTES, 'UTF-8') . "</td>
                <td><strong>" . htmlspecialchars($actionLabel, ENT_QUOTES, 'UTF-8') . "</strong></td>
                <td>" . htmlspecialchars($record['action_category'], ENT_QUOTES, 'UTF-8') . "</td>
                <td>" . htmlspecialchars($targetName, ENT_QUOTES, 'UTF-8') . "</td>
                <td>" . htmlspecialchars($details, ENT_QUOTES, 'UTF-8') . "</td>
                <td>" . htmlspecialchars($record['ip_address'] ?? 'N/A', ENT_QUOTES, 'UTF-8') . "</td>
                <td style='white-space: nowrap;'>{$createdAt}</td>
            </tr>
        ";
        $counter++;
    }
    
    //  FIX 1 & 2: Use pre-calculated values from $summary
    $uniqueActions = $summary['uniqueActions'] ?? count($actionStats);
    $uniqueModerators = $summary['uniqueModerators'] ?? count($moderatorStats);
    
    // Aggregates Badges
    $actionStatsHtml = '';
    foreach ($actionStats as $action => $count) {
        $label = ucwords(str_replace('_', ' ', $action));
        $actionStatsHtml .= '<span style="background: #E8F5E9; color: #2E7D32; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 8px; margin: 2px;">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . ': ' . $count . '</span> ';
    }
    
    $moderatorStatsHtml = '';
    foreach ($moderatorStats as $moderator => $count) {
        $moderatorStatsHtml .= '<span style="background: #E3F2FD; color: #1565C0; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 8px; margin: 2px;">' . htmlspecialchars($moderator, ENT_QUOTES, 'UTF-8') . ': ' . $count . '</span> ';
    }
    
    $totalRecords = $summary['totalRecords'];
    $dateRange = ($summary['fromDate'] ?: 'All') . ' to ' . ($summary['toDate'] ?: 'All');
    $adminName = htmlspecialchars($summary['adminName'], ENT_QUOTES, 'UTF-8');
    $date = $summary['date'];
    
    return <<<HTML
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 20px; }
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                margin: 0; 
                padding: 0; 
                font-size: 9px; 
                color: #2D3748; 
            }
            
            .header-table { 
                width: 100%; 
                border-bottom: 2px solid #6C5CE7; 
                padding-bottom: 8px; 
                margin-bottom: 12px; 
            }
            .title { 
                font-size: 18px; 
                font-weight: bold; 
                color: #6C5CE7; 
            }
            .subtitle { 
                font-size: 9px; 
                color: #718096; 
            }

            .summary-table { 
                width: 100%; 
                margin-bottom: 12px; 
            }
            .card { 
                background: #F7FAFC; 
                border: 1px solid #E2E8F0; 
                border-left: 3px solid #6C5CE7; 
                padding: 6px 8px; 
                border-radius: 4px; 
            }
            .card-number { 
                font-size: 14px; 
                font-weight: bold; 
                color: #6C5CE7; 
            }
            .card-label { 
                font-size: 8px; 
                color: #718096; 
                text-transform: uppercase; 
            }

            .stats-box { 
                background: #F7FAFC; 
                border: 1px solid #E2E8F0; 
                padding: 6px 8px; 
                margin-bottom: 10px; 
                border-radius: 4px; 
            }
            .stats-title { 
                font-weight: bold; 
                font-size: 9px; 
                color: #4A5568; 
                margin-bottom: 4px; 
            }

            .data-table { 
                width: 100%; 
                border-collapse: collapse; 
            }
            .data-table th { 
                background-color: #6C5CE7; 
                color: #FFFFFF; 
                padding: 5px 6px; 
                font-size: 8px; 
                text-transform: uppercase; 
                text-align: left; 
            }
            .data-table td { 
                padding: 5px 6px; 
                border-bottom: 1px solid #E2E8F0; 
            }
            .data-table tr:nth-child(even) td { 
                background-color: #F7FAFC; 
            }

            .footer { 
                margin-top: 15px; 
                text-align: center; 
                color: #A0AEC0; 
                font-size: 8px; 
                border-top: 1px solid #E2E8F0; 
                padding-top: 6px; 
            }
        </style>
    </head>
    <body>

        <table class="header-table">
            <tr>
                <td>
                    <div class="title">Moderation History Report</div>
                    <div class="subtitle">Generated by: {$adminName}</div>
                </td>
                <td style="text-align: right; vertical-align: bottom;">
                    <div class="subtitle">Date Range: {$dateRange}</div>
                    <div class="subtitle">Generated on: {$date}</div>
                </td>
            </tr>
        </table>

        <!--  FIX 1 & 2: Using pre-calculated values -->
        <table class="summary-table" cellspacing="4">
            <tr>
                <td class="card" width="33%">
                    <div class="card-number">{$totalRecords}</div>
                    <div class="card-label">Total Actions Recorded</div>
                </td>
                <td class="card" width="33%">
                    <div class="card-number">{$uniqueActions}</div>
                    <div class="card-label">Unique Action Categories</div>
                </td>
                <td class="card" width="33%">
                    <div class="card-number">{$uniqueModerators}</div>
                    <div class="card-label">Active Moderators</div>
                </td>
            </tr>
        </table>

        <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td width="49%" style="vertical-align: top;">
                    <div class="stats-box">
                        <div class="stats-title">Action Distribution</div>
                        {$actionStatsHtml}
                    </div>
                </td>
                <td width="2%"></td>
                <td width="49%" style="vertical-align: top;">
                    <div class="stats-box">
                        <div class="stats-title">Moderator Breakdown</div>
                        {$moderatorStatsHtml}
                    </div>
                </td>
            </tr>
        </table>

        <div style="font-weight: bold; font-size: 10px; margin: 8px 0 4px 0; color: #2D3748;">📋 Detailed Action Log</div>

        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 20px; text-align: center;">#</th>
                    <th style="width: 90px;">Moderator</th>
                    <th style="width: 80px;">Action</th>
                    <th style="width: 70px;">Category</th>
                    <th style="width: 100px;">Target Entity</th>
                    <th>Details / Reason</th>
                    <th style="width: 75px;">IP Address</th>
                    <th style="width: 85px;">Timestamp</th>
                </tr>
            </thead>
            <tbody>
                {$rows}
            </tbody>
        </table>

        <div class="footer">
            Generated on: {$date} | Thrift Store Management System
        </div>

    </body>
    </html>
HTML;
}

function sendEmailWithAttachment($fromEmail, $fromName, $toEmail, $toName, $subject, $message, $pdfData, $fileName) {
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        error_log("PHPMailer not installed. Please run: composer require phpmailer/phpmailer");
        return false;
    }

    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'mahdinmuhammad02@gmail.com';
        $mail->Password   = 'xxxx xxxx xxxx xxxx';
        $mail->SMTPSecure = 'tls';
        $mail->Port       = 587;

        $mail->setFrom($fromEmail, $fromName);
        $mail->addAddress($toEmail, $toName);
        $mail->addReplyTo($fromEmail, $fromName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $message;
        $mail->AltBody = strip_tags($message);

        $mail->addStringAttachment($pdfData, $fileName, 'base64', 'application/pdf');

        $mail->send();
        error_log("Email sent successfully to: " . $toEmail);
        return true;
    } catch (Exception $e) {
        error_log("PHPMailer error: " . $e->getMessage());
        return false;
    }
}
?>