<?php
require_once __DIR__ . '/../models/Showcase.php';

class ShowcaseController {
    private $showcaseModel;

    public function __construct($pdo) {
        $this->showcaseModel = new Showcase($pdo);
    }

    public function getShowcase($username) {
        $showcases = $this->showcaseModel->getShowcaseByUser($username);
        foreach ($showcases as &$showcase) {
            $showcase['cards'] = $this->showcaseModel->getShowcaseCards($showcase['showcase_id']);
        }
        return $showcases;
    }

    public function addCard($username, $cardId) {
        if (!isset($_SESSION['username']) || $_SESSION['username'] !== $username) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }
        $showcaseId = $this->showcaseModel->createShowcaseIfNotExists($username);
        $this->showcaseModel->addCard($showcaseId, $cardId);
        return ["success" => true];
    }

    public function removeCard($username, $cardId) {
        if (!isset($_SESSION['username']) || $_SESSION['username'] !== $username) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }
        $showcases = $this->showcaseModel->getShowcaseByUser($username);
        if (empty($showcases)) return ["error" => "No showcase found"];
        $this->showcaseModel->removeCard($showcases[0]['showcase_id'], $cardId);
        return ["success" => true];
    }
}
