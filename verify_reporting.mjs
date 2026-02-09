
const { generateHighFidelityHtmlReport } = require('./layers/base/utils/reporting')
const { PROPERTY_LIST } = require('./layers/base/constants/properties')

// Mock run data
const run = {
    batch_id: 'test-batch-123',
    upload_date: new Date().toISOString(),
    summary: {
        SB: {
            tenanciesNew: 2,
            tenanciesUpdated: 5,
            residentsNew: 2,
            residentsUpdated: 5,
            leasesNew: 1,
            leasesUpdated: 2,
            leasesRenewed: 1,
            availabilitiesNew: 1,
            availabilitiesUpdated: 3,
            noticesProcessed: 1,
            statusAutoFixes: [],
            makereadyFlags: 1,
            applicationFlags: 0,
            transferFlags: 0,
            applicationsSaved: 1,
            priceChanges: 1
        }
    },
    properties_processed: ['SB']
}

// Mock events
const events = [
    {
        property_code: 'SB',
        event_type: 'lease_renewal',
        details: {
            resident_name: 'John Doe',
            unit_name: '101',
            old_lease: { rent_amount: 1500 },
            new_lease: { rent_amount: 1600 }
        }
    },
    {
        property_code: 'SB',
        event_type: 'price_change',
        details: {
            unit_name: '202',
            old_rent: 1800,
            new_rent: 1750,
            change_amount: -50,
            change_percent: -2.7
        }
    }
]

try {
    const html = generateHighFidelityHtmlReport(run, events)
    console.log('HTML Generation Successful!')
    console.log('HTML Length:', html.length)
    if (html.includes('John Doe') && html.includes('1600')) {
        console.log('Verification: John Doe and rent amount found in HTML.')
    } else {
        console.error('Verification failed: John Doe or rent amount missing.')
        process.exit(1)
    }
} catch (err) {
    console.error('HTML Generation Failed:', err)
    process.exit(1)
}
