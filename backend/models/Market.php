<?php
class Market {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getActiveListings() {
        // Active = listed but not yet in a transaction
        $stmt = $this->pdo->query("
            SELECT l.listing_id, l.card_id, l.card_price, l.listing_time,
                   ci.card_info_id, ci.card_name, ci.type, ci.level, ci.hp,
                   c.username AS seller
            FROM listing l
            JOIN card c ON l.card_id = c.card_id
            JOIN card_info ci ON c.card_info_id = ci.card_info_id
            LEFT JOIN `transaction` t ON l.listing_id = t.listing_id
            WHERE t.listing_id IS NULL
            ORDER BY l.listing_time DESC
        ");
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function getListing($listingId) {
        $stmt = $this->pdo->prepare("
            SELECT l.*, c.username AS seller
            FROM listing l
            JOIN card c ON l.card_id = c.card_id
            LEFT JOIN `transaction` t ON l.listing_id = t.listing_id
            WHERE l.listing_id = ? AND t.listing_id IS NULL
        ");
        $stmt->execute([$listingId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function recordTransaction($listingId, $seller, $buyer) {
        $stmt = $this->pdo->prepare("
            INSERT INTO `transaction` (listing_id, seller, buyer) VALUES (?, ?, ?)
        ");
        $stmt->execute([$listingId, $seller, $buyer]);
        $stmt->closeCursor();
    }

    public function getActiveListingIdForCard($cardId) {
        $stmt = $this->pdo->prepare("
            SELECT l.listing_id FROM listing l
            LEFT JOIN `transaction` t ON l.listing_id = t.listing_id
            WHERE l.card_id = ? AND t.listing_id IS NULL
            LIMIT 1
        ");
        $stmt->execute([$cardId]);
        $row = $stmt->fetchColumn();
        $stmt->closeCursor();
        return $row ? (int) $row : null;
    }

    public function createListing($cardId, $price) {
        $stmt = $this->pdo->prepare("INSERT INTO listing (card_id, card_price) VALUES (?, ?)");
        $stmt->execute([$cardId, $price]);
        $stmt->closeCursor();
    }

    public function updateListingPrice($listingId, $price) {
        $stmt = $this->pdo->prepare("UPDATE listing SET card_price = ? WHERE listing_id = ?");
        $stmt->execute([$price, $listingId]);
        $stmt->closeCursor();
    }
}
