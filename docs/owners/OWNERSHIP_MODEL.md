# Ownership Model

**Last updated:** 2026-02-26

## 4-Tier Ownership Chain

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1 — Person                                                │
│  Table: profiles + profile_extensions                           │
│  e.g. Joanna Kim, Sarah Lee                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │  owner_profile_mapping
                       │  (equity_pct, role, distribution_gl,
                       │   contribution_gl)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 2 — Personal Entity  (Trust / Individual)                 │
│  Table: ownership_entities  [entity_type = Trust | Individual]  │
│  Fields: name, legal_title, tax_id, address_*, distribution_gl, │
│          contribution_gl                                        │
│  e.g. Joanna_Trust1, Joanna_Trust2, Sarah_Individual            │
│  ★ GL codes live here (Yardi distribution / contribution codes) │
└──────────────────────┬──────────────────────────────────────────┘
                       │  entity_entity_ownership
                       │  (equity_pct NUMERIC(7,4))
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 3 — Property Entity  (LP / LLC / Corp / Partnership/REIT) │
│  Table: ownership_entities  [entity_type = LP | LLC | ...]      │
│  Fields: name, legal_title, tax_id, address_*                   │
│  e.g. Whispering_Oaks_LP, Southborder_LP                        │
│  ✗ No GL codes (GL codes belong to personal entities only)      │
└──────────────────────┬──────────────────────────────────────────┘
                       │  entity_property_ownership
                       │  (equity_pct NUMERIC(5,2))
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 4 — Property                                              │
│  Table: properties                                              │
│  e.g. Whispering Oaks Apartments, OB Apartments                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Real-World Examples

### Example 1 — Trust Structure (Whispering Oaks)
```
Joanna Kim (profile)
  └─ 100% → Joanna_Trust1  (Individual Owners)
               └─ 12% → Whispering_Oaks_LP  (Entity Interests)
                           └─ 100% → WO Apartments  (Property Ownership)

Joanna Kim (profile)
  └─ 100% → Joanna_Trust2  (Individual Owners)
               └─ 8% → Whispering_Oaks_LP  (Entity Interests)
```

### Example 2 — Individual Entity (Southborder)
```
Sarah Lee (profile)
  └─ 100% → Sarah_Individual  (Individual Owners)
               └─ 3% → Southborder_LP  (Entity Interests)
                          └─ 85% → OB Apartments  (Property Ownership)
```

### Example 3 — TIC Structure (direct ownership, no LP wrapper)
```
TIC Owner (profile)
  └─ owner_profile_mapping with GL codes directly
     (used when owner holds property interest directly,
      not through a personal entity — OB TIC owners)
```

---

## Database Tables

| Table | Role | Key Fields |
|-------|------|------------|
| `profiles` | Person (auth user) | `id`, `name`, `email` |
| `profile_extensions` | Extended contact info | `address_*`, `phone_*`, `bio` |
| `owner_profile_mapping` | Tier 1→2 link | `profile_id`, `owner_id`, `equity_pct`, `role`, `distribution_gl`, `contribution_gl` |
| `ownership_entities` | Both Tier 2 & 3 | `name`, `entity_type`, `tax_id`, `address_*`, `distribution_gl`*, `contribution_gl`* |
| `entity_entity_ownership` | Tier 2→3 link | `owner_entity_id`, `owned_entity_id`, `equity_pct` NUMERIC(7,4) |
| `entity_property_ownership` | Tier 3→4 link | `entity_id`, `property_id`, `equity_pct` NUMERIC(5,2) |
| `properties` | Property (Tier 4) | `id`, `name`, `property_code` |

*\* GL codes only meaningful on Trust/Individual entity types (Tier 2). Property entities (Tier 3) share the same table but leave GL fields null.*

---

## UI Pages

| Page | Route | Purpose |
|------|-------|---------|
| Personal Entities | `/owners/individual-entities` | Manage Trust/Individual entities — with GL codes |
| Individual Owners | `/owners/individual-owners` | Map persons (profiles) → personal entities |
| Entity Interests | `/owners/entity-interests` | Map personal entities → property entities (equity %) |
| Property Entities | `/owners/entities` | Manage LP/LLC/Corp entities — no GL codes |
| Property Ownership | `/owners/property-ownership` | Map property entities → properties (equity %) |

---

## GL Code Rules

- **Yardi GL codes** are used for distributions and contributions in Yardi accounting
- GL codes belong on the **Personal Entity** (Tier 2) — NOT on the property entity
- Exception: TIC owners without a trust/individual entity have GL codes on `owner_profile_mapping` directly
- Format: `XXX-XXXX` (max 9 chars), e.g. `300-0000`
- Distribution GL = account used when distributing cash out to the owner
- Contribution GL = account used when owner contributes capital

---

## Equity % Precision

| Relationship Table | Column Type | Notes |
|-------------------|-------------|-------|
| `owner_profile_mapping` | `NUMERIC(5,2)` | 2 decimal places |
| `entity_entity_ownership` | `NUMERIC(7,4)` | 4 decimal places (allows e.g. 12.3456%) |
| `entity_property_ownership` | `NUMERIC(5,2)` | 2 decimal places |

---

## Entity Types

| Type | Tier | GL Codes | Example |
|------|------|----------|---------|
| `Trust` | 2 — Personal | ✓ Yes | Joanna_Trust1 |
| `Individual` | 2 — Personal | ✓ Yes | Sarah_Individual |
| `LP` | 3 — Property | ✗ No | Whispering_Oaks_LP |
| `LLC` | 3 — Property | ✗ No | Pacific Holdings LLC |
| `Corporation` | 3 — Property | ✗ No | Westside Corp |
| `Partnership` | 3 — Property | ✗ No | |
| `REIT` | 3 — Property | ✗ No | |
