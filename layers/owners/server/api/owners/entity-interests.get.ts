import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('entity_entity_ownership' as any)
    .select('id, owner_entity_id, owned_entity_id, equity_pct, notes, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Enrich with entity names and types (two lookups on same table)
  const allEntityIds = [
    ...new Set([
      ...(data || []).map((r: any) => r.owner_entity_id),
      ...(data || []).map((r: any) => r.owned_entity_id),
    ])
  ]

  const { data: entities } = await client
    .from('ownership_entities' as any)
    .select('id, name, entity_type')
    .in('id', allEntityIds.length ? allEntityIds : ['00000000-0000-0000-0000-000000000000'])

  const entityMap = new Map((entities || []).map((e: any) => [e.id, { name: e.name, entity_type: e.entity_type }]))

  return (data || []).map((r: any) => ({
    ...r,
    owner_entity_name: entityMap.get(r.owner_entity_id)?.name        || 'Unknown Entity',
    owner_entity_type: entityMap.get(r.owner_entity_id)?.entity_type || null,
    owned_entity_name: entityMap.get(r.owned_entity_id)?.name        || 'Unknown Entity',
    owned_entity_type: entityMap.get(r.owned_entity_id)?.entity_type || null,
  }))
})
