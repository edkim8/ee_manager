# Gemini Goldfish Dispatch: Asset Tables

**Date**: 2026-01-31  
**Builder**: Gemini Goldfish (Tier 1)  
**Task**: Create 4 Asset List Pages

---

## Quick Dispatch

```bash
# Switch to new branch
git checkout -b feature/asset-tables

# Start NEW Gemini Goldfish session with this message:
```

---

## Project Introduction (For New Agent)

**Project**: EE_manager V2 - Property Management System  
**Stack**: Nuxt 4 + Supabase + Nuxt UI  
**Architecture**: Layered (base, ops, assets, leasing, admin, parsing, table)

**Current Status**:
- ✅ Solver Engine complete (all data processing phases)
- ✅ Table Engine complete (GenericDataTable component)
- ✅ Schema synced (types/supabase.ts matches database)
- 🎯 **Next**: Build UI for tables (your task)

**Your Role**: Build 4 Asset list pages using established Table Engine patterns.

---

**Message to Gemini**:

```
ACT AS: Tier 1 Builder (Goldfish) - Asset Tables Specialist

TASK: Create 4 Asset List Pages (Properties, Buildings, Units, Floor Plans)

CONTEXT FILES (READ THESE FIRST):
- docs/status/STATUS_BOARD.md (READ ONLY)
- docs/KNOWLEDGE_BASE.md (CRITICALLY IMPORTANT)
- layers/table/AI_USAGE_GUIDE.md (TABLE ENGINE PATTERNS)
- docs/architecture/SYSTEM_MAP.md (READ ONLY)

OBJECTIVE:
Create 4 list pages for Asset tables using the established Table Engine patterns.

TABLES TO CREATE:
1. Properties list page (layers/assets/pages/assets/properties/index.vue)
2. Buildings list page (layers/assets/pages/assets/buildings/index.vue)
3. Units list page (layers/assets/pages/assets/units/index.vue)
4. Floor Plans list page (layers/assets/pages/assets/floor-plans/index.vue)

TECHNICAL REQUIREMENTS:
- Use GenericDataTable from Table Engine (F-010)
- Follow patterns from layers/table/AI_USAGE_GUIDE.md
- Implement search, filter, export for each table
- Use types/supabase.ts for type definitions
- No views needed (direct table queries)

IMPLEMENTATION ORDER:
1. Start with Properties (simplest)
2. Then Buildings (adds property join)
3. Then Units (adds multiple joins)
4. Finally Floor Plans (adds aggregations)

COLUMNS PER TABLE:

Properties:
- Code, Name, City, State, Unit Count, Year Built

Buildings:
- Name, Property, Address, Floor Count, Unit Count

Units:
- Unit Name, Property, Building, Floor Plan, Availability Status

Floor Plans:
- Code, Marketing Name, Property, Beds, Baths, Sqft, Base Rent

CRITICAL CONSTRAINTS:
1. DO NOT EDIT ADMIN FILES (HISTORY_INDEX.md, STATUS_BOARD.md)
2. NO LEGACY SYNTAX - Use Nuxt 4/Supabase best practices
3. FOLLOW TABLE ENGINE PATTERNS - See AI_USAGE_GUIDE.md
4. TEST EACH PAGE - Verify search, filter, export work

FINAL STEP (MANDATORY):
1. Create docs/status/LATEST_UPDATE.md with:
   - List of 4 pages created
   - Technical patterns used
   - Verification results (search, filter, export tested)
   - Any issues encountered

2. Create Pull Request:
   ```bash
   git push origin feature/asset-tables
   gh pr create --base main --head feature/asset-tables \
     --title "feat(assets): Add 4 Asset list pages (Properties, Buildings, Units, Floor Plans)" \
     --body "## Summary
   Created 4 asset list pages using Table Engine patterns.
   
   ## Pages Created
   - Properties list page
   - Buildings list page
   - Units list page
   - Floor Plans list page
   
   ## Technical Details
   - Uses GenericDataTable from Table Engine
   - Implements search, filter, export on all pages
   - Direct table queries (no views needed)
   
   ## Verification
   - [x] All 4 pages load data correctly
   - [x] Search functionality working
   - [x] Filter functionality working
   - [x] Export to CSV working
   
   ## Builder
   Gemini Goldfish (Tier 1)
   
   ## Documentation
   See docs/status/LATEST_UPDATE.md for detailed field report."
   ```

DO NOT just chat. Build the pages, create the PR, and write the documentation to disk.
```

---

## Expected Outcome

Gemini will create:
1. ✅ 4 list pages in `layers/assets/pages/assets/`
2. ✅ All pages use `GenericDataTable`
3. ✅ Search, filter, export working on all pages
4. ✅ LATEST_UPDATE.md with field report

---

## Estimated Time: 4-6 hours
