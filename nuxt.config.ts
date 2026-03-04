// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['./layers/base', './layers/ops', './layers/admin', './layers/table', './layers/parsing', './layers/inventory', './layers/owners'],

  modules: ['@nuxtjs/supabase'],

  build: {
    transpile: ['@zxing/browser', '@zxing/library'],
  },

  devtools: { enabled: true },

  compatibilityDate: '2025-01-19',

  tailwindcss: {
    config: {
      content: [
        './configs/table-configs/**/*.generated.ts'
      ]
    }
  },

  // All authenticated app routes are client-only rendered.
  // SSR is only kept for /auth/** (public login/register pages).
  // Rationale: authenticated pages have no SEO value, depend on client-side state
  // (auth session, localStorage), and loading data server-side during SSR caused
  // JavaScript heap OOM on Vercel (1.8 GB heap from widget data-fetching on cold start).
  routeRules: {
    '/':              { ssr: false },
    '/about':         { ssr: false },
    '/admin/**':      { ssr: false },
    '/amenities/**':  { ssr: false },
    '/assets/**':     { ssr: false },
    '/maintenance/**':{ ssr: false },
    '/mobile/**':     { ssr: false },
    '/office/**':     { ssr: false },
    '/owners/**':     { ssr: false },
    '/playground/**': { ssr: false },
    '/settings/**':   { ssr: false },
    '/tools/**':      { ssr: false },
    '/tour/**':       { ssr: false },
    '/user/**':       { ssr: false },
    '/widgets/**':    { ssr: false },
  },

  devServer: {
    port: 3001
  },

  supabase: {
    redirect: false,
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 14, // 14 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  },

  // Prevent native C++ addons from being bundled into the Vercel serverless function.
  // @parcel/watcher is pulled in by nitropack → listhen for dev file watching;
  // marking it external means the dynamic import fails gracefully (listhen has a .catch())
  // and the server starts without a watcher — correct behaviour in production.
  nitro: {
    externals: {
      external: ['@parcel/watcher', '@parcel/watcher-wasm']
    }
  },

  runtimeConfig: {
    // Only available on the server
    mailersendPassword: process.env.MAILERSEND_PASSWORD,
    
    public: {
      mailersendSmtpName: process.env.MAILERSEND_SMTP_NAME,
      mailersendPort: process.env.MAILERSEND_PORT || '587',
      mailersendServer: process.env.MAILERSEND_SERVER || 'smtp.mailersend.net',
      mailersendUsername: process.env.MAILERSEND_USERNAME,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    }
  }
})
