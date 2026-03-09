"""
utils/archive.py — Safe file archiving before overwrite.
"""

import shutil
from datetime import datetime
from pathlib import Path


def archive_if_exists(file_path: Path, archive_dir: Path) -> None:
    """
    If `file_path` already exists, move it to `archive_dir` with a
    timestamp suffix before the new download lands.

    Example:
        5p_Availables_26_03_07.xlsx  →  Archive/5p_Availables_26_03_07_archived_20260307_143512.xlsx
    """
    if not file_path.exists():
        return

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem    = file_path.stem
    suffix  = file_path.suffix
    dest    = archive_dir / f"{stem}_archived_{ts}{suffix}"

    shutil.move(str(file_path), str(dest))
    print(f"[archive] Moved existing file → {dest.name}")


def build_filename(name: str, dates: dict[str, str]) -> str:
    """
    Build the standard output filename: 5p_<Name>_YY_MM_DD.xlsx
    Uses D_today from the dates dict.
    """
    # D_today is MM/DD/YYYY → reformat to YY_MM_DD
    d = dates["D_today"]          # e.g. "03/07/2026"
    mm, dd, yyyy = d.split("/")
    yy = yyyy[2:]
    return f"5p_{name}_{yy}_{mm}_{dd}.xlsx"
