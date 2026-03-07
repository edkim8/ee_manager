import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/owners/distribution-events/rollup
 *
 * Creates an independent entity distribution (e.g. quarterly SBLP payout).
 * The amount is specified manually — SBLP may retain some OB receipts for expenses
 * before distributing the remainder to its partners.
 *
 * Body:
 *   source_entity_id  UUID    — the distributing entity (SBLP)
 *   total_amount      number  — the amount being distributed this quarter
 *   title             string
 *   distribution_date date
 *   type              string | null
 *   notes             string | null
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { source_entity_id, total_amount, title, distribution_date, type, notes } = body

  if (!source_entity_id)                                throw createError({ statusCode: 400, statusMessage: 'source_entity_id is required' })
  if (!total_amount || Number(total_amount) <= 0)       throw createError({ statusCode: 400, statusMessage: 'total_amount must be greater than 0' })
  if (!title?.trim())                                   throw createError({ statusCode: 400, statusMessage: 'title is required' })
  if (!distribution_date)                               throw createError({ statusCode: 400, statusMessage: 'distribution_date is required' })

  const client   = serverSupabaseServiceRole(event)
  const totalAmt = Math.round(Number(total_amount) * 100) / 100

  // ── Step 1: Partners of the source entity ─────────────────────────────────
  const { data: partnerLinks, error: e1 } = await client
    .from('entity_entity_ownership' as any)
    .select('owner_entity_id, equity_pct, withhold_pct')
    .eq('owned_entity_id', source_entity_id)

  if (e1) throw createError({ statusCode: 500, statusMessage: e1.message })
  if (!partnerLinks?.length) throw createError({ statusCode: 422, statusMessage: 'No partners found for this entity in Entity Interests.' })

  const partnerEntityIds = (partnerLinks as any[]).map((r: any) => r.owner_entity_id)

  // ── Step 2: Partner entity names and GL codes ─────────────────────────────
  const { data: partnerEntities, error: e2 } = await client
    .from('ownership_entities' as any)
    .select('id, name, distribution_gl')
    .in('id', partnerEntityIds)

  if (e2) throw createError({ statusCode: 500, statusMessage: e2.message })

  const nameMap = new Map((partnerEntities || []).map((e: any) => [e.id, e.name as string]))
  const glMap   = new Map((partnerEntities || []).map((e: any) => [e.id, e.distribution_gl as string | null]))

  // ── Step 3: Profile IDs for RLS ──────────────────────────────────────────
  const { data: ownerMappings } = await client
    .from('owner_profile_mapping' as any)
    .select('profile_id, owner_id')
    .in('owner_id', partnerEntityIds)

  const profileMap = new Map<string, string>()
  for (const m of (ownerMappings || []) as any[]) {
    if (!profileMap.has(m.owner_id)) profileMap.set(m.owner_id, m.profile_id)
  }

  // ── Step 4: Create the event (no property_id — entity-originated) ─────────
  const { data: newEvent, error: e4 } = await client
    .from('distribution_events' as any)
    .insert({
      property_id:      null,
      title:            title.trim(),
      distribution_date,
      total_amount:     totalAmt,
      type:             type || null,
      status:           'Draft',
      notes:            notes || null,
      entity_level:     false,
      source_entity_id,
      rollup_event_ids: [],
      created_by:       user.id,
    })
    .select('id')
    .single()

  if (e4 || !newEvent) throw createError({ statusCode: 500, statusMessage: e4?.message || 'Failed to create event' })

  const eventId = newEvent.id

  // ── Step 5: Build partner line items ─────────────────────────────────────
  const lineItems: any[] = []

  for (const link of partnerLinks as any[]) {
    const equityPct   = Number(link.equity_pct)
    const withholdPct = Number(link.withhold_pct) || 0

    const grossAmount = Math.round(totalAmt * equityPct / 100 * 100) / 100
    const withholdAmt = Math.round(grossAmount * withholdPct / 100 * 100) / 100
    const netAmount   = Math.round((grossAmount - withholdAmt) * 100) / 100

    lineItems.push({
      event_id:           eventId,
      profile_id:         profileMap.get(link.owner_entity_id) || null,
      owner_entity_id:    link.owner_entity_id,
      owner_name:         nameMap.get(link.owner_entity_id) || 'Unknown Entity',
      equity_pct:         equityPct,
      gross_amount:       grossAmount,
      withhold_pct:       withholdPct,
      withhold_amount:    withholdAmt,
      net_amount:         netAmount,
      distribution_gl:    glMap.get(link.owner_entity_id) || null,
      transfer_confirmed: false,
    })
  }

  lineItems.sort((a, b) => b.equity_pct - a.equity_pct)
  lineItems.forEach((li, i) => { li.sort_order = i })

  const { error: e5 } = await client
    .from('distribution_line_items' as any)
    .insert(lineItems)

  if (e5) {
    await client.from('distribution_events' as any).delete().eq('id', eventId)
    throw createError({ statusCode: 500, statusMessage: `Failed to generate line items: ${e5.message}` })
  }

  return { id: eventId, total_amount: totalAmt, line_item_count: lineItems.length }
})
