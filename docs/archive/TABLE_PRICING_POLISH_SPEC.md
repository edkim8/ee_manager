# Specification: Table & Pricing Polish (V1.0)

## Status: ARCHIVED / COMPLETED (2026-02-19)

This specification covers the fine-tuning of the leasing module's pricing logic and the responsive table UI enhancements.

---

## 🏗️ Core Architecture

### Pricing Normalization
To prevent data drift, the following fields are now the source-of-truth across all leasing views:
- `base_rent`: The contractual base rent.
- `market_rent`: The current market valuation.
- `offered_rent`: The active price being offered to applicants.

### SQL Stability Pattern
Migrations related to `view_leasing_pipeline` and `view_availabilities` are now consolidated to manage complex view dependencies. 
> [!NOTE]
> When modifying base views, use `DROP VIEW IF EXISTS ... CASCADE` carefully to ensure all downstream views are rebuilt in the same transaction.

---

## 🎨 UI/UX Refinements

### Floor Plan Metrics
- **Concession %**: A new calculated column in unit tables showing `(market - offered) / market`.
- **Summary Cards**: Average rent and square footage cards added to the detail header.

### Developer Experience
- **Collapsible Debugger**: The `ScreenDebug.vue` component now has a "Minimize" mode.
- **Persistence**: State is saved in `localStorage.getItem('debug-tray-visible')`.

---

## 🔄 Historical Record (Shift H-043)
*The following is the final report from the Refinement Build:*

render_diffs(file:///Users/edward/Dev/Nuxt/EE_manager/docs/status/LATEST_UPDATE.md)
