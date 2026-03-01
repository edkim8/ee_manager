-- Add social/tour link fields to properties table
-- Used by the iPad Tour Companion (Page 4 Neighborhood Toolkit)

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS instagram_url  TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url   TEXT,
  ADD COLUMN IF NOT EXISTS site_map_url   TEXT,   -- sightmap.com embed URL
  ADD COLUMN IF NOT EXISTS walk_score_id  TEXT;   -- Walk Score widget wsid

COMMENT ON COLUMN properties.instagram_url  IS 'Instagram page or post URL for the property';
COMMENT ON COLUMN properties.facebook_url   IS 'Facebook page URL for the property';
COMMENT ON COLUMN properties.site_map_url   IS 'Sightmap.com embed URL (e.g. https://sightmap.com/embed/xxxx)';
COMMENT ON COLUMN properties.walk_score_id  IS 'Walk Score widget ID (wsid) — register at walkscore.com/professional/api.php';
