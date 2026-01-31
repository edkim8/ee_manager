# Claude Code Dispatch: Availabilities Table

**Date**: 2026-01-31  
**Builder**: Claude Code (Tier 2)  
**Task**: Create Availabilities List Page with Metrics Dashboard

---

## Quick Dispatch

```bash
# Switch to new branch
git checkout -b feature/availabilities-table

# Start NEW Claude Code session with this command:
```

---

## Project Introduction (For New Agent)

**Project**: EE_manager V2 - Property Management System  
**Stack**: Nuxt 4 + Supabase + Nuxt UI  
**Architecture**: Layered (base, ops, assets, leasing, admin, parsing, table)

**Current Status**:
- ✅ Solver Engine complete (all data processing phases)
- ✅ Table Engine complete (GenericDataTable component)
- ✅ Schema synced (you completed this in previous session!)
- ✅ `view_availabilities_metrics` created (migration 20260131000003)
- 🎯 **Next**: Build Availabilities UI using your view (your task)

**Your Role**: Build Availabilities list page with metrics dashboard using the view you created.

---

**Golden Command**:

```bash
claude 'ACT AS: Tier 2 Builder (Goldfish) - Availabilities Specialist

TASK: Create Availabilities List Page with Metrics Dashboard

CONTEXT FILES (READ THESE FIRST):
- docs/status/STATUS_BOARD.md (READ ONLY)
- docs/KNOWLEDGE_BASE.md (CRITICALLY IMPORTANT)
- layers/table/AI_USAGE_GUIDE.md (TABLE ENGINE PATTERNS)
- docs/status/LATEST_UPDATE.md (YOUR SCHEMA SYNC WORK)
- supabase/migrations/20260131000003_schema_sync_views_and_constraints.sql (VIEW DEFINITION)

OBJECTIVE:
Create Availabilities list page with metrics dashboard using view_availabilities_metrics.

PAGE TO CREATE:
- layers/leasing/pages/leasing/availabilities/index.vue

TECHNICAL REQUIREMENTS:
- Use GenericDataTable from Table Engine (F-010)
- Query from view_availabilities_metrics (NOT availabilities table directly)
- Implement metrics dashboard with aggregations
- Complex filters (date ranges, status combinations)
- Export with computed columns

COLUMNS:
- Unit, Property, Status, Available Date, Leasing Agent, Rent Offered, Vacant Days, Turnover Days

METRICS DASHBOARD:
- Total Available (count where status = Available)
- Total Applied (count where status = Applied)
- Total Leased (count where status = Leased)
- Avg Vacant Days (average of vacant_days column)

VIEW STRUCTURE (from your migration):
```sql
CREATE OR REPLACE VIEW public.view_availabilities_metrics AS
SELECT
    a.unit_id,
    a.property_code,
    a.unit_name,
    a.status,
    a.leasing_agent,
    a.ready_date,
    a.move_out_date,
    a.move_in_date,
    a.amenities,
    t.status AS future_status,
    CASE
        WHEN t.status IN ('"'Future'"', '"'Current'"') THEN '"'Leased'"'
        WHEN t.status IN ('"'Applicant'"') THEN '"'Applied'"'
        ELSE '"'Available'"'
    END AS operational_status,
    (a.ready_date - a.move_out_date) AS turnover_days,
    CASE
        WHEN a.move_in_date IS NOT NULL THEN (a.move_in_date - a.move_out_date)
        ELSE (CURRENT_DATE - a.move_out_date)
    END AS vacant_days
FROM public.availabilities a
LEFT JOIN public.tenancies t ON a.future_tenancy_id = t.id;
```

CRITICAL CONSTRAINTS:
1. DO NOT EDIT ADMIN FILES (HISTORY_INDEX.md, STATUS_BOARD.md)
2. NO LEGACY SYNTAX - Use Nuxt 4/Supabase best practices
3. USE VIEW NOT TABLE - Query view_availabilities_metrics
4. FOLLOW TABLE ENGINE PATTERNS - See AI_USAGE_GUIDE.md

FINAL STEP (MANDATORY):
1. Overwrite docs/status/LATEST_UPDATE.md with:
   - Availabilities page creation details
   - Metrics dashboard implementation
   - View query patterns used
   - Verification results (metrics calculations tested)
   - Technical challenges and solutions

2. Create Pull Request:
   ```bash
   git push origin feature/availabilities-table
   gh pr create --base main --head feature/availabilities-table \
     --title "feat(leasing): Add Availabilities list page with metrics dashboard" \
     --body "## Summary
   Created Availabilities list page with metrics dashboard using view_availabilities_metrics.
   
   ## Features
   - Availabilities list page with complex view queries
   - Metrics dashboard (Total Available, Applied, Leased, Avg Vacant Days)
   - Complex filters (date ranges, status combinations)
   - Export with computed columns
   
   ## Technical Details
   - Uses view_availabilities_metrics (not direct table query)
   - Implements metrics aggregations
   - Complex business logic for status derivation
   
   ## Verification
   - [x] Page loads data from view correctly
   - [x] Metrics dashboard calculations accurate
   - [x] Complex filters working
   - [x] Export includes computed columns
   
   ## Builder
   Claude Code (Tier 2)
   
   ## Documentation
   See docs/status/LATEST_UPDATE.md for detailed field report."
   ```

DO NOT just chat. Build the page, create the PR, and write the documentation to disk.'
```

---

## Expected Outcome

Claude will create:
1. ✅ Availabilities list page in `layers/leasing/pages/leasing/availabilities/`
2. ✅ Metrics dashboard with 4 key metrics
3. ✅ Complex filters for date ranges and status
4. ✅ Export with computed columns
5. ✅ LATEST_UPDATE.md with field report

---

## Estimated Time: 3-4 hours
