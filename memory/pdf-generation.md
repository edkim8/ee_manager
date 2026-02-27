# PDF Generation Pipeline

## Overview
We use a Chrome headless pattern for generating high-fidelity PDF documents. This replaces heavier Python-based solutions like WeasyPrint which often have complex system-level dependencies (GTK, Pango).

## The Pattern
1. **Source**: Python builds a clean HTML string (using standard f-strings or Jinja2).
2. **Styling**: Vanilla CSS with `@page` rules for margins and headers.
3. **Execution**: Invoke the Chrome binary directly via subprocess.

## The Command
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --disable-gpu \
  --print-to-pdf="/path/to/output.pdf" \
  --print-to-pdf-no-header \
  "file:///tmp/input.html"
```

## System Constraints
> [!IMPORTANT]
> **WeasyPrint** is currently broken on this Mac due to missing `libgobject` and `libpango`. Do not attempt to use it unless `brew install pango` is successful.

## Implementation Details
- **CSS @page**: Use `size: letter; margin: 0.5in;` for standard report layout.
- **Supabase Integration**: Pull live data via the REST API within the Python script before building the HTML.
- **First Implementation**: `docs/owners/OWNERSHIP_REFERENCE.pdf` captures the full ownership chain (Person → Personal Entity → Property Entity → Property).

## Reference
- **H-062**: Introduction of PDF generation pipeline.
- **Documentation**: `docs/owners/OWNERSHIP_MODEL.md`
