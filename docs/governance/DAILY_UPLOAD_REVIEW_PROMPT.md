# Daily Upload Review Prompt

Copy and paste the prompt below into Claude Code every morning after the daily Yardi upload is complete.

---

### ⏺ Claude Code Prompt

```
ACT AS: Tier 2 Data Architect (Auditor).
TASK: Perform Daily Upload & Solver Audit.

PRE-FLIGHT:
- Run `git pull` to ensure the latest DAILY_AUDIT files are present from other machines.
  If the pull fails or the repo is dirty, note it and proceed with files currently on disk.

CONTEXT & HISTORICAL ANALYSIS:
- `docs/status/LATEST_UPDATE.md` (Current System Context)
- `docs/status/HISTORY_INDEX.md` (Technical Decision Log)
- `layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md` (Understand HOW it works)
- SCAN: Read the last 3 files matching `docs/status/DAILY_AUDIT_*.md` to understand
  historical trends and recurring issues. If fewer than 3 exist, note
  "First audit in series — no trend baseline available" and proceed.

WORKFLOW PHASE 1: EVALUATION
1. DATA AUDIT:
   - The user will paste today's Solver console log output directly into the chat.
   - Parse the log to extract: batch_id, properties processed, row counts, new/updated
     tenancies, leases created/updated, MakeReady flags, move-out overdue counts,
     alert/work order/delinquency sync results, and availability snapshots.
   - Identify the top properties by activity.

2. CONTENT ANOMALY DETECTION:
   - Check for "Event Spikes": Unusual number of lease_renewal or notice_given events
     (> 20% diff from previous days if baseline exists).
   - Verify "Auto-Status Fixes": Count Future→Notice or other auto-corrections and
     flag if > 3 in a single run.
   - Look for "Suspicious details": Negative rent values, illogical move-in/out dates,
     MakeReady units overdue > 7 days, duplicated resident names in a single batch.
   - Check "Micro Price Changes": Price shifts of $1–$2 across multiple units
     simultaneously are likely rounding artifacts — flag for confirmation.
   - ALWAYS capture ALL availability price changes in the audit report, whether few or
     many. Include a table (Unit | Property | Old Rent | New Rent | Change | % Change).
     These reflect per-property operational decisions (market repricing) and are valuable
     trend data — NOT bugs or corrections. CV $1–$2 daily decrements are AIRM (normal).
     All other properties pricing changes are manual; note them without requiring action.

3. OPERATIONAL AUDIT:
   - Check for any error messages or failed phases in the console log.
   - Evaluate pipeline health: available / applied / leased counts per property.
   - Note any alert churn (> 3 adds or removes at a single property in one run).
   - Code Efficiency Sweep: Flag if any unit is resolved multiple times (duplicate TRACE
     logs for same unit ID) — potential redundant DB calls.
   - "Silently-Dropped Tenancies": When the solver detects a tenancy that disappeared from
     Yardi without a normal status transition, it transitions it to → Canceled and resets
     the unit to Available. The standard term is ALWAYS "Canceled" — we cannot distinguish
     Canceled vs. Denied from the data and this is intentional by design (including denied
     applications would add unnecessary noise). Log the count and affected units (if
     surfaced in the log); flag if > 1 at any single property in one run.

4. INITIAL EVALUATION REPORT:
   - Present a concise summary of findings in the terminal.
   - STOP & WAIT: Ask the user for inputs/clarifications.

WORKFLOW PHASE 2: CLOSING (ON "DONE")
If the user provides feedback or says "Done":

1. Compose the final audit in markdown. Categorize all findings as:
   ✅ CLEAN, ⚠️ WARNING, or 🔴 FATAL.

2. Write the final audit to `docs/status/DAILY_AUDIT_YYYY_MM_DD.md`
   (replace YYYY_MM_DD with today's actual date).

3. Commit and push the file:
   - `git add docs/status/DAILY_AUDIT_YYYY_MM_DD.md`
   - `git commit -m "audit: daily solver audit YYYY-MM-DD"`
   - `git push`

4. Send the audit email via the API endpoint:
   POST to `/api/admin/notifications/send-audit`
   Body: { content: "<full markdown audit text>", date: "YYYY-MM-DD", batchId: "<batch_id>" }
   Confirm the response shows success and list the recipient emails.

5. Suggest 1 architectural optimization for the solver based on today's data patterns.

6. TERMINATE: Provide a "Shift Handoff" summary — key items for the next session to
   be aware of (unresolved warnings, pending follow-ups, upcoming maintenance windows).
```
