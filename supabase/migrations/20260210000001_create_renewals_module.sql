-- Migration: Renewals Module (V2)
-- Date: 2026-02-10
-- Description: Port renewal worksheets system from V1 to V2 architecture
-- Features: Manual vs Yardi-confirmed status tracking, LTL gap calculation, floor plan analytics

-- 1. Create ENUMs
CREATE TYPE public.worksheet_status AS ENUM (
    'draft',
    'final',
    'archived'
);

CREATE TYPE public.renewal_type AS ENUM (
    'standard',
    'mtm'
);

CREATE TYPE public.renewal_item_status AS ENUM (
    'pending',
    'offered',
    'manually_accepted',
    'manually_declined',
    'accepted',
    'declined',
    'expired'
);

CREATE TYPE public.rent_offer_source AS ENUM (
    'ltl_percent',
    'max_percent',
    'manual'
);

-- 2. Renewal Worksheets Table (Batch Container)
CREATE TABLE public.renewal_worksheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_code TEXT NOT NULL,
    name TEXT NOT NULL,
    status public.worksheet_status DEFAULT 'draft' NOT NULL,

    -- Date Range
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Rent Increase Configuration (visible on main page, not hidden in modal)
    max_rent_increase_percent NUMERIC(5,2) DEFAULT 5.00 NOT NULL,
    ltl_percent NUMERIC(5,2) DEFAULT 25.00 NOT NULL, -- % of gap to close

    -- MTM Configuration
    mtm_fee NUMERIC(6,2) DEFAULT 300.00 NOT NULL,
    mtm_max_percent NUMERIC(5,4) DEFAULT 0.0900 NOT NULL,

    -- Term Configuration (for offers with multiple term options)
    primary_term SMALLINT DEFAULT 12 NOT NULL,
    first_term SMALLINT,
    first_term_offset NUMERIC(4,2),
    second_term SMALLINT,
    second_term_offset NUMERIC(4,2),
    third_term SMALLINT,
    third_term_offset NUMERIC(4,2),

    -- Early Payment Incentive
    early_discount SMALLINT,
    early_discount_date DATE,

    -- Term Goals (JSONB for flexible goal tracking)
    term_goals JSONB,

    -- Notes
    notes TEXT,

    -- Approval Status (computed from items)
    is_fully_approved BOOLEAN DEFAULT false NOT NULL,

    -- Audit Fields
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_renewal_worksheets_property ON public.renewal_worksheets(property_code);
CREATE INDEX idx_renewal_worksheets_status ON public.renewal_worksheets(status);
CREATE INDEX idx_renewal_worksheets_date_range ON public.renewal_worksheets(start_date, end_date);
CREATE INDEX idx_renewal_worksheets_created_at ON public.renewal_worksheets(created_at);

-- 3. Renewal Worksheet Items Table (Individual Renewals)
CREATE TABLE public.renewal_worksheet_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worksheet_id UUID NOT NULL REFERENCES public.renewal_worksheets(id) ON DELETE CASCADE,

    -- Link to Tenancy System (V2 uses TEXT for tenancy_id, UUID for unit_id)
    tenancy_id TEXT NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id),
    property_code TEXT NOT NULL,

    -- Denormalized Display Fields (snapshot at worksheet creation)
    unit_name TEXT NOT NULL,
    resident_name TEXT,
    lease_from_date DATE,
    lease_to_date DATE,
    move_in_date DATE,

    -- Renewal Type
    renewal_type public.renewal_type DEFAULT 'standard' NOT NULL,

    -- Rent Fields (stored as NUMERIC for precision)
    current_rent NUMERIC(6,2) NOT NULL,
    market_rent NUMERIC(6,2),
    custom_rent NUMERIC(6,2),
    final_rent NUMERIC(6,2), -- The calculated/selected rent offer

    -- Rent Calculation Mode (which method was used)
    rent_offer_source public.rent_offer_source DEFAULT 'ltl_percent' NOT NULL,

    -- Additional Charges (JSONB for flexibility)
    additional_charges JSONB,

    -- MTM Specific Fields
    mtm_rent NUMERIC(6,2),
    last_mtm_offer_date DATE,

    -- Status Tracking (Manual vs Yardi-Confirmed)
    status public.renewal_item_status DEFAULT 'pending' NOT NULL,

    -- Manual Status (user-entered early signal)
    manual_status TEXT, -- 'accepted', 'declined', null
    manual_status_date DATE,
    manual_status_by UUID REFERENCES auth.users(id),

    -- Yardi Confirmation (official from daily upload)
    yardi_confirmed BOOLEAN DEFAULT false NOT NULL,
    yardi_confirmed_date DATE,
    yardi_lease_id UUID REFERENCES public.leases(id), -- Link to confirmed lease

    -- Approval Workflow
    approved BOOLEAN DEFAULT false NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    accepted_term SMALLINT, -- Which term length was accepted (6, 12, 18 months)
    accepted_date DATE,
    offered_date DATE,

    -- Comments
    comment TEXT,
    approver_comment TEXT,

    -- Soft Delete
    active BOOLEAN DEFAULT true NOT NULL,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Uniqueness: One renewal per tenancy per worksheet
    CONSTRAINT renewal_worksheet_items_unique_tenancy UNIQUE (worksheet_id, tenancy_id)
);

CREATE INDEX idx_renewal_items_worksheet ON public.renewal_worksheet_items(worksheet_id);
CREATE INDEX idx_renewal_items_tenancy ON public.renewal_worksheet_items(tenancy_id);
CREATE INDEX idx_renewal_items_unit ON public.renewal_worksheet_items(unit_id);
CREATE INDEX idx_renewal_items_property ON public.renewal_worksheet_items(property_code);
CREATE INDEX idx_renewal_items_type ON public.renewal_worksheet_items(renewal_type);
CREATE INDEX idx_renewal_items_status ON public.renewal_worksheet_items(status);
CREATE INDEX idx_renewal_items_manual_status ON public.renewal_worksheet_items(manual_status) WHERE manual_status IS NOT NULL;
CREATE INDEX idx_renewal_items_yardi_confirmed ON public.renewal_worksheet_items(yardi_confirmed);
CREATE INDEX idx_renewal_items_active ON public.renewal_worksheet_items(active) WHERE active = true;

-- 4. Function to Update Worksheet Approval Status
CREATE OR REPLACE FUNCTION public.update_worksheet_approval_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate is_fully_approved for the worksheet
    UPDATE public.renewal_worksheets
    SET
        is_fully_approved = (
            SELECT COALESCE(BOOL_AND(approved), false)
            FROM public.renewal_worksheet_items
            WHERE worksheet_id = COALESCE(NEW.worksheet_id, OLD.worksheet_id)
              AND active = true
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.worksheet_id, OLD.worksheet_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to Auto-Update is_fully_approved
CREATE TRIGGER trg_update_worksheet_approval
AFTER INSERT OR UPDATE OR DELETE ON public.renewal_worksheet_items
FOR EACH ROW
EXECUTE FUNCTION public.update_worksheet_approval_status();

-- 6. Function to Calculate Final Rent Based on Source
CREATE OR REPLACE FUNCTION public.calculate_final_rent()
RETURNS TRIGGER AS $$
DECLARE
    ltl_gap NUMERIC;
    ltl_increase NUMERIC;
    ltl_rent NUMERIC;
    max_rent NUMERIC;
    worksheet_ltl_percent NUMERIC;
    worksheet_max_percent NUMERIC;
BEGIN
    -- Fetch worksheet settings
    SELECT ltl_percent, max_rent_increase_percent
    INTO worksheet_ltl_percent, worksheet_max_percent
    FROM public.renewal_worksheets
    WHERE id = NEW.worksheet_id;

    -- Calculate based on rent_offer_source
    CASE NEW.rent_offer_source
        WHEN 'ltl_percent' THEN
            -- LTL calculation: Close X% of the gap between current and market
            -- Formula: new_rent = current_rent + ((market_rent - current_rent) * (ltl_percent / 100))
            IF NEW.market_rent IS NOT NULL AND NEW.market_rent > NEW.current_rent THEN
                ltl_gap := NEW.market_rent - NEW.current_rent;
                ltl_increase := ltl_gap * (worksheet_ltl_percent / 100);
                ltl_rent := NEW.current_rent + ltl_increase;

                -- Apply max cap (override if LTL exceeds max)
                max_rent := NEW.current_rent * (1 + worksheet_max_percent / 100);
                NEW.final_rent := LEAST(ltl_rent, max_rent);
            ELSE
                -- If no market_rent or market < current, fall back to current_rent
                NEW.final_rent := NEW.current_rent;
            END IF;

        WHEN 'max_percent' THEN
            -- Max percent calculation: current_rent * (1 + max_percent/100)
            NEW.final_rent := NEW.current_rent * (1 + worksheet_max_percent / 100);

        WHEN 'manual' THEN
            -- Manual: use custom_rent if provided, otherwise current_rent
            NEW.final_rent := COALESCE(NEW.custom_rent, NEW.current_rent);

        ELSE
            -- Default fallback
            NEW.final_rent := NEW.current_rent;
    END CASE;

    -- For MTM renewals, use mtm_rent if set (overrides other calculations)
    IF NEW.renewal_type = 'mtm' AND NEW.mtm_rent IS NOT NULL THEN
        NEW.final_rent := NEW.mtm_rent;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to Auto-Calculate Final Rent
CREATE TRIGGER trg_calculate_final_rent
BEFORE INSERT OR UPDATE OF current_rent, market_rent, rent_offer_source, custom_rent, mtm_rent ON public.renewal_worksheet_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_final_rent();

-- 8. Function to Sync Manual Status to Main Status
CREATE OR REPLACE FUNCTION public.sync_manual_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When manual_status is set, update the main status field
    IF NEW.manual_status = 'accepted' THEN
        NEW.status := 'manually_accepted';
        NEW.manual_status_date := COALESCE(NEW.manual_status_date, CURRENT_DATE);
    ELSIF NEW.manual_status = 'declined' THEN
        NEW.status := 'manually_declined';
        NEW.manual_status_date := COALESCE(NEW.manual_status_date, CURRENT_DATE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger to Sync Manual Status
CREATE TRIGGER trg_sync_manual_status
BEFORE INSERT OR UPDATE OF manual_status ON public.renewal_worksheet_items
FOR EACH ROW
WHEN (NEW.manual_status IS NOT NULL)
EXECUTE FUNCTION public.sync_manual_status();

-- 10. RLS Policies
ALTER TABLE public.renewal_worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_worksheet_items ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read/write renewals data
CREATE POLICY renewal_worksheets_auth_all
    ON public.renewal_worksheets
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY renewal_items_auth_all
    ON public.renewal_worksheet_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 11. View: Worksheet Summaries with Statistics
CREATE OR REPLACE VIEW public.view_renewal_worksheet_summaries AS
SELECT
    rw.id AS worksheet_id,
    rw.property_code,
    rw.name,
    rw.status,
    rw.start_date,
    rw.end_date,
    rw.ltl_percent,
    rw.max_rent_increase_percent,
    rw.mtm_fee,
    rw.is_fully_approved,
    rw.created_at,
    rw.updated_at,

    -- Item Counts by Type
    COUNT(rwi.id) FILTER (WHERE rwi.active = true) AS total_items,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.active = true) AS standard_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.active = true) AS mtm_count,

    -- Status Counts (Manual vs Official)
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'pending' AND rwi.active = true) AS pending_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'offered' AND rwi.active = true) AS offered_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'manually_accepted' AND rwi.active = true) AS manually_accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'manually_declined' AND rwi.active = true) AS manually_declined_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'accepted' AND rwi.active = true) AS accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'declined' AND rwi.active = true) AS declined_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'expired' AND rwi.active = true) AS expired_count,

    -- Yardi Confirmation Counts
    COUNT(rwi.id) FILTER (WHERE rwi.yardi_confirmed = true AND rwi.active = true) AS yardi_confirmed_count,

    -- Approval Counts
    COUNT(rwi.id) FILTER (WHERE rwi.approved = true AND rwi.active = true) AS approved_count,

    -- Financial Summary
    SUM(rwi.current_rent) FILTER (WHERE rwi.active = true) AS total_current_rent,
    SUM(rwi.final_rent) FILTER (WHERE rwi.active = true) AS total_offered_rent,
    SUM(rwi.final_rent - rwi.current_rent) FILTER (WHERE rwi.active = true) AS total_rent_increase,

    -- Average Increase %
    CASE
        WHEN SUM(rwi.current_rent) FILTER (WHERE rwi.active = true) > 0 THEN
            ROUND(
                (SUM(rwi.final_rent - rwi.current_rent) FILTER (WHERE rwi.active = true) /
                 SUM(rwi.current_rent) FILTER (WHERE rwi.active = true)) * 100,
                2
            )
        ELSE 0
    END AS avg_increase_percent

FROM public.renewal_worksheets rw
LEFT JOIN public.renewal_worksheet_items rwi ON rw.id = rwi.worksheet_id
GROUP BY rw.id;

-- 12. View: Renewal Pipeline Summary (for dashboard monitoring)
CREATE OR REPLACE VIEW public.view_renewal_pipeline_summary AS
SELECT
    l.property_code,
    fp.id AS floor_plan_id,
    fp.marketing_name AS floor_plan_name,

    -- Count leases expiring in next 30 days
    COUNT(DISTINCT l.id) FILTER (
        WHERE l.end_date >= CURRENT_DATE
        AND l.end_date <= CURRENT_DATE + INTERVAL '30 days'
        AND l.is_active = true
    ) AS expiring_30_days,

    -- Count leases expiring in next 90 days
    COUNT(DISTINCT l.id) FILTER (
        WHERE l.end_date >= CURRENT_DATE
        AND l.end_date <= CURRENT_DATE + INTERVAL '90 days'
        AND l.is_active = true
    ) AS expiring_90_days,

    -- Current rent stats for active leases in this floor plan
    MIN(l.rent_amount) FILTER (WHERE l.is_active = true) AS current_rent_min,
    ROUND(AVG(l.rent_amount) FILTER (WHERE l.is_active = true), 2) AS current_rent_avg,
    MAX(l.rent_amount) FILTER (WHERE l.is_active = true) AS current_rent_max,

    -- Count of renewals by status (from worksheet items)
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'offered' AND rwi.active = true) AS offered_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'manually_accepted' AND rwi.active = true) AS manually_accepted_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'manually_declined' AND rwi.active = true) AS manually_declined_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'accepted' AND rwi.active = true) AS accepted_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'declined' AND rwi.active = true) AS declined_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'pending' AND rwi.active = true) AS pending_count,

    -- Yardi confirmed count
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.yardi_confirmed = true AND rwi.active = true) AS yardi_confirmed_count

FROM public.leases l
JOIN public.tenancies t ON l.tenancy_id = t.id
JOIN public.units u ON t.unit_id = u.id
LEFT JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN public.renewal_worksheet_items rwi ON t.id = rwi.tenancy_id AND rwi.active = true
WHERE l.lease_status IN ('Current', 'Notice')
GROUP BY l.property_code, fp.id, fp.marketing_name;

-- 13. Comments
COMMENT ON TABLE public.renewal_worksheets IS 'Batch container for renewal offers. Groups renewals by date range and property. Multiple versions distinguished by created_at timestamp.';
COMMENT ON TABLE public.renewal_worksheet_items IS 'Individual renewal offers linked to tenancies. Tracks manual status (user-entered) vs Yardi-confirmed status.';
COMMENT ON COLUMN public.renewal_worksheet_items.rent_offer_source IS 'Determines rent calculation: ltl_percent (% of gap to market), max_percent (% cap), or manual (custom entry).';
COMMENT ON COLUMN public.renewal_worksheet_items.final_rent IS 'Auto-calculated based on rent_offer_source. Formula for LTL: current_rent + ((market_rent - current_rent) * (ltl_percent / 100)).';
COMMENT ON COLUMN public.renewal_worksheets.ltl_percent IS 'Lease-to-List percentage. Percentage of the gap between current_rent and market_rent to close.';
COMMENT ON COLUMN public.renewal_worksheet_items.manual_status IS 'User-entered early signal (accepted/declined) before Yardi confirmation.';
COMMENT ON COLUMN public.renewal_worksheet_items.yardi_confirmed IS 'True when renewal detected by Solver isRenewal() function from daily uploads.';
COMMENT ON COLUMN public.renewal_worksheet_items.yardi_lease_id IS 'References the new lease record created when Yardi confirms the renewal.';
COMMENT ON VIEW public.view_renewal_pipeline_summary IS 'Dashboard view showing renewal pipeline by floor plan: expiration counts, rent stats, status breakdown (manual + Yardi-confirmed).';
