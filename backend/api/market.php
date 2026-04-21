<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/MarketController.php';

$controller = new MarketController($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    echo json_encode($controller->getListings());

} elseif ($method === 'POST' && $action === 'buy') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->buyCard($data['listing_id'] ?? null));

} elseif ($method === 'POST' && $action === 'remove') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->removeListing($data['listing_id'] ?? null));

} elseif ($method === 'POST' && $action === 'update_price') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->updateListingPrice($data['listing_id'] ?? null, $data['price'] ?? null));

} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
}
