<?php
require_once __DIR__ . '/../models/Market.php';
require_once __DIR__ . '/../models/Card.php';
require_once __DIR__ . '/../models/User.php';

class MarketController {
    private $marketModel;
    private $cardModel;
    private $userModel;
    private $pdo;

    public function __construct($pdo) {
        $this->pdo         = $pdo;
        $this->marketModel = new Market($pdo);
        $this->cardModel   = new Card($pdo);
        $this->userModel   = new User($pdo);
    }

    public function getListings() {
        return $this->marketModel->getActiveListings();
    }

    public function buyCard($listingId) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }

        $buyer = $_SESSION['username'];

        $this->pdo->beginTransaction();
        try {
            $listing = $this->marketModel->getListing($listingId);
            if (!$listing) {
                $this->pdo->rollBack();
                http_response_code(404);
                return ["error" => "Listing not found or already sold"];
            }

            $seller = $listing['seller'];
            if ($seller === $buyer) {
                $this->pdo->rollBack();
                http_response_code(400);
                return ["error" => "Cannot buy your own listing"];
            }

            $deducted = $this->userModel->deductBalance($buyer, $listing['card_price']);
            if (!$deducted) {
                $this->pdo->rollBack();
                http_response_code(402);
                return ["error" => "Insufficient balance"];
            }

            $this->userModel->addBalance($seller, $listing['card_price']);
            $this->cardModel->transferOwnership($listing['card_id'], $buyer);
            $this->marketModel->recordTransaction($listingId, $seller, $buyer);

            $this->pdo->commit();
            return ["message" => "Card purchased successfully", "card_id" => $listing['card_id']];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            return ["error" => $e->getMessage()];
        }
    }
}
