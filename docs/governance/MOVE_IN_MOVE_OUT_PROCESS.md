# Move-In / Move-Out Process Vision
**Created:** 2026-03-12
**Status:** Vision document — implementation ongoing

---

## Why This Document Exists

The Daily Solver processes Yardi data files every morning. But move-ins and move-outs are not
single events — they are multi-day processes with inspection, coordination, and handoff steps.
This document captures the intended end-state for how EE Manager tracks and supports both
processes comprehensively, not just as a count in a daily report.

---

## Part 0: Date Fields — Policy & Transitional Period

### Where These Dates Come From

| Date | Primary Source | Secondary Source |
|---|---|---|
| `move_in_date` | `5p_Residents_Status` (Residents Status report) | Sometimes present in `5p_Notices` |
| `move_out_date` | `5p_Notices` (Notices report) | Also updated in `5p_Residents_Status` when Yardi reflects it |

### Business Policy (as of 2026-03-12)

Both dates are **business-critical** and should be treated as required in all logic that
depends on them (overdue move-out flags, inspection alerts, tenure calculations, make-ready
cross-references). They are stored as optional (`nullable`) in Supabase only to accommodate
historical records loaded before full date tracking was in place.

**Rule:** As the database matures, every tenancy record should have both dates. Any record
missing either date should be considered incomplete and flagged for follow-up.

### Soft Check Policy (Not Hard Crash)

The solver will **warn but not abort** when dates are missing:
- A `console.warn` is emitted for each affected tenancy during the solver run
- A `missing_move_in_date: true` or `missing_move_out_date: true` flag is written into
  the event's `details` JSON (persisted in `solver_events`)
- The daily Audit Payload includes a **DATA QUALITY** section listing all affected units
- No error is thrown, no run is aborted, no data is written incorrectly

Three check points in the solver:
1. **New tenancy detected** → warns if `move_in_date` is null (source: 5p_Residents_Status)
2. **Notice processed** → warns if `move_out_date` is null (source: 5p_Notices) —
   critical because overdue tracking and pre-inspection alerts cannot fire without this date
3. **Move-out detected** (`→ Past`)  → warns if either date is null (tenure cannot be calculated)

### Resolution Path

When the DATA QUALITY section of the audit payload shows missing dates:
1. Check the original Yardi Excel file for that date — was it blank in the source?
2. If Yardi has it, check the parser (`layers/parsing/`) for the column mapping
3. If Yardi genuinely doesn't have it, manually update the tenancy record in the DB

---

## Part 1: Understanding "Silent Drops" vs Explicit Move-Outs

### How Yardi Communicates Move-Outs (Two Paths)

**Path A — Explicit Past (tracked as `move_out` event)**
Yardi keeps the tenancy in the Residents Status report with `status = "Past"`. The solver
detects the `Notice → Past` or `Current → Past` transition and fires a `move_out` event with
full resident and unit detail.

**Path B — Silent Drop (tracked as `silent_drop` event)**
Yardi removes the tenancy from the report entirely with no `Past` row. The solver's Missing
Tenancy Sweep detects that a previously known tenancy is no longer present and infers:
- Was `Current` or `Notice` → inferred as moved out (transitions to `Past`)
- Was `Applicant` or `Future` → inferred as `Canceled` (deal fell through, denial, withdrawal)

**When does a Silent Drop happen in practice?**
- Applicant withdraws or is denied — Yardi just removes them, no Canceled status row
- Future resident falls through — same
- Property manager closes a record in Yardi without going through the formal move-out workflow
- Early terminations where the Yardi record is manually deleted
- Data corrections where a duplicate or erroneous record is removed

**Key insight from `MOVE_OUT_STATUS_ANALYSIS.md`:**
Yardi does NOT automatically transition a "Notice" tenancy to "Past" on the move-out date.
The tenancy stays as "Notice" in Yardi's report until a property manager manually closes it —
which can take days, weeks, or never. The solver already handles this via:
- Phase 2D.5 "Move Out Overdue" flags (warning at day 1, error at day 4+)
- Silent drop sweep for cases where Yardi finally drops the record without showing Past

---

## Part 2: Comprehensive Move-Out Process

### Trigger Points and Actions

```
NOTICE GIVEN
  └── Solver detects Notice status with move_out_date
  └── Event: notice_given (unit, resident, planned move-out date)
  └── Make-Ready scheduling should begin (unit needs to be queued)

3 DAYS BEFORE move_out_date
  └── [FUTURE] Alert: "Pre-Move-Out Inspection Recommended"
        - Notify: Property Manager + Maintenance
        - Action: Schedule walk-through with resident (optional — client may decline)
        - Purpose: Identify damage claims, repair scope, key return coordination
        - Status options: Scheduled / Declined by Resident / Completed

ON move_out_date (if still Notice)
  └── Existing: "Move Out Overdue" flag created (severity: warning)
        - Escalates to error at day 4+
        - Daily Solver report highlights this prominently
  └── [FUTURE] Notification to leasing agent: follow up with resident

WHEN Yardi sends Past status (or silent drop inferred)
  └── Event: move_out (explicit) or silent_drop (inferred)
  └── move_out event captures: unit, resident name, move-in date, move-out date,
        previous status, early_moveout flag
  └── Overdue flag removed automatically
  └── [FUTURE] Alert: "Move-Out Inspection Required"
        - Notify: Maintenance + Property Manager
        - Trigger make-ready workflow for this unit
        - Capture inspection result, damage notes
  └── Unit transitions to Available (handled by solver availability sync)

MAKE-READY PHASE (post move-out)
  └── Existing: MakeReady flags system (unit_flags table, flag_type = 'makeready*')
  └── Daily Solver monitors and escalates overdue make-readys
  └── [FUTURE] Link make-ready completion to next move-in scheduling
```

### Data Already Available per Move-Out
- `move_out_date` from Notices report
- `move_in_date` (resident's original move-in, for tenure calculation)
- `previous_status` (was Notice, Current, or Eviction)
- `early_moveout` boolean (actual < planned)
- Unit name, property, resident name

### What Still Needs to Be Built
- Pre-move-out inspection scheduling alerts (3-day lookahead)
- Post-move-out inspection checklist (linked to make-ready workflow)
- Resident contact notification templates
- Damage claim tracking

---

## Part 3: Comprehensive Move-In Process

### Trigger Points and Actions

```
NEW TENANCY DETECTED (Future or Applicant)
  └── Event: new_tenancy (unit, resident, status, move_in_date, rent)
  └── [FUTURE] Leasing agent alert: "New Application / Future Resident Logged"
  └── Check: Is this unit's make-ready flag resolved?
        - If NOT resolved: warn — unit may not be ready for move-in date
        - If resolved: unit is ready

MAKE-READY MONITORING (before move-in)
  └── Existing: MakeReady flags tracked daily
  └── [FUTURE] Cross-reference: for each Future tenancy, check if unit has
        an active make-ready flag. If yes, flag the scheduling conflict.
        "Unit X has a Future move-in on [date] but make-ready is not complete."

3 DAYS BEFORE move_in_date
  └── [FUTURE] Alert: "Pre-Move-In Inspection Due"
        - Notify: Leasing Agent + Property Manager
        - Action: Verify unit is ready (clean, appliances working, no open work orders)
        - Required sign-off before key handover
        - Alert if make-ready flag is still open at this point → CRITICAL

ON move_in_date
  └── [FUTURE] "Move-In Day" notification to leasing agent
  └── Monitor: if tenancy has not transitioned to Current by next solver run,
        alert leasing agent

WHEN Yardi sends Current status (resident physically moved in)
  └── Event: new_tenancy (status: Current — captured by solver now)
  └── [FUTURE] "Move-In Confirmation" — resident is now Current in system
  └── Trigger: Welcome communication, utility setup reminders, lease packet confirmation

OVERDUE MOVE-IN (if Future tenancy has move_in_date passed and still Future)
  └── [FUTURE] Flag: "Move-In Overdue" — resident has not appeared as Current
        despite move_in_date passing
        - Could mean: administrative delay, Yardi not yet updated, or deal fell through
        - Notify leasing agent to verify
```

### Data Already Available per Move-In
- `move_in_date` from tenancy record
- `status` at detection time (Future, Applicant, Current)
- `rent_amount` from lease
- Unit make-ready flag status (queryable)
- Resident name, property

### What Still Needs to Be Built
- Make-ready ↔ move-in date cross-reference check
- 3-day pre-move-in inspection alert
- Overdue move-in flag (similar to overdue move-out)
- Leasing agent notification templates

---

## Part 4: Daily Solver Report — Reframed Concept

### The Old Concept (DEPRECATED)
> "The Daily Solver Report shows what changed in today's Yardi upload files."

This framing is too narrow. It treats the report as a diff of today's Excel files.

### The New Concept
> "The Daily Solver Report is a comprehensive daily operational briefing, powered by the
> morning Yardi upload as the data trigger, but drawing on ALL data in the system to surface
> what is critical, pending, overdue, and upcoming."

The Solver run is the **trigger**, not the **scope**. Every morning after the upload:

**What the report should synthesize:**

| Section | Source | What it shows |
|---|---|---|
| Today's Changes | solver_events | New tenancies, move-outs, price changes, notices — what actually changed |
| Move-Out Pipeline | tenancies + notices | Everyone on notice: name, unit, planned move-out date, days remaining |
| Overdue Move-Outs | unit_flags (moveout_overdue) | Units past their move-out date — severity, days overdue |
| Move-In Pipeline | tenancies (Future/Applicant) | Upcoming move-ins: unit, resident, date, make-ready status |
| Make-Ready Status | unit_flags (makeready*) | Open make-readys — which units, how long overdue, linked to move-in dates |
| Renewal Pipeline | renewal_worksheet_items | Pending / offered / accepted — expiring leases approaching deadlines |
| Delinquency Snapshot | delinquencies | Current delinquents, aging, 30/60/90+ buckets |
| Work Order Health | work_orders | Open WOs, overdue (>3 days), new today |
| Occupancy Snapshot | availability_snapshots | Available units per property, day-over-day delta, avg contracted rent |
| Alerts | view_table_alerts_unified | Active alerts, new today |

**Key principle:** The daily email and report page should answer the question:
*"What do I need to know and act on today?"* — not just *"What did Yardi send us this morning?"*

---

## Part 5: Implementation Roadmap

### Already Built (as of 2026-03-12)
- [x] `move_out` event with unit/resident detail (explicit Past transitions)
- [x] `new_tenancy` event for all statuses with unit/resident detail
- [x] `silent_drop` event for inferred move-outs/cancellations
- [x] Move-out overdue flags (warning → error escalation)
- [x] Make-ready flags system
- [x] Daily email with ops summary (alerts, WOs, make-ready, delinquencies)
- [x] Audit payload export (structured text from DB — no console copy-paste)
- [x] Report page with date picker and historical report access

### Near-Term (next sessions)
- [ ] Move-out pipeline section in daily email (who is leaving, when)
- [ ] Move-in pipeline section in daily email (who is arriving, make-ready status)
- [ ] Cross-reference: Future move-in date vs make-ready open flags
- [ ] 3-day pre-move-out inspection alert (unit_flags or notification)
- [ ] 3-day pre-move-in inspection alert

### Medium-Term
- [ ] Overdue move-in flag (parallel to overdue move-out)
- [ ] Inspection checklist records (move-out and move-in)
- [ ] Monday Weekly Summary email (week-over-week aggregations)
- [ ] Email mobile layout fix (table-based, Gmail-compatible)

### Long-Term
- [ ] Resident-facing communication triggers (welcome, move-out reminders)
- [ ] Damage claim tracking linked to move-out inspections
- [ ] Make-ready completion linked to move-in scheduling confirmation

---

## Related Documents
- `docs/analysis/MOVE_OUT_STATUS_ANALYSIS.md` — technical analysis of Yardi Past status detection
- `docs/governance/DAILY_UPLOAD_REVIEW_PROMPT.md` — daily audit workflow prompt
- `docs/architecture/SOLVER_TRACKING_ARCHITECTURE.md` — event tracking system
- `docs/architecture/UNIT_FLAGS_GUIDE.md` — flag types, severity, lifecycle
