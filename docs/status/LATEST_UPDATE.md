# Latest Update — 2026-03-09

**Session:** Tier 2 Builder (Claude)
**Branch:** `chore/daily-audit-2026-03-09`
**H-Number:** H-079

---

## What Was Built

### Ingestion Validation — Robustness Pass

Automated file ingestion requires robust validation so missing or malformed files produce clear
warnings rather than silent failures. This session addressed three problems:

1. **Wrong residents_status file**: Yardi exports two variants — legacy (`5p_Residents_Status_*.xlsx`)
   and EE Manager (`5p_Residents_Status_All_*.xlsx`). Only the `_All` version should be accepted.
2. **Silent phase omissions**: When optional files are absent, solver phases skipped silently — the
   audit log was ambiguous about whether a phase ran vs. was never invoked.
3. **Missing batch manifest**: No pre-engine summary of which files were present/absent in the batch.

### Changes

**`useParseResidentsStatus.ts`** — `namePattern` changed from `'^5p_residents_status'` to
`'^5p_residents_status_all'` so the legacy file is rejected at the parser-matching stage
("Unknown file type") rather than silently parsed with wrong data.

**`useSolverEngine.ts`** — Added `else` logging branches to all 7 optional phases:
- Alerts: `console.log` (expected — Yardi produces no file when no active alerts)
- Work Orders, Delinquencies, MakeReady, Notices, Applications, Availables: `console.warn`
  (unexpected — operator should investigate)

**`ingestionValidation.ts`** (NEW) — Pure utility module extracted for unit testability:
- `classifyParseResult()` — maps `{errors[], data[]}` → one of four outcomes:
  `ok` / `warnings` / `error` / `empty_warning`
- `computeBatchManifest()` — computes present/missing/required parser sets with alerts exemption

**`solver.vue`** — Refactored to use both new utility functions. Added batch manifest console log
before engine run. Updated "No Alerts" UI badge with tooltip explaining the Yardi exemption.

### Tests Added (711 total, up from 502 baseline)

- `tests/unit/solver/ingestionValidation.test.ts` (NEW) — 25 tests covering all 4 parse outcomes,
  alerts exemption, W6 missing-file regression, required file detection, empty batch
- `tests/unit/parsing/parserConfigs.test.ts` — 2 new namePattern smoke tests:
  - Positive match: `5p_Residents_Status_All_*.xlsx` accepted
  - Negative match: `5p_Residents_Status_*.xlsx` (legacy) rejected

---

## Files Changed

| File | Change |
|---|---|
| `layers/parsing/composables/parsers/useParseResidentsStatus.ts` | namePattern `^5p_residents_status_all` (require _All) |
| `layers/admin/composables/useSolverEngine.ts` | 7 else-branch log messages for optional phase skips |
| `layers/admin/pages/admin/solver.vue` | Use `classifyParseResult` + `computeBatchManifest`; alerts UI badge |
| `layers/admin/utils/ingestionValidation.ts` | NEW — `classifyParseResult`, `computeBatchManifest` |
| `tests/unit/solver/ingestionValidation.test.ts` | NEW — 25 tests for ingestion validation utils |
| `tests/unit/parsing/parserConfigs.test.ts` | 2 namePattern smoke tests for residents_status |
