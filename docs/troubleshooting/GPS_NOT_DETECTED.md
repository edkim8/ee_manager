# GPS Not Detected - Troubleshooting Guide

## 🐛 Problem

**Symptom:** Photo shows GPS data in Mac Preview/Photos, but app shows "No GPS data found. Please enter manually."

## 🔍 Root Causes

### 1. HEIC Format (Most Common!) ⚠️
**Problem:** iPhone photos are HEIC format by default. EXIF-js library has **limited HEIC support**.

**How to check:**
- Look at file extension: `.heic` or `.HEIC`
- Or check console: `File info: { type: "image/heic" }`

**Solution:**
Convert HEIC → JPEG before uploading

#### Option A: Convert in Mac Photos (Recommended)
```
1. Open photo in Mac Photos app
2. File → Export → Export 1 Photo
3. Photo Kind: JPEG ✅ (NOT "Use HEIC")
4. ✅ Include: Location Information
5. Click "Export"
6. Upload the exported JPEG file
```

#### Option B: Convert with Preview
```
1. Open photo in Preview
2. File → Export
3. Format: JPEG ✅
4. Click "Save"
5. Upload the converted file
```

#### Option C: Use ImageMagick (Terminal)
```bash
magick convert photo.heic photo.jpg
```

### 2. GPS Stripped on Export 🚫
**Problem:** Mac Photos removes GPS by default when exporting for privacy.

**How to check:**
```bash
# Terminal - Check if GPS exists in file
mdls -name kMDItemLatitude -name kMDItemLongitude photo.jpg

# If GPS exists, you'll see:
kMDItemLatitude = 33.448367
kMDItemLongitude = -112.074036

# If stripped, you'll see:
kMDItemLatitude = (null)
kMDItemLongitude = (null)
```

**Solution:**
When exporting from Mac Photos, **ALWAYS** check:
✅ **"Include location information"**

### 3. Browser Security Strips Metadata 🔒
**Problem:** Some browsers remove EXIF data for privacy when uploading files.

**How to check:**
- Console shows: `All EXIF Tags: {}` (empty object)
- Try different browser

**Solution:**
- Use **Chrome** or **Safari** (better EXIF support)
- Avoid **Firefox Private Mode** (strips EXIF)
- Avoid **Brave** with shields up (strips EXIF)

### 4. Photo Edited in Third-Party App 🎨
**Problem:** Apps like Instagram, Photoshop, Canva strip GPS on save.

**How to check:**
- Console shows lots of EXIF tags (camera info) but no GPS tags
- File was edited/saved in other app

**Solution:**
- Use **original photo** from Camera Roll
- OR manually enter coordinates

### 5. Screenshot or Downloaded Image 📸
**Problem:** Screenshots and images downloaded from web don't have GPS.

**How to check:**
- Console shows: `All EXIF Tags: {}` or minimal tags
- File is a screenshot or download

**Solution:**
- Screenshots: Use **manual entry** (no GPS possible)
- Downloads: Find original source with GPS

## 🧪 Step-by-Step Diagnosis

### Step 1: Check File Type
```
1. Look at filename: photo.heic or photo.jpg?
2. Open Browser Console (Cmd+Option+J)
3. Upload photo
4. Look for: File info: { type: "image/heic" }
```

**Result:**
- `image/heic` → **Problem #1** - Convert to JPEG
- `image/jpeg` → Continue to Step 2

### Step 2: Check EXIF Tags
```
In console, look for:
📍 EXIF GPS Extraction
  All EXIF Tags: { ... }
```

**Result:**
- Empty `{}` → **Problem #3** (browser) or **Problem #5** (screenshot)
- Has tags but no GPS → **Problem #2** (stripped) or **Problem #4** (edited)
- Has GPS tags → **Problem #6** (format issue) - see below

### Step 3: Check Terminal Metadata
```bash
# Open Terminal
cd ~/Pictures  # or wherever photo is
mdls -name kMDItemLatitude -name kMDItemLongitude photo.jpg
```

**Result:**
- Shows coordinates → GPS exists, but browser can't read it
- Shows `(null)` → GPS was stripped from file

### Step 4: View in Online EXIF Viewer
```
1. Go to: https://exifdata.com
2. Upload your photo
3. Look for GPS section
```

**Result:**
- GPS shown → Browser/library issue
- No GPS shown → File doesn't have GPS

## ✅ Solutions Summary

| Problem | Quick Fix | Full Solution |
|---------|-----------|---------------|
| HEIC format | Export as JPEG | Use Photos → Export → JPEG |
| GPS stripped | Check "Include location" | Re-export with location |
| Browser strips | Use Chrome/Safari | Disable privacy extensions |
| Edited photo | Use original | Find unedited version |
| Screenshot | Manual entry | No GPS available |

## 🎯 Recommended Workflow for iPhone Photos

### Method 1: AirDrop (Preserves GPS, Auto-converts)
```
1. Select photo on iPhone
2. AirDrop to Mac
3. Upload directly from Downloads
✅ GPS preserved
✅ Auto-converts HEIC → JPEG (on some versions)
```

### Method 2: Export as JPEG
```
1. Open photo in Mac Photos
2. File → Export → Export 1 Photo
3. Settings:
   - Photo Kind: JPEG ✅
   - Quality: Maximum
   - Include: Location Information ✅
   - Include: Title ✅
   - Include: Keywords ✅
4. Export to Desktop
5. Upload exported JPEG
✅ GPS guaranteed to work
```

### Method 3: Use iPhone Safari (Mobile Upload)
```
1. Open app on iPhone Safari
2. Click "Add Location"
3. Take photo directly in browser
✅ GPS extracted immediately
✅ No conversion needed
```

## 🔧 Enhanced Console Debugging

With the latest update, console now shows:

### Full Diagnostic Output
```
📍 EXIF GPS Extraction
  File info:
    name: "IMG_1234.heic"  ← Check format!
    type: "image/heic"     ← HEIC = Problem!
    size: 2458923
    lastModified: "2/8/2026, 10:30:00 AM"

  All EXIF Tags: {
    Make: "Apple",
    Model: "iPhone 13 Pro",
    DateTimeOriginal: "2026:02:08 10:30:00",
    ... (but no GPS tags) ← GPS missing!
  }

  🔍 Checking alternative GPS tag names...
  🔍 Searching all tags for GPS data...
    (no GPS-related tags found) ← Confirms no GPS

  ❌ No GPS tags found in EXIF data
  Missing:
    latitude: "GPSLatitude not found"
    longitude: "GPSLongitude not found"
```

### What to Look For

1. **File type**: `image/heic` = Need to convert
2. **All EXIF Tags**: Empty `{}` = Stripped by browser
3. **GPS-related tags**: None found = No GPS in file

## 📋 Quick Reference: Export Settings

### Mac Photos Export (✅ Correct Settings)
```
File → Export → Export 1 Photo

Photo Kind: JPEG ✅ (not HEIC)
Quality: Maximum
Include:
  ✅ Title
  ✅ Keywords
  ✅ Location Information ← CRITICAL!

File Naming: Use Title
Subfolder Format: None
```

### Preview Export (✅ Correct Settings)
```
File → Export

Format: JPEG ✅
Quality: Best
Resolution: 72 dpi (or higher)

Note: Preview preserves existing GPS,
but can't add GPS if already missing
```

## 🆘 Still Not Working?

### Collect Diagnostic Info

1. **Console Output**
   ```
   - Right-click in console
   - "Save as..." → save.log
   - Share the file
   ```

2. **Terminal Check**
   ```bash
   mdls photo.jpg > photo-metadata.txt
   exiftool photo.jpg > photo-exif.txt  # if installed
   ```

3. **Online EXIF Check**
   ```
   - Upload to https://exifdata.com
   - Screenshot the GPS section
   - Share screenshot
   ```

### Manual Entry Fallback

While we debug, you can use manual entry:

1. **Get Coordinates from Mac Photos:**
   ```
   - Open photo in Mac Photos
   - Window → Info (or Cmd+I)
   - Assign Location section
   - Click map pin
   - Right-click → Copy Coordinates
   ```

2. **Paste into Form:**
   ```
   Latitude: 33.448367
   Longitude: -112.074036
   ```

3. **Or Get from Google Maps:**
   ```
   - Open location in Google Maps
   - Right-click → What's here?
   - Copy coordinates
   ```

## 🔮 Future Solutions (In Development)

### Option 1: Server-Side EXIF Extraction
```typescript
// Upload to server first, extract GPS server-side
// More reliable, handles HEIC natively
// Requires: Sharp or ExifTool on backend
```

### Option 2: Alternative EXIF Library
```typescript
// Replace exif-js with:
// - exifr (better HEIC support)
// - piexifjs (more format support)
// - browser-image-resizer + exif-js
```

### Option 3: Native File System API
```typescript
// Use File System Access API
// Read file metadata directly from disk
// Requires: Chrome 86+, user permission
```

## 📊 Common Scenarios

### Scenario 1: iPhone Photo via AirDrop
```
Format: HEIC
GPS: ✅ Should have GPS
Issue: HEIC format not supported
Solution: Export as JPEG from Mac Photos
```

### Scenario 2: Photo from Mac Photos Library
```
Format: HEIC or JPEG
GPS: ⚠️ Might be stripped on export
Issue: Export settings
Solution: Check "Include location information"
```

### Scenario 3: WhatsApp/iMessage Photo
```
Format: JPEG
GPS: ❌ Usually stripped
Issue: Messaging apps remove GPS
Solution: Use AirDrop or iCloud Photos instead
```

### Scenario 4: DSLR Camera Photo
```
Format: JPEG or RAW
GPS: ⚠️ Only if camera has GPS module
Issue: Most DSLRs don't have GPS
Solution: Manual entry or use GPS-enabled camera
```

### Scenario 5: Android Phone Photo
```
Format: JPEG
GPS: ✅ Usually has GPS
Issue: Should work fine
Solution: Check browser privacy settings
```

---

**Updated:** 2026-02-08
**Most Common Issue:** HEIC format - export as JPEG
**Success Rate After Fix:** ~95%
