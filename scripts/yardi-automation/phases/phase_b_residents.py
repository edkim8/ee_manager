"""
phases/phase_b_residents.py — Phase B: 2 Resident Directory w/Email Reports.

Manual-assist mode: script cannot auto-click through Yardi's hover menus.
Instead it prompts the user to navigate to the correct page, then takes over
for form-fill and download.

Flow (each report):
  1. Print instructions: Reports → Resident → Resident Directory w/Email
  2. wait_for_input() — user presses Enter once the new tab is active
  3. Detect the new tab (most-recently-opened page in the browser context)
  4. Fill form fields and download
"""

from pathlib import Path
from playwright.sync_api import Page, BrowserContext

from utils.archive import archive_if_exists, build_filename

STATUS_ALL = ["Current", "Future", "Notice", "Applicant", "Eviction"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _wait_for_input(prompt: str) -> None:
    """Print a prompt and pause until the user presses Enter."""
    print(f"\n{'='*60}")
    print(prompt)
    print("=" * 60)
    input("  >>> Press ENTER when ready <<<  ")


def _get_active_tab(page: Page) -> Page:
    """
    Return the most-recently-opened page in the browser context.
    If no new tab was opened, return `page` itself.
    """
    context: BrowserContext = page.context
    pages = context.pages
    if len(pages) > 1:
        return pages[-1]
    return page


def _set_property(tab: Page, code: str = "clawren") -> None:
    """Fill the property field in the report form."""
    for selector in [
        "#PropCode_LookupCode",
        "#PropertyCode_LookupCode",
        "#PropLookup_LookupCode",
        "input[name*='Prop'][name*='LookupCode']",
        "input[id*='prop' i][id*='lookup' i]",
        "input[name*='property' i]",
    ]:
        try:
            field = tab.locator(selector).first
            field.wait_for(state="visible", timeout=1_500)
            field.triple_click()
            field.fill(code)
            field.press("Tab")
            tab.wait_for_timeout(500)
            print(f"[phase_b]   Property set to '{code}' via {selector}")
            return
        except Exception:
            continue
    print("[phase_b]   WARNING: Property field not found — skipping.")


def _set_status(tab: Page, statuses: list[str] | None) -> None:
    """Select statuses in the multi-select, or leave default."""
    if statuses is None:
        return
    for selector in [
        "#Status_MultiSelect",
        "#tenstatus_MultiSelect",
        "select[name*='status' i]",
        "select[id*='status' i]",
    ]:
        try:
            sel = tab.locator(selector).first
            sel.wait_for(state="visible", timeout=1_500)
            sel.evaluate(f"""el => {{
                let targets = {statuses};
                for (let o of el.options) {{
                    o.selected = targets.includes(o.text);
                }}
            }}""")
            print(f"[phase_b]   Status set: {statuses}")
            return
        except Exception:
            continue
    print("[phase_b]   WARNING: Status field not found.")


def _fill_date(tab: Page, fragment: str, value: str) -> None:
    """Fill a date field by partial id/name match."""
    for selector in [
        f"input[id*='{fragment}' i]",
        f"input[name*='{fragment}' i]",
    ]:
        try:
            field = tab.locator(selector).first
            field.wait_for(state="visible", timeout=1_500)
            field.triple_click()
            field.fill(value)
            print(f"[phase_b]   Date '{fragment}' = {value}")
            return
        except Exception:
            continue
    print(f"[phase_b]   WARNING: Date field '{fragment}' not found.")


def _log_form_fields(tab: Page) -> None:
    """Print all visible form fields to help validate/debug selectors."""
    try:
        fields = tab.locator("input:not([type=hidden]), select").all()
        print(f"[phase_b]   Form fields ({len(fields)} found):")
        for f in fields:
            fid   = f.get_attribute("id") or ""
            fname = f.get_attribute("name") or ""
            print(f"             id={fid!r:35} name={fname!r}")
    except Exception:
        pass


def _run_and_download(
    page: Page,
    tab: Page,
    output_name: str,
    dates: dict[str, str],
    data_dir: Path,
    archive_dir: Path,
) -> None:
    filename = build_filename(output_name, dates)
    dest = data_dir / filename
    archive_if_exists(dest, archive_dir)

    # Submit the form (try common Yardi button patterns)
    submitted = False
    for selector in [
        "input[value='Run Report']",
        "input[value='Display']",
        "input[value='Submit']",
        "input[value='Run']",
        "#btnDisplay_Button",
        "#cmdRun_Button",
        "#btnRun_Button",
    ]:
        try:
            btn = tab.locator(selector).first
            btn.wait_for(state="visible", timeout=1_500)
            btn.click()
            submitted = True
            print(f"[phase_b]   Submitted via {selector}")
            break
        except Exception:
            continue

    if not submitted:
        print("[phase_b]   WARNING: Submit button not found — trying Excel directly.")

    tab.wait_for_timeout(2_000)

    # Wait for report content
    try:
        tab.locator("text=Resident").first.wait_for(state="visible", timeout=20_000)
        print("[phase_b]   Report content confirmed.")
    except Exception:
        print("[phase_b]   WARNING: Report content not confirmed — attempting download.")

    # Download
    with tab.expect_download(timeout=30_000) as dl_info:
        for selector in ["#cmdExcel_Button", "img[src*='DataGridExcel']", "input[value='Excel']"]:
            try:
                tab.locator(selector).first.click(timeout=2_000)
                break
            except Exception:
                continue

    download = dl_info.value
    download.save_as(str(dest))
    print(f"[phase_b]   Saved → {dest}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_phase_b(
    page: Page,
    dates: dict[str, str],
    data_dir: Path,
    archive_dir: Path,
) -> None:
    print("\n=== PHASE B: Resident Directory Reports (2 files) ===")

    # ------------------------------------------------------------------ #
    # Report 9: 5p_Residents_Status
    # Status: default (all), Move In: D_start → D_future
    # ------------------------------------------------------------------ #
    _wait_for_input(
        "PHASE B — Report 9: Residents Status\n"
        "\n"
        "  In Chrome:\n"
        "    1. Click  Reports  (left sidebar)\n"
        "    2. Hover  Resident\n"
        "    3. Click  Resident Directory w/Email\n"
        "    → A new tab opens with the report form.\n"
        "\n"
        "  Leave that new tab as the active/foreground tab."
    )

    tab = _get_active_tab(page)
    print(f"[phase_b]   Using tab: {tab.url[:80]}")
    _log_form_fields(tab)
    _set_property(tab, "clawren")
    _set_status(tab, None)
    _fill_date(tab, "MoveIn", dates["D_start"])
    _fill_date(tab, "MoveIn2", dates["D_future"])
    _run_and_download(page, tab, "Residents_Status", dates, data_dir, archive_dir)
    tab.close()

    # ------------------------------------------------------------------ #
    # Report 10: 5p_Residents_Status_All
    # Status: Current/Future/Notice/Applicant/Eviction | 01/01/1995 → D_future
    # ------------------------------------------------------------------ #
    _wait_for_input(
        "PHASE B — Report 10: Residents Status All\n"
        "\n"
        "  In Chrome:\n"
        "    1. Click  Reports  (left sidebar)\n"
        "    2. Hover  Resident\n"
        "    3. Click  Resident Directory w/Email\n"
        "    → A new tab opens with the report form.\n"
        "\n"
        "  Leave that new tab as the active/foreground tab."
    )

    tab = _get_active_tab(page)
    print(f"[phase_b]   Using tab: {tab.url[:80]}")
    _log_form_fields(tab)
    _set_property(tab, "clawren")
    _set_status(tab, STATUS_ALL)
    _fill_date(tab, "MoveIn", dates["D_1995"])
    _fill_date(tab, "MoveIn2", dates["D_future"])
    _run_and_download(page, tab, "Residents_Status_All", dates, data_dir, archive_dir)
    tab.close()

    print("\n[phase_b] Phase B complete.")
