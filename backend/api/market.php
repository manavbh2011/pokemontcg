<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/MarketController.php';

$controller = new MarketController($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    echo json_encode($controller->getListings());

} elseif ($method === 'POST' && $action === 'buy') {
    $data = json_decode(file_get_contents('php://input'), true);
    echo json_encode($controller->buyCard($data['listing_id']));

} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
}
