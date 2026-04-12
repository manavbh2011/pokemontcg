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

    public function listCard($cardId, $price) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }

        $seller = $_SESSION['username'];
        $cardId = (int) $cardId;
        $price  = floatval($price);

        if ($cardId <= 0 || $price <= 0) {
            http_response_code(400);
            return ["error" => "Invalid card or price"];
        }

        $owner = $this->cardModel->getOwner($cardId);
        if ($owner === false || $owner === null) {
            http_response_code(404);
            return ["error" => "Card not found"];
        }
        if ($owner !== $seller) {
            http_response_code(403);
            return ["error" => "You don't own this card"];
        }

        if ($this->marketModel->getActiveListingIdForCard($cardId)) {
            http_response_code(409);
            return ["error" => "This card is already listed for sale."];
        }

        $this->marketModel->createListing($cardId, $price);
        return ["success" => true];
    }

    public function updateListingPrice($listingId, $price) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }

        $seller    = $_SESSION['username'];
        $listingId = (int) $listingId;
        $price     = floatval($price);

        if ($listingId <= 0 || $price <= 0) {
            http_response_code(400);
            return ["error" => "Invalid listing or price"];
        }

        $listing = $this->marketModel->getListing($listingId);
        if (!$listing) {
            http_response_code(404);
            return ["error" => "Listing not found or already sold"];
        }
        if ($listing['seller'] !== $seller) {
            http_response_code(403);
            return ["error" => "Not your listing"];
        }

        $this->marketModel->updateListingPrice($listingId, $price);
        return ["success" => true];
    }

    public function removeListing($listingId) {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            return ["error" => "Not logged in"];
        }

        $listingId = (int) $listingId;
        $listing = $this->marketModel->getListing($listingId);
        if (!$listing) {
            http_response_code(404);
            return ["error" => "Listing not found"];
        }
        if ($listing['seller'] !== $_SESSION['username']) {
            http_response_code(403);
            return ["error" => "Not your listing"];
        }

        $this->marketModel->deleteListing($listingId);
        return ["success" => true];
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
            $buyerRow = $this->userModel->findByUsername($buyer);
            return [
                "success"  => true,
                "message"  => "Card purchased successfully",
                "card_id"  => $listing['card_id'],
                "balance"  => $buyerRow["balance"]
            ];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            return ["error" => $e->getMessage()];
        }
    }
}
