<?php
// Include Composer's autoloader
require __DIR__ . '/vendor/autoload.php';

use Dompdf\Dompdf;

// Create a new Dompdf instance
$dompdf = new Dompdf();

// Load HTML content
$html = '<h1 style="color: #2c3e50;">Test PDF</h1>
         <p>Dompdf is working correctly!</p>
         <p>Generated on: ' . date('Y-m-d H:i:s') . '</p>';

$dompdf->loadHtml($html);

// Set paper size and orientation
$dompdf->setPaper('A4', 'portrait');

// Render the HTML as PDF
$dompdf->render();

// Output the PDF to browser (inline)
$dompdf->stream('test.pdf', ['Attachment' => 0]);
?>