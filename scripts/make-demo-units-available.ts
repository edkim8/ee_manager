import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const targetUnits = [
  { property_code: 'SB', unit_name: '1142', rent_offered: 2100 },
  { property_code: 'SB', unit_name: '1160', rent_offered: 3200 },
  { property_code: 'RS', unit_name: '1004', rent_offered: 2400 },
  { property_code: 'RS', unit_name: '1011', rent_offered: 3500 },
];

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  for (const target of targetUnits) {
    console.log(`Processing ${target.property_code} - ${target.unit_name}...`);

    // Get unit_id
    const { data: unitData, error: unitError } = await supabase
      .from('units')
      .select('id')
      .eq('property_code', target.property_code)
      .eq('unit_name', target.unit_name)
      .single();

    if (unitError || !unitData) {
      console.error(`Failed to find unit ${target.property_code} ${target.unit_name}:`, unitError?.message);
      continue;
    }

    const unitId = unitData.id;

    // Optional: deactivate old availabilities for this unit to prevent duplicates
    await supabase
      .from('availabilities')
      .update({ is_active: false })
      .eq('unit_id', unitId)
      .eq('is_active', true);

    // Insert new availability record
    const { error: insertError } = await supabase
      .from('availabilities')
      .insert({
        unit_id: unitId,
        property_code: target.property_code,
        unit_name: target.unit_name,
        status: 'Available',
        available_date: today,
        rent_offered: target.rent_offered,
        is_active: true
      });

    if (insertError) {
      console.error(`Failed to insert availability for ${target.property_code} ${target.unit_name}:`, insertError.message);
    } else {
      console.log(`Successfully created availability record for ${target.property_code} ${target.unit_name}.`);
    }
  }
}

main().catch(console.error);
