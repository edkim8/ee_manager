#!/usr/bin/env python3
"""
yardi_download.py — Daily Yardi Voyager report downloader.

12 Excel files across 3 phases:
  Phase A (auto):   8 Dashboard reports
  Phase B (guided): 2 Resident Directory reports
  Phase C (guided): 2 Analytics reports

Run:
    python yardi_download.py
"""

import sys
import json
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from playwright.sync_api import sync_playwright, BrowserContext, Page, Frame

from config import build_dates, resolve_gdrive_data_dir, resolve_archive_dir, PHASE_C_PROPERTY_CODES
from utils.archive import archive_if_exists, build_filename

PROPERTY_LIST_C = "|".join(PHASE_C_PROPERTY_CODES)

PHASE_A_REPORTS = [
    ("Leased Units",          "Property",      "Leased_Units"),
    ("Available Units",       "Amenities",     "Availables"),
    ("Unit Transfers",        "From Property", "Transfers"),
    ("Pending Applications",  "Agent",         "Applications"),
    ("On Notice",             "Move Out Date", "Notices"),
    ("Alerts",                "Description",   "Alerts"),
    ("Pending Make Ready",    "Bedrooms",      "MakeReady"),
    ("Pending Work Requests", "WO#",           "WorkOrders"),
]


# ---------------------------------------------------------------------------
# Shared utilities
# ---------------------------------------------------------------------------

def pause(instructions: str) -> None:
    """Print a boxed instruction block and wait for the user to press Enter."""
    width = 62
    border = "─" * width
    print(f"\n┌{border}┐")
    for line in instructions.strip().splitlines():
        print(f"│  {line:<{width - 2}}│")
    print(f"└{border}┘")
    input("   ▶  Press ENTER when ready  ")
    print()


def step(n: int, total: int, label: str) -> None:
    print(f"\n{'─'*62}")
    print(f"  Step {n}/{total}: {label}")
    print(f"{'─'*62}")


def done(label: str, dest: Path) -> None:
    print(f"  ✓  Saved → {dest.name}")


# ---------------------------------------------------------------------------
# Browser connection
# ---------------------------------------------------------------------------

import os

CDP_PORT = int(os.getenv("CDP_PORT", "9222"))


def connect_and_open_page() -> str:
    """Check Chrome CDP and return the URL of the active Yardi tab."""
    try:
        with urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json") as resp:
            targets = json.loads(resp.read())
    except Exception as e:
        print(f"\n  ERROR: Cannot reach Chrome on port {CDP_PORT}.\n  {e}")
        sys.exit(1)

    yardi_url = None
    for t in targets:
        url = t.get("url", "")
        title = t.get("title", "")
        if "yardipcu.com" in url or "Yardi" in title:
            yardi_url = url
            break

    if not yardi_url:
        print("\n  ERROR: No Yardi tab found in Chrome.")
        print("  → Make sure you are logged into Yardi before running this script.")
        sys.exit(1)

    print(f"  Found Yardi tab: {yardi_url[:80]}")
    return yardi_url


# ---------------------------------------------------------------------------
# Phase A — Dashboard (fully automatic)
# ---------------------------------------------------------------------------

def _filter_frame(page: Page) -> Frame:
    f = page.frame(name="filter")
    if f is None:
        raise RuntimeError("filter iframe not found")
    return f


def run_phase_a(page: Page, dates: dict, data_dir: Path, archive_dir: Path) -> None:
    frame = _filter_frame(page)
    dashboard_url = frame.url

    for i, (label, header, name) in enumerate(PHASE_A_REPORTS, 1):
        # Return to dashboard
        if "SiteDashboard.aspx" not in _filter_frame(page).url:
            _filter_frame(page).goto(dashboard_url, wait_until="networkidle", timeout=15_000)

        step(i, 8, f"{name}  [{label}]")

        frame = _filter_frame(page)
        loc = frame.locator(f"tr:has-text('{label}') a").first

        # When count = 0, Yardi shows plain text — no <a> tag to click.
        # Catch the timeout instead of crashing Phase A and losing Make_Ready + WorkOrders.
        link_clicked = True
        try:
            loc.wait_for(state="visible", timeout=10_000)
            loc.click()
        except Exception:
            link_clicked = False

        if not link_clicked:
            if name == "Alerts":
                print(f"  INFO: Alerts stat link not clickable (count = 0) — no file produced. Solver will infer zero alerts.")
            else:
                print(f"  WARNING: Stat link not found for {name} — skipping.")
            continue

        try:
            frame.locator(f"text={header}").first.wait_for(state="visible", timeout=20_000)
            print(f"  Header '{header}' confirmed.")
        except Exception:
            print(f"  WARNING: Header '{header}' not found — skipping.")
            continue

        filename = build_filename(name, dates)
        dest = data_dir / filename
        archive_if_exists(dest, archive_dir)

        try:
            with page.expect_download(timeout=30_000) as dl:
                frame.locator("img[src*='DataGridExcel']").first.click()
            dl.value.save_as(str(dest))
            done(name, dest)
        except Exception as e:
            print(f"  WARNING: Excel download failed for {name}: {e} — skipping.")


# ---------------------------------------------------------------------------
# Phase B — Resident Directory (fully automatic via direct iframe navigation)
# ---------------------------------------------------------------------------

import time as _time

_RESIDENT_DIR_SCRIPT = "SysSqlScript.aspx?&action=Filter&select=reports/rs_gs_sql_Resident_Directory_with_Email.txt"


def _b_load_form(page: Page) -> Frame:
    """Navigate the script's filter iframe directly to the Resident Directory form URL."""
    base  = page.url.rsplit("/", 1)[0] + "/"
    url   = base + _RESIDENT_DIR_SCRIPT
    frame = _filter_frame(page)
    frame.goto(url, wait_until="networkidle", timeout=20_000)
    frame.locator("input[name='tdtMoveIn']").wait_for(state="visible", timeout=15_000)
    return frame


def _b_fill_and_download(
    page: Page,
    frame: Frame,
    statuses: list[str] | None,
    movein: str,
    movein2: str,
    report_name: str,
    dates: dict,
    data_dir: Path,
    archive_dir: Path,
) -> None:
    if statuses:
        frame.locator("select[name='tiStatus']").evaluate(
            f"el => {{ let t={json.dumps(statuses)}; for(let o of el.options) o.selected=t.includes(o.text); }}"
        )
        print(f"  Status          = {statuses}")
    else:
        print("  Status          = (default — Current only)")

    frame.locator("input[name='tdtMoveIn']").fill(movein)
    frame.locator("input[name='tdtMoveIn2']").fill(movein2)
    print(f"  Move In After   = {movein}")
    print(f"  Move In Before  = {movein2}")

    frame.locator("input[value='Run Report'], input[type='submit']").first.click()
    print("  Form submitted — waiting for report to render...")
    page.wait_for_timeout(3_000)

    excel_loc = frame.locator("#cmdExcel_Button, img[src*='DataGridExcel']").first
    try:
        excel_loc.wait_for(state="visible", timeout=30_000)
        print("  Report rendered.")
    except Exception:
        print("  WARNING: Excel button not confirmed — attempting download anyway.")

    filename = build_filename(report_name, dates)
    dest = data_dir / filename
    archive_if_exists(dest, archive_dir)

    with page.expect_download(timeout=30_000) as dl:
        excel_loc.click()

    dl.value.save_as(str(dest))
    done(report_name, dest)


def run_phase_b(page: Page, dates: dict, data_dir: Path, archive_dir: Path) -> None:

    # Report 9 ---------------------------------------------------------------
    step(9, 12, "Residents_Status")
    try:
        frame = _b_load_form(page)
        print("  ✓ Resident Directory form loaded.")
        _b_fill_and_download(page, frame, None,
                             dates["D_start"], dates["D_future"],
                             "Residents_Status", dates, data_dir, archive_dir)
    except Exception as e:
        print(f"  ERROR in step 9: {e}")

    # Report 10 --------------------------------------------------------------
    step(10, 12, "Residents_Status_All")
    try:
        frame = _b_load_form(page)
        print("  ✓ Resident Directory form loaded.")
        _b_fill_and_download(page, frame,
                             ["Current", "Future", "Notice", "Applicant", "Eviction"],
                             dates["D_1995"], dates["D_future"],
                             "Residents_Status_All", dates, data_dir, archive_dir)
    except Exception as e:
        print(f"  ERROR in step 10: {e}")


# ---------------------------------------------------------------------------
# Phase C — Analytics (manual navigation, 2 reports)
# ---------------------------------------------------------------------------

def _find_analytics_form(context: BrowserContext, script_page: Page, selector: str, timeout_s: int = 90) -> tuple[Page, Frame]:
    """
    Scan all open tabs for a filter iframe containing the given selector.
    Used after the user has already navigated to the analytics page and pressed Enter.
    """
    deadline = _time.time() + timeout_s
    dots = 0
    while _time.time() < deadline:
        for p in context.pages:
            if p is script_page:
                continue
            frame = p.frame(name="filter")
            if frame is None:
                continue
            try:
                count = frame.evaluate(f"document.querySelectorAll({json.dumps(selector)}).length")
                if count and count > 0:
                    print(f"  ✓ Form detected in filter iframe  ({p.url[:60]})")
                    return p, frame
            except Exception:
                pass
        dots += 1
        if dots % 4 == 0:
            remaining = int(deadline - _time.time())
            print(f"  ... watching ({remaining}s remaining)", end="\r", flush=True)
        _time.sleep(0.5)
    raise TimeoutError(f"Form '{selector}' not found after {timeout_s}s.")


def run_phase_c(context: BrowserContext, script_page: Page, dates: dict, data_dir: Path, archive_dir: Path) -> None:

    # Report 11 ---------------------------------------------------------------
    step(11, 12, "Delinquencies  [AR Analytics]")
    pause(
        "In Chrome (your Yardi tab):\n"
        "\n"
        "  1. Hover   Analytic Reports   (top navigation bar)\n"
        "  2. Click   Residential AR Analytics\n"
        "\n"
        "  → Wait for the form to load, then press ENTER.\n"
        "    Script fills all fields automatically."
    )

    tab, frame = _find_analytics_form(context, script_page, "#cmbReportType_DropDownList")

    frame.locator("#cmbReportType_DropDownList").select_option(label="Financial Aged Receivable")
    print("  Report Type = Financial Aged Receivable")

    frame.locator("#cmbGroupby_DropDownList").select_option(label="Resident")
    print("  Group By    = Resident")

    frame.locator("#tenstatus_MultiSelect").evaluate("""el => {
        for (let o of el.options)
            o.selected = ['Current','Notice','Eviction'].includes(o.text);
    }""")
    print("  Status      = Current, Notice, Eviction")

    # Properties: ^ separator (confirmed from live element inspection)
    prop_list = "^".join(PHASE_C_PROPERTY_CODES)
    frame.locator("#PropertyLookup_LookupCode").fill(prop_list)
    frame.locator("#PropertyLookup_LookupCode").press("Tab")
    tab.wait_for_timeout(1_500)
    print(f"  Properties  = {prop_list}")

    filename = build_filename("Delinquencies", dates)
    dest = data_dir / filename
    archive_if_exists(dest, archive_dir)

    with tab.expect_download(timeout=60_000) as dl:
        frame.locator("#btnExcel_Button").click()

    dl.value.save_as(str(dest))
    done("Delinquencies", dest)

    # Report 12 ---------------------------------------------------------------
    step(12, 12, "ExpiringLeases  [Residential Analytics]")
    pause(
        "In Chrome (your Yardi tab):\n"
        "\n"
        "  1. Hover   Analytic Reports   (top navigation bar)\n"
        "  2. Click   Residential Analytics\n"
        "\n"
        "  → Wait for the form to load, then press ENTER.\n"
        "    Script fills all fields and clicks Display automatically."
    )

    tab, frame = _find_analytics_form(context, script_page, "#ReportType_DropDownList")

    frame.locator("#ReportType_DropDownList").select_option(label="Resident Lease Expirations")
    print("  Report Type = Resident Lease Expirations")
    tab.wait_for_timeout(1_000)

    # Properties: this form uses ^ as separator
    prop_list = "^".join(PHASE_C_PROPERTY_CODES)
    frame.locator("#PropLookup_LookupCode").fill(prop_list)
    frame.locator("#PropLookup_LookupCode").press("Tab")
    tab.wait_for_timeout(1_500)
    print(f"  Properties  = {prop_list}")

    # Section: Expiring Leases (value=0) + M-to-M (value=1)
    frame.locator("#SectionMultiselect_MultiSelect").evaluate("""el => {
        for (let o of el.options)
            o.selected = (o.value === '0' || o.value === '1');
    }""")
    print("  Section     = Expiring Leases + M-to-M")

    # Dates — force-enable in case ASP.NET has them disabled initially
    frame.evaluate(
        f"""() => {{
            function setDate(id, val) {{
                let el = document.querySelector(id);
                if (!el) return;
                el.removeAttribute('disabled');
                el.classList.remove('aspNetDisabled');
                el.value = val;
                el.dispatchEvent(new Event('change', {{bubbles: true}}));
            }}
            setDate('#Date1_TextBox', '{dates["D_start"]}');
            setDate('#Date2_TextBox', '{dates["D_future"]}');
        }}"""
    )
    print(f"  Date range  = {dates['D_start']}  →  {dates['D_future']}")

    frame.locator("#Display_Button").click()
    print("  Clicked Display — report rendering (may take up to 60s)...")

    pause(
        "Verify the Expiring Leases table is showing in Chrome.\n"
        "\n"
        "  → Once the list looks correct, press ENTER to download."
    )

    filename = build_filename("ExpiringLeases", dates)
    dest = data_dir / filename
    archive_if_exists(dest, archive_dir)

    with tab.expect_download(timeout=30_000) as dl:
        frame.locator("button#Excel_Button").click()

    dl.value.save_as(str(dest))
    done("ExpiringLeases", dest)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n" + "═" * 64)
    print("  YARDI DAILY DOWNLOAD")
    print("═" * 64)

    # 1. Dates
    dates = build_dates()
    print(f"\n  Today        {dates['D_today']}")
    print(f"  Start date   {dates['D_start']}")
    print(f"  Prior end    {dates['D_prior_end']}")
    print(f"  Future end   {dates['D_future']}")

    # 2. Storage
    try:
        data_dir    = resolve_gdrive_data_dir()
        archive_dir = resolve_archive_dir(data_dir)
    except RuntimeError as e:
        print(f"\n  ERROR: {e}")
        sys.exit(1)

    print(f"\n  Save to:  {data_dir}")

    # 3. Pre-flight: Chrome must be running with CDP on port 9222
    pause(
        "Confirm Chrome (YardiUpload) is ready:\n"
        "\n"
        "  • The Yardi dashboard is open\n"
        "  • clawren is the active property\n"
        "  • Blue stat tiles are visible (Leased Units, Available Units, etc.)"
    )

    # 4. Connect
    with sync_playwright() as pw:
        # Find Yardi URL via CDP HTTP API
        yardi_url = connect_and_open_page()   # returns URL string

        browser = pw.chromium.connect_over_cdp(f"http://localhost:{CDP_PORT}")
        context = browser.contexts[0]
        page = context.new_page()

        print(f"\n  Navigating to Yardi dashboard...")
        page.goto(yardi_url, wait_until="networkidle", timeout=30_000)

        # Verify dashboard
        frame = page.frame(name="filter")
        if frame is None or "SiteDashboard.aspx" not in frame.url:
            print("\n  ERROR: Dashboard not detected. Make sure .clawren is active.")
            sys.exit(1)
        print(f"  Dashboard confirmed ✓")

        # 5. Phase A — fully automatic
        print("\n\n  ── PHASE A: Dashboard Reports (Steps 1–8, automatic) ──\n")
        run_phase_a(page, dates, data_dir, archive_dir)

        # 6. Phase B — fully automatic
        print("\n\n  ── PHASE B: Resident Directory (Steps 9–10, automatic) ──")
        run_phase_b(page, dates, data_dir, archive_dir)

        # 7. Phase C — manual navigation
        print("\n\n  ── PHASE C: Analytics (Steps 11–12, guided) ──")
        run_phase_c(context, page, dates, data_dir, archive_dir)

        # Close the tab this script opened — leave the user's original Yardi tab alone
        page.close()

        # Done
        print("\n" + "═" * 64)
        print("  ALL 12 FILES COMPLETE")
        print(f"  Saved to: {data_dir}")
        print("═" * 64 + "\n")

        browser.close()


if __name__ == "__main__":
    main()
