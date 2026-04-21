<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/AdminController.php';

if (empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden"]);
    exit;
}

$controller = new AdminController($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'packs') {
    echo json_encode($controller->getAllPackTypes());

} elseif ($method === 'GET' && $action === 'tcgdex_sets') {
    echo json_encode($controller->getTcgdexSets());

} elseif ($method === 'POST' && $action === 'add_pack') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->addPackType($data));

} elseif ($method === 'POST' && $action === 'update_price') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->updatePackPrice($data['pack_type_id'] ?? '', $data['price'] ?? 0));

} elseif ($method === 'POST' && $action === 'delete_pack') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->deletePackType($data['pack_type_id'] ?? ''));

} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
}
