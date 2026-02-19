-- Migration: Create MTM Offer History Table
-- Purpose: Track MTM offers for CA rent control compliance (Hybrid approach)
-- Date: 2026-02-14

-- Create mtm_offer_history table
CREATE TABLE IF NOT EXISTS mtm_offer_history (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  property_code TEXT NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenancy_id TEXT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,

  -- Rent Details
  current_rent DECIMAL(10,2) NOT NULL,
  offered_rent DECIMAL(10,2) NOT NULL,
  rent_increase DECIMAL(10,2) GENERATED ALWAYS AS (offered_rent - current_rent) STORED,
  increase_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN current_rent > 0
      THEN ((offered_rent - current_rent) / current_rent) * 100
      ELSE 0
    END
  ) STORED,

  -- Important Dates
  offer_date DATE NOT NULL,
  acceptance_date DATE,
  effective_date DATE NOT NULL,

  -- Status Lifecycle
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN (
    'offered',      -- Offer made, awaiting response
    'accepted',     -- Resident accepted
    'declined',     -- Resident declined
    'superseded',   -- Replaced by newer offer
    'effective',    -- Rent change in effect
    'void'          -- Cancelled/invalid
  )),

  -- Source Tracking (link back to renewals worksheet)
  renewal_worksheet_id UUID REFERENCES renewal_worksheets(id) ON DELETE SET NULL,
  renewal_worksheet_item_id UUID REFERENCES renewal_worksheet_items(id) ON DELETE SET NULL,

  -- Audit Trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  notes TEXT,

  -- Constraints
  CONSTRAINT valid_dates CHECK (effective_date >= offer_date),
  CONSTRAINT valid_rent_increase CHECK (offered_rent >= current_rent)
);

-- Performance Indexes
CREATE INDEX idx_mtm_history_unit ON mtm_offer_history(unit_id);
CREATE INDEX idx_mtm_history_tenancy ON mtm_offer_history(tenancy_id);
CREATE INDEX idx_mtm_history_property ON mtm_offer_history(property_code);
CREATE INDEX idx_mtm_history_effective_date ON mtm_offer_history(effective_date DESC);
CREATE INDEX idx_mtm_history_status ON mtm_offer_history(status) WHERE status = 'effective';
CREATE INDEX idx_mtm_history_property_effective ON mtm_offer_history(property_code, effective_date DESC, status) WHERE status = 'effective';

-- Updated_at function
CREATE OR REPLACE FUNCTION update_mtm_offer_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER update_mtm_offer_history_updated_at
  BEFORE UPDATE ON mtm_offer_history
  FOR EACH ROW
  EXECUTE FUNCTION update_mtm_offer_history_updated_at();

-- Add comment
COMMENT ON TABLE mtm_offer_history IS 'Tracks MTM (Month-to-Month) rent increase offers and acceptances for CA rent control compliance';
COMMENT ON COLUMN mtm_offer_history.status IS 'Lifecycle: offered → accepted/declined → effective (or superseded/void)';
COMMENT ON COLUMN mtm_offer_history.effective_date IS 'Date when the new rent actually takes effect (usually first of month)';
