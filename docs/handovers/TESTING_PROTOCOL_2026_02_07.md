# Testing Protocol: Daily Upload (2026-02-07)

**Goal:** Verify the multi-report Solver run and the newly enhanced high-fidelity Executive Summary.

## 1. Data Preparation
- Ensure all 11 reports are downloaded from Yardi today.
- **Specific Test Case (Manual Edit)**: If possible, slightly modify one rent value in the `Availables` report compared to yesterday's value (e.g., change a unit from $1500 to $1550) to trigger the `price_change` tracker.

## 2. Solver Execution
1.  Navigate to `/admin/solver`.
2.  Upload the batch of 11 reports.
3.  Click **Run Solver**.
4.  Monitor the Console for errors (verify no `409` or `406` resurface).

## 3. Executive Report Verification
1.  Review the Markdown report generated in the console.
2.  **Verify Tables**:
    - Are "New Tenancies" in a table?
    - Are "Lease Renewals" showing old vs new rent in a table?
    - Are "Price Changes" visible with 🟢/🔴 indicators?
3.  **Verify Price Changes**:
    - Does the unit you modified show up in the "Price Changes" table?
    - Is the percentage calculation correct?

## 4. Notification Verification
1.  Navigate to `/admin/notifications`.
2.  Verify the "Daily Summary" was triggered.
3.  Check the email (if MailerSend is active) to see if tables render clearly in the mail client.

---
**Status**: Ready for Execution Tomorrow
**Supervisor**: Foreman
