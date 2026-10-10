-- Fixora was renamed to Craftviva; update payment accounts created by the old default seed.
UPDATE payment_methods
   SET account_name = replace(account_name, 'Fixora', 'Craftviva')
 WHERE account_name LIKE '%Fixora%';

UPDATE payment_methods
   SET instructions = replace(instructions, 'Fixora', 'Craftviva')
 WHERE instructions LIKE '%Fixora%';
