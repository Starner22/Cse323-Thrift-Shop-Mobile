<?php
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
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = trim(str_replace('Bearer ', '', $authHeader));

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

    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Verify Seller Role
    $stmt = $conn->prepare("SELECT role, name, email FROM user WHERE userID = ?");
    $stmt->execute([$userID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || $user['role'] !== 'Seller') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Seller access required.']);
        exit();
    }

    // Retrieve Seller Products
    $sql = "
        SELECT 
            p.productID,
            p.name,
            p.description,
            p.price,
            p.condition,
            p.quantity,
            p.quantity_sold,
            p.status,
            p.can_display,
            p.created_at,
            c.name as categoryName,
            COALESCE(SUM(oi.quantity), 0) as total_sold,
            COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as total_revenue
        FROM product p
        LEFT JOIN categories c ON p.categoryID = c.categoryID
        LEFT JOIN orderitem oi ON p.productID = oi.productID
        LEFT JOIN `order` o ON oi.orderID = o.orderID AND o.orderStatus = 'Completed'
        WHERE p.sellerID = ? AND p.is_deleted = 0
        GROUP BY p.productID
        ORDER BY p.created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute([$userID]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($products)) {
        echo json_encode(['success' => false, 'message' => 'No products found']);
        exit();
    }

    // Aggregates
    $totalProducts = count($products);
    $totalStock = array_sum(array_column($products, 'quantity'));
    $totalSold = array_sum(array_column($products, 'total_sold'));
    $totalRevenue = array_sum(array_column($products, 'total_revenue'));

    // Render PDF
    $html = generateSellerProductsPDF($products, [
        'sellerName' => $user['name'],
        'sellerEmail' => $user['email'],
        'totalProducts' => $totalProducts,
        'totalStock' => $totalStock,
        'totalSold' => $totalSold,
        'totalRevenue' => $totalRevenue,
        'date' => date('F d, Y')
    ]);

    $options = new Options();
    $options->set('defaultFont', 'Helvetica');
    $options->set('isHtml5ParserEnabled', true);

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'landscape');
    $dompdf->render();

    $pdfOutput = $dompdf->output();
    $fileName = "Inventory_Report_" . date('Y-m-d') . ".pdf";

    // Email Config
    $toEmail = $email ?? $user['email'];
    $fromEmail = 'mahdinmuhammad02@gmail.com';
    $fromName = 'Thrift Store';

    $subject = "Product Inventory Report - " . date('F d, Y');
    $message = "
        <html>
        <body style='font-family: Arial, sans-serif; color: #333; line-height: 1.5;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #059669; margin-bottom: 5px;'>📦 Product Inventory Report</h2>
                <p>Hello " . htmlspecialchars($user['name']) . ",</p>
                <p>Your requested product inventory overview is generated and attached below.</p>
                
                <table width='100%' cellpadding='8' cellspacing='0' style='background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; margin: 20px 0;'>
                    <tr>
                        <td style='color: #4B5563;'><strong>Total Products:</strong></td>
                        <td style='text-align: right;'>{$totalProducts}</td>
                    </tr>
                    <tr>
                        <td style='color: #4B5563;'><strong>Total Stock:</strong></td>
                        <td style='text-align: right;'>{$totalStock} units</td>
                    </tr>
                    <tr>
                        <td style='color: #4B5563;'><strong>Items Sold:</strong></td>
                        <td style='text-align: right;'>{$totalSold} units</td>
                    </tr>
                    <tr>
                        <td style='color: #4B5563;'><strong>Total Revenue:</strong></td>
                        <td style='text-align: right; color: #059669; font-weight: bold;'>$" . number_format($totalRevenue, 2) . "</td>
                    </tr>
                </table>
                
                <hr style='border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;'>
                <p style='font-size: 11px; color: #9CA3AF;'>Generated on: " . date('F d, Y H:i:s') . "</p>
            </div>
        </body>
        </html>
    ";

    $emailSent = sendEmailWithAttachment($fromEmail, $fromName, $toEmail, $user['name'], $subject, $message, $pdfOutput, $fileName);

    if ($emailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'Product inventory report sent to your email',
            'email' => $toEmail
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to send email. Please try again.'
        ]);
    }

} catch (Exception $e) {
    error_log("Seller Products Export Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function generateSellerProductsPDF($products, $summary) {
    $rows = '';
    $counter = 1;

    $conditionColors = [
        'Excellent' => ['bg' => '#D1FAE5', 'text' => '#065F46'],
        'Good'      => ['bg' => '#E0F2FE', 'text' => '#075985'],
        'Normal'    => ['bg' => '#FEF3C7', 'text' => '#92400E'],
        'Subpar'    => ['bg' => '#FEE2E2', 'text' => '#991B1B']
    ];

    foreach ($products as $product) {
        $categoryName = !empty($product['categoryName']) ? htmlspecialchars($product['categoryName'], ENT_QUOTES, 'UTF-8') : 'Uncategorized';
        
        $condition = $product['condition'] ?? 'Normal';
        $condBg = $conditionColors[$condition]['bg'] ?? '#F3F4F6';
        $condText = $conditionColors[$condition]['text'] ?? '#374151';

        // Status Handler
        $statusLabel = 'Active';
        $statusStyle = 'color: #059669; font-weight: bold;';
        
        if ($product['status'] === 'pending') {
            $statusLabel = 'Pending';
            $statusStyle = 'color: #D97706; font-weight: bold;';
        } elseif (!$product['can_display']) {
            $statusLabel = 'Hidden';
            $statusStyle = 'color: #DC2626; font-weight: bold;';
        }

        $revenue = floatval($product['total_revenue'] ?? 0);
        $productName = htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8');
        $productPrice = number_format($product['price'], 2);
        $productQuantity = intval($product['quantity']);
        $productSold = intval($product['total_sold']);
        $revenueFormatted = number_format($revenue, 2);

        $rows .= "
            <tr>
                <td style='text-align: center; color: #6B7280;'>{$counter}</td>
                <td><strong>{$productName}</strong></td>
                <td>{$categoryName}</td>
                <td style='text-align: center;'>
                    <span style='background-color: {$condBg}; color: {$condText}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;'>
                        {$condition}
                    </span>
                </td>
                <td style='text-align: right;'>\${$productPrice}</td>
                <td style='text-align: center;'>{$productQuantity}</td>
                <td style='text-align: center;'>{$productSold}</td>
                <td style='text-align: right; color: #059669; font-weight: bold;'>\${$revenueFormatted}</td>
                <td style='text-align: center; {$statusStyle}'>{$statusLabel}</td>
            </tr>
        ";
        $counter++;
    }

    $totalProducts = $summary['totalProducts'];
    $totalStock = $summary['totalStock'];
    $totalSold = $summary['totalSold'];
    $totalRevenue = number_format($summary['totalRevenue'], 2);
    $sellerName = htmlspecialchars($summary['sellerName'], ENT_QUOTES, 'UTF-8');
    $sellerEmail = htmlspecialchars($summary['sellerEmail'], ENT_QUOTES, 'UTF-8');
    $date = $summary['date'];

    $turnover = 0;
    if ($totalSold > 0 && ($totalStock + $totalSold) > 0) {
        $turnover = round(($totalSold / ($totalStock + $totalSold)) * 100);
    }

    return <<<HTML
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 25px; }
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                margin: 0; 
                padding: 0; 
                font-size: 10px; 
                color: #1F2937; 
            }
            
            .header-table { 
                width: 100%; 
                border-bottom: 2px solid #10B981; 
                padding-bottom: 12px; 
                margin-bottom: 15px; 
            }
            .title { 
                font-size: 20px; 
                font-weight: bold; 
                color: #059669; 
            }
            .subtitle { 
                font-size: 10px; 
                color: #6B7280; 
            }
            
            .summary-table { 
                width: 100%; 
                margin-bottom: 15px; 
            }
            .card { 
                background: #F9FAFB; 
                border: 1px solid #E5E7EB; 
                border-left: 4px solid #10B981; 
                padding: 8px 10px; 
                border-radius: 4px; 
            }
            .card-number { 
                font-size: 16px; 
                font-weight: bold; 
                color: #059669; 
            }
            .card-label { 
                font-size: 9px; 
                color: #6B7280; 
                text-transform: uppercase; 
            }

            .data-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 15px; 
            }
            .data-table th { 
                background-color: #059669; 
                color: #FFFFFF; 
                padding: 6px 8px; 
                font-size: 9px; 
                text-transform: uppercase; 
                text-align: left; 
            }
            .data-table td { 
                padding: 6px 8px; 
                border-bottom: 1px solid #E5E7EB; 
            }
            .data-table tr:nth-child(even) td { 
                background-color: #F9FAFB; 
            }

            .total-row td { 
                background-color: #ECFDF5 !important; 
                font-weight: bold; 
                border-top: 2px solid #10B981; 
            }

            .insight-box { 
                background-color: #F3F4F6; 
                border-left: 3px solid #6B7280; 
                padding: 8px 12px; 
                font-size: 10px; 
            }
            
            .footer { 
                margin-top: 15px; 
                text-align: center; 
                color: #9CA3AF; 
                font-size: 9px; 
                border-top: 1px solid #E5E7EB; 
                padding-top: 8px; 
            }
        </style>
    </head>
    <body>

        <table class="header-table">
            <tr>
                <td>
                    <div class="title">Product Inventory Report</div>
                    <div class="subtitle">Seller: {$sellerName} ({$sellerEmail})</div>
                </td>
                <td style="text-align: right; vertical-align: bottom;">
                    <div class="subtitle">Generated on: {$date}</div>
                </td>
            </tr>
        </table>

        <!-- Summary Table Replacing Broken Grid -->
        <table class="summary-table" cellspacing="6">
            <tr>
                <td class="card" width="25%">
                    <div class="card-number">{$totalProducts}</div>
                    <div class="card-label">Total Items</div>
                </td>
                <td class="card" width="25%">
                    <div class="card-number">{$totalStock}</div>
                    <div class="card-label">Current Stock</div>
                </td>
                <td class="card" width="25%">
                    <div class="card-number">{$totalSold}</div>
                    <div class="card-label">Total Sold</div>
                </td>
                <td class="card" width="25%">
                    <div class="card-number">\${$totalRevenue}</div>
                    <div class="card-label">Total Revenue</div>
                </td>
            </tr>
        </table>

        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 20px; text-align: center;">#</th>
                    <th>Product Name</th>
                    <th style="width: 90px;">Category</th>
                    <th style="width: 60px; text-align: center;">Condition</th>
                    <th style="width: 60px; text-align: right;">Price</th>
                    <th style="width: 40px; text-align: center;">Stock</th>
                    <th style="width: 40px; text-align: center;">Sold</th>
                    <th style="width: 70px; text-align: right;">Revenue</th>
                    <th style="width: 50px; text-align: center;">Status</th>
                </tr>
            </thead>
            <tbody>
                {$rows}
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="5" style="text-align: right;">TOTALS:</td>
                    <td style="text-align: center;">{$totalStock}</td>
                    <td style="text-align: center;">{$totalSold}</td>
                    <td style="text-align: right; color: #059669;">\${$totalRevenue}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>

        <div class="insight-box">
            <strong>Performance Metrics:</strong> Estimated Inventory Turnover Rate: <strong>{$turnover}%</strong> of listed inventory sold to date.
            <p> Formula used: totalSTockSold / (totalStock + totalStockSold) * 100 </p>
        </div>

        <div class="footer">
            Thrift Store Automated Reporting System
        </div>

    </body>
    </html>
HTML;
}

function sendEmailWithAttachment($fromEmail, $fromName, $toEmail, $toName, $subject, $message, $pdfData, $fileName) {
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        return false;
    }

    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'mahdinmuhammad02@gmail.com';
        $mail->Password   = $_ENV['SMTP_PASS'] ?? 'xxxx xxxx xxxx xxxx';
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
        return true;
    } catch (Exception $e) {
        error_log("PHPMailer error: " . $e->getMessage());
        return false;
    }
}
?>