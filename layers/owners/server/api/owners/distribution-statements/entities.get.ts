import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * GET /api/owners/distribution-statements/entities
 *
 * Returns all unique recipient entities that appear in distribution_line_items,
 * enriched with the associated profile (for routing emails).
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)

  // All line items — only the fields we need for dedup
  const { data: items, error } = await client
    .from('distribution_line_items' as any)
    .select('owner_entity_id, owner_name, profile_id')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Deduplicate by owner_entity_id
  const entityMap = new Map<string, { name: string; profile_id: string | null }>()
  for (const item of (items || []) as any[]) {
    if (item.owner_entity_id && !entityMap.has(item.owner_entity_id)) {
      entityMap.set(item.owner_entity_id, {
        name:       item.owner_name,
        profile_id: item.profile_id || null,
      })
    }
  }

  if (entityMap.size === 0) return []

  // Enrich with profile name + email
  const profileIds = [...new Set([...entityMap.values()].map(v => v.profile_id).filter(Boolean))]
  const { data: profiles } = profileIds.length
    ? await client
        .from('profiles' as any)
        .select('id, first_name, last_name, email')
        .in('id', profileIds)
    : { data: [] }

  const profMap = new Map((profiles || []).map((p: any) => [
    p.id,
    {
      name:  [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '',
      email: p.email || '',
    }
  ]))

  return [...entityMap.entries()]
    .map(([id, { name, profile_id }]) => {
      const prof = profile_id ? profMap.get(profile_id) : null
      return {
        id,
        name,
        profile_id:    profile_id || null,
        profile_name:  prof?.name  || '',
        profile_email: prof?.email || '',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})
