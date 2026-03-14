# Asset Optimization Protocols: EE_manager (Unified V2.0)

## ⚠️ CRITICAL RULING — NuxtImg / NuxtPicture BANNED

**`<NuxtImg>` and `<NuxtPicture>` are PROHIBITED in this project.**

**Reason:** Caused rendering failures on iPhone (Safari/iOS WebKit). The Nuxt Image module's
on-the-fly transformation pipeline produced broken or missing images on mobile Safari,
causing visible regressions for field staff using iPhones.

**Date confirmed by user:** 2026-03-14

### Correct Pattern — Native `<img>` tag

```vue
<img
  :src="imageUrl"
  :alt="description"
  loading="lazy"
  class="..."
  @error="($event.target as HTMLImageElement).style.display='none'"
/>
```

### For AI Agents (Builders)

- **Do NOT use `<NuxtImg>`** — it is banned.
- **Do NOT use `<NuxtPicture>`** — it is banned.
- **Always use native `<img>` tags** with `loading="lazy"`.
- Add an `@error` handler to gracefully hide broken images.
- Do NOT add `format="webp"` — the native `<img>` tag does not support format conversion; images are served as-is from Supabase Storage.

---

## Previous Guidance (SUPERSEDED — DO NOT FOLLOW)

The original V1.0 of this document mandated `<NuxtImg format="webp">` for all images.
That guidance is now void. Any existing `<NuxtImg>` instances found in the codebase
should be replaced with native `<img>` tags on the next touch of that file.
