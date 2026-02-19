import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { Database } from '../../../../types/supabase'

export default defineEventHandler(async (event) => {
  const cookies = parseCookies(event)
  console.log('[API /api/me] Cookies received:', Object.keys(cookies))

  const user = await serverSupabaseUser(event)
  
  // LOG: See what we are getting from the session
  console.log('[API /api/me] Raw Auth User:', user ? JSON.stringify(user) : 'NULL')

  let userId = user?.id
  const userEmail = user?.email

  if (!userEmail) {
    console.error('[API /api/me] REJECTED: No email found in session')
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No email found'
    })
  }

  const client = serverSupabaseServiceRole<Database>(event)

  try {
    // 1. Fetch Profile - Try ID first, then Email
    let profile: any = null
    let profileError: any = null

    if (userId && userId !== 'undefined') {
      const { data, error } = await client
        .from('profiles')
        .select('*, full_name:profiles_full_name')
        .eq('id', userId)
        .maybeSingle()
      profile = data
      profileError = error
    }

    if (!profile && userEmail) {
      console.log('[API /api/me] ID lookup failed, trying email lookup for:', userEmail)
      const { data, error } = await client
        .from('profiles')
        .select('*, full_name:profiles_full_name')
        .eq('email', userEmail)
        .maybeSingle()
      profile = data
      profileError = error
      if (profile) {
        userId = profile.id
        console.log('[API /api/me] Recovered userId from email:', userId)
      }
    }

    if (profileError) {
      console.error('[API /api/me] Profile fetch error:', profileError)
    }

    if (!userId) {
      console.error('[API /api/me] REJECTED: Could not determine userId after email fallback')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - User not found in profiles'
      })
    }

    // 2. Fetch All Properties from DB
    const { data: dbProperties, error: dbError } = await client
      .from('properties')
      .select('id, code, name')
      .order('code')

    if (dbError) {
      console.error('[API /api/me] DB Properties fetch error:', dbError)
    }

    // Use DB properties if available, otherwise fallback to constants
    const allProperties = (dbProperties && dbProperties.length > 0) 
      ? dbProperties 
      : [{ id: 'SB', code: 'SB', name: 'Stonebridge' }, 
         { id: 'RS', code: 'RS', name: 'Residences' },
         { id: 'OB', code: 'OB', name: 'Ocean Breeze' },
         { id: 'CV', code: 'CV', name: 'City View' },
         { id: 'WO', code: 'WO', name: 'Whispering Oaks' }]

    console.log(`[API /api/me] Total properties found (DB + fallback): ${allProperties.length}`)

    // 3. Fetch Access & Roles
    const propertyRoles: Record<string, string> = {}
    const isSuperAdmin = !!(profile as any)?.is_super_admin

    if (isSuperAdmin) {
      console.log('[API /api/me] AUTH: Super Admin access detected')
      allProperties.forEach((p: any) => propertyRoles[p.code] = 'Owner')
    } else {
      console.log('[API /api/me] AUTH: Regular user access check')
      const { data: accessData, error: accessError } = await client
        .from('user_property_access' as any)
        .select('property_code, role')
        .eq('user_id', userId)
      
      if (accessError) {
        console.error('[API /api/me] Access fetch error:', accessError)
      }
      
      (accessData || []).forEach((a: any) => {
        propertyRoles[a.property_code] = a.role || 'Staff'
      })
    }

    console.log('[API /api/me] Final property roles:', propertyRoles)

    return {
      user: {
        id: userId,
        email: user?.email,
        profile: profile || null
      },
      access: {
        is_super_admin: isSuperAdmin,
        property_roles: propertyRoles
      },
      properties: allProperties
    }
  } catch (error: any) {
    console.error('[API /api/me] Critical error:', error)
    throw createError({
      statusCode: 500,
      message: 'Internal Server Error'
    })
  }
})
