import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * GET /api/owners/distribution-statements?entity_id=xxx
 *
 * Returns the full distribution history for a single recipient entity,
 * with each line item enriched by its parent event's metadata.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { entity_id } = getQuery(event) as { entity_id?: string }
  if (!entity_id) throw createError({ statusCode: 400, statusMessage: 'entity_id is required' })

  const client = serverSupabaseServiceRole(event)

  const { data: items, error } = await client
    .from('distribution_line_items' as any)
    .select('*')
    .eq('owner_entity_id', entity_id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!items?.length) return { entity_name: null, profile_id: null, profile_name: null, profile_email: null, items: [], totals: { gross: 0, withheld: 0, net: 0, count: 0 } }

  // Enrich with event metadata
  const eventIds = [...new Set((items as any[]).map((i: any) => i.event_id))]
  const { data: eventsData } = await client
    .from('distribution_events' as any)
    .select('id, title, distribution_date, type, status, total_amount, property_id, source_entity_id, entity_level')
    .in('id', eventIds)

  // Property names
  const propertyIds = [...new Set((eventsData || []).map((e: any) => e.property_id).filter(Boolean))]
  const { data: properties } = propertyIds.length
    ? await client.from('properties' as any).select('id, code, name').in('id', propertyIds)
    : { data: [] }
  const propMap = new Map((properties || []).map((p: any) => [p.id, { code: p.code, name: p.name }]))

  // Source entity names (for entity distributions)
  const srcEntityIds = [...new Set((eventsData || []).map((e: any) => e.source_entity_id).filter(Boolean))]
  const { data: srcEntities } = srcEntityIds.length
    ? await client.from('ownership_entities' as any).select('id, name').in('id', srcEntityIds)
    : { data: [] }
  const srcEntityMap = new Map((srcEntities || []).map((e: any) => [e.id, e.name as string]))

  const eventMap = new Map((eventsData || []).map((e: any) => [e.id, e]))

  const enrichedItems = ((items as any[]).map((i: any) => {
    const evt  = eventMap.get(i.event_id) || {}
    const prop = propMap.get(evt.property_id)
    return {
      ...i,
      event_title:         evt.title            || '—',
      distribution_date:   evt.distribution_date || '',
      event_type:          evt.type             || null,
      event_status:        evt.status           || '',
      event_total_amount:  evt.total_amount     || 0,
      entity_level:        evt.entity_level     || false,
      property_code:       prop?.code           || null,
      property_name:       prop?.name           || null,
      source_entity_name:  srcEntityMap.get(evt.source_entity_id) || null,
    }
  })).sort((a: any, b: any) => b.distribution_date.localeCompare(a.distribution_date))

  // Get profile info from the first item
  const profileId = (items as any[])[0]?.profile_id || null
  let profileName  = null
  let profileEmail = null
  if (profileId) {
    const { data: prof } = await client
      .from('profiles' as any)
      .select('first_name, last_name, email')
      .eq('id', profileId)
      .single()
    if (prof) {
      profileName  = [prof.first_name, prof.last_name].filter(Boolean).join(' ') || prof.email
      profileEmail = prof.email
    }
  }

  const totals = {
    gross:    enrichedItems.reduce((s: number, i: any) => s + Number(i.gross_amount),    0),
    withheld: enrichedItems.reduce((s: number, i: any) => s + Number(i.withhold_amount), 0),
    net:      enrichedItems.reduce((s: number, i: any) => s + Number(i.net_amount),      0),
    count:    enrichedItems.length,
  }

  return {
    entity_name:   (items as any[])[0]?.owner_name || null,
    profile_id:    profileId,
    profile_name:  profileName,
    profile_email: profileEmail,
    items:         enrichedItems,
    totals,
  }
})
