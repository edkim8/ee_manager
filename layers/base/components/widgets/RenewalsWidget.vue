<template>
  <div class="space-y-4">
    <div class="flex items-end gap-2">
      <div class="text-4xl font-black text-gray-900 dark:text-white leading-none">24</div>
      <div class="text-sm font-bold text-gray-400 mb-1">Total Pipeline</div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div class="p-2 rounded-xl bg-primary-500/5 border border-primary-500/10 text-center">
        <div class="text-lg font-bold text-primary-600">8</div>
        <div class="text-[8px] uppercase tracking-tighter text-gray-500 font-black">Sent</div>
      </div>
      <div class="p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
        <div class="text-lg font-bold text-blue-600">12</div>
        <div class="text-[8px] uppercase tracking-tighter text-gray-500 font-black">Pending</div>
      </div>
      <div class="p-2 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
        <div class="text-lg font-bold text-purple-600">4</div>
        <div class="text-[8px] uppercase tracking-tighter text-gray-500 font-black">Signed</div>
      </div>
    </div>

    <div class="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <UIcon name="i-heroicons-clock" class="w-5 h-5 text-amber-600" />
      <div class="text-[10px] font-bold text-amber-900 dark:text-amber-400 italic">
        "Expect 5 more signatures by Friday based on current pace."
      </div>
    </div>
  </div>
</template>
