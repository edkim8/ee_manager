# 🛑 PROTOCOL: TIER 2 BUILDER - YARDI AUTOMATED INGESTION

**ROLE**: Tier 2 Builder (Claude Code)
**PROJECT**: EE_manager (Nuxt 3 / Supabase)
**MISSION**: Automate the daily extraction of 12 Excel reports from Yardi Voyager to serve as the data pipeline for the EE_manager application.

## 1. Technical Strategy & Architecture
You are tasked with building the "Legacy Transport Layer" for our property management app. Yardi Voyager is highly dependent on iframes and slow-loading legacy UI components.

- **Automation Tool**: Playwright (Python or Node.js, your recommendation based on the Nuxt environment).
- **Session Handling**: Connect to an already-authenticated, running Chrome session via CDP (`--remote-debugging-port=9222`). Do NOT attempt to script the login/2FA process.
- **Wait Logic**: Never use static `sleep()`. Always use `expect_download()` and wait for specific table headers to render inside the correct dataframe/iframe before interacting.
- **Pre-flight Verification**: Before executing ANY downloads, the script MUST verify that the active browser window is currently on the Yardi Voyager main dashboard and fully authenticated. The user will manually handle 2FA and login before running this script. The script should look for a specific element (e.g., the `.clawren` property text or the dashboard statistical links) to confirm readiness. If the dashboard is not detected, it should print a clear error and exit cleanly.
- **Persistence Mandate**: Do not blindly overwrite existing files. The user will run this script from both a Mac Mini and a MacBook Air. Therefore, the target save location MUST be a cloud-synced directory, specifically **Google Drive**. The script should dynamically resolve the path to the user's Google Drive 'Data' folder (e.g., `~/Google Drive/My Drive/Data` or the appropriate macOS mount path) so it works seamlessly across both machines. Implement an archiving mechanism where existing files with the same name are moved to the Google Drive `/Archive` subfolder with a timestamp before the new file is saved.

## 2. Dynamic Date Engine
The script must calculate the following relative dates at runtime for use in form fields:
1. `D_today`: Current system date.
2. `D_start`: Exactly one month prior to `D_today`.
3. `D_prior_end`: The last day of the calendar month preceding `D_today` (e.g., if today is Dec 26, this is Nov 30).
4. `D_future`: `D_prior_end` with the year incremented by +2 years.

## 3. The 12-File Master Specification
The automation must execute in three phases, saving files using the naming convention: `5p_[Name]_YY_MM_DD.xlsx`.

### Phase A: Dashboard Numerical Links (8 Files)
**Trigger**: From the main dashboard, ensure Property `.clawren` is active. Click the specific blue numerical link, wait for the target header to appear, click the Excel icon, and save.
1. `5p_Leased_Units` -> Link: "Leased Units" | Wait Header: "Property"
2. `5p_Availables` -> Link: "Available Units" | Wait Header: "Unit Type"
3. `5p_Transfers` -> Link: "Unit Transfers" | Wait Header: "From Property"
4. `5p_Applications` -> Link: "Pending Applications" | Wait Header: "Agent"
5. `5p_Notices` -> Link: "On Notice" | Wait Header: "Move Out Date"
6. `5p_Alerts` -> Link: "Alerts" | Wait Header: "Description"
7. `5p_Make_Ready` -> Link: "Pending Make Ready" | Wait Header: "Bedrooms"
8. `5p_WorkOrders` -> Link: "Pending Work Requests" | Wait Header: "WO #"

### Phase B: Resident Directory Reports (2 Files)
**Path**: Left Sidebar -> Reports > Residents > Resident Directory w/Email.
9. `5p_Residents_Status`
   - **Property**: `.clawren`
   - **Status**: Leave default (None selected / All)
   - **Move In After**: `D_start` (Today - 1 month)
   - **Move In Before**: `D_future`
10. `5p_Residents_Status_All`
   - **Property**: `.clawren`
   - **Status**: Select 'Current', 'Future', 'Notice', 'Applicant'
   - **Move In After**: `01/01/2004`
   - **Move In Before**: `D_future`

### Phase C: Analytics Reports (2 Files)
11. `5p_Delinquencies`
   - **Path**: Top Menu -> Analytic Reports > Residential AR Analytics.
   - **Properties**: Uncheck `.clawren`. Check specifically: `azres422`, `azstoran`, `cacitvie`, `caoceabr`, `cawhioak`.
   - **Status**: 'Current', 'Notice'
   - **Report Type**: 'Financial Aged Receivable'
   - **Summary Type**: 'Resident'
   - *Action*: Run report, download, and save.
12. `5p_ExpiringLeases` (Note: Slow to render)
   - **Path**: Top Menu -> Analytic Reports > Residential Analytics.
   - **Properties**: Same 5 as above.
   - **Report Type**: 'Resident Lease Expirations'
   - **Section**: Extract 'Expiring Leases' and 'M-to-M'
   - **Date Range**: `D_start` to `D_future`

## 4. Architectural Decision Point
Before writing the code, state your recommended approach:
- **Option A (Separate Python/Node CLI App)**: A standalone script executed manually from the terminal.
- **Option B (Nuxt Integrated)**: Integrating this into the existing Nuxt server/nitro layer, perhaps triggered via an admin endpoint.

Given the interactive nature of Playwright mapping over CDP and dealing with the OS-level file download prompt, standard practice leans toward Option A. State your choice, briefly justify it, and then proceed to scaffold the solution.

Acknowledge this prompt by confirming your architectural choice and initiating the Playwright build.

