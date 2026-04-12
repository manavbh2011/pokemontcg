<?php
require_once __DIR__ . '/../models/Pack.php';
require_once __DIR__ . '/../models/User.php';

class PackController {
    private $packModel;
    private $userModel;
    private $pdo;

    public function __construct($pdo) {
        $this->pdo       = $pdo;
        $this->packModel = new Pack($pdo);
        $this->userModel = new User($pdo);
    }

    public function getAvailablePacks() {
        return $this->packModel->getAvailablePackTypes();
    }

    public function buyPack($packTypeName) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }

        $username = $_SESSION['username'];
        $stmt = $this->pdo->prepare("SELECT * FROM pack_type WHERE pack_type_id = ?");
        $stmt->execute([$packTypeName]);
        $packType = $stmt->fetch(PDO::FETCH_ASSOC);
        $stmt->closeCursor();

        if (!$packType) {
            http_response_code(404);
            return ["error" => "Pack type not found"];
        }

        $this->pdo->beginTransaction();
        try {
            // New pack row per purchase so each trainer can open the same set many times (inventory is not finite).
            $packId = $this->packModel->createPackInstance($packType['pack_type_id']);

            $deducted = $this->userModel->deductBalance($username, $packType['pack_price']);
            if (!$deducted) {
                $this->pdo->rollBack();
                http_response_code(402);
                return ["error" => "Insufficient balance"];
            }

            $this->packModel->recordPurchase($packId, $username);
            $cards = $this->packModel->fetchAndStoreCards($packType['pack_type_id'], $packId, $username);

            $this->pdo->commit();
            $after = $this->userModel->findByUsername($username);
            return [
                "success" => true,
                "pack_id" => $packId,
                "cards"   => $cards,
                "balance" => $after["balance"]
            ];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            return ["error" => $e->getMessage()];
        }
    }
}
