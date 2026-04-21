<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/AuthController.php';

$controller = new AuthController($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'me') {
    echo json_encode($controller->me());

} elseif ($method === 'GET' && $action === 'search') {
    $q = trim($_GET['q'] ?? '');
    if ($q === '') {
        echo json_encode([]);
    } else {
        echo json_encode($controller->searchUsers($q));
    }

} elseif ($method === 'GET' && $action === 'profile') {
    echo json_encode($controller->getProfile($_GET['username'] ?? ''));

} elseif ($method === 'POST' && $action === 'login') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->login($data['username'] ?? '', $data['password'] ?? ''));

} elseif ($method === 'POST' && $action === 'register') {
    $data = readJsonBody();
    if ($data === null) {
        exit;
    }
    echo json_encode($controller->register($data['username'] ?? '', $data['name'] ?? '', $data['password'] ?? ''));

} elseif ($method === 'POST' && $action === 'logout') {
    echo json_encode($controller->logout());

} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
}
