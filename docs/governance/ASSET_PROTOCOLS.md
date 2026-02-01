# Asset Optimization Protocols: EE_manager (Unified V1.0)

## 1. THE GOLDEN RULE
**Every** non-vector image asset (JPG, PNG) MUST be served via `<NuxtImg>` or `<NuxtPicture>` with high-efficiency formatting enabled.

## 2. FORMAT MANDATE
- **Default**: Use `format="webp"` for all standard images.
- **Aggressive**: Use `<NuxtPicture> format="avif,webp"` for large hero sections or detail images to ensure maximum compression.
- **Fallback**: Native browser fallback to JPG/PNG is handled automatically by Nuxt Image—do not manually specify fallbacks unless for critical legacy reasons.

## 3. KEY ATTRIBUTES CHECKLIST
| Attribute | Requirement | Rationale |
|-----------|-------------|-----------|
| `placeholder` | **Mandatory** | Prevents Layout Shift (CLS) and improves perceived performance. |
| `sizes` | **Highly Recommended** | Generates responsive `srcset` to prevent loading 4K images on mobile. |
| `loading` | `lazy` (Default) | Improves initial page load by deferring off-screen images. |
| `quality` | `80` (Default) | Best balance between file size and visual fidelity. |

## 4. CODE STANDARDS

### Standard Component
```vue
<NuxtImg 
  src="/path/to/image.jpg" 
  format="webp"
  sizes="sm:100vw md:50vw lg:400px"
  placeholder
/>
```

### High Fidelity (Hero/Detail)
```vue
<NuxtPicture 
  src="/path/to/hero.png" 
  format="avif,webp"
  placeholder
/>
```

## 5. FOR AI AGENTS (BUILDERS)
- **Do NOT** use native `<img>` tags.
- **Always** add `format="webp"` to `<NuxtImg>` calls.
- **Verification**: Check the browser network tab to ensure images are being served as `.webp` or `.avif`.
