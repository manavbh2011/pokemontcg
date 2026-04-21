ALTER TABLE listing
  ADD CONSTRAINT fk_listing_card
  FOREIGN KEY (card_id) REFERENCES `card`(card_id);

ALTER TABLE `transaction`
  ADD CONSTRAINT unique_listing_transaction UNIQUE (listing_id);
