
import { generateMarkdownReport, type PropertySummary, type SolverEvent } from '../../base/utils/reporting'

export const useSolverReportGenerator = () => {
    /**
     * Generate markdown report from summary data
     */
    const generateMarkdown = (
        batchId: string,
        uploadDate: string,
        propertySummaries: Record<string, PropertySummary>,
        events: SolverEvent[]
    ): string => {
        const run = {
            batch_id: batchId,
            upload_date: uploadDate,
            summary: propertySummaries,
            properties_processed: Object.keys(propertySummaries).sort()
        }
        return generateMarkdownReport(run, events)
    }

    /**
     * Generate filename for report
     */
    const generateFilename = (uploadDate: string, batchId: string): string => {
        const date = new Date(uploadDate)
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
        const timeStr = date.toISOString().split('T')[1].split(':').slice(0, 2).join('') // HHMM
        const shortBatchId = batchId.substring(0, 8)
        return `${dateStr}_${timeStr}_${shortBatchId}.md`
    }

    return {
        generateMarkdown,
        generateFilename
    }
}


