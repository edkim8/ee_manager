"""
utils/browser.py — CDP connection and pre-flight Yardi dashboard verification.

Strategy: Playwright's connect_over_cdp cannot reliably interact with pre-existing
Chrome tabs (page.url is blank, page.evaluate hangs). Instead we:
  1. Query Chrome's CDP HTTP API (/json) with requests to find the Yardi tab URL.
  2. Open a NEW Playwright-controlled tab in the same browser context.
  3. Navigate that new tab to the Yardi dashboard URL — session cookies carry over
     automatically since we are in the same Chrome browser context.
  4. Run all automation on this new, fully Playwright-controlled tab.
"""

import os
import sys
import urllib.request
import json

from playwright.sync_api import Browser, Page, Playwright


CDP_PORT = int(os.getenv("CDP_PORT", "9222"))
DASHBOARD_URL_FRAGMENT = "SiteDashboard.aspx"


def _cdp_targets() -> list[dict]:
    """Fetch the list of CDP targets from Chrome's HTTP API."""
    try:
        with urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json") as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"[browser] ERROR: Could not query CDP at port {CDP_PORT}: {e}")
        sys.exit(1)


def _find_yardi_target(targets: list[dict]) -> dict | None:
    """Return the CDP target dict for the Yardi Voyager tab."""
    for t in targets:
        url = t.get("url", "")
        title = t.get("title", "")
        if "yardipcu.com" in url or "Yardi" in title:
            return t
    return None


def connect_to_chrome(pw: Playwright) -> Browser:
    """Attach to the running Chrome instance via its browser-level CDP endpoint."""
    endpoint = f"http://localhost:{CDP_PORT}"
    try:
        browser = pw.chromium.connect_over_cdp(endpoint)
        print(f"[browser] Connected to Chrome via CDP at {endpoint}")
        return browser
    except Exception as exc:
        print(
            f"\n[browser] ERROR: Could not connect to Chrome on port {CDP_PORT}.\n"
            f"  Make sure Chrome is running with:\n"
            f"    --remote-debugging-port={CDP_PORT}\n"
            f"  Detail: {exc}\n"
        )
        sys.exit(1)


def get_active_page(browser: Browser) -> Page:
    """
    Open a new Playwright-controlled tab navigated to the Yardi dashboard.

    We query Chrome's CDP HTTP API to find the current Yardi dashboard URL,
    then open a fresh tab in the same browser context (inheriting session cookies)
    and navigate to that URL. This gives Playwright full JS/locator/download control
    without fighting with the pre-existing tab's CDP context.
    """
    targets = _cdp_targets()

    print(f"[browser] CDP targets found: {len(targets)}")
    for t in targets:
        print(f"  [{t.get('type','?')}] {t.get('title','')[:50]} — {t.get('url','')[:80]}")

    yardi_target = _find_yardi_target(targets)
    if yardi_target is None:
        print(
            "\n[browser] ERROR: No Yardi tab found in Chrome.\n"
            "  Make sure the Yardi Voyager dashboard is open in Chrome and you are logged in.\n"
        )
        sys.exit(1)

    yardi_url = yardi_target["url"]
    print(f"[browser] Found Yardi tab: {yardi_url[:100]}")

    # Open a new tab in the same browser context — session cookies carry over
    context = browser.contexts[0]
    page = context.new_page()
    print(f"[browser] Opened new Playwright tab, navigating to Yardi dashboard...")
    page.goto(yardi_url, wait_until="networkidle", timeout=30_000)
    print(f"[browser] Navigated to: {page.url[:100]}")
    return page


def verify_dashboard(page: Page) -> None:
    """
    Confirm the filter iframe is present and showing SiteDashboard.aspx.
    """
    print("[preflight] Verifying Yardi dashboard is active and authenticated...")

    frame = page.frame(name="filter")
    if frame is not None and DASHBOARD_URL_FRAGMENT in frame.url:
        print(f"[preflight] Dashboard confirmed — filter iframe: {frame.url[:80]}")
        return

    # Frame present but URL not synced yet — wait briefly
    if frame is not None:
        try:
            page.wait_for_function(
                f"() => document.querySelector('iframe[name=\"filter\"]')?.src?.includes('{DASHBOARD_URL_FRAGMENT}')",
                timeout=8_000,
            )
            print(f"[preflight] Dashboard confirmed (after wait).")
            return
        except Exception:
            pass

    print(
        f"\n[preflight] ABORT: Yardi dashboard not detected.\n"
        f"  filter iframe: {'found, URL=' + frame.url if frame else 'NOT FOUND'}\n"
        f"  Current page URL: {page.url}\n"
        f"  Action required:\n"
        f"    1. Ensure you are logged into Yardi with .clawren active.\n"
        f"    2. Re-run this script.\n"
    )
    sys.exit(1)
