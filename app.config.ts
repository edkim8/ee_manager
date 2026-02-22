import { defineAppConfig } from '#imports'

export default defineAppConfig({
  ui: {
    primary: 'sky',
    gray: 'neutral',
    colors: {
      primary: 'sky',
      neutral: 'neutral'
    },
    // NavigationMenu: override viewport to be fully opaque with higher z-index.
    // NuxtUI v4 merges these with the default classes via tailwind-variants extend.
    // bg-white/bg-gray-900 override the default bg-default (CSS variable), z-50 overrides z-[1].
    navigationMenu: {
      viewport: 'bg-white dark:bg-gray-900 z-50 shadow-xl',
      viewportWrapper: 'z-50',
    },
    // Standardized classes from design_standards.md
    theme: {
      typography: {
        h1: 'text-gray-900 dark:text-white font-black tracking-tight',
        h2: 'text-gray-900 dark:text-gray-100 font-bold',
        h3: 'text-gray-900 dark:text-gray-100 font-bold',
        body: 'text-gray-600 dark:text-gray-400',
        label: 'text-gray-400 dark:text-gray-500 font-bold uppercase text-xs tracking-wider',
        breadcrumb: {
          active: 'text-gray-900 dark:text-gray-100 font-bold',
          link: 'text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors'
        }
      },
      surfaces: {
        main: 'bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm',
        secondary: 'bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800',
        sidebar: 'bg-gray-900 dark:bg-gray-800/80 p-6 rounded-3xl'
      },
      borders: {
        base: 'border-gray-200 dark:border-gray-800',
        subtle: 'border-gray-100 dark:border-gray-900'
      }
    }
  }
})
