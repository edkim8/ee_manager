import imageCompression from 'browser-image-compression'

/**
 * Image Compression Utility
 * Compresses images client-side before upload to reduce storage and bandwidth
 */
export const useImageCompression = () => {
  /**
   * Compress location photo
   * Target: Web-optimized quality, good for location reference
   * Output: ~200-500KB for typical photos
   */
  const compressLocationImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.8,              // Target ~800KB max
      maxWidthOrHeight: 1200,       // Max dimension 1200px
      useWebWorker: true,           // Use Web Worker for better performance
      fileType: 'image/jpeg',       // Convert to JPEG for consistency
      initialQuality: 0.85          // 85% quality - good balance
    }

    try {
      const compressed = await imageCompression(file, options)
      return compressed
    } catch (error) {
      console.error('❌ Compression failed, using original:', error)
      return file // Fallback to original if compression fails
    }
  }

  /**
   * Compress note attachment photo
   * Target: Higher quality for documentation purposes
   * Output: ~500KB-1MB for typical photos
   */
  const compressNoteAttachment = async (file: File): Promise<File> => {
    // Only compress images, not documents
    if (!file.type.startsWith('image/')) {
      return file
    }

    const options = {
      maxSizeMB: 1.2,               // Target ~1.2MB max (higher quality for notes)
      maxWidthOrHeight: 1600,       // Max dimension 1600px (better detail)
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.88          // 88% quality - higher for documentation
    }

    try {
      const compressed = await imageCompression(file, options)
      return compressed
    } catch (error) {
      console.error('❌ Compression failed, using original:', error)
      return file // Fallback to original if compression fails
    }
  }

  /**
   * Create thumbnail for preview
   * Optional: Use if you want to generate thumbnails
   */
  const createThumbnail = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.1,               // Very small (~100KB)
      maxWidthOrHeight: 300,        // Thumbnail size
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.75          // Lower quality is fine for thumbnails
    }

    try {
      const thumbnail = await imageCompression(file, options)
      return thumbnail
    } catch (error) {
      console.error('❌ Thumbnail creation failed:', error)
      return file
    }
  }

  return {
    compressLocationImage,
    compressNoteAttachment,
    createThumbnail
  }
}
