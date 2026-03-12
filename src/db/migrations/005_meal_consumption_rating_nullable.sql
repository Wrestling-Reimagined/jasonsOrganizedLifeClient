-- Drop existing check if present (may be missing if DB was bootstrapped without 002's constraint)
ALTER TABLE meal_consumptions
DROP CHECK chk_meal_consumptions_rating;

-- Allow rating to be NULL until the user rates after consumption
ALTER TABLE meal_consumptions
MODIFY COLUMN rating TINYINT UNSIGNED NULL;

ALTER TABLE meal_consumptions
ADD CONSTRAINT chk_meal_consumptions_rating
CHECK (rating IS NULL OR (rating BETWEEN 1 AND 10));
