<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/CardController.php';

$controller = new CardController($pdo);
$method = $_SERVER['REQUEST_METHOD'];

// GET /api/cards.php?username=ash
if ($method === 'GET' && isset($_GET['username'])) {
    echo json_encode($controller->getCollection($_GET['username']));
} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
}
