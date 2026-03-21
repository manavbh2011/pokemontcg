<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/AuthController.php';

$controller = new AuthController($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    echo json_encode($controller->login($data['username'], $data['password']));

} elseif ($method === 'POST' && $action === 'logout') {
    echo json_encode($controller->logout());

} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
}
