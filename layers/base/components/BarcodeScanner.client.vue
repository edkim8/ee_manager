<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

const emit = defineEmits<{
  scanned: [value: string]
  error:   [message: string]
}>()

const videoRef   = ref<HTMLVideoElement | null>(null)
const scanning   = ref(false)
const permError  = ref('')
let   reader: BrowserMultiFormatReader | null = null
let   controls: { stop: () => void } | null = null

const startScanner = async () => {
  if (!videoRef.value) return
  permError.value = ''
  scanning.value  = true

  try {
    reader = new BrowserMultiFormatReader()

    // On mobile, use rear camera (environment facing)
    const devices = await BrowserMultiFormatReader.listVideoInputDevices()
    const rear = devices.find(d =>
      d.label.toLowerCase().includes('back') ||
      d.label.toLowerCase().includes('rear') ||
      d.label.toLowerCase().includes('environment')
    )
    const deviceId = rear?.deviceId ?? (devices.at(-1)?.deviceId ?? undefined)

    controls = await reader.decodeFromVideoDevice(
      deviceId,
      videoRef.value,
      (result, err) => {
        if (result) {
          scanning.value = false
          controls?.stop()
          emit('scanned', result.getText())
        }
        // NotFoundException fires every frame when nothing detected — ignore it
        if (err && !(err instanceof NotFoundException)) {
          console.warn('Scanner error:', err)
        }
      }
    )
  } catch (err: any) {
    scanning.value = false
    if (err?.name === 'NotAllowedError') {
      permError.value = 'Camera access denied. Please allow camera access and try again.'
    } else if (err?.name === 'NotFoundError') {
      permError.value = 'No camera found on this device.'
    } else {
      permError.value = err?.message || 'Could not start camera.'
    }
    emit('error', permError.value)
  }
}

const stopScanner = () => {
  controls?.stop()
  controls  = null
  scanning.value = false
}

onMounted(startScanner)
onUnmounted(stopScanner)

defineExpose({ stopScanner, startScanner })
</script>

<template>
  <div class="relative w-full h-full bg-black overflow-hidden">

    <!-- Camera feed -->
    <video
      ref="videoRef"
      class="absolute inset-0 w-full h-full object-cover"
      autoplay
      muted
      playsinline
    />

    <!-- Scan overlay -->
    <div v-if="scanning && !permError" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <!-- Dark vignette corners -->
      <div class="absolute inset-0 bg-black/40" style="mask-image: radial-gradient(ellipse 60% 35% at 50% 50%, transparent 100%, black 100%)" />

      <!-- Scan frame -->
      <div class="relative w-64 h-40">
        <!-- Corner marks -->
        <span class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-sm" />
        <span class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-sm" />
        <span class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-sm" />
        <span class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-sm" />

        <!-- Animated scan line -->
        <div class="absolute left-1 right-1 h-0.5 bg-primary-400 shadow-[0_0_8px_2px_theme(colors.primary.400)] animate-scan" />
      </div>

      <p class="mt-6 text-white/80 text-sm font-semibold tracking-wide">Align barcode within frame</p>
    </div>

    <!-- Permission / device error -->
    <div v-if="permError" class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-8 text-center">
      <UIcon name="i-heroicons-camera" class="w-12 h-12 text-red-400" />
      <p class="text-white text-sm font-semibold">{{ permError }}</p>
    </div>

  </div>
</template>

<style scoped>
@keyframes scan {
  0%   { top: 8px; }
  50%  { top: calc(100% - 8px); }
  100% { top: 8px; }
}
.animate-scan {
  animation: scan 2s ease-in-out infinite;
}
</style>
