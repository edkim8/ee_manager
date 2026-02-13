
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPersistence() {
  console.log('--- Testing Config Persistence ---')

  // 1. Create a temporary worksheet
  const { data: worksheet, error: createError } = await supabase
    .from('renewal_worksheets')
    .insert({
      name: 'Debug Persistence Test',
      property_code: 'US-SEA-QV', // Assuming this exists, or use a known valid one
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      status: 'draft',
      ltl_percent: 25,
      max_rent_increase_percent: 5,
      mtm_fee: 300
    })
    .select()
    .single()

  if (createError) {
    console.error('Create error:', createError)
    return
  }
  console.log('1. Created worksheet:', worksheet.id)
  console.log('   Initial values:', { ltl: worksheet.ltl_percent, max: worksheet.max_rent_increase_percent })

  // 2. Update to 0
  console.log('2. Updating ltl_percent and max_rent_increase_percent to 0...')
  const { error: updateError } = await supabase
    .from('renewal_worksheets')
    .update({
      ltl_percent: 0,
      max_rent_increase_percent: 0
    })
    .eq('id', worksheet.id)

  if (updateError) {
    console.error('Update error:', updateError)
  } else {
    console.log('   Update successful.')
  }

  // 3. Fetch back
  console.log('3. Fetching worksheet back...')
  const { data: fetched, error: fetchError } = await supabase
    .from('renewal_worksheets')
    .select('*')
    .eq('id', worksheet.id)
    .single()

  if (fetchError) {
    console.error('Fetch error:', fetchError)
  } else {
    console.log('   Fetched values:', { ltl: fetched.ltl_percent, max: fetched.max_rent_increase_percent })
    
    if (fetched.ltl_percent === 0 && fetched.max_rent_increase_percent === 0) {
      console.log('SUCCESS: Database persisted 0 values correctly.')
    } else {
      console.log('FAILURE: Database did NOT persist 0 values.')
      console.log('   (They might be null or default)')
    }
  }

  // 4. Cleanup
  console.log('4. Cleaning up...')
  await supabase.from('renewal_worksheets').delete().eq('id', worksheet.id)
}

testPersistence()
