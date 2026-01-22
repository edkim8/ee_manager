// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['./layers/base', './layers/ops', './layers/admin'],

  modules: ['@nuxtjs/supabase'],

  devtools: { enabled: true },

  compatibilityDate: '2025-01-19',

  devServer: {
    port: 3001
  },

  supabase: {
    redirect: false
  }
})
