<?php
require_once __DIR__ . '/../models/Showcase.php';
require_once __DIR__ . '/../models/Card.php';

class ShowcaseController {
    private $showcaseModel;
    private $cardModel;

    public function __construct($pdo) {
        $this->showcaseModel = new Showcase($pdo);
        $this->cardModel = new Card($pdo);
    }

    public function getShowcase($username) {
        $showcases = $this->showcaseModel->getShowcaseByUser($username);
        foreach ($showcases as &$showcase) {
            $showcase['cards'] = $this->showcaseModel->getShowcaseCards($showcase['showcase_id']);
        }
        return $showcases;
    }

    public function addCard($cardId) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }

        $username = $_SESSION['username'];
        $cardId = (int) $cardId;
        if ($cardId <= 0) {
            http_response_code(400);
            return ["error" => "Invalid card"];
        }

        if ($this->cardModel->getOwner($cardId) !== $username) {
            http_response_code(403);
            return ["error" => "You do not own this card"];
        }

        $showcaseId = $this->showcaseModel->createShowcaseIfNotExists($username);
        $this->showcaseModel->addCard($showcaseId, $cardId);
        return ["success" => true];
    }

    public function removeCard($cardId) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }

        $username = $_SESSION['username'];
        $cardId = (int) $cardId;
        if ($cardId <= 0) {
            http_response_code(400);
            return ["error" => "Invalid card"];
        }

        if ($this->cardModel->getOwner($cardId) !== $username) {
            http_response_code(403);
            return ["error" => "You do not own this card"];
        }

        $showcases = $this->showcaseModel->getShowcaseByUser($username);
        if (empty($showcases)) {
            http_response_code(404);
            return ["error" => "No showcase found"];
        }
        $this->showcaseModel->removeCard($showcases[0]['showcase_id'], $cardId);
        return ["success" => true];
    }
}
