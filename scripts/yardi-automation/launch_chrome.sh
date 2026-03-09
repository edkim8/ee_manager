#!/bin/bash
# Launch a separate Chrome instance for Yardi — does NOT close your other Chrome windows.
# Uses a dedicated user data directory (ChromeYardi) so it runs alongside normal Chrome.

open -na "Google Chrome" --args   --remote-debugging-port=9222   --user-data-dir="$HOME/Library/Application Support/Google/ChromeYardi"   --no-first-run   --no-default-browser-check

echo "Yardi Chrome launching... wait a few seconds, then log into Yardi and run: python yardi_download.py"
