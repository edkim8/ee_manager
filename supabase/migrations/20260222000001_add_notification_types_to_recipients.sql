-- Migration: Add notification_types to property_notification_recipients
-- Date: 2026-02-22
-- Purpose: Allow a single recipient row to subscribe to multiple notification types
--          (e.g., 'daily_summary', 'audit'). Existing rows default to ['daily_summary'].

ALTER TABLE public.property_notification_recipients
  ADD COLUMN notification_types TEXT[] NOT NULL DEFAULT ARRAY['daily_summary'];

-- GIN index for efficient array containment queries:
--   WHERE 'audit' = ANY(notification_types)
--   WHERE notification_types @> ARRAY['daily_summary']
CREATE INDEX idx_prop_notif_types
  ON public.property_notification_recipients USING GIN(notification_types);

COMMENT ON COLUMN public.property_notification_recipients.notification_types IS
  'Array of notification types this recipient subscribes to. Valid values: daily_summary, audit.';
