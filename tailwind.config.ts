import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{js,vue,ts}',
    './layers/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
    './configs/table-configs/**/*.generated.ts'
  ],
  theme: {
    extend: {
      screens: {
        // Desktop-first breakpoints (max-width)
        'max-sm': { 'max': '639px' },
        'max-md': { 'max': '767px' },
        'max-lg': { 'max': '1023px' },
        'max-xl': { 'max': '1279px' },
        'max-2xl': { 'max': '1535px' }
      }
    }
  },
  safelist: [
    // Base display classes
    'hidden',
    'table-cell',
    // Max-width responsive classes for hiding below breakpoints
    'max-md:hidden',   // Hide below 768px
    'max-lg:hidden',   // Hide below 1024px
    'max-xl:hidden',   // Hide below 1280px
    'max-2xl:hidden',  // Hide below 1536px
    // Safelist patterns
    {
      pattern: /^max-(md|lg|xl|2xl):hidden$/,
    }
  ]
}
