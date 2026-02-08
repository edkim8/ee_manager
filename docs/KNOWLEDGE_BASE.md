# Knowledge Base

> **Purpose**: Accumulated wisdom from development sessions. AI agents and developers MUST read this before starting work to avoid repeating solved problems.
>
> **Last Updated**: 2026-01-24

---

## Nuxt UI Quirks

### USelectMenu Empty Value Issue

**Problem**: `USelectMenu` (and other Reka UI-based components) throws runtime error when using empty string `''` as item ID.

**Error Message**:
```
Error: A <ComboboxItem /> must have a value prop that is not an empty string.
This is because the Combobox value can be set to an empty string to clear the selection and show the placeholder.
```

**Root Cause**: Reka UI's Combobox reserves empty string `''` for "no selection" state.

**Solution**: Use a sentinel value like `'none'` instead of empty string.

```typescript
// BAD - Will crash
const items = [
  { label: '(none)', id: '' },  // Empty string causes error
  { label: 'Option A', id: 'a' }
]

// GOOD - Works correctly
const items = [
  { label: '(none)', id: 'none' },  // Non-empty sentinel value
  { label: 'Option A', id: 'a' }
]
```

**Remember to update all related logic**:
```typescript
// Check for 'none' instead of empty string
if (value && value !== 'none') {
  // Value is set
}

// Initialize refs with 'none' instead of ''
const selectedValue = ref<string>('none')
```

**Affected Components**: `USelectMenu`, `USelect`, any Reka UI Combobox-based component.

**Reference**: `layers/parsing/pages/playground/parser.vue` - Transform dropdown fix.

---

### UI Component Framework Choice (Simple vs Magic)

**Problem**: Nuxt UI components (especially `UModal`, `UTabs`, and `overlay.create()`) have "magic" behaviors that often fail in complex scenarios. Specifically, `overlay.create()` strips all object properties and refs from props.

**The Simple Components Pattern**: For any non-trivial UI layout, bypass Nuxt UI and use our custom "Simple" components located in `layers/base/components/`.

**When to use Simple vs Nuxt UI**:

| Component Type | Use Nuxt UI | Use Simple Components |
|---------------|-------------|----------------------|
| Buttons/Inputs | ✅ Yes (UButton, UInput) | ❌ Not needed |
| Cards/Icons | ✅ Yes (UCard, UIcon) | ❌ Not needed |
| **Modals** | ❌ **NO** | ✅ **SimpleModal.vue** |
| **Tabs** | ❌ **NO** | ✅ **SimpleTabs.vue** |

**Reference Implementation**: 
- `docs/architecture/SIMPLE_COMPONENTS.md`
- `layers/ops/pages/office/pricing/floor-plans/index.vue` (Pricing Manager)

---

## custom Tools Registry ("The Toolbox")

We maintain a registry of our own custom tools (Simple Components, Table Engine, Parsing Engine) that are built for reuse. 
**Location**: `docs/references/CUSTOM_TOOLS_INDEX.md`.

---

---

## Nuxt Image (@nuxt/image)

### Why use Nuxt Image over native `<img>`?
1.  **Optimization**: Automatically resizes and converts images to modern formats (WebP/AVIF).
2.  **Performance**: Built-in lazy loading and `srcset` generation via the `sizes` prop.
3.  **UX**: Native support for placeholders (blurred or custom) prevents layout shifts.
4.  **DevEx**: Provider-agnostic (Cloudinary, Supabase, etc.)—change storage by updating config, not components.

### Components

#### `<NuxtImg>`
Outputs a native `<img>` tag. Best for standard image rendering.
```vue
<NuxtImg 
  src="/property.jpg" 
  sizes="sm:100vw md:50vw lg:400px" 
  placeholder 
  loading="lazy"
/>
```

#### `<NuxtPicture>`
Outputs a `<picture>` tag with multiple `<source>` elements. Use this when you need aggressive optimization (serving AVIF to supported browsers, fallback to WebP/JPG).
```vue
<NuxtPicture src="/hero.jpg" format="avif,webp" />
```

### Critical Props
- **`sizes`**: Defines responsive widths (e.g., `sm:100vw md:500px`). Nuxt generates necessary `srcset` automatically.
- **`placeholder`**: Use as a boolean for default blur or `:placeholder="[50, 25, 75, 5]"` (width, height, quality, blur) for fine-tuning.
- **`densities`**: Use `densities="x1 x2"` for high-DPI/Retina support.
- **`preload`**: Use for "above the fold" images (Hero sections) to prioritize loading.

### Best Practices
- **Always provide a placeholder** for images that aren't immediately visible above the fold.
- **Use `sizes`** instead of fixed `width`/`height` for responsive layouts.
- **Use `<NuxtPicture>`** for large Hero images to maximize format-based compression.

---

## TypeScript Patterns

### Vue Composable Type Inference

When using `computed()` with array methods like `.filter()` and `.map()`, TypeScript may lose type inference. Add explicit type annotations:

```typescript
// May show "Parameter 'm' implicitly has 'any' type"
const items = computed(() =>
  mappings.value.filter(m => m.active).map(m => m.name)
)

// Fix: Add type to callback parameter
const items = computed(() =>
  mappings.value.filter((m: MappingType) => m.active).map((m: MappingType) => m.name)
)
```

### Dynamic Imports for SSR Safety

Browser-only libraries (like `xlsx`) must be dynamically imported to avoid SSR crashes:

```typescript
// BAD - Crashes on server
import XLSX from 'xlsx'

// GOOD - SSR safe
const XLSX = await import('xlsx')
```

---

## Supabase Gotchas

### RLS Policy Order

Row Level Security policies are evaluated in order. More specific policies should come first.

### Null vs Undefined in Inserts

Supabase treats `null` and `undefined` differently:
- `null` → Sets column to NULL
- `undefined` → Uses column default

### Date Format

Always use ISO format `yyyy-MM-dd` for date columns. The `formatDateForDB()` utility handles this.


### Supabase Upsert: The Definitive Guide

**1. How it Works**
The `.upsert()` method compiles directly to a Postgres `INSERT ... ON CONFLICT` SQL statement. It is the most efficient way to handle "Create or Update" logic, atomic at the database level.

**2. The Critical Constraint Requirement**
For `.upsert()` to work with the `onConflict` option, **your database MUST have a matching Unique Index or Constraint**.
- **Misconception**: "I can just tell Supabase which columns to check."
- **Reality**: Supabase passes this to Postgres. If Postgres doesn't have an index enforcing uniqueness on those specific columns, it returns: *`there is no unique or exclusion constraint matching the ON CONFLICT specification`*.

**3. Fixing the Alerts Error (Example)**
To use `upsert` for Alerts on `(property_code, unit_name, description, resident)`, we MUST run this SQL first:
```sql
CREATE UNIQUE INDEX idx_alerts_composite_key
ON alerts (property_code, unit_name, description, resident);
```
Without this index, `upsert` is impossible.

**4. The "Null ID" Trap (Mixed Batches)**
When upserting a batch where some rows have `id` (updates) and some don't (inserts):
- The JS Client generates a single `INSERT` statement including the `id` column.
- For new rows, it sends `NULL` for `id`.
- This violates `id NOT NULL`.
- **Fix**:
    1. **Preferred**: Generate UUIDs on the client for *all* rows so every row has an ID.
    2. **Alternative**: Split into two calls (`insert` for new, `upsert` for updates).

**5. Strategy Decision Matrix**
- **Have Unique Index?** → Use `.upsert({ ... }, { onConflict: 'col1,col2' })`.
- **No Unique Index?** → Use "Safe Sync" (Fetch -> Diff -> Insert/Update).
- **Mixed New/Existing?** → Generate Client-side UUIDs -> Upsert.


### Upsert with onConflict (No Primary Key)
**Problem**: You want to `upsert` data that doesn't have a Primary Key (`id`), but you want to avoid duplicates based on other columns (e.g., `email`).

**Solution**: Use the `onConflict` option.
- **Requirement**: The columns specified in `onConflict` **MUST** have a Unique Constraint or Unique Index in the database.
- **Syntax**: `.upsert(data, { onConflict: 'col1,col2' })`

**Example**:
```typescript
// Upsert based on composite uniqueness of property_code and unit_name
const { data, error } = await supabase
  .from('units')
  .upsert(
    { property_code: 'CV', unit_name: '101', status: 'Occupied' },
    { onConflict: 'property_code,unit_name' }
  )
```
**Warning**: If you omit `onConflict` and don't provide an `id`, Supabase treats every row as a NEW insert.

### Default Columns (created_at)
**DO NOT** manually insert `created_at`.
- The database schema sets `created_at` to `now()` by default.
- Manually sending this field is redundant and can cause issues if the local time differs from server time.
- Rely on the database to handle timestamps.

---

## Project Conventions

### File Naming

- Composables: `use{PascalCase}.ts` (e.g., `useGenericParser.ts`)
- Generated Parsers: `useParse{PascalCase}.ts` (e.g., `useParseExpiringLeases.ts`)
- Types: `index.ts` in `/types` directory
- Utils: `{kebab-case}.ts` (e.g., `formatters.ts`)

### Layer Structure

Each layer should be self-contained:
```
layers/{name}/
├── components/
├── composables/
├── pages/
├── types/
├── utils/
└── docs/           # Layer-specific documentation
```

---

## Common Fixes

### "Cannot find name 'ref'" in Vue SFC

Nuxt auto-imports Vue functions. If linter complains, it's usually a tooling issue, not a real error. The code will work.

### Dropdown Shows "No data"

Check that you're using the correct prop name:
- Nuxt UI 3: Use `items` (not `options`)
- Use `value-key="id"` to specify which property is the value

---

## AI Agent Instructions

1. **Read this file first** before starting any task
2. **Update this file** when you discover new gotchas or patterns
3. **Reference specific entries** when explaining fixes to users

---

## Global Lookups

### Unit ID Lookup - **PERFORMANCE CRITICAL**
Client-side lookup to resolve `(Property Code + Unit Name)` -> `Unit ID (UUID)` without database hits during parsing.

**WHY**: Parsing large files (1000+ rows) with one DB query per row leads to N+1 performance issues and rate limiting. This lookup resolves 100% of static units instantly in memory.

- **Source File**: `layers/base/utils/unit-lookup-data.ts`
- **Helper Utility**: `layers/base/utils/lookup.ts`
- **Generator Tool**: `/admin/generators/unit-lookup`

**Usage**:
```typescript
import { resolveUnitId } from '~/layers/base/utils/lookup'

const unitId = resolveUnitId('CV', '101') // Returns UUID string or null
```

**How to Update**:
1. Go to **Admin > Playground > Unit Lookup Generator** (`/admin/generators/unit-lookup`).
2. Click **Fetch Units & Generate Code**.
3. Verify the data using the **Verify Lookup Integration** tool at the bottom of the page.
4. Copy the generated code block.
5. Paste it into `layers/base/utils/unit-lookup-data.ts`.
