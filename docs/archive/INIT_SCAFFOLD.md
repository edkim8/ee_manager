# INIT_SCAFFOLD Instructions (For Claude)

## Objective
Initialize the **EE_manager V2** project using **Nuxt 4** and the **2-Layer Goldfish Architecture**.

## Prerequisites
- Node.js (Latest LTS)
- Supabase Account Credentials (provided in prompt)

## Execution Steps

### Step 1: Initialize Nuxt 4
- Initialize a new Nuxt project in the current directory.
- Ensure you are using the precise version tag or command for **Nuxt 4** (if available/stable) or the latest Nuxt 3 with future flags enabled if Nuxt 4 is still in early preview. *Context: User requested Nuxt 4.*

### Step 2: Create Modular Monolith Structure
1. **Create Directories**:
   - `layers/base`
   - `layers/ops`
2. **Configure Layers**:
   - Create `layers/base/nuxt.config.ts`.
   - Create `layers/ops/nuxt.config.ts`.
   - In the **Root** `nuxt.config.ts`:
     ```typescript
     export default defineNuxtConfig({
       extends: ['./layers/base', './layers/ops'],
       devtools: { enabled: true }
     })
     ```
3. **Clean Up**: Remove minimal starter files (`app.vue` content) to prepare for a layout-based structure.

### Step 3: Install Dependencies
- Install **Supabase** dependencies:
  ```bash
  npm install @nuxtjs/supabase
  npm install -D supabase
  ```
- Register the module in `nuxt.config.ts`:
  ```typescript
  modules: ['@nuxtjs/supabase']
  ```

### Step 4: Environment Configuration
- Create a `.env` file in the project root.
- **Action**: Populate the `.env` file with the following credentials:
  ```env
  SUPABASE_URL="https://yeuzutjkxapfltvjcejz.supabase.co"
  SUPABASE_KEY="sb_publishable_0Kmu0i8ZHYoZUSK2KQWReg_AXUSRVN6"
  ```
- Ensure `.env` is added to `.gitignore`.

### Step 5: Initialize Supabase CLI
- Run the initialization command to set up the local Supabase configuration:
  ```bash
  npx supabase init
  ```

## Verification
1. Run `npm run dev`.
2. Ensure the application starts without errors.
3. Verify that the Nuxt Layers are recognized.
