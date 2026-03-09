/**
 * Pure utility functions for solver batch ingestion validation.
 * Extracted from solver.vue so they can be unit-tested without mounting a component.
 */

// ─── Parse Result Classification ─────────────────────────────────────────────

export type ParseOutcome = 'error' | 'empty_warning' | 'warnings' | 'ok'

export interface ParseResultInput {
  errors: string[]
  data: any[]
}

export interface ParseClassification {
  outcome: ParseOutcome
  message: string | null
}

/**
 * Classifies a parser result into one of four outcomes:
 *   'error'         — parser returned errors AND zero rows (wrong format / missing headers).
 *                     Caller should mark the file as failed and not stage it.
 *   'empty_warning' — parser returned no errors but produced zero valid data rows.
 *                     The file is valid format but all rows failed isRowValid().
 *   'warnings'      — parser returned some errors but still produced rows.
 *                     Caller should proceed with staging but surface the warning count.
 *   'ok'            — no errors and at least one valid row.
 */
export function classifyParseResult(result: ParseResultInput): ParseClassification {
  const hasErrors = result.errors.length > 0
  const hasData = result.data.length > 0

  if (hasErrors && !hasData) {
    return {
      outcome: 'error',
      message: result.errors[0] || 'Parse failed — file produced no valid rows',
    }
  }

  if (hasErrors && hasData) {
    return {
      outcome: 'warnings',
      message: `Uploaded with ${result.errors.length} warning${result.errors.length === 1 ? '' : 's'}`,
    }
  }

  if (!hasErrors && !hasData) {
    return {
      outcome: 'empty_warning',
      message: 'Warning: file parsed but contains no valid data rows',
    }
  }

  return { outcome: 'ok', message: null }
}

// ─── Batch Manifest ───────────────────────────────────────────────────────────

export interface ParserEntry {
  id: string
  label: string
  required: boolean
}

export interface BatchManifestResult {
  /** IDs of all parsers that are present and successfully staged */
  presentIds: Set<string>
  /** Parsers absent from the batch, excluding the alerts exemption */
  missingFiles: ParserEntry[]
  /** Subset of missingFiles where required === true */
  missingRequired: ParserEntry[]
}

/**
 * Computes which parsers are missing from a staged batch.
 * alertsExemptId is excluded from the missing list because Yardi
 * produces no output file when there are no active alerts.
 */
export function computeBatchManifest(
  stagedIds: Set<string>,
  solverParsers: ParserEntry[],
  alertsExemptId: string = 'alerts',
): BatchManifestResult {
  const missingFiles = solverParsers.filter(
    (p) => p.id !== alertsExemptId && !stagedIds.has(p.id),
  )
  const missingRequired = missingFiles.filter((p) => p.required)

  return { presentIds: stagedIds, missingFiles, missingRequired }
}
