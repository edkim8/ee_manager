# Solver Test Coverage

## Current State (2026-03-09, H-079)

**711 tests passing across 28 files.**

### Covered (70%+)
- `solverUtils.ts` — 9 pure functions (all covered)
- `solverTrackingState.ts` — tracking/state logic
- `availabilityUtils.ts` — availability calculations
- Tracker → Report pipeline
- `ingestionValidation.ts` — NEW (H-079): `classifyParseResult` (4 outcomes) + `computeBatchManifest` (alerts exemption, required/optional detection)
- `parserConfigs.test.ts` — namePattern smoke tests for all 20 configs including residents_status _All match/reject

### NOT Covered (the "complicated 30%")
- **Engine orchestration** (`useSolverEngine.ts`) — the full phase sequence, DB writes, multi-phase coordination
  - This requires Supabase mock harness + staged batch fixture
  - Deferred: requires test harness that can inject import_staging rows and assert DB writes
  - 3 priority test scenarios identified: Phase 2 lease upsert, Phase 2A notices tenancy lookup, MakeReady overdue flag detection

### Priority Engine Tests (backlog, 2026-03-07)
1. Phase 2 lease upsert — verify `.upsert(onConflict:'tenancy_id,start_date')` doesn't double-write
2. Phase 2A notices lookup — verify `validStatuses = ['Current', 'Notice', 'Eviction']` (W1 fix)
3. MakeReady overdue flag — verify flag creation at Day 1 and no-op on existing

### Harness Requirements
- Mock `serverSupabaseServiceRole` with in-memory table state
- Seed `import_staging` with realistic fixture rows per phase
- Assert DB write calls (upsert/insert count + payload shape)
- Must isolate phases individually (not full end-to-end run)
