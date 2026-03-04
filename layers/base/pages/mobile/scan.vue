<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useRouter } from '#imports'
import { usePropertyState } from '../../composables/usePropertyState'

definePageMeta({
  layout: 'mobile-app',
  middleware: 'auth',
})

const router = useRouter()
const { activeProperty } = usePropertyState()
const { findByAssetTag } = useInventoryInstallations()

// ── State machine: idle → scanning → looking → found | unknown ─────────────
type ScanState = 'scanning' | 'looking' | 'found' | 'unknown' | 'error'
const state      = ref<ScanState>('scanning')
const scannedTag = ref('')
const found      = ref(null)
const lookupErr  = ref('')

const scannerRef = ref(null)

// ── On barcode detected ────────────────────────────────────────────────────
const onScanned = async (value: string) => {
  scannedTag.value = value
  state.value      = 'looking'

  try {
    const result = await findByAssetTag(activeProperty.value, value)
    if (result) {
      found.value = result
      state.value = 'found'
    } else {
      state.value = 'unknown'
    }
  } catch (err: any) {
    lookupErr.value = err.message
    state.value = 'error'
  }
}

const onScanError = (msg: string) => {
  lookupErr.value = msg
  state.value = 'error'
}

// ── Actions ────────────────────────────────────────────────────────────────
const scanAgain = () => {
  found.value      = null
  scannedTag.value = ''
  lookupErr.value  = ''
  state.value      = 'scanning'
  scannerRef.value?.startScanner()
}

const goToAdd = () => {
  // Navigate to installations page; pass the scanned tag as a query param
  router.push({ path: '/mobile/installations', query: { assetTag: scannedTag.value } })
}

// ── Helpers ────────────────────────────────────────────────────────────────
const HEALTH_COLOR: Record<string, string> = {
  healthy:  'text-emerald-600 dark:text-emerald-400',
  warning:  'text-amber-600 dark:text-amber-400',
  critical: 'text-orange-600 dark:text-orange-400',
  expired:  'text-red-600 dark:text-red-400',
}
const HEALTH_BG: Record<string, string> = {
  healthy:  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  warning:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  critical: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  expired:  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
}
const STATUS_BG: Record<string, string> = {
  active:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  retired:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  disposed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
</script>

<template>
  <div class="flex flex-col" style="min-height: calc(100vh - 10rem)">

    <!-- ── Page header ──────────────────────────────────────────────────── -->
    <div class="px-4 pt-4 pb-3 flex items-center justify-between">
      <div>
        <h1 class="text-[10px] font-black uppercase tracking-widest text-gray-400">Quick Scan</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {{ state === 'scanning' ? 'Point camera at barcode label'
           : state === 'looking'  ? 'Looking up asset tag...'
           : state === 'found'    ? 'Asset found'
           : state === 'unknown'  ? 'Asset not registered'
           : 'Error' }}
        </p>
      </div>
      <NuxtLink to="/mobile/installations" class="text-xs text-primary-600 dark:text-primary-400 font-semibold">
        All Installations
      </NuxtLink>
    </div>

    <!-- ── Camera viewfinder ────────────────────────────────────────────── -->
    <div class="mx-4 rounded-3xl overflow-hidden shadow-xl" style="height: 52vw; min-height: 200px; max-height: 280px;">
      <BarcodeScanner
        v-if="state === 'scanning'"
        ref="scannerRef"
        @scanned="onScanned"
        @error="onScanError"
      />

      <!-- Paused state while looking up / after result -->
      <div v-else class="w-full h-full bg-slate-900 flex items-center justify-center">
        <div v-if="state === 'looking'" class="flex flex-col items-center gap-3">
          <div class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p class="text-white/70 text-sm font-semibold">{{ scannedTag }}</p>
        </div>
        <div v-else-if="state === 'found'" class="flex flex-col items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-emerald-400" />
          <p class="text-white/70 text-sm font-mono">{{ scannedTag }}</p>
        </div>
        <div v-else-if="state === 'unknown'" class="flex flex-col items-center gap-2">
          <UIcon name="i-heroicons-question-mark-circle" class="w-12 h-12 text-amber-400" />
          <p class="text-white/70 text-sm font-mono">{{ scannedTag }}</p>
        </div>
        <div v-else class="flex flex-col items-center gap-2 px-6 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-400" />
          <p class="text-white/70 text-sm">{{ lookupErr }}</p>
        </div>
      </div>
    </div>

    <!-- ── Result panel ─────────────────────────────────────────────────── -->
    <div class="flex-1 px-4 pt-4 space-y-3">

      <!-- FOUND — Installation detail card -->
      <template v-if="state === 'found' && found">
        <div
          class="rounded-2xl border p-4 space-y-3"
          :class="HEALTH_BG[found.health_status] ?? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-gray-800'"
        >
          <!-- Item name + health -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-lg font-black text-gray-900 dark:text-white">{{ found.brand }} {{ found.model }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ found.category_name }}</p>
            </div>
            <span class="text-sm font-black uppercase tracking-wide" :class="HEALTH_COLOR[found.health_status]">
              {{ found.health_status }}
            </span>
          </div>

          <!-- Key facts grid -->
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Location</p>
              <p class="font-semibold text-gray-800 dark:text-gray-200">{{ found.location_name || '—' }}</p>
              <p class="text-xs text-gray-400 capitalize">{{ found.location_type?.replace('_', ' ') }}</p>
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Status</p>
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold" :class="STATUS_BG[found.status]">
                {{ found.status }}
              </span>
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Installed</p>
              <p class="font-semibold text-gray-800 dark:text-gray-200">{{ fmtDate(found.install_date) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Age / Life Left</p>
              <p class="font-semibold text-gray-800 dark:text-gray-200">
                {{ found.age_years != null ? `${found.age_years}y / ${found.life_remaining_years}y` : '—' }}
              </p>
            </div>
            <div v-if="found.serial_number">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Serial #</p>
              <p class="font-mono text-sm text-gray-800 dark:text-gray-200">{{ found.serial_number }}</p>
            </div>
            <div v-if="found.asset_tag">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Asset Tag</p>
              <p class="font-mono text-sm text-gray-800 dark:text-gray-200">{{ found.asset_tag }}</p>
            </div>
          </div>

          <div v-if="found.notes" class="pt-2 border-t border-current/10">
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Notes</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">{{ found.notes }}</p>
          </div>
        </div>

        <button
          class="w-full h-12 rounded-2xl bg-primary-600 text-white font-black text-sm uppercase tracking-widest active:scale-[0.97] transition-transform"
          @click="scanAgain"
        >
          Scan Another
        </button>
      </template>

      <!-- NOT FOUND -->
      <template v-else-if="state === 'unknown'">
        <div class="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 text-center space-y-2">
          <p class="text-base font-black text-amber-800 dark:text-amber-200">Not Registered</p>
          <p class="text-sm text-amber-700 dark:text-amber-300">
            Asset tag <span class="font-mono font-bold">{{ scannedTag }}</span> is not in the system yet.
          </p>
        </div>

        <button
          class="w-full h-12 rounded-2xl bg-primary-600 text-white font-black text-sm uppercase tracking-widest active:scale-[0.97] transition-transform"
          @click="goToAdd"
        >
          Add as New Installation
        </button>

        <button
          class="w-full h-12 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-black text-sm uppercase tracking-widest active:scale-[0.97] transition-transform"
          @click="scanAgain"
        >
          Scan Again
        </button>
      </template>

      <!-- ERROR -->
      <template v-else-if="state === 'error'">
        <div class="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 text-center">
          <p class="text-sm text-red-700 dark:text-red-400">{{ lookupErr }}</p>
        </div>
        <button
          class="w-full h-12 rounded-2xl bg-primary-600 text-white font-black text-sm uppercase tracking-widest active:scale-[0.97] transition-transform"
          @click="scanAgain"
        >
          Try Again
        </button>
      </template>

      <!-- SCANNING hint -->
      <template v-else-if="state === 'scanning'">
        <div class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Supported Formats</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="fmt in ['Code 128', 'Code 39', 'EAN-13', 'QR Code', 'Data Matrix']" :key="fmt"
              class="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
              {{ fmt }}
            </span>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>
