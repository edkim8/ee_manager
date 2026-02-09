import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRecentSolverRuns() {
    console.log('🔍 Checking recent solver runs for errors...\n')

    // Get the 10 most recent solver runs
    const { data: runs, error } = await supabase
        .from('solver_runs')
        .select('id, batch_id, status, upload_date, properties_processed, error_message, summary')
        .order('upload_date', { ascending: false })
        .limit(10)

    if (error) {
        console.error('❌ Error fetching solver runs:', error)
        process.exit(1)
    }

    if (!runs || runs.length === 0) {
        console.log('ℹ️  No solver runs found in database.')
        return
    }

    console.log(`Found ${runs.length} recent solver runs:\n`)

    runs.forEach((run, idx) => {
        const date = new Date(run.upload_date).toLocaleString()
        const statusIcon = run.status === 'completed' ? '✅' : run.status === 'failed' ? '❌' : '🔄'

        console.log(`${idx + 1}. ${statusIcon} Run ${run.batch_id.substring(0, 8)}`)
        console.log(`   Date: ${date}`)
        console.log(`   Status: ${run.status}`)
        console.log(`   Properties: ${run.properties_processed?.join(', ') || 'None'}`)

        if (run.error_message) {
            console.log(`   ⚠️  ERROR: ${run.error_message}`)
        }

        if (run.summary) {
            const summary = run.summary
            const properties = Object.keys(summary)
            if (properties.length > 0) {
                console.log(`   Summary:`)
                properties.forEach(prop => {
                    const s = summary[prop]
                    console.log(`     ${prop}: ${s.tenanciesNew || 0} new tenancies, ${s.leasesRenewed || 0} renewals, ${s.priceChanges || 0} price changes`)
                })
            }
        }

        console.log('')
    })

    // Check for failed runs
    const failedRuns = runs.filter(r => r.status === 'failed')
    if (failedRuns.length > 0) {
        console.log(`\n⚠️  Found ${failedRuns.length} failed run(s)!`)
        console.log('These require investigation:\n')
        failedRuns.forEach(run => {
            console.log(`Batch ID: ${run.batch_id}`)
            console.log(`Error: ${run.error_message}`)
            console.log('')
        })
    } else {
        console.log('✅ No failed runs detected in recent history.')
    }
}

checkRecentSolverRuns().catch(console.error)
