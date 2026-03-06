# Deletion & Cleanup Protocol: EE_manager (V1.0)

## 1. PURPOSE
To ensure database integrity, storage efficiency, and cost control by standardizing how data and associated files are removed from the system. This protocol prevents "Dark Data" (unreferenced DB rows) and "Orphaned Files" (files in Storage with no DB record).

---

## 2. THE THREE DELETION TIERS

### TIER 1: SOFT DELETE (DEFAULT)
*   **Use Case**: Transactional/Relational data (Leases, Tenancies, Residents, Inventory).
*   **Mechanism**: Set `is_active = false` or `resolved_at = now()`.
*   **Policy**: Permanent retention. `is_active = false` serves as a "Natural Archive."
*   **Cleanup**: None required. Database volume is expected to be manageable for decades.

### TIER 2: HARD DELETE (OPERATIONAL)
*   **Use Case**: Disposable/Temporary data (Staging records, Daily Upload logs, Drafts).
*   **Mechanism**: `DELETE FROM table WHERE id = x`.
*   **Constraint**: Use for high-churn/low-value logs to keep primary tables lean.

### TIER 3: ATTACHMENT PURGE (HYBRID MODEL)
Database records and Storage objects are loosely coupled. We adopt a **Hybrid Model** to balance UI performance with storage hygiene.

#### 1. "Best-Effort" Client Purge (UI Layer)
Composables SHOULD attempt to delete associated storage files immediately upon record deletion.
- **Benefit**: Immediate reduction in storage usage.
- **Trade-off**: Adds minor latency. If it fails (network error), the DB delete proceeds anyway to avoid blocking the user.

#### 2. Definitive Orphan Scanner (Maintenance Layer)
The primary mechanism for storage hygiene is the **Periodic Orphan Scanner**.
*   **Mechanism**: A script that crawls storage buckets and verifies each file exists in the active DB.
*   **Frequency**: Quarterly or twice-yearly.
*   **Effectiveness**: 100% catch-all. It cleans up orphans created by failed client purges, manual DB edits, or bugs.

---

## 3. STORAGE STRUCTURE RULES

### Maximum Depth: 2 Levels
All uploaded files MUST be stored at exactly `{bucket}/{folder}/{filename}`. Sub-folders are prohibited.

**Correct:**
```
images/locations/abc123.jpg
documents/location-notes/xyz789.pdf
```

**Prohibited:**
```
images/renewal-templates/letterheads/file.jpg   ← sub-folder, violates depth rule
documents/renewal-templates/docx/template.docx  ← sub-folder, violates depth rule
```

**Why this matters:** The Orphan Scanner traverses exactly 2 levels. Files deeper than `{bucket}/{folder}/{file}` are invisible to it and will never be caught by the hygiene system.

**Enforcement:** The Orphan Scanner emits a `STRUCTURAL VIOLATION` warning when it detects a sub-folder at level 2. Any such warning must be treated as a bug — flatten the upload path.

**Known violation to resolve:** `images/renewal-templates/letterheads/` and `documents/renewal-templates/docx/` — these sub-folders predate this rule and must be flattened. Track as a follow-up migration on the renewal mail-merge system.

---

## 4. DUPLICATION & CONTENT ADDRESSING
*   **Policy**: Allow duplicate file uploads (multiple records pointing to identical content).
*   **Reasoning**: Reliability and simplicity. "Clean" content addressing (hashing) adds significant architectural overhead (Ref-counting) that is not justified at current scale.

---

## 5. MAINTENANCE & HYGIENE
1.  **Orphan Scanner**: The definitive hygiene tool. 
2.  **Log Cleanup**: `import_staging` and `solver_tracking` records older than 180 days (6 months) are candidate for auto-deletion.

---

## 6. IMPLEMENTATION CHECKLIST (FOR BUILDERS)
When implementing a "Delete" button:
- [ ] Is this Tier 1 or Tier 2?
- [ ] Does this record have attachments?
- [ ] Did I call `supabase.storage.from(bucket).remove([path])`?
- [ ] Did I verify the cascade?
