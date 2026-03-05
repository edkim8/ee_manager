# Dispatch Prompt: Renewal Mail Merge

*Copy and paste the entire block below directly into Claude Code.*

---

```
ACT AS: Tier 2 Builder (Architect).
TASK: Implement Lease Renewal Mail Merge / PDF Generator

BACKGROUND:
We need to generate standardized lease renewal PDF letters for residents using data generated from our `renewal_worksheets` table. The data matches an uploaded Excel schema and needs to be mapped to a standardized DOCX/PDF template.

CONTEXT FILES:
- `docs/architecture/SYSTEM_MAP.md` (READ ONLY)
- `docs/status/HISTORY_INDEX.md` (READ ONLY)
- `docs/KNOWLEDGE_BASE.md` (CRITICAL)
- `Reference_code/renewal_mail_merger/` (Read the `.docx` and `.xlsx` files here to understand the target output format and incoming data schema).

REQUIREMENTS:
1. Review the `RS Multi Renewal Letter.docx` text to understand the exact layout, wording, and required fields.
2. Review the data schema in `Audrey3 Dec-01-2025 to Dec-31-2025.xlsx`. The merge fields roughly map as follows:
   - Tenant Name -> `resident_name`
   - Unit -> `unit`
   - Lease Expiration -> `lease_to_date`
   - Current Base Rent -> `lease_rent`
   - Renewal Options Grid -> Map the `primary_term/rent`, `first_term/rent`, `second_term/rent`, `third_term/rent`, and `mtm_rent` into the template's table layout. (Alternatively parse the pre-computed `renewal_offers_formatted` string).
   - Concession Amount -> `early_discount`
   - Concession Deadline -> `early_discount_date`
3. We need a Server API endpoint (`/api/renewals/generate-letters.post.ts` or similar) that accepts an array of these renewal row objects and returns/generates a merged PDF (or a zipped payload of PDFs).
   - Use our existing headless Chrome / Puppeteer HTML-to-PDF pipeline (check recent `HISTORY_INDEX.md` entries or `memory/` for our recently built `OWNERSHIP_REFERENCE.pdf` pattern). 
   - DO NOT use a paid API or external service. Generate it via HTML template -> Puppeteer locally.
4. Create a Vue component on the frontend (`layers/ops/pages/office/renewals/index.vue` or a sub-component) that provides a "Generate Letters" button which posts the selected rows to this API and triggers the download.

TESTING (MANDATORY):
- Write Vitest unit tests covering the HTML strict-formatting generation (ensure currency formatting is correct, dates are formatted to `MMM DD, YYYY`, and the options grid dynamically generates).
- Run `npm run test:unit`.

CRITICAL CONSTRAINTS:
1. NO ADMIN EDITS (History/Status files).
2. UNCOVERED CODE GUARANTEE: Leave the codebase with equal or better test coverage. Do not stop until `.test.ts` passes.
3. Use Nuxt Server routes for the PDF generation, keeping heavy logic securely on the backend.

FINAL STEP (MANDATORY):
Overwrite `docs/status/LATEST_UPDATE.md` with your Field Report. Write it to disk.
```
