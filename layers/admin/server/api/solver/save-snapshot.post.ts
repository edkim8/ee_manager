import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)

  if (!body.property_code || !body.snapshot_date) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: property_code, snapshot_date' })
  }

  const client = serverSupabaseServiceRole(event)

  const { error } = await client
    .from('availability_snapshots')
    .upsert({
      solver_run_id:         body.solver_run_id,
      property_code:         body.property_code,
      snapshot_date:         body.snapshot_date,
      available_count:       body.available_count,
      applied_count:         body.applied_count,
      leased_count:          body.leased_count,
      occupied_count:        body.occupied_count,
      total_active_count:    body.total_active_count,
      total_units:           body.total_units,
      avg_market_rent:       body.avg_market_rent,
      avg_offered_rent:      body.avg_offered_rent,
      avg_contracted_rent:   body.avg_contracted_rent,
      avg_days_on_market:    body.avg_days_on_market,
      avg_concession_days:   body.avg_concession_days,
      avg_concession_amount: body.avg_concession_amount,
      price_changes_count:   body.price_changes_count
    }, { onConflict: 'property_code,snapshot_date', ignoreDuplicates: true })

  if (error) {
    console.error(`[API /api/solver/save-snapshot] Error for ${body.property_code}:`, error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, property_code: body.property_code, snapshot_date: body.snapshot_date }
})
