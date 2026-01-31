
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('--- Checking ALL Properties ---')
  
  const { data: props, error: propError } = await supabase
    .from('properties')
    .select('id, code, name')
  
  if (propError) console.error(propError)
  
  if (props && props.length > 0) {
      console.log(`Found ${props.length} properties:`)
      props.forEach(p => console.log(` - [${p.code}] ${p.name}`))
  } else {
      console.log('!!! NO PROPERTIES FOUND IN DATABASE !!!')
  }

  console.log('\n--- Checking Units for WO (Whispering Oaks) ---')
  // Users said WO has 92 units. Let's see.
  const { count, error: countError } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('property_code', 'WO')
    
  console.log(`WO Unit Count: ${count} (Error: ${countError?.message || 'None'})`)

  console.log('\n--- Checking Units for RS (Residences) ---')
  const { count: rsCount } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('property_code', 'RS')
  console.log(`RS Unit Count: ${rsCount}`)
}

main()
