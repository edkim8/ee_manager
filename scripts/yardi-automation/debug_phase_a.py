#!/usr/bin/env python3
"""
debug_phase_a.py — Interactive DOM inspection session for Phase A.

This script:
  1. Connects to your running Chrome via CDP on port 9222.
  2. Runs the pre-flight dashboard check.
  3. Opens the Playwright Inspector (page.pause()) so you can:
       - Use the Pick locator tool (crosshair icon) to click any element and
         get its selector automatically.
       - Run locator expressions in the Inspector console.
       - Step through actions one at a time.
  4. After you close the Inspector, it dumps a summary of visible link texts
     on the current page to help identify the exact dashboard link labels.

What to inspect in the Inspector:
  - Click the crosshair, then click each blue dashboard stat number/link
    (Leased Units, Available Units, etc.) to capture its selector.
  - Click the Excel export icon in any report frame.
  - Note any iframe wrapping (the Inspector shows frame context).

Usage:
    source .venv/bin/activate
    python debug_phase_a.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from playwright.sync_api import sync_playwright

CDP_PORT = int(os.getenv("CDP_PORT", "9222"))

DASHBOARD_SIGNALS = [
    "a:has-text('Leased Units')",
    "a:has-text('Available Units')",
    "a:has-text('Pending Applications')",
    "#MainMenu",
    "text=clawren",
]


def main():
    with sync_playwright() as pw:
        endpoint = f"http://localhost:{CDP_PORT}"
        try:
            browser = pw.chromium.connect_over_cdp(endpoint)
            print(f"[debug] Connected to Chrome at {endpoint}")
        except Exception as e:
            print(f"[debug] ERROR: Could not connect — {e}")
            sys.exit(1)

        # Get the active page
        page = None
        for ctx in browser.contexts:
            if ctx.pages:
                page = ctx.pages[0]
                break
        if not page:
            print("[debug] ERROR: No open pages found.")
            sys.exit(1)

        print(f"[debug] Active page URL: {page.url}")

        # Pre-flight — look for any dashboard signal
        found_signal = None
        for signal in DASHBOARD_SIGNALS:
            try:
                page.locator(signal).first.wait_for(state="visible", timeout=3_000)
                found_signal = signal
                print(f"[debug] Dashboard signal found: {signal!r}")
                break
            except Exception:
                continue

        if not found_signal:
            print(
                "[debug] WARNING: No dashboard signal matched. "
                "Make sure Yardi dashboard is the active tab.\n"
                "Proceeding to Inspector anyway so you can inspect the page."
            )

        # ---------------------------------------------------------------
        # Dump all visible link texts to help identify dashboard labels
        # ---------------------------------------------------------------
        print("\n[debug] --- Visible <a> link texts on current page ---")
        try:
            links = page.locator("a").all()
            seen = set()
            for link in links:
                try:
                    txt = link.inner_text().strip()
                    if txt and txt not in seen and len(txt) < 80:
                        seen.add(txt)
                        print(f"  {txt!r}")
                except Exception:
                    pass
        except Exception as e:
            print(f"  (could not enumerate links: {e})")

        # ---------------------------------------------------------------
        # Dump iframe info
        # ---------------------------------------------------------------
        print(f"\n[debug] --- Frames on page ({len(page.frames)} total) ---")
        for i, frame in enumerate(page.frames):
            try:
                url = frame.url
                name = frame.name or "(no name)"
                print(f"  Frame {i}: name={name!r}  url={url}")
            except Exception:
                pass

        # ---------------------------------------------------------------
        # Open Playwright Inspector — examine selectors interactively
        # ---------------------------------------------------------------
        print("\n[debug] Opening Playwright Inspector...")
        print("  → Use the crosshair (Pick locator) to click dashboard elements")
        print("  → Check which frame each element lives in")
        print("  → Close the Inspector window when done\n")

        page.pause()  # blocks here until Inspector is closed

        print("\n[debug] Inspector closed. Session complete.")
        # Do NOT close browser — it's the user's live session


if __name__ == "__main__":
    main()
