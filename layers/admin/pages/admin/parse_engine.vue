<script setup lang="ts">
import ParserPlayground from '../../../parsing/pages/playground/parser.vue'

definePageMeta({
  title: 'Parser Engine',
  layout: 'dashboard',
  middleware: ['admin']
})
</script>

<template>
  <ParserPlayground />
</template>
