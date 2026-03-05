/**
 * Renewal Letter HTML Generator
 *
 * Pure utility — no Vue/Nuxt/Supabase dependencies — fully unit testable.
 *
 * Responsibilities:
 *  1. Map internal RenewalItemUI + worksheet config → RenewalLetterRow (canonical shape)
 *  2. Format dates as "MMM DD, YYYY" and currency as "$1,352"
 *  3. Compute per-term rents from primary rent + worksheet offsets
 *  4. Render a single letter as an HTML string (with optional letterhead image)
 *  5. Combine multiple letters into a multi-page HTML document
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Canonical row shape matching the DOCX merge fields (and the XLSX export schema). */
export interface RenewalLetterRow {
  worksheet_id:         string | number
  resident_name:        string
  roommate_names:       string
  unit:                 string          // unit_name
  lease_rent:           number          // current_rent
  lease_to_date:        string          // ISO date
  primary_term:         number          // e.g. 12
  primary_rent:         number          // final_rent for primary term
  first_term:           number | null
  first_term_rent:      number | null
  second_term:          number | null
  second_term_rent:     number | null
  third_term:           number | null
  third_term_rent:      number | null
  mtm_rent:             number | null
  early_discount:       number | null
  early_discount_date:  string | null   // ISO date or null
}

/** Minimal worksheet config fields needed for letter generation */
export interface WorksheetForLetter {
  id:                       string | number
  primary_term?:            number | null
  first_term?:              number | null
  first_term_offset?:       number | null
  second_term?:             number | null
  second_term_offset?:      number | null
  third_term?:              number | null
  third_term_offset?:       number | null
  early_discount?:          number | null
  early_discount_date?:     string | null
  mtm_fee?:                 number | null
}

/**
 * Per-property context that personalises the letter body.
 * Fetched from the `renewal_letter_templates` table; falls back to defaults.
 */
export interface LetterContext {
  communityName?: string   // e.g. "Residences at 4225"
  managerName?:   string   // e.g. "Audrey Stone | Community Manager"
  managerPhone?:  string   // e.g. "602.795.2790"
}

/** Minimal renewal item needed for letter generation */
export interface RenewalItemForLetter {
  unit_name?:        string | null
  resident_name?:    string | null
  current_rent:      number
  final_rent?:       number | null
  lease_to_date?:    string | null
  renewal_type?:     string | null
  mtm_rent?:         number | null
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Format an ISO date string as "Dec 01, 2025".
 * Timezone-safe: appends T00:00:00 to prevent UTC offset shift.
 */
export function formatLetterDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

/**
 * Format a number as USD currency, no cents: "$1,352"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// ─── Term Rent Calculator ─────────────────────────────────────────────────────

/**
 * Apply a percentage offset to a base rent amount.
 * Positive offset = higher rent (shorter term), negative = lower rent (longer term).
 * Result is rounded to nearest dollar.
 */
export function applyTermOffset(baseRent: number, offsetPercent: number | null | undefined): number {
  if (!offsetPercent) return baseRent
  return Math.round(baseRent * (1 + offsetPercent / 100))
}

// ─── Row Builder ─────────────────────────────────────────────────────────────

/**
 * Map a RenewalItemForLetter + WorksheetForLetter → RenewalLetterRow.
 *
 * Per-term rents are derived by applying the worksheet's offset percentages
 * to the item's primary (final) rent, matching the XLSX export schema.
 */
export function buildLetterRow(
  item: RenewalItemForLetter,
  worksheet: WorksheetForLetter
): RenewalLetterRow {
  const primaryRent = item.final_rent ?? item.current_rent
  const primaryTerm = worksheet.primary_term ?? 12

  // Handle both flat (item.unit_name) and Supabase join shapes (item.units.unit_name)
  const resolvedUnitName = item.unit_name ?? (item as any).units?.unit_name ?? ''

  const firstTerm   = worksheet.first_term  ?? null
  const secondTerm  = worksheet.second_term ?? null
  const thirdTerm   = worksheet.third_term  ?? null

  const mtmRent = item.renewal_type === 'mtm' && item.mtm_rent
    ? item.mtm_rent
    : item.mtm_rent ?? null

  return {
    worksheet_id:        worksheet.id,
    resident_name:       item.resident_name  ?? '',
    roommate_names:      '',                           // not in DB — left blank
    unit:                resolvedUnitName,
    lease_rent:          item.current_rent,
    lease_to_date:       item.lease_to_date  ?? '',
    primary_term:        primaryTerm,
    primary_rent:        primaryRent,
    first_term:          firstTerm,
    first_term_rent:     firstTerm  !== null ? applyTermOffset(primaryRent, worksheet.first_term_offset)  : null,
    second_term:         secondTerm,
    second_term_rent:    secondTerm !== null ? applyTermOffset(primaryRent, worksheet.second_term_offset) : null,
    third_term:          thirdTerm,
    third_term_rent:     thirdTerm  !== null ? applyTermOffset(primaryRent, worksheet.third_term_offset)  : null,
    mtm_rent:            mtmRent,
    early_discount:      worksheet.early_discount      ?? null,
    early_discount_date: worksheet.early_discount_date ?? null
  }
}

/**
 * Map a full array of items for one worksheet into RenewalLetterRow[].
 * Skips items with no unit_name or resident_name.
 */
export function buildLetterRows(
  items: RenewalItemForLetter[],
  worksheet: WorksheetForLetter
): RenewalLetterRow[] {
  return items
    .filter(item => (item.unit_name || (item as any).units?.unit_name) && item.resident_name)
    .map(item => buildLetterRow(item, worksheet))
}

// ─── HTML Generator ───────────────────────────────────────────────────────────

/**
 * Build the renewal options table rows HTML for a single letter.
 * Each configured term gets one row. MTM always appears last.
 */
function buildOptionsTableRows(row: RenewalLetterRow): string {
  const terms: { months: number; rent: number }[] = [
    { months: row.primary_term,  rent: row.primary_rent }
  ]
  if (row.first_term  !== null && row.first_term_rent  !== null) terms.push({ months: row.first_term,  rent: row.first_term_rent })
  if (row.second_term !== null && row.second_term_rent !== null) terms.push({ months: row.second_term, rent: row.second_term_rent })
  if (row.third_term  !== null && row.third_term_rent  !== null) terms.push({ months: row.third_term,  rent: row.third_term_rent })

  const termRows = terms.map(t => `
    <tr>
      <td class="term-col">${t.months}</td>
      <td class="rent-col">${formatCurrency(t.rent)}</td>
      <td class="accept-col">Initial: ___________</td>
    </tr>`).join('')

  const mtmRow = row.mtm_rent !== null ? `
    <tr>
      <td class="term-col">Month to Month</td>
      <td class="rent-col">${formatCurrency(row.mtm_rent)}</td>
      <td class="accept-col">Initial: ___________</td>
    </tr>` : ''

  return termRows + mtmRow
}

/**
 * Build the early-discount paragraph, or empty string if no discount is configured.
 */
function buildDiscountParagraph(row: RenewalLetterRow): string {
  if (!row.early_discount || !row.early_discount_date) return ''

  // Parse the concession date to find the "next month" for the rebate month label
  const deadlineDate  = new Date(row.early_discount_date + 'T00:00:00')
  const rebateDate    = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth() + 1, 1)
  const rebateMonth   = rebateDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const formattedDate = formatLetterDate(row.early_discount_date)

  return `
    <p>
      If you renew with us by <strong>${formattedDate}</strong>, you will be receiving a
      one-time concession of <strong>${formatCurrency(row.early_discount)}</strong>
      off <strong>${rebateMonth}</strong> rent.
    </p>`
}

/**
 * Build the letterhead block for a single page.
 * letterheadDataUrl: a base64 data URL (preferred for Chrome headless file:// mode)
 *                    OR a public URL — both work when Chrome has network access.
 * If empty, no letterhead is rendered.
 */
function buildLetterheadHtml(letterheadDataUrl: string): string {
  if (!letterheadDataUrl) return ''
  return `
  <div class="letterhead">
    <img src="${letterheadDataUrl}" alt="Property Letterhead" class="letterhead-img"/>
  </div>`
}

/**
 * Render one complete renewal letter as an HTML string.
 * Designed to be printed as a single US Letter page.
 *
 * @param row               - Canonical letter row data
 * @param letterheadDataUrl - Base64 data URL or public URL for the property letterhead.
 *                            Pass empty string to omit the letterhead.
 * @param ctx               - Optional per-property context (community name, manager info).
 */
export function generateSingleLetterHtml(
  row: RenewalLetterRow,
  letterheadDataUrl = '',
  ctx: LetterContext = {}
): string {
  const expiryDate    = formatLetterDate(row.lease_to_date)
  const optionRows    = buildOptionsTableRows(row)
  const discountBlock = buildDiscountParagraph(row)
  const letterhead    = buildLetterheadHtml(letterheadDataUrl)

  const communityName = ctx.communityName || 'our community'
  const managerLine   = [ctx.managerName, ctx.managerPhone].filter(Boolean).join(' | ')

  return `
<div class="letter-page">
  ${letterhead}

  <!-- Header greeting -->
  <p class="greeting">
    Dear ${escapeHtml(row.resident_name)},
    <span class="unit-label">Unit: ${escapeHtml(row.unit)}</span>
  </p>

  <p>
    Congratulations on your anniversary with ${escapeHtml(communityName)}! We value your residency
    and hope you have enjoyed your home. We would love for you to continue calling
    ${escapeHtml(communityName)} your home for another term!
  </p>

  <p>
    Our records indicate that your lease expires on <strong>${expiryDate}</strong>.
    Listed below are your renewal options. Please review and let us know as soon as possible
    which you would prefer. You are currently paying a base rent of
    <strong>${formatCurrency(row.lease_rent)}</strong>.
  </p>

  <!-- Renewal options table -->
  <table class="options-table">
    <thead>
      <tr>
        <th class="term-col">Term in Month</th>
        <th class="rent-col">Rental Offer</th>
        <th class="accept-col">Accepted</th>
      </tr>
    </thead>
    <tbody>
      ${optionRows}
    </tbody>
  </table>

  <p class="notice">
    Your offer does not include additional services such as Pet, Storage, Utilities, etc.
    These will be brought up to current market value upon renewal.
  </p>

  ${discountBlock}

  <!-- Insurance notice -->
  <p class="insurance-header"><strong>***PERSONAL LIABILITY INSURANCE – ALL RESIDENTS***</strong></p>
  <p>
    Upon lease renewal you must provide your updated Declarations page of insurance reflecting
    that you have renewed your insurance with a minimum of $100,000 Personal Liability Insurance.
    Please verify with your provider that
    <em>Insurance Tracking P.O. Box 100513, Florence, SC 29502</em>
    is listed as an "Interested Party."
  </p>

  <p>
    We have enjoyed your residency with us and sincerely hope that you will continue to make
    ${escapeHtml(communityName)} your home.
  </p>

  <p class="signature">
    Sincerely,<br/>
    <strong>${managerLine ? escapeHtml(managerLine) : 'Community Management Team'}</strong>
  </p>

  <hr class="tear-line"/>

  <!-- Tear-off response section -->
  <p><em>Once you have made your decision to renew, please return this form to the front office.</em></p>

  <p>
    _________ <strong>Yes!</strong> I will renew my lease for another
    <strong>${row.primary_term} months</strong> and will provide updated Personal Liability
    Insurance for $100,000 prior to my lease end date.
  </p>
  <p>
    _________ I will renew my Lease on <strong>Month-to-Month</strong> basis and will provide
    updated Personal Liability Insurance for $100,000 prior to my lease end date.
  </p>
  <p>
    _________ I will <strong>not</strong> be renewing my lease. I understand that a 60-day
    written notice is required prior to vacating my home, and I know this is NOT considered
    a Written Notice to Vacate.
  </p>

  <p class="resident-signature">
    _____________________________________ &nbsp;&nbsp; ___________________<br/>
    Resident Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date
  </p>
</div>`
}

/**
 * Wrap all letter pages in a complete, self-contained HTML document
 * ready for Chrome headless PDF rendering.
 *
 * @param rows              - All letter rows to render (one page each)
 * @param letterheadDataUrl - Base64 data URL for the property letterhead image.
 *                            Pass empty string if no letterhead is available yet.
 * @param ctx               - Optional per-property context (community name, manager info).
 */
export function generateRenewalLettersHtml(
  rows: RenewalLetterRow[],
  letterheadDataUrl = '',
  ctx: LetterContext = {}
): string {
  const pages = rows.map(row => generateSingleLetterHtml(row, letterheadDataUrl, ctx)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Renewal Offer Letters</title>
  <style>
    @page {
      size: letter;
      margin: 0.75in 0.85in;
    }

    * { box-sizing: border-box; }

    body {
      font-family: Calibri, Arial, sans-serif;
      font-size: 10pt;
      color: #111;
      margin: 0;
      padding: 0;
    }

    /* Each letter occupies its own printed page */
    .letter-page {
      page-break-after: always;
      padding-bottom: 0;
    }
    .letter-page:last-child {
      page-break-after: avoid;
    }

    /* Letterhead — centered at the top of each page */
    .letterhead {
      text-align: center;
      margin-bottom: 14pt;
    }
    .letterhead-img {
      max-height: 90pt;   /* 50% larger than original 60pt */
      max-width: 100%;
      object-fit: contain;
    }

    .greeting {
      display: flex;
      justify-content: space-between;
      font-size: 10.5pt;
      margin-bottom: 6pt;
    }
    .unit-label {
      font-weight: bold;
    }

    p {
      margin: 0 0 8pt 0;
      line-height: 1.4;
    }

    /* Options table */
    .options-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      font-size: 10pt;
    }
    .options-table th {
      background: #f0f0f0;
      border: 1px solid #ccc;
      padding: 4pt 6pt;
      text-align: center;
      font-weight: bold;
    }
    .options-table td {
      border: 1px solid #ccc;
      padding: 4pt 6pt;
      text-align: center;
    }
    .term-col  { width: 30%; }
    .rent-col  { width: 25%; }
    .accept-col { width: 45%; text-align: left; }

    .notice {
      font-style: italic;
      font-size: 9pt;
    }

    .insurance-header {
      margin-top: 10pt;
      text-align: center;
    }

    .signature {
      margin-top: 10pt;
    }

    .tear-line {
      border: none;
      border-top: 1px dashed #555;
      margin: 14pt 0;
    }

    .resident-signature {
      margin-top: 16pt;
      font-size: 9.5pt;
    }
  </style>
</head>
<body>
${pages}
</body>
</html>`
}

// ─── Escape helper ────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
