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

    public function removeCardFromAllShowcases($cardId) {
        $stmt = $this->pdo->prepare("DELETE FROM showcase_cards WHERE card_id = ?");
        $stmt->execute([$cardId]);
        $stmt->closeCursor();
    }

    public function createShowcaseIfNotExists($username) {
        $stmt = $this->pdo->prepare("SELECT showcase_id FROM showcase WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $existing = $stmt->fetchColumn();
        $stmt->closeCursor();
        if ($existing) return $existing;

        $stmt = $this->pdo->prepare(
            "INSERT INTO showcase (showcase_name, showcase_description, username) VALUES (?, ?, ?)"
        );
        $stmt->execute([$username . "'s Showcase", "My favourite cards.", $username]);
        $stmt->closeCursor();
        return $this->pdo->lastInsertId();
    }

    public function addCard($showcaseId, $cardId) {
        $stmt = $this->pdo->prepare(
            "INSERT IGNORE INTO showcase_cards (showcase_id, card_id) VALUES (?, ?)"
        );
        $stmt->execute([$showcaseId, $cardId]);
        $stmt->closeCursor();
    }

    public function removeCard($showcaseId, $cardId) {
        $stmt = $this->pdo->prepare(
            "DELETE FROM showcase_cards WHERE showcase_id = ? AND card_id = ?"
        );
        $stmt->execute([$showcaseId, $cardId]);
        $stmt->closeCursor();
    }

    public function getShowcaseCards($showcaseId) {
        $stmt = $this->pdo->prepare("
            SELECT c.card_id, ci.card_info_id, ci.card_name, ci.type, ci.level, ci.hp
            FROM showcase_cards sc
            JOIN card c ON sc.card_id = c.card_id
            JOIN card_info ci ON c.card_info_id = ci.card_info_id
            WHERE sc.showcase_id = ?
            ORDER BY ci.card_name
        ");
        $stmt->execute([$showcaseId]);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }
}
