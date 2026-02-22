# Gemini Goldfish Debugging Prompt

Use this prompt to task a Tier 1 agent (Gemini) with resolving general operational bugs, UI glitches, or data anomalies in the EE Manager.

---

### ⏺ Gemini Goldfish Prompt Template

```bash
ACT AS: Tier 1 Debugger (Forensic Analyst).
TASK: Resolve [DESCRIBE ISSUE HERE - e.g., "The 'View Details' button on the map is throwing 404"].

CONTEXT:
- `docs/status/LATEST_UPDATE.md` (Check current branch status)
- `docs/status/HISTORY_INDEX.md` (Check architectural history)
- `docs/KNOWLEDGE_BASE.md` (Check for known quirks/fixes)

INVESTIGATION STEPS:
1. REPRODUCTION:
   - Identify the exact file and line number where the issue occurs.
   - Run relevant tests (unit/e2e) to confirm the failure.
   
2. FORENSIC ANALYSIS:
   - Inspect the data layer (Composables / Supabase queries).
   - Check for hydration issues or race conditions if it is a UI bug.
   - If related to date handling, ensure compliance with the "PST/MST Timezone-Agnostic" law.

3. CLEANUP & OPTIMIZATION:
   - Remove stray `console.log` statements.
   - Check for redundant API calls or expensive computed properties.
   - Ensure all new components follow the "Simple Component Law" (no magic wrappers).

4. IMPLEMENTATION:
   - Apply the fix in a targeted manner (minimize line changes).
   - If a DB change is required, generate a unique SQL migration in `supabase/migrations/`.

REPORTING:
- Update `docs/status/LATEST_UPDATE.md` with your fix description.
- Use `render_diffs` to show proof of work.
- Provide a clear summary of what was fixed and what was tested.
```
