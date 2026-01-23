<script setup lang="ts">
interface Props {
  text: string
  color?: string
}

withDefaults(defineProps<Props>(), {
  color: 'gray'
})
</script>

<template>
  <UBadge :color="color" variant="subtle">{{ text }}</UBadge>
</template>
