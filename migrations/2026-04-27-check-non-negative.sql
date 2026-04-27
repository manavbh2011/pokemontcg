ALTER TABLE card_info
  DROP CONSTRAINT chk_card_hp_positive;

ALTER TABLE card_info
  ADD CONSTRAINT chk_card_hp_not_negative
    CHECK (hp >= 0);
