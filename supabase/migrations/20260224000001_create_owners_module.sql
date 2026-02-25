-- Migration: Owners Module V3
-- Objective: Profile Extensions, Financial Reporting, and Distributions.
-- Date: 2026-02-24

-- 1. General Profile Extensions (Polymorphic)
-- Linked one-to-one with public.profiles to hold extensive contact/bio data.
CREATE TABLE IF NOT EXISTS public.profile_extensions (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    phone_mobile TEXT,
    phone_office TEXT,
    preferred_contact_method TEXT CHECK (preferred_contact_method IN ('Email', 'Phone', 'SMS')),
    bio TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ownership Entities (Corporate/Legal)
CREATE TABLE IF NOT EXISTS public.ownership_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    entity_type TEXT CHECK (entity_type IN ('LLC', 'Corporation', 'Individual', 'Partnership', 'REIT')),
    tax_id TEXT,
    total_equity_invested NUMERIC(15, 2) DEFAULT 0,
    -- Address (line2 supports C/O, Suite, Attn:, etc.)
    address_line1 TEXT,
    address_line2 TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Financial Reporting Tracking
-- Tracks periodic financial postings and summary generation.
CREATE TABLE IF NOT EXISTS public.financial_period_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT,
    period_type TEXT CHECK (period_type IN ('Monthly', 'Quarterly', 'Annual')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Final', 'Published')),
    summary_data JSONB, -- Stores calculated metrics: { revenue, noi, occupancy_rate, total_units, occupied_units }
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Distributions Table
CREATE TABLE IF NOT EXISTS public.distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.ownership_entities(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    title TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT CHECK (type IN ('Operating', 'Refinance', 'Sale', 'Tax')),
    status TEXT DEFAULT 'Processed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MTM Mapping (Owner Profile -> Ownership Entity)
CREATE TABLE IF NOT EXISTS public.owner_profile_mapping (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.ownership_entities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (profile_id, owner_id)
);

-- 6. Trigger for profile_extensions updated_at
CREATE TRIGGER on_profile_extensions_updated
    BEFORE UPDATE ON public.profile_extensions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Trigger for ownership_entities updated_at
CREATE TRIGGER on_ownership_entities_updated
    BEFORE UPDATE ON public.ownership_entities
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. RLS Policies

-- profile_extensions: each user manages their own row
ALTER TABLE public.profile_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_extensions_self_access"
    ON public.profile_extensions
    FOR ALL
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profile_extensions_admin_access"
    ON public.profile_extensions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

-- ownership_entities: visible to mapped owners and admins
ALTER TABLE public.ownership_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ownership_entities_owner_access"
    ON public.ownership_entities
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.owner_profile_mapping opm
            WHERE opm.owner_id = id AND opm.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

CREATE POLICY "ownership_entities_admin_write"
    ON public.ownership_entities
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

-- financial_period_reports: visible to owners of the property and admins
ALTER TABLE public.financial_period_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_period_reports_owner_access"
    ON public.financial_period_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.owner_profile_mapping opm
            JOIN public.distributions d ON d.owner_id = opm.owner_id
            WHERE opm.profile_id = auth.uid() AND d.property_id = financial_period_reports.property_id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

CREATE POLICY "financial_period_reports_admin_write"
    ON public.financial_period_reports
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

-- distributions: visible to mapped owners and admins
ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distributions_owner_access"
    ON public.distributions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.owner_profile_mapping opm
            WHERE opm.owner_id = distributions.owner_id AND opm.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

CREATE POLICY "distributions_admin_write"
    ON public.distributions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

-- owner_profile_mapping: users see their own mappings; admins see all
ALTER TABLE public.owner_profile_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_profile_mapping_self_access"
    ON public.owner_profile_mapping
    FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "owner_profile_mapping_admin_access"
    ON public.owner_profile_mapping
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_distributions_owner_id ON public.distributions(owner_id);
CREATE INDEX IF NOT EXISTS idx_distributions_property_id ON public.distributions(property_id);
CREATE INDEX IF NOT EXISTS idx_distributions_date ON public.distributions(distribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_period_reports_property ON public.financial_period_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_financial_period_reports_period ON public.financial_period_reports(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_owner_profile_mapping_profile ON public.owner_profile_mapping(profile_id);
CREATE INDEX IF NOT EXISTS idx_owner_profile_mapping_owner ON public.owner_profile_mapping(owner_id);
