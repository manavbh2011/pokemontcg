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
