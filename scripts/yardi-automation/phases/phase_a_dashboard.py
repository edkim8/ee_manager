"""
phases/phase_a_dashboard.py — Phase A: 8 Dashboard Numerical Link Downloads.

Confirmed DOM structure (2026-03-07 via CDP inspection):
  - Single iframe: name='filter', id='filter', src=SiteDashboard.aspx
  - All 8 stat links live inside this iframe. Clicking one navigates the
    iframe in-place to the report — it does NOT open a new frame.
  - Dashboard link pattern: frame.locator("tr:has-text('Leased Units') a")
    → targets the <tr> with the static label; the <a> inside holds the dynamic number.
  - Excel button: <img src=".../DataGridExcel.gif" doonclick="__doPostBack(...)">
    → selector: img[src*='DataGridExcel']
  - page.expect_download() at the page level captures iframe-triggered downloads.
  - To return to the dashboard: wait for the SiteDashboard.aspx URL to reappear
    in the filter frame (navigate back or click a Home link inside the frame).
"""

from pathlib import Path
from playwright.sync_api import Page, Frame

from utils.archive import archive_if_exists, build_filename


# (static_label_text, wait_header_text, output_name)
PHASE_A_REPORTS = [
    ("Leased Units",          "Property",      "Leased_Units"),
    ("Available Units",       "Unit Type",     "Availables"),
    ("Unit Transfers",        "From Property", "Transfers"),
    ("Pending Applications",  "Agent",         "Applications"),
    ("On Notice",             "Move Out Date", "Notices"),
    ("Alerts",                "Description",   "Alerts"),
    ("Pending Make Ready",    "Bedrooms",      "Make_Ready"),
    ("Pending Work Requests", "WO#",           "WorkOrders"),
]

DASHBOARD_IFRAME_NAME = "filter"
DASHBOARD_URL_FRAGMENT = "SiteDashboard.aspx"

# Confirmed via CDP: Yardi uses DataGridExcel.gif as the Excel export trigger.
EXCEL_ICON_SELECTOR = "img[src*='DataGridExcel']"


def _get_filter_frame(page: Page) -> Frame:
    """Return the content frame of iframe[name='filter'], or raise."""
    frame = page.frame(name=DASHBOARD_IFRAME_NAME)
    if frame is None:
        raise RuntimeError(
            f"iframe[name='{DASHBOARD_IFRAME_NAME}'] not found.\n"
            f"  Current URL: {page.url}\n"
            f"  Ensure the Yardi main dashboard is the active tab."
        )
    return frame


def _is_on_dashboard(page: Page) -> bool:
    """True if the filter iframe is currently showing SiteDashboard.aspx."""
    frame = page.frame(name=DASHBOARD_IFRAME_NAME)
    if frame is None:
        return False
    return DASHBOARD_URL_FRAGMENT in frame.url


def _return_to_dashboard(page: Page, dashboard_url: str) -> None:
    """
    Navigate the filter iframe directly back to the dashboard URL.
    Using frame.goto() is the most reliable approach — no link-hunting needed.
    """
    if _is_on_dashboard(page):
        return
    frame = _get_filter_frame(page)
    frame.goto(dashboard_url, wait_until="networkidle", timeout=15_000)


def _click_stat_link(frame: Frame, label_text: str) -> None:
    """
    Click the <a> in the <tr> whose static label matches label_text.
    The number inside the <a> is dynamic and is NOT used for targeting.
    """
    locator = frame.locator(f"tr:has-text('{label_text}') a").first
    locator.wait_for(state="visible", timeout=10_000)
    locator.click()


def _wait_for_report_header(frame: Frame, header_text: str, timeout_ms: int = 20_000) -> None:
    """Wait for the expected column header inside the filter frame (report rendered in-place)."""
    frame.locator(f"text={header_text}").first.wait_for(state="visible", timeout=timeout_ms)


def _download_report(
    page: Page,
    label_text: str,
    wait_header: str,
    output_name: str,
    dates: dict[str, str],
    data_dir: Path,
    archive_dir: Path,
) -> None:
    filename = build_filename(output_name, dates)
    dest     = data_dir / filename

    print(f"\n[phase_a] → {filename}")

    frame = _get_filter_frame(page)

    # 1. Click the stat link (label-row targeted, number-agnostic)
    _click_stat_link(frame, label_text)

    # 2. Wait for the report to render in-place inside the filter frame
    try:
        _wait_for_report_header(frame, wait_header)
        print(f"[phase_a]   Header '{wait_header}' confirmed.")
    except Exception:
        print(f"[phase_a]   WARNING: Header '{wait_header}' not found — skipping {output_name}.")
        return

    # 3. Archive existing file
    archive_if_exists(dest, archive_dir)

    # 4. Click Excel button and capture download (page-level captures iframe downloads)
    with page.expect_download(timeout=30_000) as dl_info:
        frame.locator(EXCEL_ICON_SELECTOR).first.click()

    download = dl_info.value
    download.save_as(str(dest))
    print(f"[phase_a]   Saved → {dest}")


def run_phase_a(
    page: Page,
    dates: dict[str, str],
    data_dir: Path,
    archive_dir: Path,
) -> None:
    print("\n=== PHASE A: Dashboard Numerical Links (8 files) ===")

    # Capture the dashboard URL once at the start (filter frame must be on dashboard now)
    dashboard_url = _get_filter_frame(page).url
    if DASHBOARD_URL_FRAGMENT not in dashboard_url:
        raise RuntimeError(
            f"Phase A must start with the Yardi dashboard open.\n"
            f"  filter frame is currently at: {dashboard_url}"
        )
    print(f"[phase_a] Dashboard URL: {dashboard_url}")

    for label_text, wait_header, output_name in PHASE_A_REPORTS:
        _return_to_dashboard(page, dashboard_url)

        # Sanity-check: .clawren visible in the filter frame
        try:
            _get_filter_frame(page).locator("text=clawren").first.wait_for(
                state="visible", timeout=5_000
            )
        except Exception:
            print("[phase_a]   WARNING: .clawren not detected in filter frame — proceeding.")

        _download_report(page, label_text, wait_header, output_name, dates, data_dir, archive_dir)

    print("\n[phase_a] Phase A complete.")
