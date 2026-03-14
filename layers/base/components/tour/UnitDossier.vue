<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useHead } from '#imports'
import type { Attachment } from '../../composables/useAttachments'
import { useTourState } from '../../composables/useTourState'

interface UnitData {
  unit_id?: string | null
  unit_name: string
  floor_plan_name?: string | null
  b_b?: string | null
  sf?: number | null
  rent_offered?: number | null
  available_date?: string | null
  status?: string | null
  building_name?: string | null
  vacant_days?: number | null
}


const NEIGHBORHOOD_TABS = [
  { id: 'map',       label: 'Map',      icon: 'i-heroicons-map-pin'           },
  { id: 'walkscore', label: 'Walk',     icon: 'i-heroicons-bolt'              },
  { id: 'instagram', label: 'Instagram',icon: 'i-heroicons-camera'            },
  { id: 'facebook',  label: 'Facebook', icon: 'i-heroicons-user-group'        },
  { id: 'website',   label: 'Website',  icon: 'i-heroicons-globe-alt'         },
  { id: 'sitemap',   label: 'Site Map', icon: 'i-heroicons-building-office-2' },
] as const

type NeighborhoodTabId = typeof NEIGHBORHOOD_TABS[number]['id']

const props = defineProps<{
  unit: UnitData
  /** Full property address string — used by Walk Score widget */
  propertyAddress?: string
  /** Walk Score widget ID (wsid) — stored in properties.walk_score_id */
  walkScoreId?: string | null
  /** Lat/lng from properties table — used for Google Maps embed (preferred over address string) */
  latitude?: number | null
  longitude?: number | null
  /** Social/digital presence URLs from properties table */
  websiteUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  siteMapUrl?: string | null
}>()

// ── Page navigation ─────────────────────────────────────────────────────
const PAGE_DEFS = [
  { icon: 'i-heroicons-photo',          label: 'Photos'       },
  { icon: 'i-heroicons-document-text',  label: 'Specs'        },
  { icon: 'i-heroicons-map',            label: 'Floor Plan'   },
  { icon: 'i-heroicons-globe-alt',      label: 'Neighborhood' },
]

// ── Gesture guide data (rendered in the help overlay) ────────────────────
// NOTE: 2-finger is intentionally reserved for native iPadOS pinch-to-zoom.
//       4-finger is reserved for iPadOS system functions (app switcher, home).
//       Enter/Exit Presentation Mode uses the ↙/↗ button (top-right corner).
const GESTURE_GUIDE = [
  {
    fingers: 1, arrow: '← →', color: 'bg-gray-300 dark:bg-gray-600',
    label: 'Previous / Next Photo',
    description: 'Swipe left or right on the Photo gallery to browse all unit photos.',
  },
  {
    fingers: 3, arrow: '← →', color: 'bg-primary-500',
    label: 'Previous / Next Page',
    description: 'Swipe left or right to navigate between Photos, Specs, Floor Plan, and Neighborhood.',
  },
  {
    fingers: 3, arrow: '↓', color: 'bg-primary-500',
    label: 'Toggle Tab Bar',
    description: 'Swipe down to show or hide the page tab bar. Swipe again to toggle.',
  },
]

const scrollRef = ref<HTMLElement | null>(null)
const stripRef = ref<HTMLElement | null>(null)
const currentPage = ref(0)

const onScroll = () => {
  if (!scrollRef.value) return
  currentPage.value = Math.round(scrollRef.value.scrollLeft / scrollRef.value.clientWidth)
}

const scrollToPage = (index: number) => {
  if (!scrollRef.value) return
  scrollRef.value.scrollTo({ left: index * scrollRef.value.clientWidth, behavior: 'smooth' })
}

// ── Generic Mouse Drag-to-Scroll (for Chrome desktop without trackpad) ──
const useDragScroll = (el: import('vue').Ref<HTMLElement | null>) => {
  let isDown = false;
  let startX: number;
  let scrollLeft: number;

  const onMouseDown = (e: MouseEvent) => {
    if (!el.value) return;
    isDown = true;
    startX = e.pageX - el.value.offsetLeft;
    scrollLeft = el.value.scrollLeft;
  };
  const onMouseLeave = () => { isDown = false; };
  const onMouseUp = () => { isDown = false; };
  const onMouseMove = (e: MouseEvent) => {
    if (!isDown || !el.value) return;
    e.preventDefault();
    const x = e.pageX - el.value.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag speed multiplier
    el.value.scrollLeft = scrollLeft - walk;
  };

  onMounted(() => {
    el.value?.addEventListener('mousedown', onMouseDown);
    el.value?.addEventListener('mouseleave', onMouseLeave);
    el.value?.addEventListener('mouseup', onMouseUp);
    el.value?.addEventListener('mousemove', onMouseMove);
  });
  onUnmounted(() => {
    el.value?.removeEventListener('mousedown', onMouseDown);
    el.value?.removeEventListener('mouseleave', onMouseLeave);
    el.value?.removeEventListener('mouseup', onMouseUp);
    el.value?.removeEventListener('mousemove', onMouseMove);
  });
}

useDragScroll(scrollRef)
useDragScroll(stripRef)

const { isPresenting } = useTourState()

// ── Chrome visibility (Presentation Mode chrome reveal) ─────────────────
// In Presentation Mode the tab bar is hidden. A 3-finger swipe ↓ temporarily
// reveals it (plus a Neighborhood submenu on the last page). 3-finger ↑ hides it.
const tabBarVisible = ref(false)
const showGestureHelp = ref(false)

// Reset when leaving Presentation Mode so the next session starts clean
watch(isPresenting, (val) => { if (!val) tabBarVisible.value = false })

// Auto-reveal tab bar when navigating to the Neighborhood page (pg 3).
// Google Maps iframe captures all touch events — 3-finger gestures cannot
// fire from inside it, so the user needs the tab buttons to navigate away.
watch(currentPage, (val) => { if (val === 3 && isPresenting.value) tabBarVisible.value = true })

// ── Touch Gesture System ─────────────────────────────────────────────────
//
//  Finger  │ Direction  │ Action
//  ────────┼────────────┼───────────────────────────────────────────────
//  1       │ ← →        │ Previous / Next photo (gallery page only)
//  3       │ ← →        │ Previous / Next dossier page
//  3       │ ↓          │ Toggle tab bar visibility
//
//  2-finger intentionally unhandled — reserved for native pinch-to-zoom.
//  4-finger intentionally unhandled — reserved for iPadOS system gestures.
//  Enter/Exit Presentation Mode uses the ↙/↗ button (top-right corner).
//
// NOTE: touchmove registered { passive: false } so preventDefault() is allowed.

let _touchCount = 0
let _touchStartX = 0
let _touchStartY = 0
let _touchOnStrip = false  // true when touch started on the thumbnail strip

const onDossierTouchStart = (e: TouchEvent) => {
  _touchCount = e.touches.length
  _touchStartX = e.touches[0].clientX
  _touchStartY = e.touches[0].clientY
  // Track whether the touch originated inside the thumbnail strip so we can
  // let the strip scroll natively while the hero handles photo swipes.
  _touchOnStrip = !!(stripRef.value?.contains(e.target as Node))
}

const onDossierTouchMove = (e: TouchEvent) => {
  const dx = Math.abs(e.touches[0].clientX - _touchStartX)
  const dy = Math.abs(e.touches[0].clientY - _touchStartY)
  // 3-finger horizontal → prevent native scroll (we handle page navigation)
  if (_touchCount === 3 && dx > dy && dx > 8) { e.preventDefault(); return }
  // 3-finger vertical → prevent native scroll (we handle tab bar toggle)
  if (_touchCount === 3 && dy > dx && dy > 8) { e.preventDefault(); return }
  // 1-finger horizontal on the hero → prevent native page scroll (photo nav).
  // Skip if touch started on the thumbnail strip — let the strip scroll natively.
  if (_touchCount === 1 && dx > dy && dx > 8 && !_touchOnStrip) e.preventDefault()
}

const onDossierTouchEnd = (e: TouchEvent) => {
  const dx = e.changedTouches[0].clientX - _touchStartX
  const dy = e.changedTouches[0].clientY - _touchStartY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  // ── 3-finger ────────────────────────────────────────────────────────
  if (_touchCount === 3) {
    if (absDx > 60 && absDx > absDy * 1.2) {
      // ← → Page navigation
      if (dx < 0) scrollToPage(Math.min(PAGE_DEFS.length - 1, currentPage.value + 1))
      else        scrollToPage(Math.max(0, currentPage.value - 1))
    } else if (absDy > 60 && absDy > absDx * 1.2) {
      // ↓ Toggle tab bar (swipe direction doesn't matter — one gesture, one toggle)
      tabBarVisible.value = !tabBarVisible.value
    }
    return
  }

  // ── 1-finger horizontal on gallery → photo navigation ───────────────
  if (_touchCount === 1 && currentPage.value === 0 && absDx > 40 && absDx > absDy) {
    if (photos.value.length > 1) {
      if (dx < 0) heroIndex.value = Math.min(photos.value.length - 1, heroIndex.value + 1)
      else        heroIndex.value = Math.max(0, heroIndex.value - 1)
    }
  }
}

onMounted(() => {
  scrollRef.value?.addEventListener('scroll', onScroll, { passive: true })
  scrollRef.value?.addEventListener('touchstart', onDossierTouchStart, { passive: true })
  scrollRef.value?.addEventListener('touchmove', onDossierTouchMove, { passive: false })
  scrollRef.value?.addEventListener('touchend', onDossierTouchEnd, { passive: true })
})

onUnmounted(() => {
  scrollRef.value?.removeEventListener('scroll', onScroll)
  scrollRef.value?.removeEventListener('touchstart', onDossierTouchStart)
  scrollRef.value?.removeEventListener('touchmove', onDossierTouchMove)
  scrollRef.value?.removeEventListener('touchend', onDossierTouchEnd)
})

// ── Formatting ──────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toLocaleString()}` : '—'

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  if (d <= today) return 'Now'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Urgency tag (prospect-facing; based on vacant_days) ─────────────────
const urgencyTag = computed(() => {
  const days = props.unit.vacant_days
  if (days == null) return null
  if (days <= 5)  return { label: 'Just Listed', classes: 'bg-emerald-500 text-white' }
  if (days <= 14) return { label: 'New',         classes: 'bg-sky-500 text-white' }
  if (days > 60)  return { label: 'Great Deal',  classes: 'bg-amber-500 text-white' }
  return null
})

// ── Photo Gallery (Page 1) ──────────────────────────────────────────────
import { useAttachments } from '../../composables/useAttachments'
const { fetchAttachments } = useAttachments()
const photos = ref<Attachment[]>([])
const heroIndex = ref(0)
const photosLoading = ref(false)

watch(
  () => props.unit.unit_id,
  async (id) => {
    photos.value = []
    heroIndex.value = 0
    if (!id) return
    photosLoading.value = true
    try {
      const all = await fetchAttachments(id, 'unit')
      photos.value = all.filter((a: any) => a.file_type === 'image')
    } finally {
      photosLoading.value = false
    }
  },
  { immediate: true }
)

// ── Neighborhood / Walk Score ───────────────────────────────────────────
const hasAddress = computed(() => !!props.propertyAddress)

// Google Maps embed — prefer lat/lng coordinates, fall back to address string
// z=17 with coordinates gives a tight property-level view (whole complex, ~1 block radius)
const mapSrc = computed((): string | null => {
  if (props.latitude && props.longitude) {
    return `https://maps.google.com/maps?q=${props.latitude},${props.longitude}&t=&z=17&ie=UTF8&iwloc=&output=embed`
  }
  if (props.propertyAddress) {
    const q = encodeURIComponent(props.propertyAddress)
    return `https://maps.google.com/maps?q=${q}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  }
  return null
})

// ── Neighborhood tab state ───────────────────────────────────────────────
const activeNeighborhoodTab = ref<NeighborhoodTabId>('map')

// Instagram and Facebook block all iframe embedding via X-Frame-Options / CSP.
// For these tabs we skip the iframe entirely and show a tap-to-open card.
const OPEN_ONLY_TABS = new Set<NeighborhoodTabId>(['instagram', 'facebook'])

// URL for the currently active iframe-based tab (null = not configured)
const neighborhoodIframeUrl = computed((): string | null => {
  switch (activeNeighborhoodTab.value) {
    case 'map':       return mapSrc.value
    case 'instagram': return props.instagramUrl ?? null
    case 'facebook':  return props.facebookUrl  ?? null
    case 'website':   return props.websiteUrl   ?? null
    case 'sitemap':   return props.siteMapUrl   ?? null
    default:          return null
  }
})

const openExternal = (url: string | null) => {
  if (!url || !import.meta.client) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

// Walk Score: inject config vars + widget script via useHead when wsid is provided.
// The widget finds <div id="ws-walkscore-tile"> automatically after the script loads.
if (import.meta.client && props.walkScoreId && props.propertyAddress) {
  useHead({
    script: [
      {
        key: 'ws-config',
        innerHTML: [
          `var ws_wsid = '${props.walkScoreId}';`,
          `var ws_address = '${props.propertyAddress.replace(/'/g, "\\'")}';`,
          `var ws_format = 'simple';`,
          `var ws_width = 600;`,
          `var ws_height = 200;`,
        ].join(' '),
      },
      {
        key: 'ws-widget',
        src: 'https://www.walkscore.com/tile/show-walkscore-tile.php',
        defer: true,
      },
    ],
  })
}
</script>

<template>
  <div class="relative flex flex-col h-full">

    <!-- Page Tab Bar — always visible in normal mode;
         in Presentation Mode, revealed by 3-finger ↓ (hidden by 3-finger ↑) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out overflow-hidden"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-20 opacity-100"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="max-h-20 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="!isPresenting || tabBarVisible" class="flex-shrink-0 flex items-center justify-around border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-2">
        <button
          v-for="(page, i) in PAGE_DEFS"
          :key="i"
          type="button"
          class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[52px] transition-all rounded-lg mx-0.5 my-1"
          :class="currentPage === i
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30'
            : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'"
          @click="scrollToPage(i)"
        >
          <UIcon :name="page.icon" class="w-4 h-4" />
          <span class="text-[9px] font-black uppercase tracking-wider">{{ page.label }}</span>
        </button>

        <!-- Gesture help button — lives in the tab bar so it's always reachable -->
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[52px] min-w-[44px] transition-all rounded-lg mx-0.5 my-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
          title="Gesture guide"
          @click="showGestureHelp = true"
        >
          <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" />
          <span class="text-[9px] font-black uppercase tracking-wider">Help</span>
        </button>
      </div>
    </Transition>

    <!-- Neighborhood Quick-Access Submenu
         Slides in below the tab bar when chrome is revealed via gesture on the Neighborhood page -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out overflow-hidden"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-20 opacity-100"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="max-h-20 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div
        v-if="tabBarVisible && currentPage === 3"
        class="flex-shrink-0 flex bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700"
      >
        <button
          v-for="tab in NEIGHBORHOOD_TABS"
          :key="tab.id"
          type="button"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] transition-all"
          :class="activeNeighborhoodTab === tab.id
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50/60 dark:bg-primary-950/20'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'"
          @click="activeNeighborhoodTab = tab.id; scrollToPage(3)"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          <span class="text-[8px] font-black uppercase tracking-wide">{{ tab.label }}</span>
        </button>
      </div>
    </Transition>

    <!-- Horizontal Scroll Snap Container -->
    <div
      ref="scrollRef"
      class="dossier-scroll flex flex-1 min-h-0 cursor-grab active:cursor-grabbing"
      style="overflow-x: scroll; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none;"
    >

      <!-- ── Page 1: Photo Gallery ──────────────────────────────────── -->
      <!-- Portrait:  hero (top, flex-1)  + strip (bottom, horizontal row)  -->
      <!-- Landscape: strip (left panel)  + hero (right, flex-1)            -->
      <section
        class="flex-shrink-0 w-full h-full overflow-hidden"
        style="scroll-snap-align: start;"
      >
        <div class="page1-layout">

          <!-- Hero photo -->
          <div
            class="page1-hero relative overflow-hidden flex items-center justify-center"
            :class="photos.length ? 'bg-black' : 'bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-950/40 dark:to-primary-900/30'"
          >
            <!-- Loading pulse -->
            <div v-if="photosLoading" class="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" />

            <!-- Real photo -->
            <img
              v-else-if="photos.length"
              :key="heroIndex"
              :src="photos[heroIndex]?.file_url"
              :alt="`${unit.unit_name} — photo ${heroIndex + 1} of ${photos.length}`"
              class="absolute inset-0 w-full h-full object-contain"
            />

            <!-- No photos state -->
            <div v-else class="flex flex-col items-center gap-4 text-primary-300 dark:text-primary-700 px-8 text-center">
              <UIcon name="i-heroicons-photo" class="w-20 h-20" />
              <p class="text-sm font-semibold opacity-70">No photos yet</p>
              <p class="text-xs opacity-50 max-w-xs">Upload via Assets → Units in the web interface</p>
            </div>

            <!-- Photo counter badge (top-left, only when photos exist) -->
            <div
              v-if="photos.length > 1"
              class="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full"
            >
              {{ heroIndex + 1 }} / {{ photos.length }}
            </div>
          </div>

          <!-- Thumbnail strip — horizontal at bottom (portrait), vertical at right (landscape) -->
          <div ref="stripRef" class="page1-strip bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 cursor-grab active:cursor-grabbing">
            <!-- Real thumbnails -->
            <button
              v-for="(photo, i) in photos"
              :key="photo.id"
              type="button"
              class="page1-thumb flex-shrink-0 rounded-xl overflow-hidden transition-all"
              :class="heroIndex === i
                ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900'
                : 'opacity-60 hover:opacity-100'"
              @click="heroIndex = i"
            >
              <img :src="photo.file_url" :alt="`Thumbnail ${i + 1}`" class="w-full h-full object-cover" />
            </button>

            <!-- Empty placeholder slots when no photos -->
            <template v-if="!photos.length">
              <div
                v-for="n in 5"
                :key="n"
                class="page1-thumb flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <UIcon name="i-heroicons-photo" class="w-5 h-5 text-slate-300 dark:text-slate-600" />
              </div>
            </template>
          </div>

        </div>
      </section>

      <!-- ── Page 2: Specs & Financials (Prospect-Safe) ─────────────── -->
      <section
        class="flex-shrink-0 w-full h-full overflow-y-auto"
        style="scroll-snap-align: start;"
      >
        <div class="p-5 space-y-5">

          <!-- Unit header + badges -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                {{ unit.unit_name }}
              </h2>
              <p class="text-sm text-gray-400 mt-0.5 truncate">{{ unit.floor_plan_name || 'Floor plan on request' }}</p>
              <p v-if="unit.building_name" class="text-xs text-gray-400 truncate">{{ unit.building_name }}</p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span
                v-if="urgencyTag"
                class="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap"
                :class="urgencyTag.classes"
              >
                {{ urgencyTag.label }}
              </span>
              <span
                v-if="unit.status"
                class="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                :class="unit.status === 'Available'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'"
              >
                {{ unit.status }}
              </span>
            </div>
          </div>

          <!-- Asymmetric split: Details (left) + Financials (right) -->
          <div class="grid grid-cols-2 gap-4">

            <!-- Left column: Apartment details -->
            <div class="space-y-3">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Apartment Details</p>

              <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <UIcon name="i-heroicons-home" class="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wider">Layout</p>
                  <p class="font-black text-gray-900 dark:text-white text-lg leading-tight">{{ unit.b_b || '—' }}</p>
                  <p class="text-[10px] text-gray-400">bed / bath</p>
                </div>
              </div>

              <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <UIcon name="i-heroicons-squares-2x2" class="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wider">Size</p>
                  <p class="font-black text-gray-900 dark:text-white text-lg leading-tight">
                    {{ unit.sf ? Number(unit.sf).toLocaleString() : '—' }}
                  </p>
                  <p class="text-[10px] text-gray-400">sq ft</p>
                </div>
              </div>

              <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div class="min-w-0">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wider">Available</p>
                  <p class="font-black text-gray-900 dark:text-white text-lg leading-tight">
                    {{ fmtDate(unit.available_date) }}
                  </p>
                  <p class="text-[10px] text-gray-400">move-in date</p>
                </div>
              </div>
            </div>

            <!-- Right column: Financials -->
            <div class="space-y-3">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Financials</p>

              <!-- Monthly Rent hero -->
              <div class="rounded-2xl bg-primary-600 dark:bg-primary-700 p-5 text-white shadow-lg">
                <p class="text-[10px] font-bold uppercase tracking-widest text-primary-200 mb-1">Monthly Rent</p>
                <p class="text-4xl font-black tracking-tight leading-none">{{ fmt(unit.rent_offered) }}</p>
                <p class="text-xs text-primary-200 mt-1.5">per month</p>
              </div>

              <!-- Estimated move-in cost -->
              <div class="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Est. Move-In Cost</p>
                <p class="font-black text-gray-900 dark:text-white text-xl">
                  {{ unit.rent_offered ? fmt(unit.rent_offered * 2) : '—' }}
                </p>
                <p class="text-[10px] text-gray-400 mt-0.5">First month + Security deposit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Page 3: Spatial Layout (Floor Plan) ────────────────────── -->
      <section
        class="flex-shrink-0 w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-900"
        style="scroll-snap-align: start;"
      >
        <div class="h-full flex flex-col items-center justify-center gap-6 p-6">
          <!-- Floor plan placeholder — replace with actual image once available -->
          <div class="w-full max-w-lg aspect-square rounded-3xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-4 shadow-inner">
            <UIcon name="i-heroicons-square-3-stack-3d" class="w-20 h-20 text-slate-300 dark:text-slate-600" />
            <div class="text-center">
              <p class="font-bold text-slate-500 dark:text-slate-400">Floor Plan</p>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ unit.floor_plan_name || unit.unit_name }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
            <span>Pinch to zoom · Two fingers to rotate</span>
          </div>

          <!-- Compass placeholder -->
          <div class="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest">
            <UIcon name="i-heroicons-arrow-up" class="w-3.5 h-3.5" />
            <span>North</span>
          </div>
        </div>
      </section>

      <!-- ── Page 4: Neighborhood Toolkit ──────────────────────────── -->
      <section
        class="flex-shrink-0 w-full h-full overflow-hidden"
        style="scroll-snap-align: start;"
      >
        <div class="flex flex-col h-full">

          <!-- 6-button tab row -->
          <div class="flex-shrink-0 flex bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <button
              v-for="tab in NEIGHBORHOOD_TABS"
              :key="tab.id"
              type="button"
              class="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-2 transition-all"
              :class="activeNeighborhoodTab === tab.id
                ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'"
              @click="activeNeighborhoodTab = tab.id"
            >
              <UIcon :name="tab.icon" class="w-4 h-4" />
              <span class="text-[9px] font-black uppercase tracking-wide">{{ tab.label }}</span>
            </button>
          </div>

          <!-- Content area — fills all remaining height -->
          <div class="flex-1 min-h-0 relative overflow-hidden">

            <!-- Walk Score — v-show keeps the div in the DOM so the WS script can find it -->
            <div
              v-show="activeNeighborhoodTab === 'walkscore'"
              class="absolute inset-0 flex items-center justify-center overflow-y-auto p-6 bg-white dark:bg-gray-900"
            >
              <div v-if="hasAddress && walkScoreId">
                <!-- Walk Score script fills this div by id -->
                <div id="ws-walkscore-tile" />
              </div>
              <div v-else class="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-600 text-center">
                <UIcon name="i-heroicons-bolt" class="w-12 h-12" />
                <p class="font-semibold text-sm">Walk Score not configured</p>
                <p class="text-xs max-w-xs">Add a Walk Score ID to this property in Property Settings</p>
              </div>
            </div>

            <!-- Instagram / Facebook — these sites block all iframe embedding via CSP.
                 Always show a tap-to-open card regardless of browser or device. -->
            <div
              v-if="OPEN_ONLY_TABS.has(activeNeighborhoodTab)"
              class="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8"
              :class="activeNeighborhoodTab === 'instagram'
                ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400'
                : 'bg-[#1877F2]'"
            >
              <!-- Configured → branded open card -->
              <template v-if="neighborhoodIframeUrl">
                <UIcon
                  :name="activeNeighborhoodTab === 'instagram' ? 'i-heroicons-camera' : 'i-heroicons-user-group'"
                  class="w-16 h-16 text-white drop-shadow-lg"
                />
                <div class="text-center">
                  <p class="font-black text-white text-2xl tracking-tight">
                    {{ activeNeighborhoodTab === 'instagram' ? 'Instagram' : 'Facebook' }}
                  </p>
                  <p class="text-white/70 text-sm mt-1 font-medium">Opens in browser</p>
                </div>
                <button
                  type="button"
                  class="flex items-center gap-2 bg-white text-gray-900 font-black text-sm px-8 py-3.5 rounded-2xl shadow-xl active:scale-95 transition-transform"
                  @click="openExternal(neighborhoodIframeUrl)"
                >
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4" />
                  Open
                </button>
              </template>

              <!-- Not configured -->
              <template v-else>
                <UIcon
                  :name="activeNeighborhoodTab === 'instagram' ? 'i-heroicons-camera' : 'i-heroicons-user-group'"
                  class="w-12 h-12 text-white/40"
                />
                <div class="text-center">
                  <p class="font-semibold text-white/80 text-sm capitalize">{{ activeNeighborhoodTab }} not configured</p>
                  <p class="text-white/50 text-xs mt-1 max-w-xs">Add the URL under Assets → Properties → Settings.</p>
                </div>
              </template>
            </div>

            <!-- Iframe-based tabs (Map, Website, Site Map) -->
            <div
              v-if="activeNeighborhoodTab !== 'walkscore' && !OPEN_ONLY_TABS.has(activeNeighborhoodTab)"
              class="absolute inset-0 flex flex-col"
            >
              <!-- iframe (loads if URL is known) -->
              <iframe
                v-if="neighborhoodIframeUrl"
                :key="activeNeighborhoodTab"
                :src="neighborhoodIframeUrl"
                class="flex-1 w-full border-0"
                allow="fullscreen"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              />

              <!-- Not-configured placeholder -->
              <div
                v-else
                class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-600 p-8 text-center bg-slate-50 dark:bg-slate-900"
              >
                <UIcon
                  :name="NEIGHBORHOOD_TABS.find(t => t.id === activeNeighborhoodTab)?.icon ?? 'i-heroicons-globe-alt'"
                  class="w-12 h-12"
                />
                <p class="font-semibold text-sm capitalize">{{ activeNeighborhoodTab }} not configured</p>
                <p class="text-xs max-w-xs">Add this URL under Assets → Properties → Settings in the web interface.</p>
              </div>

              <!-- Open-in-browser escape hatch (top-right overlay, frosted) -->
              <button
                v-if="neighborhoodIframeUrl"
                type="button"
                class="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-all active:scale-95 min-h-[36px]"
                @click="openExternal(neighborhoodIframeUrl)"
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
                Open
              </button>
            </div>

          </div>
        </div>
      </section>

    </div>
    <!-- end scroll container -->

    <!-- ── Gesture Help Overlay ─────────────────────────────────────────
         Triggered by the "?" button in the tab bar. Shows the full gesture map.
         Dismisses on backdrop tap or the close button. -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showGestureHelp"
        class="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
        @click.self="showGestureHelp = false"
      >
        <!-- Bottom sheet panel -->
        <div class="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[80%] flex flex-col">

          <!-- Handle + header -->
          <div class="flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-hand-raised" class="w-5 h-5 text-primary-500" />
              <h3 class="font-black text-lg text-gray-900 dark:text-white tracking-tight">Touch Gestures</h3>
            </div>
            <button
              type="button"
              class="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              @click="showGestureHelp = false"
            >
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </div>

          <!-- Gesture table -->
          <div class="overflow-y-auto px-6 pb-8 space-y-1">

            <!-- Section header helper -->
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2 pb-1">Navigation</p>

            <div v-for="row in GESTURE_GUIDE" :key="row.label" class="flex items-center gap-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <!-- Finger count badge -->
              <div class="flex-shrink-0 w-14 flex flex-col items-center gap-0.5">
                <div class="flex gap-0.5">
                  <span
                    v-for="n in row.fingers"
                    :key="n"
                    class="w-2 h-5 rounded-full"
                    :class="row.color"
                  />
                </div>
                <span class="text-[9px] font-bold text-gray-400 mt-0.5">{{ row.fingers }}-finger</span>
              </div>

              <!-- Direction + description -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-lg leading-none">{{ row.arrow }}</span>
                  <span class="font-bold text-sm text-gray-900 dark:text-white">{{ row.label }}</span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">{{ row.description }}</p>
              </div>
            </div>

            <!-- Tips -->
            <div class="mt-4 space-y-2">
              <div class="p-4 rounded-2xl bg-primary-50 dark:bg-primary-950/30 flex gap-3">
                <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p class="text-xs text-primary-700 dark:text-primary-300 leading-relaxed">
                  In Presentation Mode the tab bar is hidden. Use <strong>3-finger ↓</strong> to toggle it on or off.
                  On the Neighborhood (Map) page it appears automatically — touch gestures don't work inside the map.
                </p>
              </div>
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex gap-3">
                <UIcon name="i-heroicons-arrows-pointing-in" class="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Use the <strong>↙ button</strong> (top-right corner) to exit Presentation Mode and switch units via the shortlist bar.
                  2-finger and 4-finger gestures are reserved for standard iPad functions (zoom, app switcher).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* ── Horizontal scroll snap container ──────────────────────────────── */
.dossier-scroll::-webkit-scrollbar { display: none; }

/* ── Page 1: Portrait default — hero top, strip bottom ─────────────── */
.page1-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.page1-hero {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.page1-strip {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 10px 12px;
  overflow-x: auto;
  overflow-y: hidden;
  border-top-width: 1px;
  scrollbar-width: none;
}
.page1-strip::-webkit-scrollbar { display: none; }

.page1-thumb {
  width: 72px;
  height: 56px;
}

/* ── Page 1: Landscape — strip moves to RIGHT side panel (92px) ─────── */
@media (orientation: landscape) {
  .page1-layout {
    flex-direction: row;
  }

  .page1-hero {
    order: 1;
    flex: 1;
    min-width: 0;
  }

  .page1-strip {
    order: 2;
    flex-direction: column;
    width: 92px;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    border-top-width: 0;
    border-left-width: 1px;
    padding: 10px 8px;
  }

  .page1-thumb {
    width: 100%;
    height: 62px;
  }
}
</style>
