# Yardi Daily Download

Downloads 12 Excel files from Yardi Voyager in a single terminal run.
Steps 1–10 are fully automatic. Steps 11–12 require two brief pauses each.

---

## One-time setup

### Mac Mini
```bash
cd ~/Dev/Nuxt/EE_manager/scripts/yardi-automation
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
chmod +x launch_chrome.sh
```

### MacBook Air (standalone copy)
```bash
# Copy folder from Mac Mini via Dropbox, then on MacBook Air:
cp -r ~/Library/CloudStorage/Dropbox/yardi-automation ~/Dev/yardi-automation
rm -rf ~/Library/CloudStorage/Dropbox/yardi-automation   # remove from Dropbox

cd ~/Dev/yardi-automation
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
chmod +x launch_chrome.sh
```

**First time only (both machines):** After launching Chrome, log into Yardi Voyager
and complete 2FA. Chrome saves the session — future runs open already logged in.

---

## Daily usage

### Step 1 — Launch the Yardi Chrome window

**Mac Mini:**
```bash
cd ~/Dev/Nuxt/EE_manager/scripts/yardi-automation
./launch_chrome.sh
```

**MacBook Air:**
```bash
cd ~/Dev/yardi-automation
./launch_chrome.sh
```

Wait a few seconds. In the new Chrome window:
- Log in if prompted (complete 2FA)
- Navigate to the **main Yardi dashboard**
- Confirm **clawren** is the active property — blue stat tiles are visible

### Step 2 — Run the script

**Mac Mini:**
```bash
cd ~/Dev/Nuxt/EE_manager/scripts/yardi-automation
source .venv/bin/activate
python yardi_download.py
```

**MacBook Air:**
```bash
cd ~/Dev/yardi-automation
source .venv/bin/activate
python yardi_download.py
```

### Step 3 — Follow the prompts

**Pre-flight:** Confirm dashboard is ready → press Enter.

**Steps 1–10:** Fully automatic. No action needed. Watch the terminal for progress.

**Step 11 — Delinquencies (AR Analytics):**
1. In Chrome: hover **Analytic Reports** → click **Residential AR Analytics**
2. Wait for the form to load
3. Press **Enter** in the terminal
4. Script auto-fills all fields and downloads

**Step 12 — Expiring Leases (Residential Analytics):**
1. In Chrome: hover **Analytic Reports** → click **Residential Analytics**
2. Wait for the form to load
3. Press **Enter** in the terminal
4. Script auto-fills Report Type, Properties, Section, and Dates — then clicks Display
5. Wait for the table to appear in Chrome and verify it looks correct
6. Press **Enter** in the terminal to download

Done. All 12 files are saved to Dropbox automatically.

---

## What the script does

| Step | File | Method | Notes |
|------|------|--------|-------|
| 1 | `5p_Leased_Units` | Auto | |
| 2 | `5p_Availables` | Auto | |
| 3 | `5p_Transfers` | Auto | |
| 4 | `5p_Applications` | Auto | |
| 5 | `5p_Notices` | Auto | |
| 6 | `5p_Alerts` | Auto | |
| 7 | `5p_MakeReady` | Auto | |
| 8 | `5p_WorkOrders` | Auto | |
| 9 | `5p_Residents_Status` | Auto | Navigates iframe directly |
| 10 | `5p_Residents_Status_All` | Auto | Same form, all statuses from 01/01/1995 |
| 11 | `5p_Delinquencies` | Guided (1 pause) | You navigate; script fills & downloads |
| 12 | `5p_ExpiringLeases` | Guided (2 pauses) | You navigate; script fills, you verify, script downloads |

---

## Files saved

```
~/Library/CloudStorage/Dropbox/Data/5p_<Name>_YY_MM_DD.xlsx
```

Previous files with the same name are moved to `Dropbox/Data/Archive/` with a
timestamp before the new file is saved.

---

## How it works (technical)

| Phase | Technique |
|-------|-----------|
| Connect to Chrome | `playwright connect_over_cdp` on port 9222 |
| Phase A (steps 1–8) | Click dashboard links in `filter` iframe, wait for header, download via Excel icon |
| Phase B (steps 9–10) | Navigate `filter` iframe directly to `SysSqlScript.aspx` URL — no hover menu needed |
| Phase C (steps 11–12) | Scan all open tabs for `filter` iframe with correct form; fill via Playwright locators |
| Properties (steps 11–12) | `^`-separated codes in lookup field (`azres422^azstoran^cacitvie^caoceabr^cawhioak`) |
| Step 12 Excel download | `button#Excel_Button` (confirmed via live DOM inspection) |
| File archiving | `utils/archive.py` — moves existing file with timestamp before saving new one |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Cannot reach Chrome on port 9222` | Run `./launch_chrome.sh` first |
| `No Yardi tab found` | Log into Yardi in the Chrome window before running the script |
| `Dashboard not detected` | Go to the Yardi main dashboard with clawren active |
| Step 9/10 form not loading | Check that the Yardi session is still active (not timed out) |
| Step 11/12 form not found | Make sure the analytics page is fully loaded before pressing Enter |
| Step 12 slow to render | Normal — Yardi can take 30–60s. Wait for the table before pressing Enter |

---

## The 12 files

| # | Filename | Source |
|---|----------|--------|
| 1 | `5p_Leased_Units` | Dashboard → Leased Units |
| 2 | `5p_Availables` | Dashboard → Available Units |
| 3 | `5p_Transfers` | Dashboard → Unit Transfers |
| 4 | `5p_Applications` | Dashboard → Pending Applications |
| 5 | `5p_Notices` | Dashboard → On Notice |
| 6 | `5p_Alerts` | Dashboard → Alerts |
| 7 | `5p_MakeReady` | Dashboard → Pending Make Ready |
| 8 | `5p_WorkOrders` | Dashboard → Pending Work Requests |
| 9 | `5p_Residents_Status` | Reports → Resident → Resident Directory w/Email (Current only, 1 month) |
| 10 | `5p_Residents_Status_All` | Same report, all statuses, from 01/01/1995 |
| 11 | `5p_Delinquencies` | Analytic Reports → Residential AR Analytics |
| 12 | `5p_ExpiringLeases` | Analytic Reports → Residential Analytics (Expiring Leases + M-to-M) |
