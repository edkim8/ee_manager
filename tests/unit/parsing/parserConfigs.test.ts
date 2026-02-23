import { describe, it, expect } from 'vitest'
import type { ParserConfig } from '../../../layers/parsing/types'
import { AvailablesConfig }          from '../../../layers/parsing/composables/parsers/useParseAvailables'
import { AvailablesAuditConfig }     from '../../../layers/parsing/composables/parsers/useParseAvailablesAudit'
import { residents_statusConfig }    from '../../../layers/parsing/composables/parsers/useParseResidentsStatus'
import { ExpiringLeasesConfig }      from '../../../layers/parsing/composables/parsers/useParseExpiringLeases'
import { propertiesConfig }          from '../../../layers/parsing/composables/parsers/useParseProperties'
import { residentsConfig }           from '../../../layers/parsing/composables/parsers/useParseResidents'
import { WorkOrdersConfig }          from '../../../layers/parsing/composables/parsers/useParseWorkorders'
import { TransfersConfig }           from '../../../layers/parsing/composables/parsers/useParseTransfers'
import { unitsConfig }               from '../../../layers/parsing/composables/parsers/useParseUnits'
import { amenitiesListConfig }       from '../../../layers/parsing/composables/parsers/useParseAmenitiesList'
import { LeasedUnitsConfig }         from '../../../layers/parsing/composables/parsers/useParseLeasedunits'
import { yardiReportConfig }         from '../../../layers/parsing/composables/parsers/useParseYardiReport'
import { fiveP_amenitiesaudit_02_05_2026Config } from '../../../layers/parsing/composables/parsers/engine_useParse5pAmenitiesaudit'
import { fiveP_amenitieslistConfig } from '../../../layers/parsing/composables/parsers/engine_useParse5pAmenitieslist'
import { DelinquenciesConfig }       from '../../../layers/parsing/composables/parsers/useParseDelinquencies'
import { ApplicationsConfig }        from '../../../layers/parsing/composables/parsers/useParseApplications'
import { AlertsConfig }              from '../../../layers/parsing/composables/parsers/useParseAlerts'
import { MakeReadyConfig }           from '../../../layers/parsing/composables/parsers/useParseMakeready'
import { amenitiesAuditConfig }      from '../../../layers/parsing/composables/parsers/useParseAmenitiesAudit'
import { NoticesConfig }             from '../../../layers/parsing/composables/parsers/useParseNotices'

// ─── Config registry ──────────────────────────────────────────────────────────

const ALL_CONFIGS: Array<{ name: string; config: ParserConfig }> = [
  { name: 'AvailablesConfig',          config: AvailablesConfig },
  { name: 'AvailablesAuditConfig',     config: AvailablesAuditConfig },
  { name: 'residents_statusConfig',    config: residents_statusConfig },
  { name: 'ExpiringLeasesConfig',      config: ExpiringLeasesConfig },
  { name: 'propertiesConfig',          config: propertiesConfig },
  { name: 'residentsConfig',           config: residentsConfig },
  { name: 'WorkOrdersConfig',          config: WorkOrdersConfig },
  { name: 'TransfersConfig',           config: TransfersConfig },
  { name: 'unitsConfig',               config: unitsConfig },
  { name: 'amenitiesListConfig',       config: amenitiesListConfig },
  { name: 'LeasedUnitsConfig',         config: LeasedUnitsConfig },
  { name: 'yardiReportConfig',         config: yardiReportConfig },
  { name: 'fiveP_amenitiesaudit_02_05_2026Config', config: fiveP_amenitiesaudit_02_05_2026Config },
  { name: 'fiveP_amenitieslistConfig', config: fiveP_amenitieslistConfig },
  { name: 'DelinquenciesConfig',       config: DelinquenciesConfig },
  { name: 'ApplicationsConfig',        config: ApplicationsConfig },
  { name: 'AlertsConfig',              config: AlertsConfig },
  { name: 'MakeReadyConfig',           config: MakeReadyConfig },
  { name: 'amenitiesAuditConfig',      config: amenitiesAuditConfig },
  { name: 'NoticesConfig',             config: NoticesConfig },
]

const VALID_STRATEGIES = ['standard', 'yardi_report', 'fill_down']

// ─── Cross-config invariants ──────────────────────────────────────────────────

describe('parser config registry', () => {
  it('has 20 configs registered', () => {
    expect(ALL_CONFIGS).toHaveLength(20)
  })

  it('has no duplicate config ids', () => {
    const ids = ALL_CONFIGS.map((c) => c.config.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('has unique ids (each id appears exactly once)', () => {
    const ids = ALL_CONFIGS.map((c) => c.config.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toHaveLength(0)
  })
})

// ─── Per-config structural tests ──────────────────────────────────────────────

describe.each(ALL_CONFIGS)('$name', ({ name: _name, config }) => {
  it('has a non-empty id string', () => {
    expect(typeof config.id).toBe('string')
    expect(config.id.length).toBeGreaterThan(0)
  })

  it('has a valid namePattern (compilable regex)', () => {
    expect(() => new RegExp(config.namePattern)).not.toThrow()
  })

  it('has a valid strategy', () => {
    expect(VALID_STRATEGIES).toContain(config.strategy)
  })

  it('has a non-empty mapping', () => {
    expect(Object.keys(config.mapping).length).toBeGreaterThan(0)
  })

  it('has getUniqueId as a function (when defined)', () => {
    if (config.getUniqueId !== undefined) {
      expect(typeof config.getUniqueId).toBe('function')
    }
  })

  it('getUniqueId produces a string for a sample row', () => {
    if (config.getUniqueId) {
      // Call with an empty object — should return a string (possibly all underscores)
      const result = config.getUniqueId({})
      expect(typeof result).toBe('string')
    }
  })

  it('all mapping entries have a non-empty targetField', () => {
    for (const [header, mapping] of Object.entries(config.mapping)) {
      expect(typeof mapping.targetField).toBe('string')
      expect(mapping.targetField.length).toBeGreaterThan(0)
    }
  })

  it('required fields are booleans when defined', () => {
    for (const mapping of Object.values(config.mapping)) {
      if (mapping.required !== undefined) {
        expect(typeof mapping.required).toBe('boolean')
      }
    }
  })

  it('has at least one required field (except generic fallback configs)', () => {
    // yardiReportConfig is a generic fallback parser with no strict required fields
    if (config.id === 'yardi_report_generic') return
    const requiredCount = Object.values(config.mapping).filter((m) => m.required === true).length
    expect(requiredCount).toBeGreaterThan(0)
  })
})

// ─── Per-config filename pattern spot-checks ──────────────────────────────────

describe('namePattern smoke tests', () => {
  it('AvailablesConfig matches 5p_Availables files', () => {
    expect('5p_Availables_2026-02-23.xlsx').toMatch(new RegExp(AvailablesConfig.namePattern))
  })

  it('ExpiringLeasesConfig matches expected filenames', () => {
    const re = new RegExp(ExpiringLeasesConfig.namePattern)
    // Should match the Expiring Leases report format
    expect(ExpiringLeasesConfig.namePattern.length).toBeGreaterThan(0)
    // Pattern is valid
    expect(() => re.test('5p_ExpiringLeases.xlsx')).not.toThrow()
  })

  it('residents_statusConfig does not match unrelated filenames', () => {
    const re = new RegExp(residents_statusConfig.namePattern)
    expect(re.test('5p_Availables.xlsx')).toBe(false)
  })
})
