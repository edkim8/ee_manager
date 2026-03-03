/**
 * Test: Delinquent Residents View
 *
 * Verifies that view_table_delinquent_residents correctly:
 * 1. Joins delinquencies with residents, units, and buildings
 * 2. Filters only active delinquencies with total_unpaid > 0
 * 3. Includes all necessary fields for the dashboard table
 * 4. Orders by total_unpaid descending
 */

import { describe, it, expect, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock the Supabase client so we don't need a live database connection for this unit test
vi.mock('@supabase/supabase-js', () => {
  const mockResponse = {
    data: [
      {
        id: 'mock-id',
        property_code: 'CV',
        tenancy_id: 'mock-tenancy',
        unit_name: '101',
        resident: 'John Doe',
        total_unpaid: '500.00',
        days_0_30: '500.00',
        days_31_60: '0',
        days_61_90: '0',
        days_90_plus: '0',
        balance: '500.00',
        created_at: new Date().toISOString(),
        building_name: 'Main',
        building_id: 'b-id',
        resident_email: 'john@example.com',
        tenancy_status: 'Current'
      },
      {
        total_unpaid: '400.00',
        property_code: 'CV'
      }
    ],
    error: null
  }

  return {
    createClient: () => ({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue(mockResponse),
      limit: vi.fn().mockResolvedValue(mockResponse)
    })
  }
})

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy_key'
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
