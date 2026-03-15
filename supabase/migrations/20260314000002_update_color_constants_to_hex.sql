-- Migration: 20260314000002_update_color_constants_to_hex
-- Phase 1 of H-091: Convert available_status_color_* constants from
-- word-based values ("red", "pink", etc.) to definitive hex codes.
-- The DB is now the single source of truth — no client-side colorMap needed.

UPDATE app_constants
SET
  value         = '#F01C1C',
  default_value = '#F01C1C',
  help_text     = 'Enter a hex color code, e.g. #F01C1C'
WHERE key = 'available_status_color_past_due';

UPDATE app_constants
SET
  value         = '#F472B6',
  default_value = '#F472B6',
  help_text     = 'Enter a hex color code, e.g. #F472B6'
WHERE key = 'available_status_color_urgent';

UPDATE app_constants
SET
  value         = '#FBBF24',
  default_value = '#FBBF24',
  help_text     = 'Enter a hex color code, e.g. #FBBF24'
WHERE key = 'available_status_color_approaching';

UPDATE app_constants
SET
  value         = '#34D399',
  default_value = '#34D399',
  help_text     = 'Enter a hex color code, e.g. #34D399'
WHERE key = 'available_status_color_scheduled';

UPDATE app_constants
SET
  value         = '#60A5FA',
  default_value = '#60A5FA',
  help_text     = 'Enter a hex color code, e.g. #60A5FA'
WHERE key = 'available_status_color_default';
