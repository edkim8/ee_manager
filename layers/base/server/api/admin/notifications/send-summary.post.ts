import nodemailer from 'nodemailer'
import { serverSupabaseServiceRole } from '#supabase/server'
import { Database } from '../../../../../types/supabase'
import { generateHighFidelityHtmlReport } from '../../../../utils/reporting'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { runId } = body

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing runId'
    })
  }

  const config = useRuntimeConfig()
  const client = serverSupabaseServiceRole<Database>(event)

  console.log('[Email API] Using host:', config.public.mailersendServer, 'port:', config.public.mailersendPort)
  
  try {
    // 1. Fetch the Solver Run data
    const { data: run, error: runError } = await client
      .from('solver_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError || !run) throw runError || new Error('Run not found')

    const propertiesProcessed = run.properties_processed || []
    if (propertiesProcessed.length === 0) {
      return { success: true, message: 'No properties to notify' }
    }


    // 2. Fetch all events for this run
    const { data: events, error: eventsError } = await client
      .from('solver_events')
      .select('*')
      .eq('solver_run_id', runId)

    if (eventsError) throw eventsError
    const allEvents = (events || []) as any[]

    // 3. Fetch all active recipients for these properties
    const { data: recipients, error: recError } = await client
      .from('property_notification_recipients')
      .select('email, property_code')
      .in('property_code', propertiesProcessed)
      .eq('is_active', true)

    if (recError) throw recError
    if (!recipients || recipients.length === 0) {
      return { success: true, message: 'No recipients found for these properties' }
    }

    // 4. Consolidate by Email
    const emailToProperties = recipients.reduce((acc, curr) => {
      if (!acc[curr.email]) acc[curr.email] = []
      acc[curr.email].push(curr.property_code)
      return acc
    }, {} as Record<string, string[]>)

    // 5. Setup Transporter
    const transporter = nodemailer.createTransport({
      host: config.public.mailersendServer,
      port: parseInt(config.public.mailersendPort as string),
      auth: {
        user: config.public.mailersendUsername,
        pass: config.mailersendPassword
      }
    })

    const summaryData = run.summary as any
    const results = []

    // 6. Send consolidated emails
    for (const [email, propertyCodes] of Object.entries(emailToProperties)) {
      // Filter events and summary for this recipient's properties
      const recipientEvents = allEvents.filter(e => propertyCodes.includes(e.property_code))
      
      // Create a scoped run object for the generator
      const scopedRun = {
        ...run,
        properties_processed: propertyCodes,
        // We keep the main summary but the generator only iterates over properties_processed
      }

      const htmlContent = generateHighFidelityHtmlReport(scopedRun, recipientEvents)

      try {
        await transporter.sendMail({
          from: `"${config.public.mailersendSmtpName || 'EE Manager'}" <${config.public.mailersendUsername || 'noreply@ee-manager.com'}>`,
          to: email,
          subject: `Daily Solver Summary - ${new Date().toLocaleDateString()}`,
          html: htmlContent
        })
        results.push({ email, status: 'sent', propertyCount: propertyCodes.length })
      } catch (sendError: any) {
        console.error(`[Email] Failed to send to ${email}:`, sendError)
        results.push({ email, status: 'failed', error: sendError.message })
      }
    }

    return {
      success: true,
      results
    }
  } catch (error: any) {
    console.error('[Email API] Global error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
