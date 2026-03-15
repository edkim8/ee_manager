import { describe, it, expect } from 'vitest'
import { getColorCode, isValidHex } from '../../../layers/ops/utils/colorUtils'

describe('isValidHex', () => {
  it('returns true for valid 6-digit hex', () => {
    expect(isValidHex('#F01C1C')).toBe(true)
    expect(isValidHex('#34D399')).toBe(true)
    expect(isValidHex('#60A5FA')).toBe(true)
  })

  it('returns true for 3-digit shorthand hex', () => {
    expect(isValidHex('#FFF')).toBe(true)
    expect(isValidHex('#000')).toBe(true)
  })

  it('returns true for 8-digit hex with alpha', () => {
    expect(isValidHex('#F01C1CFF')).toBe(true)
  })

  it('returns false for color word names (legacy)', () => {
    expect(isValidHex('red')).toBe(false)
    expect(isValidHex('pink')).toBe(false)
    expect(isValidHex('yellow')).toBe(false)
    expect(isValidHex('green')).toBe(false)
    expect(isValidHex('blue')).toBe(false)
  })

  it('returns false for null / undefined / empty', () => {
    expect(isValidHex(null)).toBe(false)
    expect(isValidHex(undefined)).toBe(false)
    expect(isValidHex('')).toBe(false)
  })

  it('returns false for malformed values', () => {
    expect(isValidHex('B91C1C')).toBe(false)   // missing #
    expect(isValidHex('#ZZZZZZ')).toBe(false)   // invalid chars
    expect(isValidHex('#12')).toBe(false)        // too short
  })
})

describe('getColorCode', () => {
  it('returns the hex value when it starts with #', () => {
    expect(getColorCode('#F01C1C', '#000000')).toBe('#F01C1C')
    expect(getColorCode('#F472B6', '#000000')).toBe('#F472B6')
    expect(getColorCode('#34D399', '#000000')).toBe('#34D399')
  })

  it('returns defaultHex for null / undefined / empty', () => {
    expect(getColorCode(null, '#AABBCC')).toBe('#AABBCC')
    expect(getColorCode(undefined, '#AABBCC')).toBe('#AABBCC')
    expect(getColorCode('', '#AABBCC')).toBe('#AABBCC')
  })

  it('returns defaultHex for legacy word-based color names', () => {
    expect(getColorCode('red', '#F01C1C')).toBe('#F01C1C')
    expect(getColorCode('pink', '#F472B6')).toBe('#F472B6')
    expect(getColorCode('yellow', '#FBBF24')).toBe('#FBBF24')
    expect(getColorCode('green', '#34D399')).toBe('#34D399')
    expect(getColorCode('blue', '#60A5FA')).toBe('#60A5FA')
  })

  it('returns defaultHex for any other non-hex string', () => {
    expect(getColorCode('garbage', '#FF0000')).toBe('#FF0000')
    expect(getColorCode('rgb(255,0,0)', '#FF0000')).toBe('#FF0000')
  })

  it('preserves lowercase hex values correctly', () => {
    expect(getColorCode('#b91c1c', '#000000')).toBe('#b91c1c')
  })
})
