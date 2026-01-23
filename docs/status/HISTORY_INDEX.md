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
