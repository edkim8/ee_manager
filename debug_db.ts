
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugFloorPlans() {
    const { data, error } = await supabase
        .from('floor_plans')
        .select('id, property_code, marketing_name')
        .limit(10)

    if (error) {
        console.error('Error fetching floor plans:', error)
        return
    }

    console.log('Sample Floor Plans:', data)
    
    const { data: props, error: pError } = await supabase
        .from('properties')
        .select('code, name')
    
    console.log('Properties:', props)
}

debugFloorPlans()
