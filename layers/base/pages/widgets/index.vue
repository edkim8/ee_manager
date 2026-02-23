<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})
</script>

<template>
  <div class="h-full bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
    <div class="max-w-[1600px] mx-auto p-4 md:p-8">
      <WidgetsDashboard />
    </div>
  </div>
</template>
