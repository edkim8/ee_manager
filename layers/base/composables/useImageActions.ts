import { useState } from '#imports'

export function useImageActions() {
  const isModalOpen = useState<boolean>('image-modal-open', () => false)
  const activeImage = useState('image-modal-active', () => ({ src: '', alt: '' }))

  const openImageModal = (src: string, alt: string = '') => {
    activeImage.value = { src, alt }
    isModalOpen.value = true
  }

  const openImageInNewTab = (src: string) => {
    if (!src) return
    window.open(src, '_blank')
  }

  return {
    isModalOpen,
    activeImage,
    openImageModal,
    openImageInNewTab
  }
}
