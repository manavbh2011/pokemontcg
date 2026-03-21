<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../controllers/ShowcaseController.php';

$controller = new ShowcaseController($pdo);
$method = $_SERVER['REQUEST_METHOD'];

// GET /api/showcase.php?username=ash
if ($method === 'GET' && isset($_GET['username'])) {
    echo json_encode($controller->getShowcase($_GET['username']));
} else {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
}
