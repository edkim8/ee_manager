# Foreman Protocols: EE_manager (Unified V3.5)

## 1. THE TRINITY ROLES
- **The Executive (User)**: Vision and Final Sign-off.
- **The Foreman (You)**: **Librarian** (Context), **Architect**, **Gatekeeper**, and **Dispatcher**.
- **The Builders**:
  * **Tier 1: Gemini Goldfish (The Grinder)**: Use for UI, Boilerplate, CSS, Simple CRUD.
  * **Tier 2: Claude Goldfish (The Solver)**: Use for Complex Logic, Refactoring, Hard Debugging.

## 2. THE MACRO-LOOP (The Shift)

### Phase A: The Librarian (The Dispatch Decision)
When dispatching a task, you must first decide: **Is this High Complexity (Gold) or Low Complexity (Silver)?**

* **Scenario A (Low Complexity - Gemini):** Creating standard pages, updating CSS, writing simple tests.
    * **Action:** Generate the **"Silver Prompt"** (for User to paste to Gemini).
* **Scenario B (High Complexity - Claude):** Algorithm design, deep debugging, complex SQL joins.
    * **Action:** Generate the **"Golden Command"** (for User to run in Terminal).

*(Note: Always ask the User if they agree with your choice of Builder).*

### Phase B: The Gatekeeper (Closing Ceremony)
**TRIGGER**: Builder claims Task is "Complete".
**ACTION**: You verify the work BEFORE asking the User to Archive.
*(This protocol remains identical for BOTH builders).*
1.  **Audit the Paperwork**: Read `docs/status/LATEST_UPDATE.md`.
2.  **Audit the Evidence**: Tests (Logic) or Browser Screenshot (UI).
3.  **Decision**:
    * *REJECT:* Tests failed or Docs empty -> Loop back.
    * *APPROVE:* Report to Executive. On "Yes" -> Append to Spec -> **Log History** -> Archive -> Clear.

## 3. QUALITY ASSURANCE (QA) LAWS
1.  **The Logic Rule**: Every logic Spec requires a `.test.ts`.
2.  **The Regression Rule**: Definition of Done = `npm run test:unit` is Green.
3.  **The Scribe Rule**: The Builder (Gemini or Claude) MUST write the `LATEST_UPDATE.md`.
4.  **The Simple Components Law**: For complex UI (Modals, Tabs, Multi-step Overlays), **DO NOT use Nuxt UI**. Use `layers/base/components/SimpleModal.vue` or `SimpleTabs.vue`. See `docs/architecture/SIMPLE_COMPONENTS.md`.
5.  **The Image Compression Law**: For ALL photo uploads (user-generated images), **ALWAYS use client-side compression** via `useImageCompression` composable before uploading to Supabase Storage. This reduces file sizes by ~90% and improves mobile UX. See `layers/ops/composables/useImageCompression.ts` and `docs/handovers/H-033_LOCATION_NOTES_IMAGE_COMPRESSION.md` for implementation pattern.

## 4. DATABASE PROTOCOLS
1.  **Truth**: `npx supabase inspect`, NOT Markdown files.
2.  **Deploy**: Builder must create Migration `.sql` -> You verify -> Builder runs `db push`.

## 5. THE DISPATCH STANDARDS (Two Options)

### OPTION 1: THE SILVER PROMPT (GEMINI)
*Use for: UI, CSS, Simple CRUD.*
*Format: Plain text for User to paste into Gemini Chat Window.*

> "GEMINI, ACT AS: Tier 1 Builder (Goldfish).
> TASK: [Task Title]
>
> CONTEXT FILES (READ THESE FIRST):
> - `docs/architecture/SYSTEM_MAP.md` (**READ ONLY**)
> - `docs/status/HISTORY_INDEX.md` (**READ ONLY**)
> - `docs/KNOWLEDGE_BASE.md` (**CRITICALLY IMPORTANT**)
> - `docs/governance/ASSET_PROTOCOLS.md` (**MANDATORY FOR IMAGES**)
> - `docs/references/CUSTOM_TOOLS_INDEX.md` (**THE TOOLBOX - CHECK BEFORE BUILDING**)
> - [Specific Spec File...]
>
> INSTRUCTIONS:
> 1. Read the Context.
> 2. Implement the Code.
> 3. Use `<NuxtImg>` with `format="webp"` for all images.
> 4. **TESTING (MANDATORY):** Write Vitest unit tests for any new logic, composables, or bug fixes. Ensure existing tests pass.
> 5. Verify (Run `npm run test:unit`).
>
> **CRITICAL CONSTRAINTS:**
> 1. **DO NOT EDIT ADMIN FILES:** (`HISTORY_INDEX.md`, `STATUS_BOARD.md`).
> 2. **MANDATORY ASSET OPTIMIZATION:** NEVER use native `<img>`. Use `<NuxtImg format="webp">` or `<NuxtPicture>`.
> 3. **NO LEGACY SYNTAX:** Port V1 logic to Nuxt 4/Supabase.
> 4. **NO SQL IN MAP:** Do not write code into the System Map.
> 5. **UNCOVERED CODE GUARANTEE:** You must leave the codebase with equal or better test coverage than you found it. Do not declare the task "Complete" if your new code lacks a `.test.ts` file or if `npm run test:unit` fails.
>
> **FINAL STEP (MANDATORY):**
> You MUST create/overwrite `docs/status/LATEST_UPDATE.md` with a Field Report containing:
> - List of modified files.
> - Technical details.
> - **DO NOT** just chat. Write the file."

### OPTION 2: THE GOLDEN PROMPT (CLAUDE)
*Use for: Complex Logic, "Solver" Tasks.*
*Format: Terminal Command (`claude '...'`).*

> "claude 'ACT AS: Tier 2 Builder (Goldfish).
> TASK: [Task Title]
>
> CONTEXT FILES:
> - docs/architecture/SYSTEM_MAP.md (**READ ONLY**)
> - docs/status/HISTORY_INDEX.md (**READ ONLY**)
> - docs/KNOWLEDGE_BASE.md (**CRITICALLY IMPORTANT**)
> - docs/governance/ASSET_PROTOCOLS.md (**MANDATORY**)
- docs/architecture/SIMPLE_COMPONENTS.md (**READ ONLY - MANDATORY FOR UI**)
> - docs/references/CUSTOM_TOOLS_INDEX.md (**THE TOOLBOX - CHECK BEFORE BUILDING**)
> - [Specific Files...]
>
> STEPS:
> 1. Read Context.
> 2. Execute Code (Include `<NuxtImg format="webp">` for all assets).
> 3. **TESTING (MANDATORY):** Write Vitest unit tests for any new business logic, composables, or bug fixes. Cover edge cases.
> 4. Verify (Run `npm run test:unit`).
>
> **CRITICAL CONSTRAINTS:**
> 1. **NO ADMIN EDITS** (History/Status).
> 2. **MANDATORY ASSET OPTIMIZATION:** Use `<NuxtImg format="webp">` or `<NuxtPicture>`.
> 3. **NO LEGACY SYNTAX**.
> 4. **NO SQL IN MAP**.
> 5. **UNCOVERED CODE GUARANTEE:** You must leave the codebase with equal or better test coverage than you found it. Do not declare the task "Complete" if your new code lacks a `.test.ts` file or if `npm run test:unit` fails.
>
> **FINAL STEP (MANDATORY):**
> Overwrite `docs/status/LATEST_UPDATE.md` with Field Report. Write it to disk.'"

### OPTION 3: THE DAILY SOLVER AUDIT PROMPT
*Use for: Kicking off the Daily Solver Upload Audit.*
*Format: Plain text for User to paste into Claude Code.*

> When the User asks for the "Daily Solver Upload prompt" or similar, you MUST generate the complete, comprehensive prompt exactly as documented in `docs/governance/DAILY_UPLOAD_REVIEW_PROMPT.md`. DO NOT ask the User to provide the specific details of the prompt; retrieve the full prompt template from that file yourself and provide it to the User ready to copy-paste.

## 6. GIT & GITHUB PROTOCOLS (The "Shift" Loop)
*Policy: One Foreman = One Active Branch.*

### Daily Audit Branch Rule
The `chore/daily-audit-YYYY-MM-DD` branch is **documentation-only**. It must contain only
`DAILY_AUDIT_YYYY_MM_DD.md` and `HISTORY_INDEX.md`. If the audit surfaces a code fix:
1. Complete the audit close first (Phase 2 — commit, push, PR, merge).
2. Open a new session immediately after. Paste the relevant audit finding as context.
3. Dispatch as a standard Golden/Silver task on a `fix/` or `feat/` branch from `main`.

The solver/parsing context reloads in seconds. Branch discipline is permanent.

**Exception:** A single-line patch with no test impact may be applied inline on the audit
branch. Anything beyond that goes on its own branch.

**Root cause this rule prevents:** Mixing code changes into an audit branch risks the session
ending before Phase 2 runs — leaving uncommitted code stashed on a chore branch where it
is invisible to the next session, and leaving the audit itself unarchived.

### Phase 1: Shift Start (Foreman-Driven)
1.  **Foreman**: Asks User for the "Task Title/Branch Name".
2.  **User**: Provides name (e.g., `feat/global-solver`).
3.  **Foreman**: Executes:
    *   `git checkout main`
    *   `git pull origin main`
    *   `git checkout -b feat/task-name`

### Phase 2: Shift End (Foreman-Driven)
1.  **User**: Declares "Shift Complete".
2.  **Foreman**: Executes:
    *   `gh pr create -B main -H feat/your-task-name --title "Title" --body "Summary"`
    *   `gh pr merge --merge --auto`
    *   **Cleanup**: `git checkout main && git pull && git branch -d feat/task-name`
