-- Allow rating to be NULL until the user rates after consumption
ALTER TABLE meal_consumptions
MODIFY COLUMN rating TINYINT UNSIGNED NULL;

-- Drop existing check so we can add one that allows NULL
ALTER TABLE meal_consumptions
DROP CHECK chk_meal_consumptions_rating;

ALTER TABLE meal_consumptions
ADD CONSTRAINT chk_meal_consumptions_rating
CHECK (rating IS NULL OR (rating BETWEEN 1 AND 10));
