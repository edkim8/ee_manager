-- Migration: Solver Schema (Tenancies, Residents, Leases, Staging)
-- Date: 2026-01-28
-- Description: Implements the Hybrid Solver Schema with 'tenancy_id' as the anchor.

-- 1. Create ENUMs
CREATE TYPE public.tenancy_status AS ENUM (
    'Current',
    'Notice',
    'Future',
    'Applicant',
    'Eviction',
    'Past',
    'Denied',
    'Canceled'
);

CREATE TYPE public.household_role AS ENUM (
    'Primary',
    'Roommate',
    'Occupant',
    'Guarantor'
);

CREATE TYPE public.lease_status AS ENUM (
    'Current',
    'Notice',
    'Future',
    'Past',
    'Eviction'
);

CREATE TYPE public.import_report_type AS ENUM (
    'residents_status',
    'leased_units',
    'expiring_leases',
    'availables',
    'applications',
    'make_ready',
    'notices',
    'transfers'
);

-- 2. Import Staging Table
CREATE TABLE public.import_staging (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID NOT NULL,
    report_type public.import_report_type NOT NULL,
    property_code TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Tenancies Table (The Container)
CREATE TABLE public.tenancies (
    id TEXT PRIMARY KEY, -- The Yardi Tenancy ID (e.g. 't0012345')
    property_code TEXT NOT NULL,
    unit_id UUID NOT NULL REFERENCES public.units(id),
    status public.tenancy_status NOT NULL, -- The status of the contract
    move_in_date DATE,
    move_out_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_tenancies_property ON public.tenancies(property_code);
CREATE INDEX idx_tenancies_unit ON public.tenancies(unit_id);

-- 4. Residents Table (The Participants)
-- "Tenancy Roster" Model: All people linked to a tenancy
CREATE TABLE public.residents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_code TEXT NOT NULL,
    tenancy_id TEXT NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE, -- The Link
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role public.household_role NOT NULL, -- Primary vs Roommate
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_residents_property ON public.residents(property_code);
CREATE INDEX idx_residents_tenancy ON public.residents(tenancy_id);
-- Fuzzy Match Index
CREATE INDEX idx_residents_fuzzy ON public.residents(property_code, name, email);

-- 5. Leases (Financials)
CREATE TABLE public.leases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_code TEXT NOT NULL,
    tenancy_id TEXT NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount NUMERIC,
    deposit_amount NUMERIC,
    lease_status public.lease_status NOT NULL,
    is_active BOOLEAN DEFAULT true, -- Efficiency flag for "Current Lease"
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_leases_property ON public.leases(property_code);
CREATE INDEX idx_leases_tenancy ON public.leases(tenancy_id);
-- Efficiently find the active lease for a tenancy
CREATE INDEX idx_leases_active ON public.leases(tenancy_id, is_active);

-- 6. Availabilities (Marketing & Ops Snapshot with History)
CREATE TABLE public.availabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id),
    property_code TEXT NOT NULL,
    status TEXT, -- 'Available', 'Applied', 'Leased', 'Occupied'
    unit_name TEXT, -- Optimization for View
    available_date DATE,
    move_out_date DATE, -- Previous Resident
    move_in_date DATE, -- Future Resident
    ready_date DATE, -- From MakeReady
    rent_market NUMERIC,
    rent_offered NUMERIC,
    amenities JSONB DEFAULT '{}'::jsonb, -- Unit Amenities / Concessions
    leasing_agent TEXT, -- Responsible Leasing Agent (from Applications)
    future_tenancy_id TEXT REFERENCES public.tenancies(id), -- Link to Applicant or Future Lease
    is_mi_inspection BOOLEAN, -- Move-In Inspection Status
    screening_result TEXT, -- From Applications
    is_active BOOLEAN DEFAULT true, -- Marks current availability cycle
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Partial unique index: Only one active availability per unit
CREATE UNIQUE INDEX idx_availabilities_active_unit ON public.availabilities(unit_id) WHERE (is_active = true);

CREATE INDEX idx_availabilities_property ON public.availabilities(property_code);
CREATE INDEX idx_availabilities_status ON public.availabilities(status);
CREATE INDEX idx_availabilities_unit ON public.availabilities(unit_id);
CREATE INDEX idx_availabilities_future ON public.availabilities(future_tenancy_id);

-- View: Availabilities Metrics
CREATE OR REPLACE VIEW public.view_availabilities_metrics AS
SELECT
    a.unit_id,
    a.property_code,
    a.unit_name,
    a.status, -- Physical Status (Vacant/Occupied)
    a.leasing_agent,
    a.ready_date,
    a.move_out_date,
    a.move_in_date,
    a.amenities,
    -- Future Tenancy Status (e.g., 'Applicant', 'Future', 'Denied')
    t.status AS future_status,
    -- Operational Category: 'Available', 'Applied', 'Leased'
    CASE
        WHEN t.status IN ('Future', 'Current') THEN 'Leased'
        WHEN t.status IN ('Applicant') THEN 'Applied'
        ELSE 'Available'
    END AS operational_status,
    -- Turnover Days: Ready Date - Move Out Date
    (a.ready_date - a.move_out_date) AS turnover_days,
    -- Vacant Days: If Future Lease exists -> Gap between leases. If Not -> Gap until Today.
    CASE
        WHEN a.move_in_date IS NOT NULL THEN (a.move_in_date - a.move_out_date)
        ELSE (CURRENT_DATE - a.move_out_date)
    END AS vacant_days
FROM public.availabilities a
LEFT JOIN public.tenancies t ON a.future_tenancy_id = t.id;

-- 7. Applications (Leasing Pipeline & Workflow)
CREATE TABLE public.applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_code TEXT NOT NULL,
    unit_id UUID REFERENCES public.units(id),
    applicant_name TEXT NOT NULL,
    agent TEXT,
    application_date DATE NOT NULL,
    status TEXT NOT NULL, -- 'Approved', 'Pending', 'Canceled', etc.
    is_overdue BOOLEAN DEFAULT false, -- Computed flag (app_date > 5 days && status != closed)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_applications_property ON public.applications(property_code);
CREATE INDEX idx_applications_status ON public.applications(status);

-- 8. Enable RLS (Row Level Security) - Standard boilerplate
ALTER TABLE public.import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Note: Policies need to be added depending on Auth requirements
-- Open Policy for Admin Tooling (Authenticated Users Only)
CREATE POLICY "Enable all for authenticated users" ON public.import_staging
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.residents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Create Views

-- Leases View: Enriched lease data with resident, household, and unit information
CREATE OR REPLACE VIEW public.leases_view AS
SELECT 
    l.id,
    l.tenancy_id,
    l.property_code,
    
    -- Primary Resident Name
    (
        SELECT r.name 
        FROM public.residents r 
        WHERE r.tenancy_id = l.tenancy_id 
          AND r.role = 'Primary' 
          AND r.is_active = true
        LIMIT 1
    ) AS resident,
    
    -- Household Count (Primary + Roommates + Occupants)
    (
        SELECT COUNT(*) 
        FROM public.residents r 
        WHERE r.tenancy_id = l.tenancy_id 
          AND r.role IN ('Primary', 'Roommate', 'Occupant')
          AND r.is_active = true
    ) AS number_household,
    
    -- Unit Name
    (
        SELECT u.unit_name 
        FROM public.units u 
        JOIN public.tenancies t ON t.unit_id = u.id
        WHERE t.id = l.tenancy_id
        LIMIT 1
    ) AS unit_name,
    
    -- Move-in Date from Tenancy
    (
        SELECT t.move_in_date 
        FROM public.tenancies t 
        WHERE t.id = l.tenancy_id
        LIMIT 1
    ) AS move_in_date,
    
    -- Lease Details
    l.start_date,
    l.end_date,
    l.rent_amount,
    l.deposit_amount,
    l.lease_status
    
FROM public.leases l
WHERE l.is_active = true;

-- Grant access to authenticated users
GRANT SELECT ON public.leases_view TO authenticated;

-- 8. Row Level Security (RLS)

CREATE POLICY "Enable all for authenticated users" ON public.tenancies
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.leases
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.availabilities
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.applications
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
