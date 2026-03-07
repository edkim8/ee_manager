import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  const client = serverSupabaseServiceRole(event)

  const patch: Record<string, any> = {}
  if (body.transfer_confirmed !== undefined) patch.transfer_confirmed = body.transfer_confirmed
  if (body.transfer_date      !== undefined) patch.transfer_date      = body.transfer_date || null
  if (body.transfer_notes     !== undefined) patch.transfer_notes     = body.transfer_notes || null

  const { data: updated, error } = await client
    .from('distribution_line_items' as any)
    .update(patch)
    .eq('id', id)
    .select('event_id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Auto-update event status based on confirmed count
  const eventId = updated.event_id
  const { data: allItems } = await client
    .from('distribution_line_items' as any)
    .select('transfer_confirmed')
    .eq('event_id', eventId)

  if (allItems?.length) {
    const confirmedCount = (allItems as any[]).filter((i) => i.transfer_confirmed).length
    const total = allItems.length
    const newStatus = confirmedCount === 0 ? 'Draft'
      : confirmedCount === total ? 'Complete'
      : 'Processing'

    await client
      .from('distribution_events' as any)
      .update({ status: newStatus })
      .eq('id', eventId)
  }

  return { success: true }
})
