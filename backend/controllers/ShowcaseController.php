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
}
