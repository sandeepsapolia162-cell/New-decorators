-- Run once on an existing D1 database to support pinned portfolio photos.
ALTER TABLE media ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0 CHECK(is_pinned IN (0,1));
DROP INDEX IF EXISTS media_visible_order;
CREATE INDEX IF NOT EXISTS media_visible_order ON media(is_visible, is_pinned, sort_order);
