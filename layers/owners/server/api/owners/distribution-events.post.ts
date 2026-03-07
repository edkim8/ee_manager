import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/owners/distribution-events
 *
 * Two modes controlled by `entity_level` flag:
 *
 * entity_level = false (default — RS, SB, CV, WO):
 *   Property → property entity → personal entity partners (trusts/individuals)
 *   Line items: one per personal entity (trust/individual)
 *   Effective % = (epo × eeo) / 100
 *
 * entity_level = true (OB monthly):
 *   Property → property entities directly (SBLP, CLL-Southborder)
 *   Line items: one per property entity
 *   Effective % = epo (single level)
 *   SBLP then does a separate quarterly rollup to its own partners.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { property_id, title, distribution_date, total_amount, type, notes, entity_level } = body

  if (!property_id)       throw createError({ statusCode: 400, statusMessage: 'property_id is required' })
  if (!title?.trim())     throw createError({ statusCode: 400, statusMessage: 'title is required' })
  if (!distribution_date) throw createError({ statusCode: 400, statusMessage: 'distribution_date is required' })
  if (!total_amount || Number(total_amount) <= 0) throw createError({ statusCode: 400, statusMessage: 'total_amount must be greater than 0' })

  const client   = serverSupabaseServiceRole(event)
  const totalAmt = Number(total_amount)
  const isEntityLevel = !!entity_level

  // ── Step 1: Property entities for this property ───────────────────────────
  const { data: propOwnership, error: e1 } = await client
    .from('entity_property_ownership' as any)
    .select('entity_id, equity_pct')
    .eq('property_id', property_id)

  if (e1) throw createError({ statusCode: 500, statusMessage: e1.message })
  if (!propOwnership?.length) throw createError({ statusCode: 422, statusMessage: 'No property entities found for this property. Set up Property Ownership first.' })

  const propEntityIds = propOwnership.map((r: any) => r.entity_id)

  // ── Step 2: Entity names + GL from ownership_entities ─────────────────────
  const { data: entityRows, error: e2 } = await client
    .from('ownership_entities' as any)
    .select('id, name, distribution_gl')
    .in('id', propEntityIds)

  if (e2) throw createError({ statusCode: 500, statusMessage: e2.message })

  const entityNameMap = new Map((entityRows || []).map((e: any) => [e.id, e.name as string]))
  const entityGLMap   = new Map((entityRows || []).map((e: any) => [e.id, e.distribution_gl as string | null]))

  // ── Step 3: Create the event ──────────────────────────────────────────────
  const { data: newEvent, error: e3 } = await client
    .from('distribution_events' as any)
    .insert({
      property_id,
      title:             title.trim(),
      distribution_date,
      total_amount:      totalAmt,
      type:              type || null,
      status:            'Draft',
      notes:             notes || null,
      entity_level:      isEntityLevel,
      created_by:        user.id,
    })
    .select('id')
    .single()

  if (e3 || !newEvent) throw createError({ statusCode: 500, statusMessage: e3?.message || 'Failed to create event' })

  const eventId = newEvent.id
  const lineItems: any[] = []

  if (isEntityLevel) {
    // ── Entity-level: one line item per property entity (SBLP, CLL-Southborder) ──
    for (const epo of propOwnership as any[]) {
      const equityPct   = Number(epo.equity_pct)
      const grossAmount = Math.round(totalAmt * equityPct / 100 * 100) / 100

      lineItems.push({
        event_id:           eventId,
        profile_id:         null,
        owner_entity_id:    epo.entity_id,
        owner_name:         entityNameMap.get(epo.entity_id) || 'Unknown Entity',
        equity_pct:         equityPct,
        gross_amount:       grossAmount,
        withhold_pct:       0,
        withhold_amount:    0,
        net_amount:         grossAmount,
        distribution_gl:    entityGLMap.get(epo.entity_id) || null,
        transfer_confirmed: false,
      })
    }

    lineItems.sort((a, b) => b.equity_pct - a.equity_pct)
    lineItems.forEach((li, i) => { li.sort_order = i })

  } else {
    // ── Partner-level: traverse entity_entity_ownership to personal entities ──
    const { data: entityOwnership, error: e4 } = await client
      .from('entity_entity_ownership' as any)
      .select('owner_entity_id, owned_entity_id, equity_pct, withhold_pct')
      .in('owned_entity_id', propEntityIds)

    if (e4) throw createError({ statusCode: 500, statusMessage: e4.message })
    if (!entityOwnership?.length) throw createError({ statusCode: 422, statusMessage: 'No personal entities found in the ownership chain. Set up Entity Interests first.' })

    const personalEntityIds = [...new Set((entityOwnership as any[]).map((r: any) => r.owner_entity_id))]

    const { data: personalEntities, error: e5 } = await client
      .from('ownership_entities' as any)
      .select('id, name, distribution_gl')
      .in('id', personalEntityIds)

    if (e5) throw createError({ statusCode: 500, statusMessage: e5.message })

    const personalNameMap = new Map((personalEntities || []).map((e: any) => [e.id, e.name as string]))
    const personalGLMap   = new Map((personalEntities || []).map((e: any) => [e.id, e.distribution_gl as string | null]))

    const { data: ownerMappings, error: e6 } = await client
      .from('owner_profile_mapping' as any)
      .select('profile_id, owner_id')
      .in('owner_id', personalEntityIds)

    if (e6) throw createError({ statusCode: 500, statusMessage: e6.message })

    const profileMap = new Map<string, string>()
    for (const m of (ownerMappings || []) as any[]) {
      if (!profileMap.has(m.owner_id)) profileMap.set(m.owner_id, m.profile_id)
    }

    const propEntityEquityMap = new Map((propOwnership as any[]).map((r: any) => [r.entity_id, Number(r.equity_pct)]))

    for (const eeLink of entityOwnership as any[]) {
      const epoEquity   = propEntityEquityMap.get(eeLink.owned_entity_id) ?? 0
      const eeoEquity   = Number(eeLink.equity_pct)
      const withholdPct = Number(eeLink.withhold_pct) || 0

      const effectivePct = (epoEquity * eeoEquity) / 100
      const grossAmount  = Math.round(totalAmt * effectivePct / 100 * 100) / 100
      const withholdAmt  = Math.round(grossAmount * withholdPct / 100 * 100) / 100
      const netAmount    = Math.round((grossAmount - withholdAmt) * 100) / 100

      lineItems.push({
        event_id:           eventId,
        profile_id:         profileMap.get(eeLink.owner_entity_id) || null,
        owner_entity_id:    eeLink.owner_entity_id,
        owner_name:         personalNameMap.get(eeLink.owner_entity_id) || 'Unknown Entity',
        equity_pct:         effectivePct,
        gross_amount:       grossAmount,
        withhold_pct:       withholdPct,
        withhold_amount:    withholdAmt,
        net_amount:         netAmount,
        distribution_gl:    personalGLMap.get(eeLink.owner_entity_id) || null,
        transfer_confirmed: false,
      })
    }

    lineItems.sort((a, b) => b.equity_pct - a.equity_pct)
    lineItems.forEach((li, i) => { li.sort_order = i })
  }

  const { error: e7 } = await client
    .from('distribution_line_items' as any)
    .insert(lineItems)

  if (e7) {
    await client.from('distribution_events' as any).delete().eq('id', eventId)
    throw createError({ statusCode: 500, statusMessage: `Failed to generate line items: ${e7.message}` })
  }

  return { id: eventId, line_item_count: lineItems.length }
})
