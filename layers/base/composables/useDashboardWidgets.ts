// Shared state for dashboard view mode.
// false = show Monitors (default), true = show Widgets (/widgets page content)
// useState is Nuxt SSR-safe and shared across all component instances
// that call this composable — no props/emit needed.
export const useDashboardWidgets = () => {
  const showWidgets = useState('dashboard-view-mode', () => false)
  return { showWidgets }
}
