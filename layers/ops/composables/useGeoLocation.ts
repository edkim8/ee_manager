import EXIF from 'exif-js'

export const useGeoLocation = () => {
  /**
   * Helper to convert DMS (degrees, minutes, seconds) to decimal
   * Handles multiple format variations
   */
  const convertDMSToDecimal = (data: any, ref: string): number => {
    console.log('Converting GPS data:', { data, type: typeof data, isArray: Array.isArray(data), ref })

    // Case 1: Already in decimal degree format (single number)
    if (typeof data === 'number') {
      console.log('→ Detected: Decimal degree format')
      const decimal = (ref === 'S' || ref === 'W') ? -Math.abs(data) : Math.abs(data)
      console.log('→ Result:', decimal)
      return decimal
    }

    // Case 2: DMS array format [degrees, minutes, seconds]
    if (Array.isArray(data) && data.length >= 2) {
      console.log('→ Detected: DMS array format')

      // Extract values (some might be fractions)
      const degrees = typeof data[0] === 'number' ? data[0] : (data[0].numerator / data[0].denominator)
      const minutes = typeof data[1] === 'number' ? data[1] : (data[1].numerator / data[1].denominator)
      const seconds = data[2] ? (typeof data[2] === 'number' ? data[2] : (data[2].numerator / data[2].denominator)) : 0

      console.log('→ Parsed DMS:', { degrees, minutes, seconds })

      // Convert to decimal
      let decimal = degrees + minutes / 60 + seconds / 3600

      // Apply hemisphere
      if (ref === 'S' || ref === 'W') {
        decimal = decimal * -1
      }

      console.log('→ Result:', decimal)
      return decimal
    }

    // Case 3: String format "33° 26' 54.12\"" (rare but possible)
    if (typeof data === 'string') {
      console.log('→ Detected: String DMS format')
      const match = data.match(/(\d+)°?\s*(\d+)?'?\s*([0-9.]+)?"?/)
      if (match) {
        const degrees = parseFloat(match[1])
        const minutes = match[2] ? parseFloat(match[2]) : 0
        const seconds = match[3] ? parseFloat(match[3]) : 0

        let decimal = degrees + minutes / 60 + seconds / 3600
        if (ref === 'S' || ref === 'W') {
          decimal = decimal * -1
        }

        console.log('→ Result:', decimal)
        return decimal
      }
    }

    console.warn('→ Unknown GPS format, returning 0')
    return 0
  }

  /**
   * Extract GPS coordinates from a file
   */
  const extractCoordinates = (file: File): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      let resolved = false
      
      const safeResolve = (val: { lat: number; lng: number } | null) => {
        if (!resolved) {
            resolved = true
            resolve(val)
        }
      }

      // 1. Timeout Failsafe (3 seconds)
      setTimeout(() => {
        if (!resolved) {
            console.warn('EXIF extraction timed out')
            safeResolve(null)
        }
      }, 3000)

      try {
          // 2. Run Extraction
          EXIF.getData(file as any, function (this: any) {
            try {
              // Debugging: Log all tags to see what we actually have
              const allTags = EXIF.getAllTags(this)
              console.group('📍 EXIF GPS Extraction')
              console.log('File info:', {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: new Date(file.lastModified).toLocaleString()
              })
              console.log('All EXIF Tags:', allTags)

              // Try multiple GPS tag variations (different cameras/software use different names)
              let latData = EXIF.getTag(this, 'GPSLatitude')
              let latRef = EXIF.getTag(this, 'GPSLatitudeRef')
              let lngData = EXIF.getTag(this, 'GPSLongitude')
              let lngRef = EXIF.getTag(this, 'GPSLongitudeRef')

              // Fallback: Check alternative tag names
              if (!latData) {
                console.log('🔍 Checking alternative GPS tag names...')
                latData = allTags.GPSLatitude || allTags.latitude || allTags.Latitude
                lngData = allTags.GPSLongitude || allTags.longitude || allTags.Longitude
                latRef = allTags.GPSLatitudeRef || allTags.LatitudeRef
                lngRef = allTags.GPSLongitudeRef || allTags.LongitudeRef

                if (latData || lngData) {
                  console.log('✅ Found GPS in alternative tags!')
                }
              }

              // Fallback: Search all tags for GPS-like values
              if (!latData && !lngData) {
                console.log('🔍 Searching all tags for GPS data...')
                Object.keys(allTags).forEach(key => {
                  const value = allTags[key]
                  if (key.toLowerCase().includes('gps') || key.toLowerCase().includes('lat') || key.toLowerCase().includes('lon')) {
                    console.log(`  Found GPS-related tag: ${key} =`, value)
                  }
                })
              }

              console.log('GPS Tags (Raw):', {
                  GPSLatitude: latData,
                  GPSLatitudeRef: latRef,
                  GPSLongitude: lngData,
                  GPSLongitudeRef: lngRef,
                  GPSVersionID: EXIF.getTag(this, 'GPSVersionID')
              })

              // Format detection
              console.log('Format Detection:', {
                  latDataType: typeof latData,
                  latDataIsArray: Array.isArray(latData),
                  lngDataType: typeof lngData,
                  lngDataIsArray: Array.isArray(lngData)
              })

              // Check if GPS data exists
              if (latData && lngData) {
                  console.log('✅ GPS data found, attempting conversion...')

                  // Be less strict. If we have Lat/Lng data but no refs, default to N/W (USA context)
                  const safeLatRef = latRef || 'N'
                  const safeLngRef = lngRef || 'W'

                  console.log('Using references:', { latitude: safeLatRef, longitude: safeLngRef })

                  const lat = convertDMSToDecimal(latData, safeLatRef)
                  const lng = convertDMSToDecimal(lngData, safeLngRef)

                  console.log('Final Coordinates:', { lat, lng })

                  // Validation: Check if coordinates are reasonable
                  const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90
                  const isValidLng = !isNaN(lng) && lng >= -180 && lng <= 180

                  console.log('Validation:', {
                      isValidLat,
                      isValidLng,
                      latInRange: `${lat} ∈ [-90, 90]`,
                      lngInRange: `${lng} ∈ [-180, 180]`
                  })

                  if (isValidLat && isValidLng) {
                     console.log('✅ GPS extraction successful!')
                     console.groupEnd()
                     safeResolve({ lat, lng })
                  } else {
                     console.error('❌ Invalid coordinates - out of range or NaN')
                     console.groupEnd()
                     safeResolve(null)
                  }
              } else {
                console.warn('❌ No GPS tags found in EXIF data')
                console.log('Missing:', {
                    latitude: !latData ? 'GPSLatitude not found' : 'OK',
                    longitude: !lngData ? 'GPSLongitude not found' : 'OK'
                })
                console.groupEnd()
                safeResolve(null)
              }
            } catch (error) {
              console.error('Error parsing EXIF tags:', error)
              safeResolve(null)
            }
          })
      } catch (e) {
         console.error('Error starting EXIF extraction:', e)
         safeResolve(null)
      }
    })
  }

  return {
    extractCoordinates
  }
}
