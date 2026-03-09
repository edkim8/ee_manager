# Foreman Report: Yardi Daily Download Automation — 2026-03-08

**Date:** 2026-03-08
**To:** Foreman
**From:** Claude Sonnet 4.6 (Tier 2 Builder)
**Location:** `scripts/yardi-automation/`
**Status:** COMPLETE — Script is live and validated end-to-end on Mac Mini. MacBook Air copy deployed.

---

## Executive Summary

Built a standalone Python/Playwright CLI that automates the daily extraction of 12 Excel
reports from Yardi Voyager. The script connects to an already-authenticated Chrome session
via CDP (no login scripting), navigates Yardi's legacy iframe-based UI, fills forms, and
saves files to Dropbox with automatic archiving of previous versions.

**End state:** One terminal command downloads all 12 files. Steps 1–10 are fully hands-free.
Steps 11–12 require two brief pauses each (navigate to page → press Enter; verify table → press Enter).

---

## Files Delivered

| File | Purpose |
|------|---------|
| `yardi_download.py` | Main script — single entry point for all 12 reports |
| `launch_chrome.sh` | Launches a separate Chrome instance with CDP on port 9222 |
| `config.py` | Date engine + Dropbox path resolution |
| `utils/archive.py` | Archives existing files before overwriting |
| `README.md` | Full daily runbook + setup for both machines |
| `inspect_phase_b.py` | Diagnostic tool used during development (keep for debugging) |

Modular phase files (`phases/`) are superseded by `yardi_download.py` and no longer used.

---

## Architecture

### Connection Strategy
- `./launch_chrome.sh` opens Chrome with `--remote-debugging-port=9222` using a dedicated
  user data dir (`ChromeYardi`) — leaves the user's normal Chrome windows untouched.
- `yardi_download.py` uses `playwright.connect_over_cdp()` to attach to the running Chrome.
  A new automation tab is opened via `context.new_page()` and navigated to the Yardi dashboard.

### Phase A — Dashboard Reports (Steps 1–8, fully automatic)
- Clicks numerical stat links in the `filter` iframe (`tr:has-text('Label') a`)
- Waits for a unique column header to confirm the right report loaded
- Downloads via `img[src*='DataGridExcel']` Excel icon
- Returns to dashboard URL between reports

### Phase B — Resident Directory (Steps 9–10, fully automatic)
Key discovery: the form URL is deterministic. Instead of navigating hover menus,
the script navigates the `filter` iframe directly:
```
SysSqlScript.aspx?&action=Filter&select=reports/rs_gs_sql_Resident_Directory_with_Email.txt
```
This bypasses Yardi's hover menu entirely. Form fields confirmed via `inspect_phase_b.py`:
- `select[name='tiStatus']` — status multi-select
- `input[name='tdtMoveIn']` / `input[name='tdtMoveIn2']` — date range
- `input[value='Run Report']` — submit button
- `#cmdExcel_Button` / `img[src*='DataGridExcel']` — Excel download

### Phase C — Analytics Reports (Steps 11–12, guided)
User navigates to the analytics page (hover menus cannot be scripted reliably).
Script then scans all open tabs for a `filter` iframe containing the target form selector.

**Step 11 — Residential AR Analytics** (`ARAnalytics_res.aspx`):
- `#cmbReportType_DropDownList` → Financial Aged Receivable
- `#cmbGroupby_DropDownList` → Resident
- `#tenstatus_MultiSelect` → Current, Notice, Eviction
- `#PropertyLookup_LookupCode` → `azres422^azstoran^cacitvie^caoceabr^cawhioak` (^ separator)
- `#btnExcel_Button` → download

**Step 12 — Residential Analytics** (`ResReportSummary.aspx`):
- `#ReportType_DropDownList` → Resident Lease Expirations
- `#PropLookup_LookupCode` → same 5 properties (^ separator)
- `#SectionMultiselect_MultiSelect` → values `0` (Expiring Leases) + `1` (M-to-M)
- `#Date1_TextBox` / `#Date2_TextBox` → set via JS (fields carry `disabled` until Report Type triggers them)
- `button#Display_Button` → renders the report
- `button#Excel_Button` → download (confirmed via live DOM inspection; `doonclick` attribute pattern)

### File Naming & Archiving
```
5p_<Name>_YY_MM_DD.xlsx  →  Dropbox/Data/
```
Previous file moved to `Dropbox/Data/Archive/5p_<Name>_YY_MM_DD_archived_YYYYMMDD_HHMMSS.xlsx`

---

## Key Technical Discoveries

| Problem | Root Cause | Solution |
|---------|------------|----------|
| Phase B tab detection failed | Playwright cannot evaluate JS on pre-existing tabs not created by Playwright | Navigate script's own `filter` iframe directly to the report URL |
| Phase B/C forms in filter iframe | Yardi loads all content inside an `iframe[name="filter"]`, not top-level | All locators use `frame.locator()` not `page.locator()` |
| Phase C tab scanning | User navigates in their own tab; script's tab is different | `_find_analytics_form()` scans all `context.pages` for the filter iframe with the target selector |
| Properties field — pipe separator failed | AR Analytics and Residential Analytics use `^` not `\|` as separator | Confirmed via live DOM inspection: `value="azres422^azstoran^..."` |
| Step 12 Excel button not found | Button is `<button id="Excel_Button">`, not `<img>` or `<input>` | Confirmed via DOM inspection; use `button#Excel_Button` |
| Date fields disabled on Step 12 | ASP.NET sets `disabled="disabled"` until Report Type selection triggers enable | JS `removeAttribute('disabled')` + `dispatchEvent('change')` |
| `.clawren` property lookup error | `.clawren` is a portfolio group code, not a valid individual property code | Use 5 individual property codes directly; popup checkbox approach for Step 11, text field for Step 12 |
| CRLF in launch_chrome.sh | macOS `zsh` rejects scripts with Windows line endings | Rewrote file with explicit LF encoding |

---

## Deployment

- **Mac Mini:** `~/Dev/Nuxt/EE_manager/scripts/yardi-automation/` (in git repo)
- **MacBook Air:** `~/Dev/yardi-automation/` (standalone copy, not in git)
- **Output:** `~/Library/CloudStorage/Dropbox/Data/` on both machines (auto-detected by `config.py`)

MacBook Air setup: copy folder → create `.venv` → `pip install -r requirements.txt` → `chmod +x launch_chrome.sh`. Do not store in Dropbox (syncs thousands of `.venv` files).

---

## No Pending Actions

All 12 reports validated end-to-end on 2026-03-08. Script is production-ready.
