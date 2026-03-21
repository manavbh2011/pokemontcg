<?php
class Card {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getCollectionByUser($username) {
        $stmt = $this->pdo->prepare("
            SELECT c.card_id, ci.card_name, ci.type, ci.level, ci.hp, ci.card_info_id
            FROM card c
            JOIN card_info ci ON c.card_info_id = ci.card_info_id
            WHERE c.username = ?
            ORDER BY ci.card_name
        ");
        $stmt->execute([$username]);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function transferOwnership($cardId, $newOwner) {
        $stmt = $this->pdo->prepare("UPDATE card SET username = ? WHERE card_id = ?");
        $stmt->execute([$newOwner, $cardId]);
        $stmt->closeCursor();
    }

    public function getOwner($cardId) {
        $stmt = $this->pdo->prepare("SELECT username FROM card WHERE card_id = ?");
        $stmt->execute([$cardId]);
        $result = $stmt->fetchColumn();
        $stmt->closeCursor();
        return $result;
    }
}
