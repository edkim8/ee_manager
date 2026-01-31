
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { CLIENT_UNIT_LOOKUP } from '../layers/base/utils/unit-lookup-data'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('--- Starting Seed Process ---')
  
  const entries = Object.entries(CLIENT_UNIT_LOOKUP)
  console.log(`Found ${entries.length} entries in CLIENT_UNIT_LOOKUP`)

  // 1. Extract Unique Properties
  const propertiesSet = new Set<string>()
  entries.forEach(([key]) => {
      const [pCode] = key.split('_')
      if (pCode) propertiesSet.add(pCode.toUpperCase())
  })
  
  console.log(`Found ${propertiesSet.size} unique properties:`, [...propertiesSet])

  // 2. Insert Properties
  for (const pCode of propertiesSet) {
      const { error } = await supabase
        .from('properties')
        .upsert({ 
            code: pCode, 
            name: `${pCode} Property` // Placeholder name
        }, { onConflict: 'code' })
      
      if (error) console.error(`Error upserting property ${pCode}:`, error.message)
      else console.log(`Upserted Property: ${pCode}`)
  }

  // 3. Insert Units
  console.log('Upserting Units...')
  const unitsToUpsert = entries.map(([key, id]) => {
      const [pCodeRaw, ...rest] = key.split('_')
      const pCode = pCodeRaw.toUpperCase()
      const unitName = rest.join('_').replace(/^c/, '') // Strip 'c' prefix if exists (e.g. cv_c101 -> 101)
      
      // Heuristic: If unit name starts with 'c' or 's' followed by digit, likely a prefix. 
      // But let's look at the data. 
      // cv_c101 -> 101? Or c101? 
      // The snippet showed "cv_c101". The debug log showed "1025". 
      // Let's assume the user wants the EXACT unit name from the key suffix, but cleaned up? 
      // User request said: "RS 1025". Key is "rs_1025". So suffix = unit name.
      
      // Let's just take the suffix part of the key.
      const rawSuffix = key.substring(pCodeRaw.length + 1) // "1025" or "c101"
      
      // The user log showed "1025", "1027". The file has "rs_1025". So suffix is "1025".
      // But CV has "cv_c101". Does that map to unit "c101" or "101"?
      // Let's keep it raw for now to be safe, or just strip 'c'/'s' if it matches user pattern?
      // Wait, the Parser likely parses "101" from file. 
      // Let's just insert as is (rawSuffix) AND normalized if needed?
      // Actually, to capture "RS 1025" -> "rs_1025", we need the unit_name in DB to match "1025".
      
      return {
          id: id,
          property_code: pCode,
          unit_name: rawSuffix, // "1025", "c101" etc.
          status: 'Vacant', // Default
      }
  })

  // Batch insert
  const BATCH_SIZE = 500
  for (let i = 0; i < unitsToUpsert.length; i += BATCH_SIZE) {
      const chunk = unitsToUpsert.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('units').upsert(chunk, { onConflict: 'id' })
      if (error) console.error('Error upserting units chunk:', error.message)
      else console.log(`Upserted batch ${i / BATCH_SIZE + 1}`)
  }
  
  console.log('Seed Complete.')
}

seed()
