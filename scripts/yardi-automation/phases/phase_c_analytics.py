"""
phases/phase_c_analytics.py — Phase C: 2 Analytics Reports.

Manual-assist mode: script cannot auto-click through Yardi's hover menus.
Instead it prompts the user to navigate to the correct page, then takes over
for form-fill and download.

Confirmed selectors (2026-03-07 via CDP inspection):

Report 11 — Residential AR Analytics (ARAnalytics_res.aspx):
  cmbReportType_DropDownList  → "Financial Aged Receivable"
  cmbGroupby_DropDownList     → "Resident"
  tenstatus_MultiSelect       → multi-select: "Current", "Notice", "Eviction"
  PropertyLookup_LookupCode   → property text input (pipe-separated codes)
  btnExcel_Button             → Excel download button

Report 12 — Residential Analytics (ResReportSummary.aspx):
  ReportType_DropDownList     → "Resident Lease Expirations"
  PropLookup_LookupCode       → property text input
  Date1_TextBox               → start date
  Date2_TextBox               → end date
  (Excel icon uses DataGridExcel pattern like Phase A)

Navigation: links are in the MAIN document (not the filter iframe).
  "Residential AR Analytics"  → loads ARAnalytics_res.aspx in filter iframe
  "Residential Analytics"     → loads ResReportSummary.aspx in filter iframe
"""

from pathlib import Path
from playwright.sync_api import Page, Frame

from config import PHASE_C_PROPERTY_CODES
from utils.archive import archive_if_exists, build_filename

# The 5 target properties — pipe-separated for Yardi's text lookup field
PROPERTY_LIST = "|".join(PHASE_C_PROPERTY_CODES)

DASHBOARD_URL_FRAGMENT = "SiteDashboard.aspx"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _wait_for_input(prompt: str) -> None:
    """Print a prompt and pause until the user presses Enter."""
    print(f"\n{'='*60}")
    print(prompt)
    print("=" * 60)
    input("  >>> Press ENTER when ready <<<  ")


def _get_filter_frame(page: Page) -> Frame:
    frame = page.frame(name="filter")
    if frame is None:
        raise RuntimeError("filter iframe not found — is the Yardi page still open?")
    return frame


def _fill_text(frame: Frame, selector: str, value: str) -> None:
    field = frame.locator(selector).first
    field.triple_click()
    field.fill(value)


def _return_to_dashboard(page: Page, dashboard_url: str) -> None:
    frame = _get_filter_frame(page)
    if DASHBOARD_URL_FRAGMENT not in frame.url:
        frame.goto(dashboard_url, wait_until="networkidle", timeout=15_000)


# ---------------------------------------------------------------------------
# Report 11: 5p_Delinquencies — Residential AR Analytics
# ---------------------------------------------------------------------------

def _run_delinquencies(
    page: Page,
    dates: dict[str, str],
    data_dir: Path,
    archive_dir: Path,
) -> None:
    filename = build_filename("Delinquencies", dates)
    dest = data_dir / filename

    _wait_for_input(
        "PHASE C — Report 11: Delinquencies (AR Analytics)\n"
        "\n"
        "  In Chrome (main Yardi tab):\n"
        "    1. Hover  Analytic Reports  (top nav)\n"
        "    2. Click  Residential AR Analytics\n"
        "    → The filter iframe loads ARAnalytics_res.aspx\n"
        "\n"
        "  You should see a form with 'Report Type', 'Summary Type',\n"
        "  'Status', and 'Property' fields visible in the iframe."
    )

    print(f"\n[phase_c] → {filename}")

    frame = _get_filter_frame(page)

    # Confirm we landed on the right page
    if "ARAnalytics_res.aspx" not in frame.url:
        print(f"[phase_c]   WARNING: Expected ARAnalytics_res.aspx but frame is at: {frame.url[:80]}")
        print("[phase_c]   Attempting to proceed anyway...")

    print("[phase_c]   AR Analytics form loaded.")

    # Report Type: Financial Aged Receivable
    frame.locator("#cmbReportType_DropDownList").select_option(label="Financial Aged Receivable")
    
    # WAIT FOR POSTBACK: Yardi reloads the iframe when Report Type changes.
    # If we select the next dropdown too quickly, the reload wipes it out.
    page.wait_for_timeout(2000)

    # Summary Type: Resident
    frame.locator("#cmbGroupby_DropDownList").select_option(label="Resident")

    # Status: Current + Notice + Eviction (multi-select)
    status_select = frame.locator("#tenstatus_MultiSelect")
    status_select.evaluate("""el => {
        for (let o of el.options) {
            o.selected = (o.text === 'Current' || o.text === 'Notice' || o.text === 'Eviction');
        }
    }""")

    # Properties: enter the 5 target codes (pipe-separated)
    _fill_text(frame, "#PropertyLookup_LookupCode", PROPERTY_LIST)
    frame.locator("#PropertyLookup_LookupCode").press("Tab")
    page.wait_for_timeout(1_500)

    # Archive and download
    archive_if_exists(dest, archive_dir)
    with page.expect_download(timeout=60_000) as dl_info:
        frame.locator("#btnExcel_Button").click()

    download = dl_info.value
    download.save_as(str(dest))
    print(f"[phase_c]   Saved → {dest}")


# ---------------------------------------------------------------------------
# Report 12: 5p_ExpiringLeases — Residential Analytics (slow to render)
# ---------------------------------------------------------------------------

def _run_expiring_leases(
    page: Page,
    dates: dict[str, str],
    data_dir: Path,
    archive_dir: Path,
) -> None:
    filename = build_filename("ExpiringLeases", dates)
    dest = data_dir / filename

    _wait_for_input(
        "PHASE C — Report 12: Expiring Leases (Residential Analytics)\n"
        "\n"
        "  In Chrome (main Yardi tab):\n"
        "    1. Hover  Analytic Reports  (top nav)\n"
        "    2. Click  Residential Analytics\n"
        "    → The filter iframe loads ResReportSummary.aspx\n"
        "\n"
        "  You should see a form with 'Report Type' and 'Property' fields."
    )

    print(f"\n[phase_c] → {filename}  (may be slow — up to 90s)")

    frame = _get_filter_frame(page)

    if "ResReportSummary.aspx" not in frame.url:
        print(f"[phase_c]   WARNING: Expected ResReportSummary.aspx but frame is at: {frame.url[:80]}")
        print("[phase_c]   Attempting to proceed anyway...")

    print("[phase_c]   Residential Analytics form loaded.")

    # Report Type: Resident Lease Expirations
    frame.locator("#ReportType_DropDownList").select_option(label="Resident Lease Expirations")

    # Properties
    _fill_text(frame, "#PropLookup_LookupCode", PROPERTY_LIST)
    frame.locator("#PropLookup_LookupCode").press("Tab")
    page.wait_for_timeout(1_500)

    # Date range: D_start → D_future
    _fill_text(frame, "#Date1_TextBox", dates["D_start"])
    _fill_text(frame, "#Date2_TextBox", dates["D_future"])

    # Click Display to render the report
    frame.locator("input[value='Display'], #btnDisplay_Button").first.click()
    page.wait_for_timeout(3_000)

    # Wait for report content (slow render — 90s timeout)
    try:
        frame.locator("text=Expiring Leases").first.wait_for(state="visible", timeout=90_000)
        print("[phase_c]   Report rendered.")
    except Exception:
        print("[phase_c]   WARNING: 'Expiring Leases' header not confirmed — attempting download anyway.")

    archive_if_exists(dest, archive_dir)
    with page.expect_download(timeout=30_000) as dl_info:
        frame.locator("img[src*='DataGridExcel']").first.click()

    download = dl_info.value
    download.save_as(str(dest))
    print(f"[phase_c]   Saved → {dest}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_phase_c(
    page: Page,
    dates: dict[str, str],
    data_dir: Path,
    archive_dir: Path,
    dashboard_url: str = "",
) -> None:
    print("\n=== PHASE C: Analytics Reports (2 files) ===")

    _run_delinquencies(page, dates, data_dir, archive_dir)
    _run_expiring_leases(page, dates, data_dir, archive_dir)

    print("\n[phase_c] Phase C complete.")
