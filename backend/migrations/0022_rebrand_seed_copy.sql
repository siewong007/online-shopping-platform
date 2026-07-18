-- Replace "Home Depot" branding in seed copy with generic "Online Shopping" wording.

UPDATE categories
SET teaser = 'Browse the homepage the way Online Shopping customers expect to shop it.'
WHERE slug = 'all'
  AND teaser = 'Browse the homepage the way Home Depot customers expect to shop it.';

UPDATE promotions
SET description = 'Bring Online Shopping-style freight confidence to dishwashers, laundry and kitchen refresh packages.'
WHERE label = 'Fast Free Delivery'
  AND description = 'Bring Home Depot-style freight confidence to dishwashers, laundry and kitchen refresh packages.';
