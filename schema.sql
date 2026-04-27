-- Database tables


-- Trainers (users)


CREATE TABLE IF NOT EXISTS trainer (
   username VARCHAR(255) PRIMARY KEY,
   name VARCHAR(255) NOT NULL,
   password_hash VARCHAR(255) NOT NULL,
   balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);


-- Packs


CREATE TABLE IF NOT EXISTS pack_type (
   pack_type_id VARCHAR(255) PRIMARY KEY,
   pack_type_name VARCHAR(255) NOT NULL,
   pack_type_description TEXT NOT NULL,
   pack_price DECIMAL(10, 2) NOT NULL
);


CREATE TABLE IF NOT EXISTS pack (
   pack_id INT AUTO_INCREMENT PRIMARY KEY,
   pack_type_id VARCHAR(255) NOT NULL,
   FOREIGN KEY (pack_type_id) REFERENCES pack_type(pack_type_id)
);


-- Cards


CREATE TABLE IF NOT EXISTS card_info (
   card_info_id VARCHAR(255) PRIMARY KEY,
   card_name VARCHAR(255) NOT NULL,
   `type` VARCHAR(255) NOT NULL,
   `level` VARCHAR(255) NOT NULL,
   hp INT NOT NULL
);


CREATE TABLE IF NOT EXISTS `card` (
   card_id INT AUTO_INCREMENT PRIMARY KEY,
   card_info_id VARCHAR(255) NOT NULL,
   pack_id INT NOT NULL,
   username VARCHAR(255) NOT NULL,
   FOREIGN KEY (card_info_id) REFERENCES card_info(card_info_id),
   FOREIGN KEY (pack_id) REFERENCES pack(pack_id),
   FOREIGN KEY (username) REFERENCES trainer(username)
);


-- Showcases


CREATE TABLE IF NOT EXISTS showcase (
   showcase_id INT AUTO_INCREMENT PRIMARY KEY,
   showcase_name VARCHAR(255) NOT NULL,
   showcase_description TEXT NOT NULL,
   username VARCHAR(255) NOT NULL,
   FOREIGN KEY (username) REFERENCES trainer(username)
);


CREATE TABLE IF NOT EXISTS showcase_cards (
   showcase_id INT NOT NULL,
   card_id INT NOT NULL,
   PRIMARY KEY (showcase_id, card_id),
   FOREIGN KEY (showcase_id) REFERENCES showcase(showcase_id),
   FOREIGN KEY (card_id) REFERENCES `card`(card_id)
);


-- Buying/selling cards


CREATE TABLE IF NOT EXISTS listing (
   listing_id INT AUTO_INCREMENT PRIMARY KEY,
   card_id INT NOT NULL,
   listing_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   card_price DECIMAL(10, 2) NOT NULL,
   FOREIGN KEY (card_id) REFERENCES `card`(card_id)
);


CREATE TABLE IF NOT EXISTS `transaction` (
   transaction_id INT AUTO_INCREMENT PRIMARY KEY,
   listing_id INT NOT NULL,
   card_purchase_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   seller VARCHAR(255) NOT NULL,
   buyer VARCHAR(255) NOT NULL,
   UNIQUE KEY unique_listing_transaction (listing_id),
   FOREIGN KEY (listing_id) REFERENCES listing(listing_id),
   FOREIGN KEY (seller) REFERENCES trainer(username),
   FOREIGN KEY (buyer) REFERENCES trainer(username)
);


-- Buying packs


CREATE TABLE IF NOT EXISTS buys_pack (
   pack_id INT NOT NULL PRIMARY KEY,
   username VARCHAR(255) NOT NULL,
   pack_purchase_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (pack_id) REFERENCES pack(pack_id),
   FOREIGN KEY (username) REFERENCES trainer(username)
);

-- Migration: Add CHECK constraints for data integrity

-- trainer: balance can't be negative
ALTER TABLE trainer
  ADD CONSTRAINT chk_trainer_balance_non_negative
    CHECK (balance >= 0);

-- pack_type: price must be positive
ALTER TABLE pack_type
  ADD CONSTRAINT chk_pack_price_positive
    CHECK (pack_price > 0);

-- card_info: HP must be positive (a card with 0 or negative HP makes no sense)
ALTER TABLE card_info
  ADD CONSTRAINT chk_card_hp_positive
    CHECK (hp > 0);

-- listing: price must be positive (free or negative listings shouldn't exist)
ALTER TABLE listing
  ADD CONSTRAINT chk_listing_price_positive
    CHECK (card_price > 0);

-- transaction: a trainer can't buy their own listing
ALTER TABLE `transaction`
  ADD CONSTRAINT chk_transaction_buyer_ne_seller
    CHECK (buyer <> seller);

-- card_info: HP must be non-negative, not positive, oops
ALTER TABLE card_info
  DROP CONSTRAINT chk_card_hp_positive;

ALTER TABLE card_info
  ADD CONSTRAINT chk_card_hp_not_negative
    CHECK (hp >= 0);
