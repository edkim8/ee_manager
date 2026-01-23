<script setup lang="ts">
const authStore = useAuthStore()
const { access_list, active_property } = storeToRefs(authStore)

const options = computed(() => {
  return access_list.value.map(access => ({
    label: getPropertyName(access.apt_code as PropertyCode),
    value: access.apt_code
  }))
})
</script>

<template>
  <USelectMenu
    v-if="access_list.length > 0"
    v-model="active_property"
    :options="options"
    placeholder="Select Property"
    value-attribute="value"
    option-attribute="label"
  />
</template>
