# Standardized Image System API

This document outlines the standardized pattern for image interactions across the application. It leverages `@nuxt/image` for optimization and a shared state composable for modal synchronization.

## Core Components

### 1. `ImageGalleryItem.vue`
The primary UI component for displaying images in a layout (grid, sidebar, or hero).

**Props:**
- `src` (required): The path or URL to the image.
- `alt` (optional): Descriptive text for the image.
- `aspectRatio` (optional): CSS class for height/ratio (e.g., `aspect-video`, `h-[400px]`). Defaults to `aspect-video`.

**Key Features:**
- **Auto-Optimization**: Uses `NuxtImg` with WebP format and 80% quality.
- **Hover Transitions**: Groups hover effects for "Open Large" and "Open Original" (new tab).
- **Responsive Sizing**: Configured with `sizes` for different breakpoints.

---

### 2. `useImageActions.ts`
A shared state composable that manages the visibility and content of the image modal.

**Usage:**
```typescript
const { isModalOpen, activeImage, openImageModal } = useImageActions()
```

**Implementation Detail**: Uses Nuxt's `useState` to ensure that clicking an `ImageGalleryItem` (a child or sibling) correctly triggers the `ImageModal` regardless of component depth.

---

### 3. `ImageModal.vue`
A specialized modal component for high-fidelity image viewing.

**Props:**
- `modelValue` (v-model): Boolean visibility.
- `src`: Image source.
- `alt`: Title/Alt text.

**Visual Standard**:
- **Boxing**: Uses the regular `SimpleModal` boxed card layout.
- **Background**: Transparent `bg-gray-900/40` with backdrop blur.
- **Scaling**: Enforces a `min-w-[800px]` (on desktop) to ensure small images are effectively enlarged.

---

### 4. `SimpleModal.vue`
The foundational modal component.

**New Props:**
- `seamless`: Removes the card wrapper for immersive content.
- `description`: Sub-header text below the title.
- `noPadding`: Removes the internal `p-8` for edge-to-edge content (like photos).

---

## Standard Process for Adding Photos

1. **In the Template**: Use `ImageGalleryItem` instead of raw `NuxtImg`.
2. **On the Page**: Include a single instance of `ImageModal`.
3. **State Hook**: Call `useImageActions()` to sync the visibility state.

```vue
<script setup>
const { isModalOpen, activeImage } = useImageActions()
</script>

<template>
  <div>
    <ImageGalleryItem :src="path" alt="Label" />
    
    <ImageModal 
      v-model="isModalOpen" 
      :src="activeImage.src" 
      :alt="activeImage.alt" 
    />
  </div>
</template>
```

---

## Message to Foreman (Handover)

> [!IMPORTANT]
> **Foreman**: Please index this `Image System API` for global use. When the USER asks to add photos, floor plans, or galleries to any page, ALWAYS use this pattern. Do not implement custom `UModal` or `NuxtImg` logic for enlargement.
> 
> **Standard locations**:
> - Components: `layers/base/components/ImageGalleryItem.vue`
> - Modal: `layers/base/components/modals/ImageModal.vue`
> - Composable: `layers/base/composables/useImageActions.ts`
> 
> This ensures every photo interaction in the app is optimized, properly centered, and has the standardized translucent overlay.
