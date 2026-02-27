# Project Memory Index

## Core Mission
Nuxt 4 / Supabase Property Management Platform (EE Manager).

## Active Modules
- **Base**: Navigation, Authentication, Shared Utilities.
- **Ops**: Solver Engine, Availability, Tenancy tracking, Work Orders.
- **Admin**: User management, Parser controls, Solver Inspector.
- **Table**: Standardized `GenericDataTable` with Excel-based configurations.
- **Owners**: Ownership entities, Property portfolios, and PDF reporting.

## Critical Infrastructure
- **Solver Engine**: Daily reconciliation of Yardi data.
- **PDF Pipeline**: Chrome Headless pattern for reporting.
- **RLS Policy**: Tiered access (SuperAdmin, RPM, Asset, PM) with strict data isolation.

## Technical Debt / Standing Rules
- **Rule of Scribes**: Always update `LATEST_UPDATE.md` and `HISTORY_INDEX.md` at end of session.
- **Gatekeeper Protocol**: Foreman must verify all unmerged work before termination.
- **HTML-First Tables**: Avoid heavy client-side computation; use standard scoped slots.

## Recent History Reference
- **H-060**: Daily Audit (Feb 26).
- **H-061**: Snapshot RLS Fix (Option B server-side route).
- **H-062**: Owners Module Refinement & PDF Generation Pipeline.
