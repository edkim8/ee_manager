# GPS Format Detection & Debugging Guide

## 🎯 Problem Statement

Different cameras, phones, and photo editors store GPS coordinates in EXIF metadata using different formats:
- **DMS Array**: `[33, 26, 54.12]` (Degrees, Minutes, Seconds)
- **Decimal**: `33.448367` (Single number)
- **Fractional DMS**: `[{numerator: 33, denominator: 1}, {numerator: 26, denominator: 1}, ...]`
- **String**: `"33° 26' 54.12\""`

Mac Photos, in particular, may use **decimal degree format** or **fractional DMS** depending on the source.

## 🔍 Enhanced Detection System

### Supported Formats

#### Format 1: Decimal Degree (Single Number)
```javascript
GPSLatitude: 33.448367
GPSLongitude: -112.074036
```

**Detection:**
```javascript
if (typeof data === 'number') {
  // Already decimal, just apply hemisphere
  const decimal = (ref === 'S' || ref === 'W') ? -Math.abs(data) : Math.abs(data)
  return decimal
}
```

**Example Output:**
```
Input: 33.448367, ref: 'N'
Output: 33.448367

Input: 112.074036, ref: 'W'
Output: -112.074036
```

#### Format 2: DMS Array (Simple Numbers)
```javascript
GPSLatitude: [33, 26, 54.12]  // 33° 26' 54.12"
GPSLongitude: [112, 4, 26.53]
```

**Detection:**
```javascript
if (Array.isArray(data) && data.length >= 2) {
  const degrees = data[0]
  const minutes = data[1]
  const seconds = data[2] || 0

  let decimal = degrees + minutes / 60 + seconds / 3600
  if (ref === 'S' || ref === 'W') {
    decimal = decimal * -1
  }
  return decimal
}
```

**Example Output:**
```
Input: [33, 26, 54.12], ref: 'N'
Calculation: 33 + 26/60 + 54.12/3600 = 33.448367
Output: 33.448367
```

#### Format 3: Fractional DMS (EXIF-js Format)
```javascript
GPSLatitude: [
  {numerator: 33, denominator: 1},  // 33/1 = 33°
  {numerator: 26, denominator: 1},  // 26/1 = 26'
  {numerator: 5412, denominator: 100} // 5412/100 = 54.12"
]
```

**Detection:**
```javascript
if (Array.isArray(data)) {
  const degrees = typeof data[0] === 'number'
    ? data[0]
    : (data[0].numerator / data[0].denominator)

  const minutes = typeof data[1] === 'number'
    ? data[1]
    : (data[1].numerator / data[1].denominator)

  const seconds = data[2]
    ? (typeof data[2] === 'number'
        ? data[2]
        : (data[2].numerator / data[2].denominator))
    : 0

  let decimal = degrees + minutes / 60 + seconds / 3600
  // Apply hemisphere...
}
```

**Example Output:**
```
Input: [{numerator: 33, denominator: 1}, {numerator: 26, denominator: 1}, {numerator: 5412, denominator: 100}]
Parsed: degrees=33, minutes=26, seconds=54.12
Calculation: 33 + 26/60 + 54.12/3600 = 33.448367
Output: 33.448367
```

#### Format 4: String DMS (Rare)
```javascript
GPSLatitude: "33° 26' 54.12\""
```

**Detection:**
```javascript
if (typeof data === 'string') {
  const match = data.match(/(\d+)°?\s*(\d+)?'?\s*([0-9.]+)?"?/)
  if (match) {
    const degrees = parseFloat(match[1])
    const minutes = match[2] ? parseFloat(match[2]) : 0
    const seconds = match[3] ? parseFloat(match[3]) : 0
    // Convert to decimal...
  }
}
```

## 📊 Console Debugging Output

When you upload a photo, you'll see comprehensive logging in the browser console:

### Example 1: Successful Extraction (DMS Array)
```
📍 EXIF GPS Extraction
  All EXIF Tags: {Make: "Apple", Model: "iPhone 13 Pro", ...}
  GPS Tags (Raw):
    GPSLatitude: [33, 26, 54.12]
    GPSLatitudeRef: "N"
    GPSLongitude: [112, 4, 26.53]
    GPSLongitudeRef: "W"
    GPSVersionID: [2, 2, 0, 0]
  Format Detection:
    latDataType: "object"
    latDataIsArray: true
    lngDataType: "object"
    lngDataIsArray: true
  ✅ GPS data found, attempting conversion...
  Using references: {latitude: "N", longitude: "W"}
  Converting GPS data: {data: [33, 26, 54.12], type: "object", isArray: true, ref: "N"}
    → Detected: DMS array format
    → Parsed DMS: {degrees: 33, minutes: 26, seconds: 54.12}
    → Result: 33.448367
  Converting GPS data: {data: [112, 4, 26.53], type: "object", isArray: true, ref: "W"}
    → Detected: DMS array format
    → Parsed DMS: {degrees: 112, minutes: 4, seconds: 26.53}
    → Result: -112.074036
  Final Coordinates: {lat: 33.448367, lng: -112.074036}
  Validation:
    isValidLat: true
    isValidLng: true
    latInRange: "33.448367 ∈ [-90, 90]"
    lngInRange: "-112.074036 ∈ [-180, 180]"
  ✅ GPS extraction successful!
```

### Example 2: Decimal Degree Format (Mac Photos)
```
📍 EXIF GPS Extraction
  All EXIF Tags: {Make: "Canon", Model: "EOS 5D Mark IV", ...}
  GPS Tags (Raw):
    GPSLatitude: 33.448367
    GPSLatitudeRef: "N"
    GPSLongitude: 112.074036
    GPSLongitudeRef: "W"
  Format Detection:
    latDataType: "number"
    latDataIsArray: false
    lngDataType: "number"
    lngDataIsArray: false
  ✅ GPS data found, attempting conversion...
  Using references: {latitude: "N", longitude: "W"}
  Converting GPS data: {data: 33.448367, type: "number", isArray: false, ref: "N"}
    → Detected: Decimal degree format
    → Result: 33.448367
  Converting GPS data: {data: 112.074036, type: "number", isArray: false, ref: "W"}
    → Detected: Decimal degree format
    → Result: -112.074036
  Final Coordinates: {lat: 33.448367, lng: -112.074036}
  Validation:
    isValidLat: true
    isValidLng: true
  ✅ GPS extraction successful!
```

### Example 3: No GPS Data
```
📍 EXIF GPS Extraction
  All EXIF Tags: {Make: "Apple", Model: "iPhone 13 Pro", ...}
  GPS Tags (Raw):
    GPSLatitude: undefined
    GPSLatitudeRef: undefined
    GPSLongitude: undefined
    GPSLongitudeRef: undefined
  Format Detection:
    latDataType: "undefined"
    latDataIsArray: false
    lngDataType: "undefined"
    lngDataIsArray: false
  ❌ No GPS tags found in EXIF data
  Missing:
    latitude: "GPSLatitude not found"
    longitude: "GPSLongitude not found"
```

### Example 4: Invalid Coordinates
```
📍 EXIF GPS Extraction
  GPS Tags (Raw):
    GPSLatitude: [200, 0, 0]  // Invalid! > 90
    GPSLatitudeRef: "N"
  ...
  Final Coordinates: {lat: 200, lng: -112.074036}
  Validation:
    isValidLat: false
    isValidLng: true
    latInRange: "200 ∈ [-90, 90]" ❌
    lngInRange: "-112.074036 ∈ [-180, 180]" ✅
  ❌ Invalid coordinates - out of range or NaN
```

## 🧪 Testing Your Mac Photos

### Step-by-Step Debugging

1. **Open Browser Developer Console**
   - Chrome/Edge: `Cmd+Option+J` (Mac) or `F12`
   - Safari: `Cmd+Option+C`
   - Firefox: `Cmd+Option+K`

2. **Upload Your Mac Photo**
   - Go to `/assets/locations`
   - Click "Add Location"
   - Select your photo

3. **Check Console Output**
   - Look for `📍 EXIF GPS Extraction` group
   - Find `GPS Tags (Raw)` section
   - Check `Format Detection`

4. **Interpret Results**

   **If you see:**
   ```
   GPSLatitude: [33, 26, 54.12]
   → Detected: DMS array format
   ✅ GPS extraction successful!
   ```
   **Status:** ✅ Working correctly

   **If you see:**
   ```
   GPSLatitude: 33.448367
   → Detected: Decimal degree format
   ✅ GPS extraction successful!
   ```
   **Status:** ✅ Working correctly

   **If you see:**
   ```
   GPSLatitude: undefined
   ❌ No GPS tags found
   ```
   **Status:** ❌ Photo has no GPS metadata (stripped by Mac Photos?)

   **If you see:**
   ```
   GPSLatitude: [some weird format]
   → Unknown GPS format, returning 0
   ```
   **Status:** ⚠️ Unknown format - needs investigation

## 🔧 Common Issues & Solutions

### Issue 1: Mac Photos Strips GPS on Export

**Symptom:**
```
❌ No GPS tags found in EXIF data
```

**Cause:** Mac Photos removes GPS data by default when exporting

**Solution:**
1. In Mac Photos, select photo
2. File → Export → Export 1 Photo
3. ✅ Check "Include location information"
4. Export and try again

### Issue 2: Wrong Coordinates (Off by a lot)

**Symptom:**
```
Final Coordinates: {lat: 26.433333, lng: 54.2}  // Should be USA but looks like Middle East
```

**Cause:** Hemisphere reference (N/S/E/W) missing or wrong

**Solution:**
- Check console for `Using references` line
- If shows `{latitude: "N", longitude: "W"}` for USA locations → Correct
- If missing, we default to N/W (USA context)
- Can manually edit in form after upload

### Issue 3: Slightly Off (Few meters)

**Symptom:**
```
Expected: 33.448367, -112.074036
Got: 33.448370, -112.074040  // Close but slightly different
```

**Cause:** Rounding differences in DMS → Decimal conversion

**Solution:**
- This is normal! GPS precision is ~10-15 feet anyway
- Difference of 0.000003° = ~30cm (acceptable)

### Issue 4: Fractional Format Not Recognized

**Symptom:**
```
Converting GPS data: {data: [{numerator: 33, denominator: 1}, ...], ...}
→ Result: NaN
```

**Cause:** Code not handling fractional objects correctly

**Solution:**
- Check if `data[0].numerator` exists
- Our enhanced code should handle this now
- If still fails, copy the exact console output and report

## 📝 Manual Testing Checklist

Test with photos from:
- [ ] iPhone (latest iOS)
- [ ] Android phone
- [ ] DSLR camera (Canon/Nikon)
- [ ] Mac Photos exported (with location)
- [ ] Mac Photos exported (without location)
- [ ] Edited in Photoshop/Lightroom
- [ ] Downloaded from Google Photos
- [ ] Screenshot (no GPS expected)

Expected results:
- Phones/cameras with GPS: ✅ Coordinates extracted
- Mac Photos (location enabled): ✅ Coordinates extracted
- Mac Photos (location disabled): ❌ No GPS → Manual entry
- Screenshots: ❌ No GPS → Manual entry

## 🎓 Understanding Coordinate Formats

### DMS (Degrees Minutes Seconds)
```
Latitude: 33° 26' 54.12" N
- Degrees: 33
- Minutes: 26
- Seconds: 54.12
- Hemisphere: North (+)

Conversion to Decimal:
33 + (26/60) + (54.12/3600) = 33.448367
```

### Decimal Degrees
```
Latitude: 33.448367
- Direct value
- No conversion needed
- Sign indicates hemisphere (+ = N/E, - = S/W)
```

### Hemisphere Rules
```
Latitude:
- North (N) → Positive (0° to +90°)
- South (S) → Negative (0° to -90°)

Longitude:
- East (E) → Positive (0° to +180°)
- West (W) → Negative (0° to -180°)
```

## 🚀 Next Steps If Issues Persist

1. **Capture Console Output**
   - Right-click in console
   - "Save as..." → Save to file
   - Share the output

2. **Try Manual Entry**
   - Open photo in Preview (Mac)
   - Tools → Show Inspector
   - GPS tab → Copy coordinates
   - Paste into manual entry fields

3. **Check Photo Properties**
   ```bash
   # Mac Terminal
   mdls -name kMDItemLatitude -name kMDItemLongitude photo.jpg

   # Should output:
   kMDItemLatitude = 33.448367
   kMDItemLongitude = -112.074036
   ```

4. **Use Online EXIF Viewer**
   - Upload to: https://exifdata.com
   - Check GPS tags
   - Compare with our console output

---

**Enhanced:** 2026-02-08
**Supports:** DMS Array, Decimal Degree, Fractional DMS, String formats
**Status:** ✅ Production Ready
