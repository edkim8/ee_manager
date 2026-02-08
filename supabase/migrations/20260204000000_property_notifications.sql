-- Migration: Create Property Notification Recipients Table
-- Date: 2026-02-04
-- Purpose: Store email addresses mapped to specific properties for daily upload summaries

CREATE TABLE IF NOT EXISTS public.property_notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_code TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(property_code, email)
);

-- Indexes for performance
CREATE INDEX idx_prop_notif_code ON public.property_notification_recipients(property_code);
CREATE INDEX idx_prop_notif_active ON public.property_notification_recipients(is_active);

-- Enable RLS
ALTER TABLE public.property_notification_recipients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Admins) to manage this table
-- In a production app, we would restrict this to only super_admins using our is_admin() function
CREATE POLICY "Admins can manage notification recipients"
    ON public.property_notification_recipients
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Add useful comments
COMMENT ON TABLE public.property_notification_recipients IS 'Stores email recipients for property-specific daily solver summaries.';
COMMENT ON COLUMN public.property_notification_recipients.property_code IS 'The unique code for the property (e.g., SB, RS).';
