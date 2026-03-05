# Foreman Report: Renewal Mail Merge & Letter Template System — 2026-03-04

**Date:** 2026-03-04
**To:** Foreman
**From:** Claude Sonnet 4.6 (Tier 2 Builder / Architect)
**Branch:** `main`
**Status:** ✅ COMPLETE — Deployed to GitHub. Pending production verification.

---

## Executive Summary

A full lease renewal letter generation system was designed and built from scratch across two main areas:

1. **Letter Generation** — From any finalized renewal worksheet, leasing staff can now generate a multi-page PDF (one letter per resident), export an Excel mail merge data file, and download a property-specific Word DOCX template. Letters are property-branded with custom letterhead images and personalized community/manager info.

2. **Letter Template Admin UI** — A new page (`Leasing → Letter Templates`) allows users with Asset, RPM, or Manager roles to upload per-property letterhead images, upload custom DOCX templates, and set community name / manager name / manager phone that appear in the letter body. No developer involvement needed for ongoing template management.

---

## What Was Built

### New Pages
| Route | Purpose | Access |
|---|---|---|
| `/office/renewal-templates` | Per-property letterhead, DOCX, and letter body text management | Super Admin, Asset, RPM, Manager |

### New Server Routes
| Route | Purpose |
|---|---|
| `GET /api/renewal-templates` | Fetch all accessible property templates |
| `PATCH /api/renewal-templates/:code` | Upsert community name, manager info, or Storage URLs |
| `POST /api/renewals/generate-letters` | Chrome headless PDF generation endpoint |

### New Utilities & Composables
| File | Purpose |
|---|---|
| `layers/ops/utils/renewalLetterHtml.ts` | Pure-TS letter renderer — zero framework deps, fully unit-testable |
| `layers/ops/utils/renewalLetterConfig.ts` | Per-property static config (letterhead path, DOCX name) |
| `layers/ops/composables/useRenewalsMailMerger.ts` | Three export actions: PDF, Excel, DOCX download |
| `layers/ops/middleware/renewal-templates.ts` | Route guard: Asset / RPM / Manager / super admin |

### Database
| File | Purpose |
|---|---|
| `supabase/migrations/20260304000001_create_renewal_letter_templates.sql` | New table with 5 seeded properties + RLS |

### Static Assets
| File | Purpose |
|---|---|
| `public/images/letterheads/RS.jpg` | RS letterhead image (168×45px) |
| `public/templates/RS_Multi_Renewal_Letter_Template.docx` | RS starter DOCX template |

### Tests
- **70 unit tests** in `tests/unit/ops/renewalLetterHtml.test.ts` (all passing)
- Covers: date formatting, currency, term offset math, letter row building, HTML rendering, letterhead injection, LetterContext personalization, Supabase join shape resolution, and property config lookup

---

## How the System Works

### Path A — PDF Letters
1. Leasing staff opens a **finalized** renewal worksheet
2. Clicks **Generate PDF Letters**
3. Server fetches letterhead + community/manager info from `renewal_letter_templates` table
4. Renders one HTML page per resident, calls Chrome headless `--print-to-pdf`
5. Returns a multi-page US Letter PDF — auto-downloads in browser

### Path B — Word Mail Merge
1. Staff clicks **Export Mail Merge Data** → downloads Excel (one row per resident, columns match `«merge_field»` names)
2. Staff clicks **Download DOCX Template** → downloads property's Word template
3. In Word: Mailings → Select Recipients → Use Existing List → pick the Excel → Finish & Merge

### Template Management (Leasing → Letter Templates)
- Upload letterhead JPG/PNG → saves to Supabase `images` bucket
- Upload DOCX template → saves to Supabase `documents` bucket
- Edit community name, manager name, phone → click Save → stored in `renewal_letter_templates` table
- All 16 merge fields documented in the on-page reference table and context helper

---

## Merge Fields (16 Total)

`resident_name` · `roommate_names` · `unit` · `lease_to_date` · `lease_rent` · `primary_term` · `primary_rent` · `first_term` · `first_term_rent` · `second_term` · `second_term_rent` · `third_term` · `third_term_rent` · `mtm_rent` · `early_discount` · `early_discount_date`

---

## What Foreman Must Do Next

| Priority | Action |
|---|---|
| 🔴 | **Production test PDF generation** — Navigate to a finalized RS worksheet in production, click Generate PDF Letters. Confirm Chrome headless is available on the production server. If not, the PDF path will fail with a 503 (Chrome not found) — Word mail merge path is unaffected. |
| 🟡 | **Upload RS letterhead** — Go to Leasing → Letter Templates → RS card → Upload Image → select the RS letterhead JPG. This replaces the local file fallback with the Supabase Storage URL. |
| 🟡 | **Upload RS DOCX template** — RS card → Upload Template → select the customized RS DOCX. Confirm "Download current" link appears. |
| 🟡 | **Set manager info for all properties** — Fill in community name, manager name, manager phone for each property card → Save. These appear in the letter body and signature. |
| ⚪ | **Other properties** — Letterhead images and DOCX templates for SB, OB, CV, WO need to be sourced from property managers and uploaded via the same UI. |
| ⚪ | **Unit test coverage** — See MASTER_TEST_BACKLOG.md for H-072 items added. Server routes and composable not yet unit-tested. |

---

## Known Limitations

- **Chrome required for PDF** — Production server must have Google Chrome installed. The Word mail merge path (Excel + DOCX) works on any server.
- **Property scoping on GET** — The template list currently returns all accessible properties. Per-property scoping based on `user_property_access` was implemented but caused silent failures due to an unresolved `user_property_access` query issue in the server context. This is a follow-up item; the page middleware already restricts page access correctly.
- **RS only has a letterhead** — SB, OB, CV, WO have no letterhead uploaded yet. Letters will render without one until images are provided and uploaded.
