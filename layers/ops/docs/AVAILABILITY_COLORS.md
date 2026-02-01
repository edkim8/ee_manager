# Availability Table Color Scheme

This document defines the color-coded intensity scale for units based on their vacancy duration (`vacant_days`).

## Vacancy Legend

| Range (Days) | Color Name | Hex Code | Criticality |
| :--- | :--- | :--- | :--- |
| **0 or greater** | Red | `#B91C1C` | **Immediate Action** (Currently Vacant) |
| **-1 to -25** | Pink | `#F472B6` | Vacating in <25 days |
| **-26 to -50** | Yellow | `#FBBF24` | Vacating in 26-50 days |
| **-51 to -75** | Green | `#34D399` | Vacating in 51-75 days |
| **Less than -75** | Blue | `#60A5FA` | Stable (>75 days) |

## Implementation Details

The "Unit" column in the Availabilities table uses these colors as a solid background for a button-style cell. 
- **Text Color**: Dark Gray/Black (`#030712`) for maximum contrast.
- **Font**: Extra Bold (Black).
- **Action**: Clicking navigates to the specific Unit Detail page.

---
*Last Updated: 2026-02-01*
