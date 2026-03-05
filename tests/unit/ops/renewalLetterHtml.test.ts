import { describe, it, expect } from 'vitest'
import {
  formatLetterDate,
  formatCurrency,
  applyTermOffset,
  buildLetterRow,
  buildLetterRows,
  generateSingleLetterHtml,
  generateRenewalLettersHtml,
  type RenewalItemForLetter,
  type WorksheetForLetter,
  type LetterContext
} from '../../../layers/ops/utils/renewalLetterHtml'
import {
  getPropertyLetterConfig,
  PROPERTY_LETTER_CONFIGS
} from '../../../layers/ops/utils/renewalLetterConfig'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseWorksheet: WorksheetForLetter = {
  id:                    26,
  primary_term:          12,
  first_term:            11,
  first_term_offset:     1.0,       // +1% = shorter term costs more
  second_term:           14,
  second_term_offset:    -1.0,      // -1% = longer term costs less
  third_term:            15,
  third_term_offset:     -1.5,
  early_discount:        400,
  early_discount_date:   '2025-10-13'
}

const baseItem: RenewalItemForLetter = {
  unit_name:     '1017',
  resident_name: 'Paul Gonzales',
  current_rent:  1493,
  final_rent:    1538,
  lease_to_date: '2025-12-31',
  renewal_type:  'standard',
  mtm_rent:      2103
}

// ─── formatLetterDate ─────────────────────────────────────────────────────────

describe('formatLetterDate', () => {
  it('formats an ISO date string as "Mon DD, YYYY"', () => {
    expect(formatLetterDate('2025-12-31')).toBe('Dec 31, 2025')
    expect(formatLetterDate('2025-01-05')).toBe('Jan 05, 2025')
    expect(formatLetterDate('2025-10-13')).toBe('Oct 13, 2025')
  })

  it('returns empty string for null', () => {
    expect(formatLetterDate(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatLetterDate(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatLetterDate('')).toBe('')
  })

  it('is timezone-safe — does not shift date due to UTC offset', () => {
    // A date that would become the previous day if parsed as UTC in US/Pacific
    const result = formatLetterDate('2025-03-01')
    expect(result).toBe('Mar 01, 2025')
  })
})

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats whole dollar amounts without cents', () => {
    expect(formatCurrency(1352)).toBe('$1,352')
    expect(formatCurrency(2103)).toBe('$2,103')
    expect(formatCurrency(400)).toBe('$400')
  })

  it('rounds decimal amounts', () => {
    expect(formatCurrency(1352.99)).toBe('$1,353')
    expect(formatCurrency(1352.1)).toBe('$1,352')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })

  it('handles null as $0', () => {
    expect(formatCurrency(null)).toBe('$0')
  })

  it('handles undefined as $0', () => {
    expect(formatCurrency(undefined)).toBe('$0')
  })

  it('handles large amounts', () => {
    expect(formatCurrency(10000)).toBe('$10,000')
  })
})

// ─── applyTermOffset ──────────────────────────────────────────────────────────

describe('applyTermOffset', () => {
  it('applies a positive offset percentage', () => {
    // 1% of 1538 = 15.38 → rounds to 1553
    expect(applyTermOffset(1538, 1.0)).toBe(1553)
  })

  it('applies a negative offset percentage', () => {
    // -1% of 1538 = -15.38 → rounds to 1523
    expect(applyTermOffset(1538, -1.0)).toBe(1523)
  })

  it('returns base rent when offset is null', () => {
    expect(applyTermOffset(1538, null)).toBe(1538)
  })

  it('returns base rent when offset is undefined', () => {
    expect(applyTermOffset(1538, undefined)).toBe(1538)
  })

  it('returns base rent when offset is 0', () => {
    expect(applyTermOffset(1538, 0)).toBe(1538)
  })

  it('rounds to nearest dollar', () => {
    // 0.5% of 1000 = 5 → 1005
    expect(applyTermOffset(1000, 0.5)).toBe(1005)
    // 0.75% of 1000 = 7.5 → rounds to 1008
    expect(applyTermOffset(1000, 0.75)).toBe(1008)
  })
})

// ─── buildLetterRow ───────────────────────────────────────────────────────────

describe('buildLetterRow', () => {
  it('maps item + worksheet fields to the canonical letter row shape', () => {
    const row = buildLetterRow(baseItem, baseWorksheet)

    expect(row.worksheet_id).toBe(26)
    expect(row.resident_name).toBe('Paul Gonzales')
    expect(row.unit).toBe('1017')
    expect(row.lease_rent).toBe(1493)
    expect(row.lease_to_date).toBe('2025-12-31')
  })

  it('sets primary term from worksheet', () => {
    const row = buildLetterRow(baseItem, baseWorksheet)
    expect(row.primary_term).toBe(12)
    expect(row.primary_rent).toBe(1538)
  })

  it('computes first_term_rent by applying offset to primary_rent', () => {
    const row = buildLetterRow(baseItem, baseWorksheet)
    // +1% of 1538 = 1553.38 → 1553
    expect(row.first_term).toBe(11)
    expect(row.first_term_rent).toBe(1553)
  })

  it('computes second_term_rent by applying offset', () => {
    const row = buildLetterRow(baseItem, baseWorksheet)
    // -1% of 1538 = 1522.62 → 1523
    expect(row.second_term).toBe(14)
    expect(row.second_term_rent).toBe(1523)
  })

  it('computes third_term_rent by applying offset', () => {
    const row = buildLetterRow(baseItem, baseWorksheet)
    // -1.5% of 1538 = 1514.93 → 1515
    expect(row.third_term).toBe(15)
    expect(row.third_term_rent).toBe(1515)
  })

  it('includes mtm_rent', () => {
    const row = buildLetterRow(baseItem, baseWorksheet)
    expect(row.mtm_rent).toBe(2103)
  })

  it('includes early discount info', () => {
    const row = buildLetterRow(baseItem, baseWorksheet)
    expect(row.early_discount).toBe(400)
    expect(row.early_discount_date).toBe('2025-10-13')
  })

  it('falls back to current_rent when final_rent is null', () => {
    const item = { ...baseItem, final_rent: null }
    const row = buildLetterRow(item, baseWorksheet)
    expect(row.primary_rent).toBe(1493)
  })

  it('returns null for optional terms when worksheet has no first_term', () => {
    const ws: WorksheetForLetter = { ...baseWorksheet, first_term: null }
    const row = buildLetterRow(baseItem, ws)
    expect(row.first_term).toBeNull()
    expect(row.first_term_rent).toBeNull()
  })

  it('uses 12 as default primary_term when not set in worksheet', () => {
    const ws: WorksheetForLetter = { ...baseWorksheet, primary_term: null }
    const row = buildLetterRow(baseItem, ws)
    expect(row.primary_term).toBe(12)
  })
})

// ─── buildLetterRows ──────────────────────────────────────────────────────────

describe('buildLetterRows', () => {
  it('converts an array of items to an array of letter rows', () => {
    const items: RenewalItemForLetter[] = [
      baseItem,
      { ...baseItem, unit_name: '1043', resident_name: 'Mikaela Hoppensteadt', current_rent: 1881, final_rent: 1881 }
    ]
    const rows = buildLetterRows(items, baseWorksheet)
    expect(rows).toHaveLength(2)
    expect(rows[0].unit).toBe('1017')
    expect(rows[1].unit).toBe('1043')
  })

  it('filters out items with no unit_name', () => {
    const items: RenewalItemForLetter[] = [
      { ...baseItem, unit_name: null },
      baseItem
    ]
    const rows = buildLetterRows(items, baseWorksheet)
    expect(rows).toHaveLength(1)
  })

  it('filters out items with no resident_name', () => {
    const items: RenewalItemForLetter[] = [
      { ...baseItem, resident_name: null },
      baseItem
    ]
    const rows = buildLetterRows(items, baseWorksheet)
    expect(rows).toHaveLength(1)
  })

  it('returns empty array for empty input', () => {
    expect(buildLetterRows([], baseWorksheet)).toEqual([])
  })
})

// ─── generateSingleLetterHtml ─────────────────────────────────────────────────

describe('generateSingleLetterHtml', () => {
  const row = buildLetterRow(baseItem, baseWorksheet)

  it('renders resident name', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('Paul Gonzales')
  })

  it('renders unit number', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('1017')
  })

  it('renders lease expiry date in MMM DD, YYYY format', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('Dec 31, 2025')
  })

  it('renders current rent in currency format', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('$1,493')
  })

  it('renders all four term options in the table', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('<td class="term-col">12</td>')
    expect(html).toContain('<td class="term-col">11</td>')
    expect(html).toContain('<td class="term-col">14</td>')
    expect(html).toContain('<td class="term-col">15</td>')
  })

  it('renders MTM row', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('Month to Month')
    expect(html).toContain('$2,103')
  })

  it('renders primary term rent correctly', () => {
    const html = generateSingleLetterHtml(row)
    // primary rent = 1538
    expect(html).toContain('$1,538')
  })

  it('renders early discount when configured', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('$400')
    expect(html).toContain('Oct 13, 2025')
  })

  it('omits discount block when early_discount is null', () => {
    const rowNoDiscount = buildLetterRow(baseItem, {
      ...baseWorksheet,
      early_discount: null,
      early_discount_date: null
    })
    const html = generateSingleLetterHtml(rowNoDiscount)
    expect(html).not.toContain('one-time concession')
  })

  it('wraps output in a letter-page div', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('class="letter-page"')
  })

  it('includes personal liability insurance notice', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).toContain('PERSONAL LIABILITY INSURANCE')
  })

  it('escapes HTML special characters in resident name', () => {
    const dangerRow = buildLetterRow(
      { ...baseItem, resident_name: 'O\'Brien <Test> & Sons' },
      baseWorksheet
    )
    const html = generateSingleLetterHtml(dangerRow)
    expect(html).not.toContain('<Test>')
    expect(html).toContain('&lt;Test&gt;')
    expect(html).toContain('&amp;')
  })
})

// ─── Letterhead rendering ─────────────────────────────────────────────────────

describe('letterhead rendering', () => {
  const row = buildLetterRow(baseItem, baseWorksheet)
  const fakeDataUrl = 'data:image/jpeg;base64,/9j/fakebase64=='

  it('renders letterhead img when data URL is provided', () => {
    const html = generateSingleLetterHtml(row, fakeDataUrl)
    expect(html).toContain('class="letterhead"')
    expect(html).toContain(`src="${fakeDataUrl}"`)
    expect(html).toContain('class="letterhead-img"')
  })

  it('omits letterhead block when data URL is empty string', () => {
    const html = generateSingleLetterHtml(row, '')
    expect(html).not.toContain('class="letterhead"')
    expect(html).not.toContain('letterhead-img')
  })

  it('omits letterhead when data URL is omitted (default param)', () => {
    const html = generateSingleLetterHtml(row)
    expect(html).not.toContain('class="letterhead"')
  })

  it('passes letterhead to every page in generateRenewalLettersHtml', () => {
    const rows = buildLetterRows(
      [baseItem, { ...baseItem, unit_name: '2001', resident_name: 'Jane Doe' }],
      baseWorksheet
    )
    const html  = generateRenewalLettersHtml(rows, fakeDataUrl)
    const count = (html.match(/class="letterhead"/g) ?? []).length
    expect(count).toBe(2)
  })

  it('includes letterhead CSS in the document', () => {
    const rows = buildLetterRows([baseItem], baseWorksheet)
    const html = generateRenewalLettersHtml(rows, fakeDataUrl)
    expect(html).toContain('.letterhead')
    expect(html).toContain('.letterhead-img')
    expect(html).toContain('text-align: center')
  })
})

// ─── Property letter config ───────────────────────────────────────────────────

describe('getPropertyLetterConfig', () => {
  it('returns correct config for RS', () => {
    const config = getPropertyLetterConfig('RS')
    expect(config.propertyCode).toBe('RS')
    expect(config.propertyName).toBe('Residences at 4225')
    expect(config.letterheadImagePath).toBe('images/letterheads/RS.jpg')
    expect(config.docxTemplateName).toBe('RS_Renewal_Letter_Template.docx')
  })

  it('is case-insensitive', () => {
    expect(getPropertyLetterConfig('rs').propertyCode).toBe('RS')
    expect(getPropertyLetterConfig('Rs').propertyCode).toBe('RS')
  })

  it('returns fallback for unknown property code', () => {
    const config = getPropertyLetterConfig('XX')
    expect(config.propertyCode).toBe('')
    expect(config.docxTemplateName).toBe('Renewal_Letter_Template.docx')
  })

  it('returns fallback for empty string', () => {
    expect(getPropertyLetterConfig('').propertyCode).toBe('')
  })

  it('has configs for all 5 properties', () => {
    expect(Object.keys(PROPERTY_LETTER_CONFIGS)).toEqual(
      expect.arrayContaining(['RS', 'SB', 'OB', 'CV', 'WO'])
    )
  })

  it('each property has a unique docxTemplateName', () => {
    const names  = Object.values(PROPERTY_LETTER_CONFIGS).map(c => c.docxTemplateName)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })
})

// ─── generateRenewalLettersHtml ───────────────────────────────────────────────

describe('generateRenewalLettersHtml', () => {
  it('returns a complete HTML document', () => {
    const rows = buildLetterRows([baseItem], baseWorksheet)
    const html = generateRenewalLettersHtml(rows)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it('includes @page CSS for print sizing', () => {
    const rows = buildLetterRows([baseItem], baseWorksheet)
    const html = generateRenewalLettersHtml(rows)
    expect(html).toContain('@page')
    expect(html).toContain('size: letter')
  })

  it('renders one letter-page per row', () => {
    const items: RenewalItemForLetter[] = [
      baseItem,
      { ...baseItem, unit_name: '1050', resident_name: 'Tate Farris', current_rent: 1578, final_rent: 1578 }
    ]
    const rows = buildLetterRows(items, baseWorksheet)
    const html = generateRenewalLettersHtml(rows)
    const pageCount = (html.match(/class="letter-page"/g) ?? []).length
    expect(pageCount).toBe(2)
  })

  it('returns valid HTML for empty rows array', () => {
    const html = generateRenewalLettersHtml([])
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).not.toContain('class="letter-page"')
  })
})

// ─── Supabase join shape (unit_name nested under units.*) ────────────────────

describe('Supabase join shape — unit_name nested', () => {
  it('buildLetterRow resolves unit name from item.units.unit_name when item.unit_name is absent', () => {
    const rawItem = {
      ...baseItem,
      unit_name: undefined,  // not present at top level (raw DB response)
      units: { unit_name: '1017', floor_plan_id: 'fp-abc' }
    } as any
    const row = buildLetterRow(rawItem, baseWorksheet)
    expect(row.unit).toBe('1017')
  })

  it('buildLetterRows filters correctly for nested shape', () => {
    const rawItems = [
      { ...baseItem, unit_name: undefined, units: { unit_name: '1017', floor_plan_id: 'fp-a' } },
      { ...baseItem, unit_name: undefined, units: { unit_name: '1050', floor_plan_id: 'fp-b' }, resident_name: 'Tate Farris' }
    ] as any[]
    const rows = buildLetterRows(rawItems, baseWorksheet)
    expect(rows).toHaveLength(2)
    expect(rows[0].unit).toBe('1017')
    expect(rows[1].unit).toBe('1050')
  })

  it('prefers flat item.unit_name over nested units.unit_name', () => {
    const item = {
      ...baseItem,
      unit_name: 'FLAT',
      units: { unit_name: 'NESTED', floor_plan_id: 'fp-a' }
    } as any
    const row = buildLetterRow(item, baseWorksheet)
    expect(row.unit).toBe('FLAT')
  })
})

// ─── LetterContext rendering ──────────────────────────────────────────────────

describe('LetterContext rendering', () => {
  const row = buildLetterRow(baseItem, baseWorksheet)
  const ctx: LetterContext = {
    communityName: 'Residences at 4225',
    managerName:   'Audrey Stone | Community Manager',
    managerPhone:  '602.795.2790',
  }

  it('renders custom communityName in the letter body', () => {
    const html = generateSingleLetterHtml(row, '', ctx)
    expect(html).toContain('Residences at 4225')
  })

  it('renders managerName and managerPhone separated by |', () => {
    const html = generateSingleLetterHtml(row, '', ctx)
    expect(html).toContain('Audrey Stone | Community Manager | 602.795.2790')
  })

  it('renders managerName alone when phone is absent', () => {
    const html = generateSingleLetterHtml(row, '', { managerName: 'Jane Doe' })
    expect(html).toContain('Jane Doe')
    expect(html).not.toContain(' | ')
  })

  it('falls back to "our community" when communityName is empty', () => {
    const html = generateSingleLetterHtml(row, '', {})
    expect(html).toContain('our community')
  })

  it('falls back to "Community Management Team" when managerName is absent', () => {
    const html = generateSingleLetterHtml(row, '', {})
    expect(html).toContain('Community Management Team')
  })

  it('escapes HTML in communityName', () => {
    const html = generateSingleLetterHtml(row, '', { communityName: 'Oaks & Pines <Test>' })
    expect(html).toContain('Oaks &amp; Pines &lt;Test&gt;')
    expect(html).not.toContain('<Test>')
  })

  it('passes ctx through generateRenewalLettersHtml to each page', () => {
    const rows = buildLetterRows(
      [baseItem, { ...baseItem, unit_name: '2001', resident_name: 'Jane Doe' }],
      baseWorksheet
    )
    const html  = generateRenewalLettersHtml(rows, '', ctx)
    const count = (html.match(/Residences at 4225/g) ?? []).length
    // Each letter mentions community name at least twice (greeting + closing)
    expect(count).toBeGreaterThanOrEqual(4)
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles worksheet with only primary term (no alt terms)', () => {
    const simpleWorksheet: WorksheetForLetter = {
      id: 1,
      primary_term: 12
    }
    const row = buildLetterRow(baseItem, simpleWorksheet)
    expect(row.first_term).toBeNull()
    expect(row.second_term).toBeNull()
    expect(row.third_term).toBeNull()
    expect(row.early_discount).toBeNull()
    expect(row.mtm_rent).toBe(2103) // from item.mtm_rent
  })

  it('handles item with zero current_rent', () => {
    const row = buildLetterRow({ ...baseItem, current_rent: 0, final_rent: 0 }, baseWorksheet)
    expect(formatCurrency(row.lease_rent)).toBe('$0')
    expect(formatCurrency(row.primary_rent)).toBe('$0')
  })
})
