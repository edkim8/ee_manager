
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Get latest batch for Residents Status
  const { data: batches, error } = await supabase
    .from('import_staging')
    .select('*')
    .eq('report_type', 'residents_status')
    .eq('property_code', 'RS')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching batch:', error)
    return
  }

  if (!batches || batches.length === 0) {
    console.log('No recent RS batches found.')
    return
  }

  const batch = batches[0]
  console.log(`Inspecting Batch ID: ${batch.batch_id}`)
  console.log(`Property: ${batch.property_code} (Report: ${batch.report_type})`)

  const rawData = batch.raw_data as any[]
  
  if (!Array.isArray(rawData)) {
      console.log("Raw data is not an array.")
      return
  }

  console.log(`Total Rows Parsed: ${rawData.length}`)

  // Filter for specific units
  const targetUnits = ['1025', '1026', '1027']
  const found = rawData.filter(r => targetUnits.includes(r.unit_name))

  console.log('\n--- FOUND ROWS ---')
  found.forEach(r => {
      console.log(`\nUnit: ${r.unit_name}`)
      console.log(JSON.stringify(r, null, 2))
  })

  // Check if 1026 is missing
  if (!found.find(r => r.unit_name === '1026')) {
      console.log('\n!!! ALERT: Unit 1026 is MISSING from the parsed data !!!')
      
      // Look around 1025 to see what happened
      const idx = rawData.findIndex(r => r.unit_name === '1025')
      if (idx !== -1) {
          console.log('\n--- Context around 1025 ---')
          console.log(`Row ${idx}: Unit ${rawData[idx].unit_name}`)
          if (rawData[idx+1]) console.log(`Row ${idx+1}: Unit ${rawData[idx+1].unit_name}`)
          if (rawData[idx+2]) console.log(`Row ${idx+2}: Unit ${rawData[idx+2].unit_name}`)
      }
  }
}

main()
