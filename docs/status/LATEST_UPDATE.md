# H-072 — Renewal Mail Merge & Letter Template System

**Date:** 2026-03-04
**Status:** ✅ COMPLETE — pushed to main, pending production verification

---

## What Was Built

### 1. Letter Generation (Worksheet Detail Page)

Three export buttons appear on any **Finalized** renewal worksheet (`/office/renewals/[id]`):

| Button | What It Does |
|--------|-------------|
| **Generate PDF Letters** | Chrome headless renders one US Letter page per resident, auto-downloads as PDF |
| **Export Mail Merge Data** | Downloads Excel with one row per resident; column names match DOCX merge fields exactly |
| **Download DOCX Template** | Downloads the property's Word template with `«merge_field»` placeholders |

### 2. Letter Template Management (`/office/renewal-templates`)

New page under **Leasing → Letter Templates**. Per-property cards allow:
- Upload letterhead image (JPG/PNG) → Supabase Storage → embedded in PDF letters
- Upload Word DOCX template (.docx) → Supabase Storage → downloadable from worksheets
- Set community name, manager name, manager phone → injected into letter body text

Access: Super Admin, Asset, RPM, Manager roles.

---

## Architecture

```
Worksheet (finalized)
  ├── Generate PDF Letters
  │     → POST /api/renewals/generate-letters
  │     → Fetches renewal_letter_templates (community name, manager, letterhead URL)
  │     → renewalLetterHtml.ts → Chrome headless → PDF
  │
  ├── Export Mail Merge Data
  │     → useRenewalsMailMerger.ts → xlsx library → .xlsx download
  │
  └── Download DOCX Template
        → useRenewalsMailMerger.ts → fetch from Supabase Storage or /public/templates/

Leasing → Letter Templates (/office/renewal-templates)
  → GET /api/renewal-templates (fetch all templates)
  → PATCH /api/renewal-templates/:code (save text fields + Storage URLs)
  → Supabase Storage: images bucket (letterheads), documents bucket (DOCX)
```

---

## Files

### New
| File | Purpose |
|------|---------|
| `layers/ops/utils/renewalLetterHtml.ts` | Pure-TS letter engine, 0 framework deps |
| `layers/ops/utils/renewalLetterConfig.ts` | Static per-property config (5 properties) |
| `layers/ops/server/api/renewals/generate-letters.post.ts` | PDF generation endpoint |
| `layers/ops/composables/useRenewalsMailMerger.ts` | Three export actions composable |
| `layers/ops/middleware/renewal-templates.ts` | Route guard (Asset/RPM/Manager/super admin) |
| `layers/ops/pages/office/renewal-templates.vue` | Template management UI |
| `layers/admin/server/api/renewal-templates/index.get.ts` | GET templates API |
| `layers/admin/server/api/renewal-templates/[code].patch.ts` | PATCH template API |
| `supabase/migrations/20260304000001_create_renewal_letter_templates.sql` | DB table + seed + RLS |
| `public/images/letterheads/RS.jpg` | RS letterhead image |
| `public/templates/RS_Multi_Renewal_Letter_Template.docx` | RS starter DOCX |
| `tests/unit/ops/renewalLetterHtml.test.ts` | 70 unit tests (all passing) |

### Modified
| File | Change |
|------|--------|
| `layers/base/components/AppNavigation.vue` | Added Letter Templates to Leasing menu (role-gated) |
| `layers/ops/composables/useRenewalsMailMerger.ts` | Rewrote with property-specific exports |
| `layers/ops/pages/office/renewals/[id].vue` | Added 3 export buttons + context helper steps |

---

## 16 Merge Fields

| Field | Source |
|-------|--------|
| `resident_name` | Resident full name |
| `roommate_names` | Additional occupants |
| `unit` | Unit number |
| `lease_to_date` | Lease expiry (formatted MMM DD, YYYY) |
| `lease_rent` | Current rent |
| `primary_term` | Primary renewal term (months) |
| `primary_rent` | Final approved rent |
| `first/second/third_term` | Alternate term lengths |
| `first/second/third_term_rent` | primary_rent ± worksheet offset % |
| `mtm_rent` | Month-to-month rent |
| `early_discount` | Early renewal concession amount |
| `early_discount_date` | Discount deadline |

---

## Testing

**573 unit tests passing** (up from 502 at session start).
70 new tests in `renewalLetterHtml.test.ts`.
See `docs/testing/MASTER_TEST_BACKLOG.md` section 3 for outstanding server route + composable coverage items (H072-A through H072-G).

---

## Known Limitations & Follow-ups

- **Chrome required for PDF** — Vercel/production must have Chrome available. Word mail merge path is unaffected.
- **SB/OB/CV/WO letterheads** — Not yet uploaded. Need property managers to provide images. Upload via Leasing → Letter Templates.
- **Property scoping on GET** — Template list returns all accessible properties; per-property row filtering deferred (silent failure in `user_property_access` server query needs investigation).
- **Foreman report:** `docs/handovers/FOREMAN_REPORT_2026_03_04_RENEWAL_MAIL_MERGE.md`
