import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('distributions' as any)
    .select('id, owner_id, property_id, title, amount, distribution_date, type, status, notes, created_at')
    .order('distribution_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = data || []

  // Enrich with entity names
  const ownerIds = [...new Set(rows.map((r: any) => r.owner_id).filter(Boolean))]
  const propertyIds = [...new Set(rows.map((r: any) => r.property_id).filter(Boolean))]

  const [{ data: entities }, { data: properties }] = await Promise.all([
    ownerIds.length
      ? client.from('ownership_entities' as any).select('id, name').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? client.from('properties' as any).select('id, name, code').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
  ])

  const entityMap  = new Map((entities  || []).map((e: any) => [e.id, e.name]))
  const propertyMap = new Map((properties || []).map((p: any) => [p.id, { name: p.name, code: p.code }]))

  return rows.map((r: any) => ({
    ...r,
    owner_name:    entityMap.get(r.owner_id)    || 'Unknown Entity',
    property_name: propertyMap.get(r.property_id)?.name || null,
    property_code: propertyMap.get(r.property_id)?.code || null,
  }))
})
