<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/PackController.php';

$controller = new PackController($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    echo json_encode($controller->getAvailablePacks());

} elseif ($method === 'POST' && $action === 'buy') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->buyPack($data['pack_type_id'] ?? ''));

} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
}
