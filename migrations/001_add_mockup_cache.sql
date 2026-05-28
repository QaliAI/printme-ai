-- Migration: Cache Printify mockup URLs on the generated_designs table
--
-- This avoids regenerating mockups every time a user views their design.
-- The first preview load triggers Printify mockup generation; subsequent
-- loads read from this cache (instant + zero Printify API cost).
--
-- printify_mockups stores an array of:
--   {
--     "blueprintId": 12,
--     "productId": "abc123",
--     "title": "Preview 1779990000",
--     "mockups": [
--       { "src": "https://images.printify.com/...", "position": "front", "isDefault": true },
--       ...
--     ]
--   }
--
-- printify_image_id stores the uploaded image's Printify ID so we can
-- reuse it across products instead of re-uploading.
--
-- printify_mockups_generated_at lets us identify stale caches (e.g. after
-- product catalog changes).

ALTER TABLE generated_designs
  ADD COLUMN IF NOT EXISTS printify_mockups JSONB,
  ADD COLUMN IF NOT EXISTS printify_image_id TEXT,
  ADD COLUMN IF NOT EXISTS printify_mockups_generated_at TIMESTAMP;

-- Lightweight index for finding designs with cached mockups
CREATE INDEX IF NOT EXISTS idx_generated_designs_has_mockups
  ON generated_designs ((printify_mockups IS NOT NULL))
  WHERE printify_mockups IS NOT NULL;

COMMENT ON COLUMN generated_designs.printify_mockups IS
  'Cached Printify mockup URLs (one entry per blueprint, multiple mockup angles each)';
COMMENT ON COLUMN generated_designs.printify_image_id IS
  'Printify upload ID for the design image — reusable across mockup generations';
COMMENT ON COLUMN generated_designs.printify_mockups_generated_at IS
  'When the mockups were last regenerated. Used to invalidate stale caches.';
