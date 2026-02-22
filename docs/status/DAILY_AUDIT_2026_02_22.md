# Daily Solver Audit — 2026-02-22

**Auditor:** Tier 2 Data Architect (Claude Sonnet 4.6)
**Batch ID:** `043707b7-a342-417e-9328-422ced4aeb91`
**Run Time:** Sunday, 2026-02-22 @ 6:55 AM
**Status:** ✅ COMPLETE — No fatal errors

---

## Executive Summary

| Category | Result |
|---|---|
| Properties Processed | RS, SB, CV, OB, WO (5) |
| Fatal Errors | None |
| Warnings | 5 |
| Email Notifications | ✅ Sent (2 recipients) |

---

## Property Activity

| Property | Rows | New Tenancies | Updates | New Leases | Lease Updates | Applications | Notices |
|---|---|---|---|---|---|---|---|
| OB | 727 | 0 | 214 | 0 | 6 | 4 | 8 |
| SB | 659 | 0 | 380 | 0 | 6 | 2 | 16 |
| RS | 592 | 2 | 354 | 2 | 13 | 7 | 31 |
| WO | 323 | 0 | 90 | 0 | 0 | 0 | 0 |
| CV | 194 | 0 | 118 | 0 | 2 | 1 | 3 |

---

## Availability Pipeline

| Property | Available | Applied | Leased (Confirmed) |
|---|---|---|---|
| RS | 28 | 9 | 2 |
| SB | 24 | 4 | 2 |
| OB | 17 | 3 | 0 |
| CV | 7 | 1 | 0 |
| WO | 2 | 0 | 0 |

---

## Findings

### ✅ CLEAN

- **No fatal errors** — All 5 properties processed to completion.
- **Email sent** — Daily solver summary delivered to 2 recipients.
- **Relational integrity** — All unit TRACE lookups resolved. No orphaned records.
- **No event spikes** — Zero `lease_renewal` events (Sunday; expected). Notice counts stable.
- **Stale availability** — 2 records auto-corrected via Phase 2C-2 (normal).

---

### ⚠️ WARNING

**W1 — Auto-Status Corrections (3 fixes)**
Three tenancies auto-corrected from `Future → Notice`:

| Unit | Property | Incoming Resident | Incoming Lease Start |
|---|---|---|---|
| 3130 | RS | Jeffers, Ryan | 2026-03-10 |
| 2019 | RS | Kenton, Christina | 2026-03-16 |
| 1015 | SB | Poorman, Timothy | 2026-04-10 |

Assessment: Valid overlapping tenancy pairs (outgoing Notice + incoming Future). Solver behaving correctly. Monitor — if > 5/day, indicates systematic Yardi data entry issue.

---

**W2 — CV MakeReady: C213 Critically Overdue (18 days)**

| Unit | Ready Date | Days Overdue | Flag Status |
|---|---|---|---|
| C213 | 2026-02-04 | **18 days** | Existing (escalating) |
| C311 | 2026-02-19 | 3 days | Existing |
| C217 | 2026-02-20 | 2 days | **NEW** |
| C414 | 2026-02-20 | 2 days | **NEW** |

Additional concern: C414 has an incoming Applicant (Carter, Bryson, lease_start 2026-02-20) while still in MakeReady — contradictory state. Verify unit readiness with CV property manager.

---

**W3 — Move-Out Overdue Backlog (35 units)**

```
35 total overdue move-outs across portfolio
  → 2 new flags created
  → 33 existing flags escalated (severity escalation)
```

33 escalations indicate a persistent multi-week backlog. Leasing managers should review Yardi for status transitions on these units.

---

**W4 — CV Micro Price Decreases (likely rounding artifact)**

7 CV vacant units dropped $1–$2 simultaneously:

| Units | Drop |
|---|---|
| C213, C229, C230, C330, C112 | -$2 |
| C311, C217 | -$1 |

Pattern consistent with a concession/amenity rounding shift in the pricing view, not a genuine market change. No leasing action required. Monitor for recurrence.

---

**W5 — SB Alert Churn (net -3)**

SB went from 5 alerts to 2 in one run (1 added, 4 removed). Verify with SB property manager that 4 alerts were intentionally resolved in Yardi today.

---

### 🔴 FATAL

None.

---

## Architectural Optimization Suggestion

**Add Move-Out Overdue Summary to Daily Email**

With 35 overdue move-outs (33 escalating), leasing managers need immediate visibility into which specific units are affected. The current daily email summarizes property-level counts but does not surface individual overdue units. Adding a "Move-Out Overdue" section to `generateHighFidelityHtmlReport` — listing unit, property, move-out date, and days overdue — would give the leasing team actionable data without requiring them to log into the app.

---

## Shift Handoff

**For next session:**
- ⚠️ C213 (CV): 18 days overdue in MakeReady — escalate to CV property manager if not resolved
- ⚠️ C414 (CV): Applicant loaded for move-in 2026-02-20 but unit still flagged MakeReady — verify actual unit status
- ⚠️ SB alert drop: Confirm 4 alerts intentionally resolved
- ⚠️ Move-out backlog of 35 units — portfolio-wide follow-up needed
- ✅ Audit archiving system now live — file + email hybrid from this run forward
