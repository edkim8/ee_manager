# Solver Architecture

## Summary
The Solver is the central engine for reconciling Yardi upload data with the system's internal state. It manages tenancies, availability, and financial tracking for properties.

## Core Components

### 1. Data Ingestion
- Uploads are staged in `import_staging`.
- The `useSolverEngine.ts` composable manages the browser-side workflow.

### 2. Reconciliation Logic
- **Phase 1: Validation**: Schema and rule checks.
- **Phase 2: Execution**:
    - **2A: New Tenancies**: Detecting inserts vs. updates.
    - **2D: Move-Outs**: Identifying overdue move-outs.
    - **2E: Transfers**: Managing cross-property resident moves.

### 3. Snapshotting
- **Option B (Current)**: Availability snapshots are pushed via a server-side API (`/api/solver/save-snapshot`) using `service_role` to bypass RLS.

## Design Patterns
- **Idempotency**: All solver phases are designed to be re-run safely.
- **Zero-Trust Phase 2E**: Multi-property transfers default to `UNKNOWN` property code for stability, using row-level property metadata for flag creation.

## History & Context
- **H-060/H-061**: Fix for RLS 403 errors on snapshots.
- **H-062**: Integration of PDF reporting into the Owners module.
