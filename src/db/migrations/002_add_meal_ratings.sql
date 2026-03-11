ALTER TABLE meal_consumptions
ADD COLUMN rating TINYINT UNSIGNED NOT NULL DEFAULT 5;

ALTER TABLE meal_consumptions
ADD CONSTRAINT chk_meal_consumptions_rating
CHECK (rating BETWEEN 1 AND 10);
