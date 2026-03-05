/**
 * GET /api/renewal-templates
 *
 * Returns all renewal_letter_templates rows the user has access to.
 * Page-level access is enforced by the renewal-templates middleware.
 * This route only verifies authentication.
 */

import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('renewal_letter_templates')
    .select('*')
    .order('property_code')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
