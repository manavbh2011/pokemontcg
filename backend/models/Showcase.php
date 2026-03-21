<?php
class Showcase {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getShowcaseByUser($username) {
        $stmt = $this->pdo->prepare("SELECT * FROM showcase WHERE username = ?");
        $stmt->execute([$username]);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function getShowcaseCards($showcaseId) {
        $stmt = $this->pdo->prepare("
            SELECT c.card_id, ci.card_name, ci.type, ci.level, ci.hp
            FROM showcase_cards sc
            JOIN card c ON sc.card_id = c.card_id
            JOIN card_info ci ON c.card_info_id = ci.card_info_id
            WHERE sc.showcase_id = ?
        ");
        $stmt->execute([$showcaseId]);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }
}
