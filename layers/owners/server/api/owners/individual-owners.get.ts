import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('owner_profile_mapping')
    .select(`
      profile_id,
      owner_id,
      equity_pct,
      role,
      distribution_gl,
      contribution_gl,
      notes,
      created_at,
      profiles!profile_id(id, first_name, last_name, email),
      ownership_entities!owner_id(id, name, entity_type)
    `)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return (data || []).map((r: any) => ({
    profile_id:      r.profile_id,
    owner_id:        r.owner_id,
    equity_pct:      r.equity_pct,
    role:            r.role,
    distribution_gl: r.distribution_gl,
    contribution_gl: r.contribution_gl,
    notes:           r.notes,
    profile_name:    [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ') || r.profiles?.email || 'Unknown',
    profile_email:   r.profiles?.email || '',
    entity_name:     r.ownership_entities?.name || 'Unknown',
    entity_type:     r.ownership_entities?.entity_type || '',
  }))
})
