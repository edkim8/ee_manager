<script setup lang="ts">
useHead({
  script: [{ src: 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js', defer: true }],
})

const displayHours   = ref('00')
const displayMinutes = ref('00')
const displaySeconds = ref('00')
const isCompleted    = ref(false)
const initialMinutes = ref(10)
const isRunning      = ref(false)

const is2020ModeActive  = ref(false)
const current2020Phase  = ref<'work' | 'break' | null>(null)
const modeMessage       = ref('')

let timerInterval: ReturnType<typeof setInterval> | null = null
let toneSynth: any = null

const KEYS = {
  endTime:  'ee-countdown-endTime',
  running:  'ee-countdown-isRunning',
  mode2020: 'ee-countdown-2020mode',
  phase:    'ee-countdown-2020phase',
}

const setupAudio = async () => {
  const Tone = (window as any).Tone
  if (typeof window !== 'undefined' && Tone && !toneSynth) {
    try {
      await Tone.start()
      toneSynth = new Tone.FMSynth().toDestination()
    } catch (e) {
      console.warn('Audio unavailable:', e)
    }
  }
}

const playWorkChime = () => {
  if (!toneSynth) return
  const now = (window as any).Tone?.now?.()
  if (!now) return
  toneSynth.triggerAttackRelease('G4', '16n', now)
  toneSynth.triggerAttackRelease('B4', '16n', now + 0.125)
  toneSynth.triggerAttackRelease('D5', '16n', now + 0.25)
}

const playBreakChime = () => {
  if (!toneSynth) return
  const now = (window as any).Tone?.now?.()
  if (!now) return
  toneSynth.triggerAttackRelease('C4', '16n', now)
  toneSynth.triggerAttackRelease('E4', '16n', now + 0.2)
  toneSynth.triggerAttackRelease('G4', '16n', now + 0.4)
}

const tick = () => {
  const endTime = parseInt(localStorage.getItem(KEYS.endTime) || '0', 10)
  if (!endTime || !isRunning.value) { stopTimer(true); return }

  const remaining = endTime - Date.now()
  if (remaining <= 0) {
    if (is2020ModeActive.value) { startNext2020Phase() }
    else { isCompleted.value = true; playWorkChime(); stopTimer(true) }
  } else {
    const h = Math.floor((remaining / (1000 * 60 * 60)) % 24)
    const m = Math.floor((remaining / 1000 / 60) % 60)
    const s = Math.floor((remaining / 1000) % 60)
    displayHours.value   = String(h).padStart(2, '0')
    displayMinutes.value = String(m).padStart(2, '0')
    displaySeconds.value = String(s).padStart(2, '0')
  }
}

const startTimer = (durationMinutes: number, phase?: 'work' | 'break') => {
  if (isRunning.value) return
  const durationMs = phase === 'break' ? 20 * 1000 : durationMinutes * 60 * 1000
  localStorage.setItem(KEYS.endTime, String(Date.now() + durationMs))
  localStorage.setItem(KEYS.running, 'true')
  isRunning.value = true
  isCompleted.value = false

  if (phase) {
    current2020Phase.value = phase
    modeMessage.value = phase === 'work' ? 'Work Session (20 min)' : 'Eye Break (20 sec)'
    localStorage.setItem(KEYS.phase, phase)
  }

  tick()
  timerInterval = setInterval(tick, 1000)
}

const stopTimer = (clearAll: boolean) => {
  isRunning.value = false
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  if (clearAll) {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k))
    is2020ModeActive.value = false
    current2020Phase.value = null
    modeMessage.value = ''
  } else {
    localStorage.setItem(KEYS.running, 'false')
  }
}

const resetTimer = () => {
  stopTimer(true)
  isCompleted.value = false
  displayHours.value   = String(Math.floor(initialMinutes.value / 60)).padStart(2, '0')
  displayMinutes.value = String(initialMinutes.value % 60).padStart(2, '0')
  displaySeconds.value = '00'
}

const startNext2020Phase = () => {
  stopTimer(false)
  if (current2020Phase.value === 'work') { playBreakChime(); startTimer(0, 'break') }
  else { playWorkChime(); startTimer(20, 'work') }
}

const toggle2020Mode = async () => {
  await setupAudio()
  const wasActive = is2020ModeActive.value
  stopTimer(true)
  if (wasActive) {
    is2020ModeActive.value = false
    resetTimer()
  } else {
    is2020ModeActive.value = true
    localStorage.setItem(KEYS.mode2020, 'true')
    isCompleted.value = false
    startTimer(20, 'work')
  }
}

const setPreset = (mins: number) => {
  if (isRunning.value) return
  initialMinutes.value = mins
  resetTimer()
}

onMounted(() => {
  const was2020 = localStorage.getItem(KEYS.mode2020) === 'true'
  const endTime = parseInt(localStorage.getItem(KEYS.endTime) || '0', 10)

  if (was2020 && endTime > Date.now()) {
    is2020ModeActive.value = true
    current2020Phase.value = localStorage.getItem(KEYS.phase) as 'work' | 'break'
    modeMessage.value = current2020Phase.value === 'work' ? 'Work Session (20 min)' : 'Eye Break (20 sec)'
    isRunning.value = true
    tick()
    timerInterval = setInterval(tick, 1000)
    return
  }

  const wasRunning = localStorage.getItem(KEYS.running) === 'true'
  if (wasRunning && endTime > Date.now()) {
    isRunning.value = true
    tick()
    timerInterval = setInterval(tick, 1000)
  } else {
    resetTimer()
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const digitClass = computed(() => {
  if (isCompleted.value) return 'text-green-500 dark:text-green-400'
  if (isRunning.value) return 'text-gray-900 dark:text-white'
  return 'text-gray-300 dark:text-gray-600'
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-2">
    <!-- 20/20 phase label -->
    <div
      v-if="is2020ModeActive"
      class="text-[10px] font-black uppercase tracking-widest"
      :class="current2020Phase === 'work' ? 'text-primary-500' : 'text-green-500'"
    >
      {{ modeMessage }}
    </div>

    <!-- Timer display -->
    <div class="font-mono text-6xl font-black tracking-widest tabular-nums" :class="digitClass">
      <span v-if="isCompleted && !is2020ModeActive" class="text-4xl">Done!</span>
      <span v-else>
        {{ displayHours }}<span class="animate-pulse" :class="{ 'opacity-20': !isRunning }">:</span>{{ displayMinutes }}<span class="animate-pulse" :class="{ 'opacity-20': !isRunning }">:</span>{{ displaySeconds }}
      </span>
    </div>

    <!-- 20/20 toggle -->
    <UButton
      @click="toggle2020Mode"
      :color="is2020ModeActive ? 'primary' : 'neutral'"
      :variant="is2020ModeActive ? 'solid' : 'outline'"
      size="sm"
      class="w-full"
      icon="i-heroicons-eye"
    >
      20/20 Eye Break Mode
    </UButton>

    <!-- Presets + custom input -->
    <template v-if="!is2020ModeActive">
      <div class="grid grid-cols-2 gap-2 w-full">
        <UFormField label="Minutes" size="sm">
          <UInput v-model.number="initialMinutes" type="number" size="sm" :disabled="isRunning" />
        </UFormField>
        <div class="grid grid-cols-2 gap-1 items-end">
          <UButton
            v-for="t in [5, 15, 30, 60]"
            :key="t"
            :label="`${t}m`"
            color="info"
            variant="soft"
            size="xs"
            :disabled="isRunning"
            @click="setPreset(t)"
          />
        </div>
      </div>
    </template>

    <!-- Controls -->
    <div class="flex gap-2 w-full">
      <UButton
        v-if="!isRunning"
        icon="i-heroicons-play-20-solid"
        label="Start"
        color="primary"
        size="sm"
        class="flex-1"
        :disabled="isCompleted || is2020ModeActive"
        @click="startTimer(initialMinutes)"
      />
      <UButton
        v-else
        icon="i-heroicons-pause-20-solid"
        label="Pause"
        color="warning"
        size="sm"
        class="flex-1"
        :disabled="is2020ModeActive"
        @click="stopTimer(false)"
      />
      <UButton
        icon="i-heroicons-arrow-path-20-solid"
        label="Reset"
        color="neutral"
        size="sm"
        class="flex-1"
        :disabled="is2020ModeActive"
        @click="resetTimer"
      />
    </div>
  </div>
</template>
