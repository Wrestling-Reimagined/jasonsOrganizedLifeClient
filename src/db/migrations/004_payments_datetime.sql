ALTER TABLE payments
ADD COLUMN paid_at DATETIME NULL;

UPDATE payments
SET paid_at = STR_TO_DATE(CONCAT(paid_on, ' 12:00:00'), '%Y-%m-%d %H:%i:%s')
WHERE paid_at IS NULL;

ALTER TABLE payments
MODIFY COLUMN paid_at DATETIME NOT NULL;
