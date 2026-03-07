import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)

  const { data: events, error } = await client
    .from('distribution_events' as any)
    .select('id, property_id, title, distribution_date, total_amount, type, status, notes, entity_level, source_entity_id, rollup_event_ids, created_at')
    .order('distribution_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = events || []

  // Enrich with property names (property_id is nullable for entity distributions)
  const propertyIds = [...new Set(rows.map((r: any) => r.property_id).filter(Boolean))]
  const { data: properties } = propertyIds.length
    ? await client.from('properties' as any).select('id, code, name').in('id', propertyIds)
    : { data: [] }

  const propMap = new Map((properties || []).map((p: any) => [p.id, { code: p.code, name: p.name }]))

  // Enrich entity distributions with source entity name
  const sourceEntityIds = [...new Set(rows.map((r: any) => r.source_entity_id).filter(Boolean))]
  const { data: sourceEntities } = sourceEntityIds.length
    ? await client.from('ownership_entities' as any).select('id, name').in('id', sourceEntityIds)
    : { data: [] }

  const entityMap = new Map((sourceEntities || []).map((e: any) => [e.id, e.name as string]))

  // Enrich with line item counts
  const eventIds = rows.map((r: any) => r.id)
  const { data: lineItems } = eventIds.length
    ? await client
        .from('distribution_line_items' as any)
        .select('event_id, transfer_confirmed')
        .in('event_id', eventIds)
    : { data: [] }

  const countMap = new Map<string, { total: number; confirmed: number }>()
  for (const li of (lineItems || []) as any[]) {
    const entry = countMap.get(li.event_id) ?? { total: 0, confirmed: 0 }
    entry.total += 1
    if (li.transfer_confirmed) entry.confirmed += 1
    countMap.set(li.event_id, entry)
  }

  return rows.map((r: any) => {
    const isEntityDist = !r.property_id && r.source_entity_id
    return {
      ...r,
      property_code:   isEntityDist ? null : (propMap.get(r.property_id)?.code || '—'),
      property_name:   isEntityDist ? null : (propMap.get(r.property_id)?.name || 'Unknown'),
      source_entity_name: entityMap.get(r.source_entity_id) || null,
      owner_count:     countMap.get(r.id)?.total     ?? 0,
      confirmed_count: countMap.get(r.id)?.confirmed ?? 0,
    }
  })
})
