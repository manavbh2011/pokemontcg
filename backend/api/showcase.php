<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/ShowcaseController.php';

$controller = new ShowcaseController($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET /api/showcase.php?username=ash
if ($method === 'GET' && isset($_GET['username'])) {
    echo json_encode($controller->getShowcase($_GET['username']));

} elseif ($method === 'POST' && $action === 'add') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->addCard($data['card_id'] ?? null));

} elseif ($method === 'POST' && $action === 'remove') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->removeCard($data['card_id'] ?? null));

} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
}
