<?php
class Pack {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAvailablePackTypes() {
        $stmt = $this->pdo->query("SELECT * FROM pack_type");
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function getAvailablePack($packTypeName) {
        // Find a pack of this type not yet purchased
        $stmt = $this->pdo->prepare("
            SELECT p.pack_id FROM pack p
            LEFT JOIN buys_pack bp ON p.pack_id = bp.pack_id
            WHERE p.pack_type_name = ? AND bp.pack_id IS NULL
            LIMIT 1
        ");
        $stmt->execute([$packTypeName]);
        $result = $stmt->fetchColumn();
        $stmt->closeCursor();
        return $result;
    }

    public function recordPurchase($packId, $username) {
        $stmt = $this->pdo->prepare(
            "INSERT INTO buys_pack (pack_id, username) VALUES (?, ?)"
        );
        $stmt->execute([$packId, $username]);
        $stmt->closeCursor();
    }

    public function getPackCards($packId) {
        $stmt = $this->pdo->prepare("
            SELECT c.card_id, ci.card_name, ci.type, ci.level, ci.hp
            FROM card c
            JOIN card_info ci ON c.card_info_id = ci.card_info_id
            WHERE c.pack_id = ?
        ");
        $stmt->execute([$packId]);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function assignCardsToUser($packId, $username) {
        $stmt = $this->pdo->prepare("UPDATE card SET username = ? WHERE pack_id = ?");
        $stmt->execute([$username, $packId]);
        $stmt->closeCursor();
    }
}
