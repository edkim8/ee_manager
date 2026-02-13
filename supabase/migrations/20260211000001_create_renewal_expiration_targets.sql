-- Renewal Expiration Targets Table
-- Stores monthly lease expiration targets for strategic planning

CREATE TABLE IF NOT EXISTS renewal_expiration_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_code TEXT NOT NULL,
    month TEXT NOT NULL, -- YYYY-MM format
    target_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one record per property per month
    UNIQUE(property_code, month)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_renewal_expiration_targets_property
ON renewal_expiration_targets(property_code);

-- Auto-update updated_at
CREATE TRIGGER update_renewal_expiration_targets_updated_at
    BEFORE UPDATE ON renewal_expiration_targets
    FOR EACH ROW
    EXECUTE FUNCTION extensions.moddatetime('updated_at');

COMMENT ON TABLE renewal_expiration_targets IS 'Monthly lease expiration targets for strategic planning (24-month forecast)';
