<!--
  File: app/components/widgets/CountdownTimerWidget.vue

  This is a self-contained, persistent countdown timer.
  - It uses `localStorage` to remember the timer's state across page navigations and reloads.
  - It now includes a fully functional, cyclical "20/20" mode with audio chimes.
  - The countdown continues in the background as long as the browser is open.
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

// `useHead` is a Nuxt auto-imported composable.
useHead({
  script: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js',
      defer: true,
    },
  ],
});

// --- STATE MANAGEMENT ---
const displayHours = ref('00');
const displayMinutes = ref('00');
const displaySeconds = ref('00');
const isCompleted = ref(false);
const initialMinutes = ref(10);
const isRunning = ref(false);

// --- 20/20 MODE STATE ---
const is2020ModeActive = ref(false);
const current2020Phase = ref<'work' | 'break' | null>(null);
const modeMessage = ref('');

let timerInterval: ReturnType<typeof setInterval> | null = null;
let toneSynth: any = null;

// --- LOCAL STORAGE KEYS ---
const STORAGE_KEY_END_TIME = 'countdown_endTime';
const STORAGE_KEY_IS_RUNNING = 'countdown_isRunning';
const STORAGE_KEY_2020_MODE = 'countdown_is2020Mode';
const STORAGE_KEY_2020_PHASE = 'countdown_2020Phase';

// --- AUDIO CUES ---
const setupAudio = async () => {
  if (typeof window !== 'undefined' && (window as any).Tone && !toneSynth) {
    try {
      await (window as any).Tone.start();
      toneSynth = new (window as any).FMSynth().toDestination();
      console.log('Audio context started and synth created.');
    } catch (e) {
      console.error('Could not start audio context:', e);
    }
  }
};

const playWorkChime = () => {
  if (!toneSynth) return;
  const now = (window as any).Tone.now();
  toneSynth.triggerAttackRelease('G4', '16n', now);
  toneSynth.triggerAttackRelease('B4', '16n', now + 0.125);
  toneSynth.triggerAttackRelease('D5', '16n', now + 0.25);
  toneSynth.triggerAttackRelease('G4', '16n', now + 0.5);
  toneSynth.triggerAttackRelease('B4', '16n', now + 0.625);
  toneSynth.triggerAttackRelease('D5', '16n', now + 0.75);
};

const playBreakChime = () => {
  if (!toneSynth) return;
  const now = (window as any).Tone.now();
  toneSynth.triggerAttackRelease('C4', '16n', now);
  toneSynth.triggerAttackRelease('E4', '16n', now + 0.2);
  toneSynth.triggerAttackRelease('G4', '16n', now + 0.4);
};

// --- CORE TIMER LOGIC ---
const tick = () => {
  const endTime = parseInt(
    localStorage.getItem(STORAGE_KEY_END_TIME) || '0',
    10
  );
  if (!endTime || !isRunning.value) {
    stopTimer(true);
    return;
  }

  const remaining = endTime - Date.now();

  if (remaining <= 0) {
    if (is2020ModeActive.value) {
      startNext2020Phase();
    } else {
      isCompleted.value = true;
      playWorkChime();
      stopTimer(true);
    }
  } else {
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remaining / 1000 / 60) % 60);
    const seconds = Math.floor((remaining / 1000) % 60);

    displayHours.value = String(hours).padStart(2, '0');
    displayMinutes.value = String(minutes).padStart(2, '0');
    displaySeconds.value = String(seconds).padStart(2, '0');
  }
};

const startTimer = (durationMinutes: number, phase?: 'work' | 'break') => {
  if (isRunning.value) return;

  const durationMs =
    phase === 'break' ? 20 * 1000 : durationMinutes * 60 * 1000;
  const endTime = Date.now() + durationMs;

  localStorage.setItem(STORAGE_KEY_END_TIME, String(endTime));
  localStorage.setItem(STORAGE_KEY_IS_RUNNING, 'true');

  isRunning.value = true;
  isCompleted.value = false;

  if (phase) {
    current2020Phase.value = phase;
    modeMessage.value =
      phase === 'work' ? 'Work Session (20 min)' : 'Eye Break (20 sec)';
    localStorage.setItem(STORAGE_KEY_2020_PHASE, phase);
  }

  tick();
  timerInterval = setInterval(tick, 1000);
};

const stopTimer = (shouldClearAll: boolean) => {
  isRunning.value = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (shouldClearAll) {
    localStorage.removeItem(STORAGE_KEY_END_TIME);
    localStorage.removeItem(STORAGE_KEY_IS_RUNNING);
    localStorage.removeItem(STORAGE_KEY_2020_MODE);
    localStorage.removeItem(STORAGE_KEY_2020_PHASE);
    is2020ModeActive.value = false;
    current2020Phase.value = null;
    modeMessage.value = '';
  } else {
    localStorage.setItem(STORAGE_KEY_IS_RUNNING, 'false');
  }
};

const resetTimer = () => {
  stopTimer(true);
  isCompleted.value = false;
  const hours = Math.floor(initialMinutes.value / 60);
  const minutes = initialMinutes.value % 60;
  displayHours.value = String(hours).padStart(2, '0');
  displayMinutes.value = String(minutes).padStart(2, '0');
  displaySeconds.value = '00';
};

// --- 20/20 MODE LOGIC ---
const startNext2020Phase = () => {
  stopTimer(false);

  if (current2020Phase.value === 'work') {
    playBreakChime();
    startTimer(0, 'break');
  } else {
    playWorkChime();
    startTimer(20, 'work');
  }
};

const toggle2020Mode = async () => {
  await setupAudio();

  const wasActive = is2020ModeActive.value;
  stopTimer(true);

  if (wasActive) {
    // If it was active, we are turning it OFF.
    is2020ModeActive.value = false;
    // `stopTimer(true)` already cleared the localStorage keys
    resetTimer();
  } else {
    // If it was inactive, we are turning it ON.
    is2020ModeActive.value = true;
    localStorage.setItem(STORAGE_KEY_2020_MODE, 'true');
    isCompleted.value = false;
    // Start with the 20-minute work session first
    startTimer(20, 'work');
  }
};

const setPresetTime = (minutes: number) => {
  if (isRunning.value) return;
  initialMinutes.value = minutes;
  resetTimer();
};

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  const was2020ModeActive =
    localStorage.getItem(STORAGE_KEY_2020_MODE) === 'true';
  const endTime = parseInt(
    localStorage.getItem(STORAGE_KEY_END_TIME) || '0',
    10
  );

  if (was2020ModeActive && endTime > Date.now()) {
    is2020ModeActive.value = true;
    current2020Phase.value = localStorage.getItem(STORAGE_KEY_2020_PHASE) as
      | 'work'
      | 'break';
    modeMessage.value =
      current2020Phase.value === 'work'
        ? 'Work Session (20 min)'
        : 'Eye Break (20 sec)';
    isRunning.value = true;
    tick();
    timerInterval = setInterval(tick, 1000);
    return;
  }

  const wasRunning = localStorage.getItem(STORAGE_KEY_IS_RUNNING) === 'true';
  if (wasRunning && endTime > Date.now()) {
    isRunning.value = true;
    tick();
    timerInterval = setInterval(tick, 1000);
  } else if (endTime > 0 && endTime <= Date.now()) {
    isCompleted.value = true;
    stopTimer(true);
  } else {
    resetTimer();
  }
});

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

// --- UI HELPERS ---
const timerDisplayClass = computed(() => {
  if (isCompleted.value) {
    return 'text-success-500 dark:text-success-400';
  }
  if (isRunning.value) {
    return 'text-gray-800 dark:text-gray-100';
  }
  return 'text-gray-400 dark:text-gray-500';
});
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 flex flex-col items-center justify-center text-center w-full max-w-sm mx-auto"
  >
    <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
      Countdown Timer
    </h3>

    <div
      v-if="is2020ModeActive"
      class="mb-4 text-sm font-semibold"
      :class="
        current2020Phase === 'work'
          ? 'text-primary-500 dark:text-primary-400'
          : 'text-success-500 dark:text-success-400'
      "
    >
      {{ modeMessage }}
    </div>

    <!-- Timer Display -->
    <div
      class="font-mono text-6xl font-bold tracking-widest"
      :class="timerDisplayClass"
    >
      <span v-if="isCompleted && !is2020ModeActive">Done!</span>
      <div v-else>
        <span>{{ displayHours }}</span>
        <span class="animate-pulse" :class="{ 'opacity-0': !isRunning }"
          >:</span
        >
        <span>{{ displayMinutes }}</span>
        <span class="animate-pulse" :class="{ 'opacity-0': !isRunning }"
          >:</span
        >
        <span>{{ displaySeconds }}</span>
      </div>
    </div>

    <!-- 20/20 Mode Toggle -->
    <div class="my-6 w-full">
      <UButton
        @click="toggle2020Mode"
        :color="is2020ModeActive ? 'primary' : 'neutral'"
        :variant="is2020ModeActive ? 'solid' : 'outline'"
        size="lg"
        class="w-full"
      >
        <div class="flex items-center justify-center gap-2">
          <UIcon name="i-heroicons-eye" />
          <span>20/20 Eye Break Mode</span>
        </div>
      </UButton>
    </div>

    <template v-if="!is2020ModeActive">
      <!-- Input for setting initial time -->
      <div class="grid grid-cols-2 gap-2 w-full">
        <div class="w-full">
          <UFormField label="Set initial time (minutes)">
            <UInput
              v-model.number="initialMinutes"
              type="number"
              size="lg"
              placeholder="e.g., 10"
              :disabled="isRunning"
            />
          </UFormField>
        </div>

        <!-- Preset Time Buttons -->
        <div class="grid grid-cols-2 justify-items-auto gap-2">
          <UButton
            v-for="time in [5, 15, 30, 60]"
            :key="time"
            :label="`${time} min`"
            color="info"
            variant="soft"
            size="sm"
            @click="setPresetTime(time)"
            :disabled="isRunning"
            class="flex-1"
          />
        </div>
      </div>
    </template>

    <!-- Control Buttons -->
    <div class="flex items-center justify-center gap-4 w-full mt-4">
      <UButton
        v-if="!isRunning"
        label="Start"
        icon="i-heroicons-play-20-solid"
        color="primary"
        size="lg"
        @click="startTimer(initialMinutes)"
        :disabled="isCompleted || is2020ModeActive"
        class="flex-1"
      />
      <UButton
        v-else
        label="Pause"
        icon="i-heroicons-pause-20-solid"
        color="warning"
        size="lg"
        @click="stopTimer(false)"
        :disabled="is2020ModeActive"
        class="flex-1"
      />
      <UButton
        label="Reset"
        icon="i-heroicons-arrow-path-20-solid"
        color="neutral"
        size="lg"
        @click="resetTimer"
        :disabled="is2020ModeActive"
        class="flex-1"
      />
    </div>
  </div>
</template>
