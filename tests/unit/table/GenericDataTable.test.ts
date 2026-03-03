import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('GenericDataTable CSS Guardrails', () => {
  it('must contain table-layout: fixed and avoid breaking CSS hacks', () => {
    // Read the actual component file
    const filePath = path.resolve(__dirname, '../../../layers/table/components/GenericDataTable.vue')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Extract just the <style> block to avoid matching comments
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/)
    expect(styleMatch, 'GenericDataTable.vue must have a <style> block').not.toBeNull()
    const styleContent = styleMatch![1]

    // 1. MUST HAVE table-layout: fixed
    expect(
      styleContent.includes('table-layout: fixed'),
      'CRITICAL: GenericDataTable must use table-layout: fixed so that <col> widths are respected. If this is changed to auto, the column engine will break across the app.'
    ).toBe(true)

    // 2. MUST NOT HAVE the phantom-cell ::after hack
    expect(
      styleContent.includes('::after') && styleContent.includes('display: table-cell'),
      'CRITICAL: Do not use the ::after { display: table-cell; width: 100% } hack. It breaks the column width engine and causes squished columns.'
    ).toBe(false)

    // 3. MUST NOT HAVE th:last-child { width: auto !important }
    expect(
      styleContent.includes('th:last-child') && styleContent.includes('width: auto'),
      'CRITICAL: Do not force th:last-child to width: auto. Let the Javascript column engine and <col> tags dictate widths.'
    ).toBe(false)
  })
})
