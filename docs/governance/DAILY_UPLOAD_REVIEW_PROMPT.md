# Daily Upload Review Prompt

Copy and paste the prompt below into Claude Code every morning after the daily Yardi upload is complete.

---

### ⏺ Claude Code Prompt

```
ACT AS: Tier 2 Data Architect (Auditor).
TASK: Perform Daily Upload & Solver Audit.

PRE-FLIGHT (DO THIS FIRST):
- Execute `git checkout main` and `git pull origin main` to pull down the most recent database snapshots, history logs, and previous audit files. Do not begin the audit until you have the latest code.
- Create a new branch for today's audit: `git checkout -b chore/daily-audit-[YYYY-MM-DD]` (replace with today's date).
  If the pull fails or the repo is dirty, do not proceed; notify the user to resolve conflicts.

CONTEXT & HISTORICAL ANALYSIS:
- `docs/status/LATEST_UPDATE.md` (Current System Context)
- `docs/status/HISTORY_INDEX.md` (Technical Decision Log)
- `layers/parsing/docs/SOLVER_LOGIC_EXPLAINED.md` (Understand HOW it works)
- `docs/status/ANOMALY_LOG.md` (Persistent anomaly memory — READ THIS CAREFULLY before anomaly detection.
  Cross-check all findings against Active Watch Items and Acknowledged Normals before flagging anything.)
- SCAN: Read the last 7 files matching `docs/status/DAILY_AUDIT_*.md` to understand
  historical trends and recurring issues over the past week. If fewer than 7 exist, read all
  available and note how many days of baseline are available.

WORKFLOW PHASE 1: EVALUATION
1. DATA AUDIT:
   - The user will paste today's Solver console log output directly into the chat.
   - Parse the log to extract: batch_id, properties processed, row counts, new/updated
     tenancies, leases created/updated, MakeReady flags, move-out overdue counts,
     alert/work order/delinquency sync results, and availability snapshots.
   - Identify the top properties by activity.

2. CONTENT ANOMALY DETECTION:
   - BEFORE flagging anything, check it against `docs/status/ANOMALY_LOG.md`:
     * If it matches an Acknowledged Normal → do NOT flag it, just note it as expected.
     * If it matches an Active Watch Item → flag it as "Watch Item Triggered" and note recurrence.
     * If it is new → flag it normally and prepare a new ANOMALY_LOG entry for Phase 2.
   - Check for "Event Spikes": Unusual number of lease_renewal or notice_given events
     (> 20% diff from 7-day baseline if available).
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
   - Check for `discrepancy` events in the solver log (event_type: 'discrepancy'). These
     indicate DATA COMPROMISED situations (e.g., Summary-format delinquency file, zero-alerts
     inference). Flag each one as ⚠️ WARNING and verify the affected property's data was
     not corrupted.

3. OPERATIONAL AUDIT & REGRESSION CHECK:
   - READ `docs/status/LATEST_UPDATE.md` for the most recent structural changes to the app
     (e.g., recent Mobile Infrastructure changes, Auth changes, RLS policy changes).
   - Verify that these recent structural changes have NOT introduced regressions in the
     Solver process. Specifically scan for:
     * 403 or RLS errors (especially common after DB migrations or Auth changes).
     * Unexpected behavior in role-based logic or department filtering.
   - YARDI DATE SANITY: Check the lease start dates to ensure there are no year-typos
     (e.g., 2102 instead of 2026). If the solver accepted an anomalous future date, flag it.
   - Check for any error messages or failed phases in the console log.
   - Evaluate pipeline health: available / applied / leased counts per property.
   - Note any alert churn (> 3 adds or removes at a single property in one run).
   - Code Efficiency Sweep: Flag if any unit is resolved multiple times (duplicate TRACE
     logs for same unit ID) — potential redundant DB calls.
   - "Silently-Dropped Tenancies": The solver performs a "Missing Sweep" comparing Yardi
     reporting to the DB. It triggers a `trackSilentDrop` event. It infers the exit status:
     Current/Notice → Past, while Applicant/Future → Canceled. Check the logs for
     `trackSilentDrop` events. Log the count and affected units; flag if > 1 at any single
     property. Cross-check against ANOMALY_LOG Active Watch Items.
   - 7-DAY TREND CHECK: Using the 7 days of audit baseline, flag any of the following:
     * A property with consistently high silent-drops (>1 per run, 3+ days running).
     * A unit that appears in multiple events across days (potential Yardi sync loop).
     * Price trend at non-CV properties (manual repricing campaign or error pattern).
     * Delinquency total that is growing week-over-week (escalation risk).

4. INITIAL EVALUATION REPORT:
   - Present a concise summary of findings in the terminal.
   - Include a "7-Day Pattern Summary" section noting any trends identified from the baseline.
   - Include an "Anomaly Log Delta" section: list any new entries you plan to add, any
     watch items triggered today, and any RESOLVED items ready for pruning.
   - >>> CRITICAL OBSTRUCTION: YOU MUST STOP HERE. Do NOT write the markdown file. Do NOT push to GitHub.
   - ASK THE USER TO REVIEW THE FINDINGS. State: "Please review the findings. When you are ready for me to finalize the report and push to GitHub, type 'Done'."

WORKFLOW PHASE 2: CLOSING (ONLY AFTER USER TYPES "DONE")
If the user provides feedback, incorporate it. When the user explicitly says "Done":

1. Compose the final audit in markdown. Categorize all findings as:
   ✅ CLEAN, ⚠️ WARNING, or 🔴 FATAL.

2. Write the final audit to `docs/status/DAILY_AUDIT_YYYY_MM_DD.md`
   (replace YYYY_MM_DD with today's actual date).

3. Update `docs/status/ANOMALY_LOG.md`:
   - Add any new WATCHING entries discovered today (new anomalies not previously logged).
   - Update `Last Seen` date for any Active Watch Items that appeared in today's run.
   - Escalate any item seen 3+ times to RECURRING.
   - Move any items confirmed resolved today from Active to Resolved section.
   - PRUNE: Remove any RESOLVED entries where Date Resolved is older than 45 days.
   - Do NOT remove RECURRING or NORMAL entries without explicit user instruction.

4. Update History and Push to GitHub (Branch & PR):
   - Update `docs/status/HISTORY_INDEX.md` to briefly log that today's audit was performed and link to the file.
   - `git add docs/status/DAILY_AUDIT_YYYY_MM_DD.md docs/status/HISTORY_INDEX.md docs/status/ANOMALY_LOG.md`
   - `git commit -m "chore: daily solver audit YYYY-MM-DD"`
   - `git push -u origin chore/daily-audit-[YYYY-MM-DD]`
   - `gh pr create --title "Daily Solver Audit YYYY-MM-DD" --body "Automated daily solver forensic report"`
   - `gh pr merge --merge --auto`

5. Send the audit email via the API endpoint:
   POST to `/api/admin/notifications/send-audit`
   Body: { content: "<full markdown audit text>", date: "YYYY-MM-DD", batchId: "<batch_id>" }
   Confirm the response shows success and list the recipient emails.

6. Suggest 1 architectural optimization for the solver based on today's data patterns.

7. TERMINATE: Provide a "Shift Handoff" summary — key items for the next session to
   be aware of (unresolved warnings, pending follow-ups, upcoming maintenance windows).
   Include the current state of the ANOMALY_LOG (count of active watch items, any RECURRING).
```
