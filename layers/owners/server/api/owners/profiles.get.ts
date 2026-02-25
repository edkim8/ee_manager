import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('profiles')
    .select('id, first_name, last_name, email')
    .order('last_name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return (data || []).map((p: any) => ({
    id:    p.id,
    name:  [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
    email: p.email,
  }))
})
