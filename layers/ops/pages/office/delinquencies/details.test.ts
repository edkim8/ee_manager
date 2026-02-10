/**
 * Test: Delinquent Residents View
 *
 * Verifies that view_table_delinquent_residents correctly:
 * 1. Joins delinquencies with residents, units, and buildings
 * 2. Filters only active delinquencies with total_unpaid > 0
 * 3. Includes all necessary fields for the dashboard table
 * 4. Orders by total_unpaid descending
 */

import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

describe('view_table_delinquent_residents', () => {
  it('should fetch delinquent residents with all required fields', async () => {
    const { data, error } = await supabase
      .from('view_table_delinquent_residents')
      .select('*')
      .limit(10)

    expect(error).toBeNull()
    expect(data).toBeDefined()

    if (data && data.length > 0) {
      const record = data[0]

      // Verify core delinquency fields
      expect(record).toHaveProperty('id')
      expect(record).toHaveProperty('property_code')
      expect(record).toHaveProperty('tenancy_id')
      expect(record).toHaveProperty('unit_name')
      expect(record).toHaveProperty('resident')
      expect(record).toHaveProperty('total_unpaid')
      expect(record).toHaveProperty('days_0_30')
      expect(record).toHaveProperty('days_31_60')
      expect(record).toHaveProperty('days_61_90')
      expect(record).toHaveProperty('days_90_plus')
      expect(record).toHaveProperty('balance')
      expect(record).toHaveProperty('created_at')

      // Verify joined fields
      expect(record).toHaveProperty('building_name')
      expect(record).toHaveProperty('building_id')
      expect(record).toHaveProperty('resident_email')
      expect(record).toHaveProperty('tenancy_status')

      // Verify filter conditions
      expect(Number(record.total_unpaid)).toBeGreaterThan(0)
    }
  })

  it('should order results by total_unpaid descending', async () => {
    const { data, error } = await supabase
      .from('view_table_delinquent_residents')
      .select('total_unpaid')
      .limit(5)

    expect(error).toBeNull()

    if (data && data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        expect(Number(data[i].total_unpaid)).toBeGreaterThanOrEqual(
          Number(data[i + 1].total_unpaid)
        )
      }
    }
  })

  it('should filter by property_code correctly', async () => {
    const testPropertyCode = 'CV' // Example property code

    const { data, error } = await supabase
      .from('view_table_delinquent_residents')
      .select('*')
      .eq('property_code', testPropertyCode)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      data.forEach(record => {
        expect(record.property_code).toBe(testPropertyCode)
      })
    }
  })

  it('should include only active delinquencies with debt', async () => {
    const { data, error } = await supabase
      .from('view_table_delinquent_residents')
      .select('total_unpaid')
      .limit(50)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      data.forEach(record => {
        expect(Number(record.total_unpaid)).toBeGreaterThan(0)
      })
    }
  })
})
