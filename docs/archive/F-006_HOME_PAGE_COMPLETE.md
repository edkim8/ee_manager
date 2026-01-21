# Spec: Home Page & Dashboard Foundation

## Goal
Establish the authenticated "Home" experience for the EE_manager application. This includes the main Dashboard layout (Shell), the Home page content, and the security middleware to protect these routes.

## Requirements

### 1. Authentication Middleware (`middleware/auth.ts`)
- **Logic**:
  - Check if `useSupabaseUser()` is present.
  - If NO user: Redirect to `/auth/login`.
  - If YES user: Allow access.
- **Scope**: Apply to the Home page and all future protected routes.

### 2. AppNavigation Component (`components/AppNavigation.vue`)
- **Reference**: `docs/references/AppNavigation_REF.vue`
- **Instructions**:
  - **Structure**: Use the HTML/Template structure from the reference file verbatim (Header > Logo > NavMenu > UserControls).
  - **Adaptation**:
    - **Stores**: The reference uses `useAuthStore` (Pinia).
      - *Action*: Check if `useAuthStore` exists. If NOT, use `useSupabaseUser()` and `useSupabaseClient()` directly in the script setup, effectively replacing the store logic for `user`, `profile`, and `signOut`.
      - *Action*: remove `access_list` and `active_property` references if those stores/types don't exist yet. Comment them out or stub them as `ref([])`.
    - **Composables**:
      - `useLayoutMode`: If not present, remove this feature (toggle button).
      - `useColorMode`: Standard Nuxt UI, keep it.
    - **Navigation Items**: Keep the structure but ensure routes exist or handle 404s gracefully (Placeholders are fine).
      - `to: '/'` (Dashboard)
      - `to: '/assets/...'` (Placeholders)
      - `to: '/office/...'` (Placeholders)

### 3. Dashboard Layout (`layouts/dashboard.vue`)
- **Structure**:
  - **Header**: Include `<AppNavigation />`.
  - **Main Content Area**: `<UContainer class="py-6"><slot /></UContainer>` (or similar padding).
  - **Footer**: Optional copyright.

### 4. Home Page (`pages/index.vue`)
- **Route**: `/`
- **Layout**: `dashboard`
- **Middleware**: `auth`
- **Content**:
  - Greeting: "Welcome back, {User Email}"
  - Stats Placeholders: Simple cards.

## Implementation Steps (Builder Instructions)

1.  **Create Middleware**: `layers/base/middleware/auth.ts`.
2.  **Create Navigation**: `layers/base/components/AppNavigation.vue` (referencing `docs/references/AppNavigation_REF.vue`).
    - *Crucial*: Remove dependency on missing stores/composables. Make it work with standard Supabase/Nuxt composables.
3.  **Create Layout**: `layers/base/layouts/dashboard.vue`.
    - Import and use `AppNavigation`.
4.  **Update Page**: `layers/base/pages/index.vue`.
    - `definePageMeta({ layout: 'dashboard', middleware: 'auth' })`
5.  **Verify**:
    - Login -> See Dashboard with Navigation.
    - Check Mobile Menu (responsive).
    - Logout -> Redirect to login.

## verification
- [ ] Automated: Route guard check.
- [ ] Manual: Login/Logout flow.
- [ ] Manual: Navigation Menu renders and is responsive.
