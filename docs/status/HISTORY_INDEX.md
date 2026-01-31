# History Index: Technical Decision Log

This file tracks key architectural decisions and completed milestones. Read this at the start of a session to "download" past wisdom without reading the full archives.

| ID | Module | Key Decisions | Archive Link |
|----|--------|---------------|--------------|
| H-001 | Initialization | Established 2-Layer "Goldfish" Architecture (Base/Ops). Enforced Spec-First Rule. | [INIT_SCAFFOLD](../archive/INIT_SCAFFOLD.md) |
| H-002 | Database | Implemented `profiles` table with RLS and Auto-Triggers. | - |
| H-003 | UI Strategy | Pivot to "Nuxt UI First" + JIT Components. Abandoned custom Atoms. | [ATOM_SPEC](../archive/01_UI_KIT_ATOMS_OBSOLETE.md) |
| H-004 | Architecture | Adopted Nuxt UI v4 Standard: `<UApp>` wrapper required, `@nuxt/ui` + `tailwindcss` imported in CSS. | [F-004_LOGIN](../archive/F-004_LOGIN_COMPLETE.md) |
| H-005 | Dashboard | Implemented `dashboard` layout + `auth` middleware. Ported `AppNavigation`. Fixed root route conflict. | [F-006_HOME_PAGE](../archive/F-006_HOME_PAGE_COMPLETE.md) |
| H-006 | QA | Instituted "Zero-Trust" Protocol. Installed Vitest + Playwright. Required Spec-based unit tests for all logic. | [F-007_TESTING](../archive/F-007_TESTING_INFRA_COMPLETE.md) |
| H-007 | Database | Added `user_property_access` MTM table with strict RLS. Established Constants for Property Codes. | [F-008_ACCESS](../archive/F-008_PROPERTY_ACCESS_COMPLETE.md) |
| H-008 | Administration | Implemented Admin Layer (`layers/admin`) with User Management. Added `admin` middleware and V4 UI components. | [F-009_ADMIN](../archive/F-009_ADMIN_USERS_COMPLETE.md) |
| H-010 | Table Engine | Table Engine v1.0 released. Core architecture established. GenericDataTable with 6 slots, 9 cell components, export (CSV/PDF), column presets. Living documentation at `layers/table/AI_USAGE_GUIDE.md`. | - |
| H-011 | Parsing Engine | Parsing Engine v1.0 released. Standardized specialized `layers/parsing` module. Implemented `useGenericParser` with 3 core strategies (Standard, Yardi Report, Fill Down). Configuration-driven architecture with Playground generator. | [08_PARSING_ENGINE](../specs/base/08_PARSING_ENGINE.md) |
| H-012 | Solver Engine | Established "Anchor" Architecture (Tenancy-Centric). Defined "Strict Primary" vs "Safe Sync" protocols for complex data merging. Created Solver Logic documentation. | [SOLVER_LOGIC](../../layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md) |
| H-013 | Solver Phase 2 | Implemented Leases table with 3-Criteria Renewal Detection, UPDATE-based Safe Sync, and historical preservation. Created `leases_view` for enriched reporting. | [SOLVER_LOGIC](../../layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md) |
| H-014 | Solver Phase 2A | Implemented Notices processing with unit resolution, status auto-fix, and dual table updates. Fixed schema issues and NOT NULL constraints. Tested with 61 notices across 5 properties. | [SOLVER_LOGIC](../../layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md) |
| H-015 | Unit Flags System | Created extensible unit_flags infrastructure for ALL unit-level alerts. EAV pattern with JSONB metadata, partial unique index, soft delete. Implemented MakeReady overdue detection as first flag type. Core infrastructure for future modules. | [UNIT_FLAGS_GUIDE](../architecture/UNIT_FLAGS_GUIDE.md) |
| H-016 | Solver Phase 2D | Implemented Applications processing with unit resolution, availability updates, application upsert, and overdue flag creation. Fixed 5 critical bugs including parser NULL handling and schema redundancy. Removed status/is_overdue columns. | [SOLVER_LOGIC](../../layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md) |
| H-017 | Solver Engine Complete | Completed all Solver Engine core phases (1, 2, 2A, 2C, 2D). All data processing working. Optional files (`5p_Transfers`, `5p_Leased_Units`) deferred. Phase 3 (UI presentation) is future work. | [SOLVER_STATUS](../handoff/SOLVER_STATUS_CLARIFICATION.md) |
| H-018 | Schema Sync & Table Prep | Fixed availability_status ENUM, created view_availabilities_metrics and view_leases, resolved 406 errors. Established PR workflow policy. Prepared dispatch commands for Table Presentation Phase (Asset tables + Availabilities). | [SCHEMA_SYNC](../handoff/SCHEMA_SYNC_SUMMARY.md) |
