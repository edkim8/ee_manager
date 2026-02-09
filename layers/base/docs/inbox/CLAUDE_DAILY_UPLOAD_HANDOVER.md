# Startup Prompt: Claude Code - Daily Upload Auditor

## Role & Context
You are a senior systems engineer tasked with auditing and enhancing the **EE Manager Daily Upload System**. Your predecessor (the Foreman) has just implemented a "High-Fidelity Email Reporting" system that centralizes reporting logic in `layers/base/utils/reporting.ts`.

## Your Primary Objectives

### 1. Audit Daily Upload Logs
- Review the `console.log` output from recent Solver runs (check terminal history or database `solver_runs.error_message`).
- Identify any "FATAL" errors, parsing mismatches (Rigid Handshake violations), or performance bottlenecks.
- Propose and implement fixes for any identified bugs in the ingestion pipeline (`legacy_parser.ts`, `multi_source_parser.ts`).

### 2. Enhance Daily Upload Email Reporting
- Build upon the new `reporting.ts` utility.
- Ensure the email reports are delivering maximum value to executive stakeholders.
- If necessary, add new sections to the HTML template for specialized tracking (e.g., delinquency alerts, amenity mismatches).

### 3. Review Historical Context
- Review the following handover documents to understand past debugging efforts:
    - [FOREMAN_SYNC_SYSTEM_COMPLETION.md](file:///Users/edward/Dev/Nuxt/EE_manager/docs/handovers/FOREMAN_SYNC_SYSTEM_COMPLETION.md)
    - [HANDOFF_DAILY_UPLOAD_TESTING.md](file:///Users/edward/Dev/Nuxt/EE_manager/docs/handovers/HANDOFF_DAILY_UPLOAD_TESTING.md)
    - [SOLVER_TRACKING_ARCHITECTURE.md](file:///Users/edward/Dev/Nuxt/EE_manager/docs/architecture/SOLVER_TRACKING_ARCHITECTURE.md)

### 4. Process Status Report
- Write an update to [STATUS_BOARD.md](file:///Users/edward/Dev/Nuxt/EE_manager/docs/status/STATUS_BOARD.md) reflecting today's progress.
- **CRITICAL**: Do not document the *content* of the data updates. Instead, document the **uploading process** (e.g., infrastructure stability, bug fixes in the parser, deployment of the reporting utility).

## Today's Shift Summary (from Foreman)
- Branch: `feat/daily-upload-email-reporting`
- Implemented `layers/base/utils/reporting.ts` (HTML & Markdown generation).
- Refactored `useSolverReportGenerator.ts` to use shared utility.
- Updated `send-summary.post.ts` to fetch detailed events and send high-fidelity HTML emails.
- Verified schema alignments via `types/supabase.ts`.

## Instructions for Claude
1. Checkout the current branch.
2. Review the files modified by the Foreman.
3. Begin the "Daily Upload Audit" by checking the latest `solver_runs` table data for errors.
4. Update the `STATUS_BOARD.md` as instructed above.
