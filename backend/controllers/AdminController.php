<?php
class AdminController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAllPackTypes() {
        $stmt = $this->pdo->query("SELECT * FROM pack_type ORDER BY pack_type_name");
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        return $result;
    }

    public function getTcgdexSets() {
        $response = @file_get_contents("https://api.tcgdex.net/v2/en/sets");
        if ($response === false) {
            http_response_code(502);
            return ["error" => "Failed to fetch sets from TCGdex"];
        }

        $sets = json_decode($response, true);
        if (!is_array($sets)) {
            http_response_code(502);
            return ["error" => "Invalid response from TCGdex"];
        }

        // Fetch all already-inserted IDs in one query
        $existing = $this->pdo->query("SELECT pack_type_id FROM pack_type")->fetchAll(PDO::FETCH_COLUMN);
        $existingSet = array_flip($existing);

        $result = [];
        foreach ($sets as $set) {
            $result[] = [
                "id"           => $set['id'],
                "name"         => $set['name'],
                "already_added" => isset($existingSet[$set['id']])
            ];
        }
        return $result;
    }

    public function addPackType($data) {
        $id          = trim($data['pack_type_id'] ?? '');
        $name        = trim($data['pack_type_name'] ?? '');
        $description = trim($data['pack_type_description'] ?? '');
        $price       = floatval($data['pack_price'] ?? 0);

        if (!$id || !$name || $price <= 0) {
            http_response_code(400);
            return ["error" => "ID, name, and a positive price are required"];
        }

        $check = $this->pdo->prepare("SELECT 1 FROM pack_type WHERE pack_type_id = ?");
        $check->execute([$id]);
        if ($check->fetchColumn()) {
            $check->closeCursor();
            http_response_code(409);
            return ["error" => "Pack type ID already exists"];
        }
        $check->closeCursor();

        $stmt = $this->pdo->prepare(
            "INSERT INTO pack_type (pack_type_id, pack_type_name, pack_type_description, pack_price) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$id, $name, $description, $price]);
        $stmt->closeCursor();
        return ["success" => true];
    }

    public function updatePackPrice($packTypeId, $price) {
        $packTypeId = trim($packTypeId);
        $price      = floatval($price);

        if (!$packTypeId) {
            http_response_code(400);
            return ["error" => "Pack type ID is required"];
        }
        if ($price <= 0) {
            http_response_code(400);
            return ["error" => "Price must be positive"];
        }

        $stmt = $this->pdo->prepare("UPDATE pack_type SET pack_price = ? WHERE pack_type_id = ?");
        $stmt->execute([$price, $packTypeId]);
        $affected = $stmt->rowCount();
        $stmt->closeCursor();

        if (!$affected) {
            http_response_code(404);
            return ["error" => "Pack type not found"];
        }
        return ["success" => true];
    }

    public function deletePackType($packTypeId) {
        $packTypeId = trim($packTypeId);
        if (!$packTypeId) {
            http_response_code(400);
            return ["error" => "Pack type ID is required"];
        }

        $stmt = $this->pdo->prepare("DELETE FROM pack_type WHERE pack_type_id = ?");
        $stmt->execute([$packTypeId]);
        $affected = $stmt->rowCount();
        $stmt->closeCursor();

        if (!$affected) {
            http_response_code(404);
            return ["error" => "Pack type not found"];
        }
        return ["success" => true];
    }
}
