-- Fix unique constraint to allow same round_number for playoff vs regular rounds
ALTER TABLE rounds DROP CONSTRAINT rounds_season_id_round_number_key;
ALTER TABLE rounds ADD CONSTRAINT rounds_season_id_round_number_is_playoff_key
  UNIQUE (season_id, round_number, is_playoff);
