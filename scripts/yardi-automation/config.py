"""
config.py — Dynamic date engine and path resolution.
"""

import os
import sys
from datetime import date, timedelta
from pathlib import Path
import calendar


# ---------------------------------------------------------------------------
# Dynamic Date Engine
# ---------------------------------------------------------------------------

def _last_day_of_prev_month(today: date) -> date:
    """Return the last calendar day of the month preceding `today`."""
    first_of_this_month = today.replace(day=1)
    return first_of_this_month - timedelta(days=1)


def build_dates() -> dict[str, str]:
    """
    Compute all runtime dates. Returns a dict with MM/DD/YYYY strings
    ready to paste into Yardi form fields.

    D_today     — current system date
    D_start     — exactly one month prior to today
    D_prior_end — last day of the calendar month preceding today
    D_future    — D_prior_end with year +2
    D_1995      — fixed anchor date for the "All" resident report (01/01/1995)
    """
    today = date.today()

    # D_start: subtract ~1 month (same day, prior month; clamp to month-end)
    month_ago_month = today.month - 1 or 12
    month_ago_year  = today.year if today.month > 1 else today.year - 1
    last_day_of_month_ago = calendar.monthrange(month_ago_year, month_ago_month)[1]
    d_start_day = min(today.day, last_day_of_month_ago)
    d_start = date(month_ago_year, month_ago_month, d_start_day)

    d_prior_end = _last_day_of_prev_month(today)
    d_future    = d_prior_end.replace(year=d_prior_end.year + 2)

    fmt = lambda d: d.strftime("%m/%d/%Y")

    return {
        "D_today":     fmt(today),
        "D_start":     fmt(d_start),
        "D_prior_end": fmt(d_prior_end),
        "D_future":    fmt(d_future),
        "D_1995":      "01/01/1995",
    }


# ---------------------------------------------------------------------------
# Google Drive Path Resolution (Mac Mini + MacBook Air)
# ---------------------------------------------------------------------------

# Ordered list of candidate cloud-sync Data directories.
# The first one that exists on the current machine wins.
# Add or reorder candidates here as storage providers change.
_DATA_DIR_CANDIDATES = [
    # ── Active: Dropbox (current) ──────────────────────────────────────────
    Path.home() / "Library" / "CloudStorage" / "Dropbox" / "Data",
    Path.home() / "Dropbox" / "Data",                          # legacy Dropbox path

    # ── Future: Google Drive (ekim@lehbros.com) ───────────────────────────
    Path.home() / "Library" / "CloudStorage" / "GoogleDrive-ekim@lehbros.com" / "My Drive" / "Data",
    Path.home() / "Library" / "CloudStorage" / "GoogleDrive-edkim88@gmail.com" / "My Drive" / "Data",

    # ── Future: iCloud Drive ──────────────────────────────────────────────
    Path.home() / "Library" / "Mobile Documents" / "com~apple~CloudDocs" / "Data",
]


def resolve_gdrive_data_dir() -> Path:
    """
    Return the resolved Path to the active cloud-sync Data folder.
    Tries candidates in order; first existing directory wins.
    Override with DATA_DIR in .env for a fully custom path.
    Raises RuntimeError with a clear message if nothing is found.
    """
    # Honour explicit override first
    override = os.getenv("DATA_DIR") or os.getenv("GOOGLE_DRIVE_PATH")
    if override:
        p = Path(override).expanduser()
        if p.exists():
            return p
        print(f"[config] WARNING: DATA_DIR override '{override}' does not exist — falling back to auto-detect.")

    for candidate in _DATA_DIR_CANDIDATES:
        if candidate.exists():
            candidate.mkdir(parents=True, exist_ok=True)
            print(f"[config] Using data dir: {candidate}")
            return candidate

    raise RuntimeError(
        "Could not locate a cloud-sync Data folder on this machine.\n"
        "Set DATA_DIR in your .env file to the folder where files should be saved, e.g.:\n"
        "  DATA_DIR=~/Dropbox/Data"
    )


def resolve_archive_dir(data_dir: Path) -> Path:
    """Return (and create) the Archive subfolder within the data dir."""
    archive = data_dir / "Archive"
    archive.mkdir(parents=True, exist_ok=True)
    return archive


# ---------------------------------------------------------------------------
# Yardi property codes used in Phase C
# ---------------------------------------------------------------------------

PHASE_C_PROPERTY_CODES = [
    "azres422",
    "azstoran",
    "cacitvie",
    "caoceabr",
    "cawhioak",
]
