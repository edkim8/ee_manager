/**
 * Per-property configuration for renewal letters.
 *
 * Each property has its own:
 *  - Display name (used in letter body and filenames)
 *  - Letterhead image path (relative to /public, served as static asset)
 *  - DOCX template filename (in /public/templates/)
 *
 * When a property does not yet have a letterhead image or DOCX template,
 * the system falls back gracefully: no image is shown, and the generic
 * template path is returned.
 */

export interface PropertyLetterConfig {
  propertyCode:      string
  propertyName:      string   // Full display name used in the letter
  letterheadImagePath: string // Relative to /public (e.g. "images/letterheads/RS.jpg")
  docxTemplateName:  string   // Filename only, found in /public/templates/
}

export const PROPERTY_LETTER_CONFIGS: Record<string, PropertyLetterConfig> = {
  RS: {
    propertyCode:        'RS',
    propertyName:        'Residences at 4225',
    letterheadImagePath: 'images/letterheads/RS.jpg',
    docxTemplateName:    'RS_Renewal_Letter_Template.docx',
  },
  SB: {
    propertyCode:        'SB',
    propertyName:        'Stonebridge Apartments',
    letterheadImagePath: 'images/letterheads/SB.jpg',   // add image when available
    docxTemplateName:    'SB_Renewal_Letter_Template.docx',
  },
  OB: {
    propertyCode:        'OB',
    propertyName:        'Ocean Breeze Apartments',
    letterheadImagePath: 'images/letterheads/OB.jpg',
    docxTemplateName:    'OB_Renewal_Letter_Template.docx',
  },
  CV: {
    propertyCode:        'CV',
    propertyName:        'City View Apartments',
    letterheadImagePath: 'images/letterheads/CV.jpg',
    docxTemplateName:    'CV_Renewal_Letter_Template.docx',
  },
  WO: {
    propertyCode:        'WO',
    propertyName:        'Whispering Oaks Apartments',
    letterheadImagePath: 'images/letterheads/WO.jpg',
    docxTemplateName:    'WO_Renewal_Letter_Template.docx',
  },
}

/** Fallback config for unknown property codes */
const FALLBACK_CONFIG: PropertyLetterConfig = {
  propertyCode:        '',
  propertyName:        'Management',
  letterheadImagePath: '',
  docxTemplateName:    'Renewal_Letter_Template.docx',
}

export function getPropertyLetterConfig(propertyCode: string): PropertyLetterConfig {
  return PROPERTY_LETTER_CONFIGS[propertyCode?.toUpperCase()] ?? FALLBACK_CONFIG
}
