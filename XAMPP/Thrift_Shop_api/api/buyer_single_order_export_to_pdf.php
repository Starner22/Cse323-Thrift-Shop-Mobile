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
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token.']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $orderID = intval($input['orderID'] ?? 0);
    $userID = $payload['userID'];

    if (!$orderID) {
        echo json_encode(['success' => false, 'message' => 'Order ID required']);
        exit();
    }

    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Fetch Order
    $stmt = $conn->prepare("
        SELECT o.*, u.name as buyerName, u.email as buyerEmail
        FROM `order` o
        JOIN user u ON o.buyerID = u.userID
        WHERE o.orderID = ? 
        AND (o.buyerID = ? OR ? IN (SELECT userID FROM user WHERE role = 'Admin'))
    ");
    $stmt->execute([$orderID, $userID, $userID]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        echo json_encode(['success' => false, 'message' => 'Order not found or unauthorized']);
        exit();
    }

    // Fetch Items
    $stmt = $conn->prepare("
        SELECT oi.*, p.name as productName
        FROM orderitem oi
        JOIN product p ON oi.productID = p.productID
        WHERE oi.orderID = ?
    ");
    $stmt->execute([$orderID]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Generate PDF
    $html = generateOrderPDF($order, $items);

    $options = new Options();
    $options->set('defaultFont', 'Helvetica');
    $options->set('isHtml5ParserEnabled', true);
    
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    $pdfOutput = $dompdf->output();
    $fileName = "Invoice_#{$orderID}.pdf";

    // Email Config
    $fromEmail = 'mahdinmuhammad02@gmail.com';
    $fromName  = 'Thrift Store';
    $toEmail   = $order['buyerEmail'];
    $toName    = $order['buyerName'];

    $subject = "Invoice #{$orderID} - Thrift Store";
    $message = "
        <html>
        <body style='font-family: Arial, sans-serif; color: #333; line-height: 1.6;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #4F46E5; margin-bottom: 5px;'>🛍️ Thrift Store</h2>
                <h3 style='margin-top: 0;'>Order Invoice #{$orderID}</h3>
                <p>Dear " . htmlspecialchars($order['buyerName']) . ",</p>
                <p>Thank you for your purchase! Attached to this email is your official order invoice PDF.</p>
                <div style='background: #F9FAFB; border: 1px solid #E5E7EB; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                    <p style='margin: 4px 0;'><strong>Order Date:</strong> " . date('F d, Y', strtotime($order['orderDate'])) . "</p>
                    <p style='margin: 4px 0;'><strong>Order Status:</strong> " . htmlspecialchars($order['orderStatus']) . "</p>
                    <p style='margin: 4px 0;'><strong>Total Amount:</strong> $" . number_format($order['totalPrice'], 2) . "</p>
                </div>
                <hr style='border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;'>
                <p style='font-size: 12px; color: #6B7280;'>This is an automated message. Please do not reply directly to this email.</p>
            </div>
        </body>
        </html>
    ";

    $emailSent = sendEmailWithAttachment($fromEmail, $fromName, $toEmail, $toName, $subject, $message, $pdfOutput, $fileName);

    if ($emailSent) {
        echo json_encode(['success' => true, 'message' => 'Invoice email sent successfully.', 'email' => $toEmail]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to send email. Please try again.']);
    }

} catch (Exception $e) {
    error_log("❌ PDF Export Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function generateOrderPDF($order, $items) {
    $date = date('F d, Y', strtotime($order['orderDate']));
    $generatedAt = date('F d, Y H:i');

    $statusStyles = [
        'Pending'    => ['bg' => '#FEF3C7', 'text' => '#92400E'],
        'Processing' => ['bg' => '#E0F2FE', 'text' => '#075985'],
        'Shipped'    => ['bg' => '#F3E8FF', 'text' => '#6B21A8'],
        'Completed'  => ['bg' => '#D1FAE5', 'text' => '#065F46'],
        'Cancelled'  => ['bg' => '#FEE2E2', 'text' => '#991B1B']
    ];

    $status = $order['orderStatus'] ?? 'Pending';
    $badgeBg = $statusStyles[$status]['bg'] ?? '#F3F4F6';
    $badgeText = $statusStyles[$status]['text'] ?? '#374151';

    $itemsHtml = '';
    $calculatedTotal = 0;
    $counter = 1;

    foreach ($items as $item) {
        $price = floatval($item['price_at_purchase']);
        $qty = intval($item['quantity']);
        $subtotal = $price * $qty;
        $calculatedTotal += $subtotal;

        $productName = htmlspecialchars($item['productName']);
        $formattedPrice = number_format($price, 2);
        $formattedSubtotal = number_format($subtotal, 2);

        $itemsHtml .= "
            <tr>
                <td style='text-align: center;'>{$counter}</td>
                <td>{$productName}</td>
                <td style='text-align: right;'>\${$formattedPrice}</td>
                <td style='text-align: center;'>{$qty}</td>
                <td style='text-align: right;'>\${$formattedSubtotal}</td>
            </tr>
        ";
        $counter++;
    }

    $formattedTotal = number_format($calculatedTotal, 2);

    $buyerName = htmlspecialchars($order['buyerName']);
    $buyerEmail = htmlspecialchars($order['buyerEmail']);
    $shippingName = htmlspecialchars($order['shipping_name'] ?? $buyerName);
    $shippingAddress = htmlspecialchars($order['shipping_address'] ?? 'N/A');
    $shippingCity = htmlspecialchars($order['shipping_city'] ?? '');
    $shippingPostal = htmlspecialchars($order['shipping_postal_code'] ?? '');
    $paymentMethod = htmlspecialchars($order['payment_method'] ?? 'N/A');
    $paymentStatus = htmlspecialchars($order['payment_status'] ?? 'N/A');

    return <<<HTML
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 30px; }
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                color: #1F2937; 
                font-size: 12px; 
                line-height: 1.5; 
            }
            .header-table { 
                width: 100%; 
                border-bottom: 2px solid #E5E7EB; 
                padding-bottom: 15px; 
                margin-bottom: 20px; 
            }
            .brand-title { 
                font-size: 24px; 
                font-weight: bold; 
                color: #4F46E5; 
                margin: 0; 
            }
            .invoice-title { 
                font-size: 18px; 
                font-weight: bold; 
                color: #374151; 
                text-align: right; 
                margin: 0; 
            }
            .invoice-subtitle { 
                font-size: 11px; 
                color: #6B7280; 
                text-align: right; 
            }
            
            .meta-table { 
                width: 100%; 
                margin-bottom: 20px; 
            }
            .meta-card { 
                background: #F9FAFB; 
                border: 1px solid #E5E7EB; 
                border-radius: 6px; 
                padding: 12px; 
                vertical-align: top; 
            }
            .meta-label { 
                font-weight: bold; 
                color: #4B5563; 
                font-size: 11px; 
            }
            .meta-value { 
                color: #1F2937; 
            }
            .status-badge { 
                background-color: {$badgeBg}; 
                color: {$badgeText}; 
                padding: 3px 8px; 
                border-radius: 10px; 
                font-weight: bold; 
                font-size: 10px; 
                display: inline-block; 
            }
            
            .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0; 
            }
            .items-table th { 
                background-color: #4F46E5; 
                color: #FFFFFF; 
                padding: 8px 10px; 
                font-size: 11px; 
                text-transform: uppercase; 
                letter-spacing: 0.5px; 
            }
            .items-table td { 
                padding: 9px 10px; 
                border-bottom: 1px solid #E5E7EB; 
                font-size: 11px; 
            }
            .items-table tr:nth-child(even) td { 
                background-color: #F9FAFB; 
            }
            
            .summary-table { 
                width: 100%; 
                margin-top: 10px; 
            }
            .grand-total-label { 
                text-align: right; 
                font-size: 13px; 
                font-weight: bold; 
                padding-right: 15px; 
            }
            .grand-total-value { 
                text-align: right; 
                font-size: 16px; 
                font-weight: bold; 
                color: #4F46E5; 
                width: 120px; 
            }
            
            .thank-you-box { 
                background-color: #ECFDF5; 
                border-left: 4px solid #10B981; 
                padding: 10px 12px; 
                margin-top: 30px; 
                border-radius: 4px; 
            }
            .thank-you-title { 
                font-weight: bold; 
                color: #065F46; 
            }
            .thank-you-sub { 
                font-size: 10px; 
                color: #047857; 
            }
            
            .footer { 
                margin-top: 40px; 
                text-align: center; 
                font-size: 10px; 
                color: #9CA3AF; 
                border-top: 1px solid #E5E7EB; 
                padding-top: 10px; 
            }
        </style>
    </head>
    <body>

        <table class="header-table">
            <tr>
                <td>
                    <div class="brand-title">Thrift Store</div>
                    <div style="font-size: 11px; color: #6B7280;">Official Purchase Receipt</div>
                </td>
                <td>
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-subtitle">#{$order['orderID']}</div>
                </td>
            </tr>
        </table>

        <table class="meta-table" cellspacing="0" cellpadding="0">
            <tr>
                <td class="meta-card" width="48%">
                    <strong style="color: #4F46E5; font-size: 12px;">Order Details</strong>
                    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 6px 0 10px 0;">
                    <table width="100%" cellspacing="0" cellpadding="2">
                        <tr>
                            <td class="meta-label">Date:</td>
                            <td class="meta-value">{$date}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Status:</td>
                            <td><span class="status-badge">{$status}</span></td>
                        </tr>
                        <tr>
                            <td class="meta-label">Payment:</td>
                            <td class="meta-value">{$paymentMethod} ({$paymentStatus})</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Buyer:</td>
                            <td class="meta-value">{$buyerName}</td>
                        </tr>
                    </table>
                </td>
                
                <td width="4%"></td>
                
                <td class="meta-card" width="48%">
                    <strong style="color: #4F46E5; font-size: 12px;">Shipping Address</strong>
                    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 6px 0 10px 0;">
                    <div class="meta-value">
                        <strong>{$shippingName}</strong><br>
                        {$shippingAddress}<br>
                        {$shippingCity} {$shippingPostal}
                    </div>
                </td>
            </tr>
        </table>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 30px; text-align: center;">#</th>
                    <th style="text-align: left;">Item Description</th>
                    <th style="width: 80px; text-align: right;">Unit Price</th>
                    <th style="width: 40px; text-align: center;">Qty</th>
                    <th style="width: 90px; text-align: right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                {$itemsHtml}
            </tbody>
        </table>

        <table class="summary-table">
            <tr>
                <td class="grand-total-label">Total Amount Due:</td>
                <td class="grand-total-value">\${$formattedTotal}</td>
            </tr>
        </table>

        <div class="thank-you-box">
            <div class="thank-you-title">Thank you for your business!</div>
            <div class="thank-you-sub">Please retain this document for your records. If you have any questions, feel free to contact support.</div>
        </div>

        <div class="footer">
            Generated on {$generatedAt} | Thrift Store Automated Systems
        </div>

    </body>
    </html>
HTML;
}

function sendEmailWithAttachment($fromEmail, $fromName, $toEmail, $toName, $subject, $message, $pdfData, $fileName) {
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        error_log("PHPMailer not installed");
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
        return true;
    } catch (Exception $e) {
        error_log("PHPMailer Error: " . $e->getMessage());
        return false;
    }
}
?>