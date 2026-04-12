<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/MarketController.php';

$controller = new MarketController($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$cardId = $data['card_id'] ?? null;
$price  = $data['price'] ?? null;

echo json_encode($controller->listCard($cardId, $price));
