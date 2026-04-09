<?php
require_once __DIR__ . '/../models/Card.php';

class CardController {
    private $cardModel;

    public function __construct($pdo) {
        $this->cardModel = new Card($pdo);
    }

    public function getCollection($requestedUser) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }
        if ($_SESSION['username'] !== $requestedUser) {
            http_response_code(403);
            return ["error" => "Unauthorized"];
        }
        return $this->cardModel->getCollectionByUser($requestedUser);
    }
}
