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

    public function getAvailablePack($packTypeId) {
        $stmt = $this->pdo->prepare("
            SELECT p.pack_id FROM pack p
            JOIN pack_type pt ON p.pack_type_name = pt.pack_type_name
            LEFT JOIN buys_pack bp ON p.pack_id = bp.pack_id
            WHERE pt.pack_type_id = ? AND bp.pack_id IS NULL
            LIMIT 1
        ");
        $stmt->execute([$packTypeId]);
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

    public function fetchAndStoreCards($packTypeId, $packId, $username) {
        // Fetch all cards in the set
        $setResponse = file_get_contents("https://api.tcgdex.net/v2/en/sets/{$packTypeId}");
        if ($setResponse === false) {
            throw new Exception("Failed to fetch cards for set '{$packTypeId}'");
        }

        $setData = json_decode($setResponse, true);
        $cards   = $setData['cards'] ?? [];

        if (empty($cards)) {
            throw new Exception("No cards found for set '{$packTypeId}'");
        }

        // Pick 5 random cards
        shuffle($cards);
        $selected = array_slice($cards, 0, 5);
        $stored   = [];

        foreach ($selected as $cardStub) {
            $cardId = $cardStub['id'];

            // Fetch full card details
            $cardResponse = file_get_contents("https://api.tcgdex.net/v2/en/cards/{$cardId}");
            if ($cardResponse === false) {
                throw new Exception("Failed to fetch card '{$cardId}'");
            }

            $card = json_decode($cardResponse, true);

            $cardInfoId = $card['id'];
            $cardName   = $card['name'];
            $type       = $card['types'][0] ?? 'Unknown';
            $level      = $card['rarity'] ?? 'Unknown';
            $hp         = $card['hp'] ?? 0;

            // Insert into card_info if not already present
            $check = $this->pdo->prepare("SELECT 1 FROM card_info WHERE card_info_id = ?");
            $check->execute([$cardInfoId]);
            $exists = $check->fetchColumn();
            $check->closeCursor();

            if (!$exists) {
                $stmt = $this->pdo->prepare(
                    "INSERT INTO card_info (card_info_id, card_name, type, level, hp) VALUES (?, ?, ?, ?, ?)"
                );
                $stmt->execute([$cardInfoId, $cardName, $type, $level, $hp]);
                $stmt->closeCursor();
            }

            // Insert into card
            $stmt = $this->pdo->prepare(
                "INSERT INTO card (card_info_id, pack_id, username) VALUES (?, ?, ?)"
            );
            $stmt->execute([$cardInfoId, $packId, $username]);
            $stmt->closeCursor();

            $stored[] = [
                "card_info_id" => $cardInfoId,
                "card_name"    => $cardName,
                "type"         => $type,
                "level"        => $level,
                "hp"           => $hp
            ];
        }

        return $stored;
    }
}
