# 🛑 PROTOCOL: TIER 2 BUILDER - SILENT DROP ANALYSIS

**ROLE**: Tier 2 Builder (Goldfish)
**PROJECT**: EE_manager (Nuxt 3 / Supabase / Yardi Data Sync)

## 1. The Context (Missing Tenancy Sweep)
Currently, our `5p_Residents_Status` Yardi report is filtered to **exclude** `Canceled` and `Denied` statuses to prevent pulling in years of inactive data. 

Because of this, when an `Applicant` or `Future` tenancy cancels, they "silently drop" from the daily report. The `useSolverEngine`'s "Missing Tenancy Sweep" logic detects this disappearance and assumes they transitioned to a terminal state (usually defaulting to `Canceled` or `Past`).

You can find the documentation for this logic in `docs/architecture/SOLVER_LOGIC_EXPLAINED.md` (or similar) under the "MISSING TENANCY SWEEP" section, and the implementation in `layers/admin/composables/useSolverEngine.ts`.

## 2. The Proposed Alternative
The Architect (Foreman) and User are proposing a tradeoff to get a clearer picture of these transitions:
- What if we add an **additional** `5p_Residents_Status` export?
- This new export would have a **shorter duration** (e.g., 1 month backward to 2 years forward).
- Crucially, it would **NOT be filtered** for active-only statuses. It would include `Canceled` and `Denied` records.
- Because the time window is short, the file size won't explode, but it *will* explicitly capture the transition of `Future` -> `Canceled` or `Future` -> `Denied` as it happens.

## 3. Your Mission
Please review the codebase (specifically `useSolverEngine.ts`) and provide a detailed analysis of this proposed alternative. 

Provide your response in the following format:

### A. Proof of Understanding
Explain in your own words how the current "Missing Tenancy Sweep" works when an Applicant vanishes from the active `5p_Residents_Status` report. Explain the current heuristic used to classify them as `Canceled` vs `Past`.

### B. Tradeoff Analysis
Analyze the User's proposal (adding a second, unfiltered, short-duration report). 
- **Benefits:** What are the technical benefits to the Solver Engine's accuracy (e.g., avoiding false positives)?
- **Costs:** What is the cost regarding parser complexity, upload workflow, user friction, and engine processing time?
- **Architecture:** How would the `useSolverEngine.ts` and `ParserConfigs` need to change to accommodate a "Delta/Short" file alongside the "Full/Active" file? Would they be merged before processing, or processed sequentially?

### C. Alternative Approaches
Could we achieve explicit transitions without a second file? (e.g., modifying the single report to include Canceled/Denied but heavily restricting the "move-out" date range filter in Yardi before export).

### D. Final Recommendation
As the Tier 2 Builder, give your definitive recommendation. Should we stick with the current inference-based "Missing Sweep", adopt the dual-report system, or use a new third alternative?

Acknowledge this prompt by outputting your analysis.
