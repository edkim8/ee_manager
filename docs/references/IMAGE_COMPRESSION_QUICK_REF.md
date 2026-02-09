# Image Compression Quick Reference

**For AI Agents**: Use this pattern when implementing ANY photo upload feature.

---

## ⚡ Quick Start

### 1. Import the composable
```typescript
import { useImageCompression } from './useImageCompression'
```

### 2. Compress before upload
```typescript
const uploadPhoto = async (file: File) => {
  // Compress the image
  const { compressLocationImage } = useImageCompression()
  const compressed = await compressLocationImage(file)

  // Upload compressed version
  const { data, error } = await supabase.storage
    .from('images')
    .upload(filePath, compressed)  // Use compressed, not original
}
```

### 3. Use .jpg extension
```typescript
// Images are converted to JPEG by compression
const fileName = `${randomId()}-${Date.now()}.jpg`  // Always .jpg
```

---

## 📦 Available Functions

### `compressLocationImage(file: File): Promise<File>`
**Use for**: Location photos, property photos, general asset images
- Max: 1200px, 85% quality, ~800KB
- Fast compression for reference photos

### `compressNoteAttachment(file: File): Promise<File>`
**Use for**: Documentation photos, inspection photos, detailed images
- Max: 1600px, 88% quality, ~1.2MB
- Higher quality for important documentation
- **Auto-skips non-images** (PDFs, docs)

### `createThumbnail(file: File): Promise<File>`
**Use for**: Preview images, list views, galleries
- Max: 300px, 75% quality, ~100KB
- Very small for fast loading

---

## 🎯 Implementation Checklist

When adding photo upload to ANY feature:

- [ ] Import `useImageCompression`
- [ ] Call compression function before upload
- [ ] Change file extension to `.jpg`
- [ ] Update error messages (remove size limit mentions)
- [ ] Test with large HEIC/PNG photos
- [ ] Verify console shows compression stats

---

## 📊 Performance Expectations

| Original | Compressed | Reduction | Time |
|----------|------------|-----------|------|
| 6MB HEIC | ~600KB JPG | 90% | 1-3s |
| 3MB PNG | ~400KB JPG | 87% | 0.5-1s |
| 8MB RAW | ~800KB JPG | 90% | 2-4s |

**Total upload time**: 2-3.5 seconds (vs 5+ seconds uncompressed)

---

## ⚠️ Common Mistakes

### ❌ DON'T: Upload original file
```typescript
await supabase.storage.from('images').upload(path, file)  // BAD
```

### ✅ DO: Compress first
```typescript
const compressed = await compressLocationImage(file)
await supabase.storage.from('images').upload(path, compressed)  // GOOD
```

### ❌ DON'T: Keep original extension
```typescript
const ext = file.name.split('.').pop()  // Could be .HEIC, .PNG
const fileName = `photo.${ext}`  // BAD
```

### ✅ DO: Use .jpg
```typescript
const fileName = `photo.jpg`  // GOOD - compression converts to JPEG
```

### ❌ DON'T: Compress documents
```typescript
const compressed = await compressNoteAttachment(pdfFile)  // Unnecessary
```

### ✅ DO: Use smart compression
```typescript
// compressNoteAttachment auto-detects and skips non-images
const processed = await compressNoteAttachment(file)  // GOOD
```

---

## 🔍 Debugging

### Check compression is working:
Look for console output:
```
🖼️ Compressing location image: { original: "6.23 MB" }
✅ Location image compressed: { compressed: "687 KB", reduction: "89%" }
```

### If compression fails:
```
❌ Compression failed, using original: [error]
```
- Check browser compatibility
- Verify file is valid image
- Check Web Worker support

### If files are still large:
- Verify you're uploading `compressed`, not `file`
- Check compression settings in `useImageCompression.ts`
- Ensure proper function (location vs attachment)

---

## 📚 Reference Files

**Implementation**: `layers/ops/composables/useImageCompression.ts`
**Example Usage**: `layers/ops/composables/useLocationService.ts`
**Full Documentation**: `docs/handovers/H-033_LOCATION_NOTES_IMAGE_COMPRESSION.md`
**Protocol**: `docs/governance/FOREMAN_PROTOCOLS.md` (Law #5)

---

## 🚀 Copy-Paste Template

```typescript
// Add to any composable with photo upload
import { useImageCompression } from './useImageCompression'

export const useYourFeature = () => {
  const supabase = useSupabaseClient()

  const uploadPhoto = async (file: File) => {
    // Compress image
    const { compressLocationImage } = useImageCompression()
    const compressed = await compressLocationImage(file)

    // Generate filename with .jpg extension
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.jpg`
    const filePath = `your-folder/${fileName}`

    // Upload compressed version
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, compressed)

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  return { uploadPhoto }
}
```

---

**Last Updated**: 2026-02-08
**Pattern Established By**: H-033 Location Notes Implementation
