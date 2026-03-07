import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/solver/update-tenancy-status
 *
 * Transitions silently-dropped tenancies to their terminal status using service_role,
 * bypassing the RLS gap that silently blocks authenticated-JWT status updates on tenancies.
 *
 * Body:
 *   toPastIds:     string[]  — tenancy IDs to transition → Past
 *   toCanceledIds: string[]  — tenancy IDs to transition → Canceled
 *   propertyCode:  string    — used only for logging
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { toPastIds = [], toCanceledIds = [], propertyCode = 'UNKNOWN' } = body

  if (!Array.isArray(toPastIds) || !Array.isArray(toCanceledIds)) {
    throw createError({ statusCode: 400, statusMessage: 'toPastIds and toCanceledIds must be arrays' })
  }

  const client = serverSupabaseServiceRole(event)
  const results: { past: number; canceled: number; errors: string[] } = { past: 0, canceled: 0, errors: [] }

  // Transition Current/Notice → Past
  if (toPastIds.length > 0) {
    for (let i = 0; i < toPastIds.length; i += 1000) {
      const chunk = toPastIds.slice(i, i + 1000)
      const { data, error } = await client
        .from('tenancies')
        .update({ status: 'Past' })
        .in('id', chunk)
        .select('id')
      if (error) {
        console.error(`[API solver/update-tenancy-status] ${propertyCode}: Past transition error:`, error)
        results.errors.push(`Past error: ${error.message}`)
      } else {
        const count = data?.length ?? 0
        if (count === 0) {
          console.warn(`[API solver/update-tenancy-status] ${propertyCode}: Past update returned 0 rows for chunk of ${chunk.length} IDs — RLS or ID mismatch`)
        }
        results.past += count
      }
    }
  }

  // Transition Applicant/Future → Canceled
  if (toCanceledIds.length > 0) {
    for (let i = 0; i < toCanceledIds.length; i += 1000) {
      const chunk = toCanceledIds.slice(i, i + 1000)
      const { data, error } = await client
        .from('tenancies')
        .update({ status: 'Canceled' })
        .in('id', chunk)
        .select('id')
      if (error) {
        console.error(`[API solver/update-tenancy-status] ${propertyCode}: Canceled transition error:`, error)
        results.errors.push(`Canceled error: ${error.message}`)
      } else {
        const count = data?.length ?? 0
        if (count === 0) {
          console.warn(`[API solver/update-tenancy-status] ${propertyCode}: Canceled update returned 0 rows for chunk of ${chunk.length} IDs — RLS or ID mismatch`)
        }
        results.canceled += count
      }
    }
  }

  console.log(`[API solver/update-tenancy-status] ${propertyCode}: →Past ${results.past}, →Canceled ${results.canceled}`)

  return results
})
