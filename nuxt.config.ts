// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['./layers/base', './layers/ops', './layers/admin', './layers/table', './layers/parsing'],

  modules: ['@nuxtjs/supabase', '@nuxt/image'],

  devtools: { enabled: true },

  compatibilityDate: '2025-01-19',

  devServer: {
    port: 3001
  },

  supabase: {
    redirect: false
  },

  runtimeConfig: {
    // Only available on the server
    mailersendPassword: process.env.MAILERSEND_PASSWORD,
    
    public: {
      mailersendSmtpName: process.env.MAILERSEND_SMTP_NAME,
      mailersendPort: process.env.MAILERSEND_PORT || '587',
      mailersendServer: process.env.MAILERSEND_SERVER || 'smtp.mailersend.net',
      mailersendUsername: process.env.MAILERSEND_USERNAME,
    }
  }
})
