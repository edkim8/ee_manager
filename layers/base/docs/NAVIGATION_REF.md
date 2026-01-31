# App Navigation Reference

> **Docs**: `layers/base/docs/NAVIGATION_REF.md`
> **Component**: `layers/base/components/AppNavigation.vue`

## Structure

The navigation is divided into logical groups based on the layer architecture.

### 1. Dashboard
- **Route**: `/`
- **Icon**: `i-heroicons-home`

### 2. Assets (Layer: `ops`)
- **Properties**: `/assets/properties`
- **Buildings**: `/assets/buildings`
- **Floor Plans**: `/assets/floor-plans`
- **Units**: `/assets/units`

### 3. Office (Layer: `ops`)
- **Availability**: `/office/availabilities`
- **Leases**: `/office/leases`
- **Residents**: `/office/residents`

### 4. Admin (Layer: `admin`)
- **Import Data**: `/admin/upload`

## Adding New Items

1. Locate `navigationItems` computed property in `AppNavigation.vue`.
2. Push a new object to the `items` array.
3. Use `i-heroicons-*` for consistence.
4. Ensure child routes are defined in `pages/` (Nuxt file-based routing).
