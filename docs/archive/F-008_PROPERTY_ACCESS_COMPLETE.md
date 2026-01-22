# Spec: Property Access & Constants

## Goal
Implement the foundational Property Access Control system. This involves defining the immutable list of Properties (Constants) and creating a database table to track which users have access to which properties.

## Requirements

### 1. Constants (`layers/base/constants/properties.ts`)
- **Data Source**:
  | Name | Code | Yardi ID |
  |------|------|----------|
  | Stonebridge | SB | azstoran |
  | Residences | RS | azres422 |
  | Ocean Breeze | OB | caoceabr |
  | City View | CV | cacitvie |
  | Whispering Oaks | WO | cawhioak |

- **Exports**:
  - `PROPERTY_LIST` (Array of objects)
  - `PropertyCode` (Type/Enum: 'SB' | 'RS' | ...)
  - `getPropertyName(code: string): string` (Helper)

### 2. Database Schema (`supabase/migrations/...`)
- **Table**: `public.user_property_access`
- **SQL Definition**:
  ```sql
  create table public.user_property_access (
    id uuid not null default gen_random_uuid (),
    user_id uuid not null,
    property_code text not null,
    role text null,
    constraint user_property_access_pkey primary key (id),
    constraint user_property_access_user_id_property_code_key unique (user_id, property_code),
    constraint user_property_access_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
    constraint user_property_access_role_check check (
      (
        role = any (
          array[
            'Owner'::text,
            'Staff'::text,
            'Manager'::text,
            'RPM'::text,
            'Asset'::text
          ]
        )
      )
    )
  ) TABLESPACE pg_default;
  ```
- **Row Level Security (RLS)**:
  - Enable RLS.
  - Policy "Users can view own access": `auth.uid() = user_id`.

### 3. Testing (`tests/unit/constants/properties.test.ts`)
- Verify `getPropertyName('SB')` returns "Stonebridge".
- Verify handling of invalid codes.

## Implementation Steps (Builder Instructions)

1.  **Create Constants**: `layers/base/constants/properties.ts`.
2.  **Create Migration**: `supabase/migrations/[timestamp]_user_property_access.sql`.
3.  **Create Tests**: `tests/unit/constants/properties.test.ts`.
4.  **Verify**:
    - Run `npm run test:unit`.
    - Apply migration locally: `npx supabase db reset` (or push if local dev).
      *Protocol Update*: Since we are local, asking the user to apply migration is safer, or we can use `npx supabase migration up`. Check `package.json` for supabase scripts.

## verification
- [ ] Automated: `npm run test:unit` passes.
- [ ] Manual: Table exists in local Supabase.

## Field Report (2026-01-21)

### Technical Details
- **Implementation**:
    - Created `layers/base/constants/properties.ts` with strict `PropertyCode` typing and helper `getPropertyName`.
    - Created Supabase migration `20260120060000_user_property_access.sql`.
- **Database Schema**:
    - Table: `user_property_access`.
    - Constraints: Unique pair `(user_id, property_code)`.
    - RLS: Enabled, policy links to `auth.uid()`.
- **Verification**:
    - Unit Tests: `tests/unit/constants/properties.test.ts` (12/12 passed).
    - Database: Table `public.user_property_access` exists remotely.
