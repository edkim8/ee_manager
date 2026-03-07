import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  const client = serverSupabaseServiceRole(event)

  const [{ data: evt, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    client
      .from('distribution_events' as any)
      .select('*')
      .eq('id', id)
      .single(),
    client
      .from('distribution_line_items' as any)
      .select('*')
      .eq('event_id', id)
      .order('sort_order', { ascending: true }),
  ])

  if (e1) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  // Enrich with property name (nullable for entity distributions)
  const [{ data: prop }, { data: srcEntity }] = await Promise.all([
    evt.property_id
      ? client.from('properties' as any).select('code, name').eq('id', evt.property_id).single()
      : { data: null },
    evt.source_entity_id
      ? client.from('ownership_entities' as any).select('name').eq('id', evt.source_entity_id).single()
      : { data: null },
  ])

  return {
    ...evt,
    property_code:      prop?.code || null,
    property_name:      prop?.name || null,
    source_entity_name: (srcEntity as any)?.name || null,
    line_items:         items || [],
  }
})
