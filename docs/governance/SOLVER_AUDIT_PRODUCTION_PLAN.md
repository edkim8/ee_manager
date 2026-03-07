# Production Transition Plan: Daily Solver Audit

> **Purpose**: This document explores strategies for transitioning the "Daily Solver Audit" from a manual, developer-driven process (using Antigravity and Claude Code) into a sustainable, production-ready automated system.
> **Status**: Core Brainstorming Phase (Draft)
> **Last Updated**: 2026-03-07

---

## 1. The Challenge (Current State)
Currently, the Daily Audit relies heavily on the developer's local environment:
1. Foreman (Antigravity) generates the prompt.
2. The User copies the prompt and the Solver's console trace into Claude Code (CLI).
3. Claude Code reads the last 3 markdown files (`docs/status/DAILY_AUDIT_*.md`).
4. Claude evaluates the delta, summarizes, and creates a PR.

**Limitations for Production:**
- Requires visual monitoring of the terminal.
- Reading markdown files for history doesn't scale well beyond 3-5 days (context window bloat).
- Not headless (requires developer intervention).

---

## 2. Expanding the "Memory Window" (7 Days -> 1 Quarter)
Relying on Claude to read past markdown files is a "hack" for the dev phase. To scale memory to a week or a quarter, we need structured storage.

### Proposed Architecture: The `audit_logs` Table
Instead of just writing a markdown file, the audit system should persist structured data to Supabase.
- **Table**: `audit_logs` (or `solver_insights`)
- **Columns**: `date`, `batch_id`, `total_events`, `make_ready_count`, `warnings` (JSONB), `anomalies` (JSONB).

**How this expands memory:**
When the auditor runs, instead of reading past markdown files, it executes a simple query: *Fetch the `warnings` and `make_ready_count` for the last 7 days.* 
For quarterly memory, the system can run a "Weekly Rollup" script that summarizes the 7 days into a single database row, creating a high-level "Quarterly Context" that the LLM consumes instantly.

---

## 3. Automation Strategies (The Graceful Transition)

We should transition in phases to ensure accuracy isn't lost when we remove the human from the loop.

### Phase 1: The Local Node Script (Hybrid) - *IMPLEMENTABLE NOW*
This phase is entirely feasible to build and implement right now alongside your current workflow. Since we have access to the advanced Claude 4.6 Sonnet model via the Anthropic API, we can replicate the exact reasoning capabilities of your CLI agent in a dedicated background script.

- We create a dedicated script: `npm run audit:daily` (built in Node.js/TypeScript within `layers/parsing`).
- The script uses the **Anthropic API (configured for Claude 4.6 Sonnet)** directly.
- **Workflow**: The script programmatically reads the local solver log generated during your run -> queries the last 7 days of context from Supabase -> passes the structured payload to the Claude 4.6 API -> receives the Markdown response -> automatically commits and pushes the file.
- **Benefit**: You still manually trigger the ingestion and solver on your Mac, but this eliminates the tedious copy/paste of prompts and logs entirely. It's a massive quality-of-life win during dev/staging.

### Phase 2: Serverless Automation (Target Production State)
There are two primary ways to fully automate this without opening an IDE:

#### Option A: GitHub Actions (Recommended for Longevity & Independence)
Since the output of the audit is fundamentally a Markdown file committed to the repository, a CI/CD pipeline runner like GitHub Actions is the natural fit for orchestration.

- Set up a scheduled workflow (e.g., 2:00 AM daily).
- The workflow runs the Automated Ingestion Script (downloading the Excel files).
- The workflow runs the Solver (via a headless script).
- The workflow runs the Phase 1 Node Script (Anthropic API).
- The action commits the new Markdown file, opens a PR, and fires the API route `/api/admin/notifications/send-audit` to email the stakeholders.

**Robustness & Migration Profile:**
- **High Longevity:** The script relies purely on Node.js and standard CLI commands.
- **Migration Path:** If you leave GitHub, migrating this to GitLab CI, Bitbucket Pipelines, or even an AWS EC2 cron job is trivial because the logic is just containerized bash/node commands. It is completely platform-agnostic at its core.

#### Option B: Nuxt Server Task/Vercel Cron (Higher Coupling, Deeper UI Integration)
Build the LLM audit logic directly into a Nuxt server API route (`/api/solver/audit.post.ts`).

- A cloud provider's Cron service triggers this route daily.
- The route queries Supabase, sends the payload to Anthropic, and writes the results to the database instead of a Markdown file.
- The Nuxt frontend queries the database to display the audit history on an Admin dashboard.

**Robustness & Migration Profile:**
- **Medium Longevity:** This tightly couples your background data processing to your UI meta-framework (Nuxt) and hosting provider's specific Cron implementation (e.g., Vercel Cron). 
- **Migration Path:** If you migrate away from Vercel to AWS/DigitalOcean, you will need to setup your own cron system to hit the Nuxt endpoints. Furthermore, serverless functions on Vercel often have strict timeout limits (10s - 60s depending on tier) which large LLM calls and solver processing loops frequently exceed, leading to brittle, failing architecture natively unsuited for lengthy background tasks. 

---

## 5. Handling Code Modifications & Diagnostics

A major advantage of the current manual dev process is that you use an interactive agent (Claude Code in the Antigravity terminal) to both perform the audit *and* write code fixes based on the results.

Moving to Phase 1 or Production removes the interactive loop. The automated system becomes a "Reporting Agent", not a "Builder Agent."

### In Phase 1 (The Local Script)
1.  **The Trigger:** You run `npm run audit:daily`.
2.  **The Result:** The script calls the API, generates the Markdown report, and opens a PR. 
3.  **The Workflow:** You read the report. If the report identifies a bug or regression (e.g., "Trailing space found in Parser"), you do not fix it in that script. You simply open Antigravity (or Claude Code), point it at the report, and dispatch the Tier 2 Builder exactly as we do now: *"Claude, read `DAILY_AUDIT_2026_03_07.md` and implement the fixes for Bug 1 and Bug 2 on a new branch."*
4.  **Summary:** Phase 1 saves you the 5-10 minutes of manual prompting and log pasting, but fully preserves your ability to interact with a Builder Agent when fixes are needed.

### In Production (GitHub Actions)
The mindset shifts entirely. Production systems should never write and merge code to themselves autonomously based on an hourly/daily audit.

1.  **The Trigger:** GitHub Actions runs the Audit at 2:00 AM.
2.  **The Result:** The system generates the JSON/Markdown report and emails you the results. 
3.  **Handling Anomalies:**
    - If the report is `GREEN / 0 Warnings`, you do nothing.
    - If the report identifies a `RED / FATAL` bug, you (the human) start a new dev session on your local machine. You open Antigravity, read the production report, fix the code, test it, and push a hotfix PR.
4.  **Why this is correct:** Code modifications are inherently risky. While an LLM is fantastic at auditing data anomalies, allowing it to modify core business logic in a live production environment unsupervised violates the "Zero-Trust Protocol." The production Audit system acts as your hyper-vigilant Monitoring tool, alerting you so you can dispatch the Architect (Foreman/Claude) safely in a local dev environment.

---

## 6. Final Recommendation Summary
When development wraps up and we move to production:
1. **Ditch the Markdown files** as the primary source of truth for history, and move the audit summaries into a Supabase JSONB table.
2. **Build a TypeScript Script** using the Anthropic API to replace the Claude Code CLI.
3. **Use GitHub Actions** to orchestrate the pipeline: Download Excels -> Run Solver -> Run LLM Audit -> Send HTML Email.

We can leave this document here and evolve it as we build out the ingestion layer.
