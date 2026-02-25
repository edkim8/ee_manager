import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('entity_property_ownership' as any)
    .select(`
      id,
      equity_pct,
      notes,
      created_at,
      updated_at,
      entity_id,
      property_id
    `)
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Enrich with entity and property names
  const entityIds   = [...new Set((data || []).map((r: any) => r.entity_id))]
  const propertyIds = [...new Set((data || []).map((r: any) => r.property_id))]

  const [{ data: entities }, { data: properties }] = await Promise.all([
    client.from('ownership_entities' as any).select('id, name').in('id', entityIds.length ? entityIds : ['00000000-0000-0000-0000-000000000000']),
    client.from('properties').select('id, code, name').in('id', propertyIds.length ? propertyIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  const entityMap   = new Map((entities   || []).map((e: any) => [e.id, e.name]))
  const propertyMap = new Map((properties || []).map((p: any) => [p.id, { code: p.code, name: p.name }]))

  return (data || []).map((r: any) => ({
    ...r,
    entity_name:    entityMap.get(r.entity_id)   || 'Unknown Entity',
    property_code:  propertyMap.get(r.property_id)?.code || '—',
    property_name:  propertyMap.get(r.property_id)?.name || 'Unknown Property',
  }))
})
