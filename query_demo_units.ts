import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase.from('view_leasing_pipeline').select('*').in('unit_name', ['1142', '1160', '1004', '1011']);
  console.log(JSON.stringify(data, null, 2));
}
check();
