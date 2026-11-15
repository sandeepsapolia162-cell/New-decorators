-- Remove later placements when the same static file occurs more than once
-- in the same category. This changes database rows only; image files remain.
BEGIN TRANSACTION;

DELETE FROM media
WHERE id IN (
  SELECT later.id
  FROM media AS later
  JOIN media AS earlier
    ON earlier.source = 'static'
   AND later.source = 'static'
   AND earlier.category_id = later.category_id
   AND earlier.external_url = later.external_url
   AND (earlier.sort_order < later.sort_order
        OR (earlier.sort_order = later.sort_order AND earlier.id < later.id))
);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY category_id ORDER BY sort_order, created_at, id
  ) - 1 AS new_sort_order
  FROM media
)
UPDATE media
SET sort_order = (SELECT new_sort_order FROM ranked WHERE ranked.id = media.id)
WHERE id IN (SELECT id FROM ranked);

COMMIT;

-- Rollback note: the deleted duplicate database placements cannot be recreated
-- from this file alone. Restore the pre-migration D1 JSON backup to recover them.
-- No original files were deleted. The updated seed and fallback HTML do not
-- recreate same-file placements within the same category.
