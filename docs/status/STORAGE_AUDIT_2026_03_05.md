# Storage Audit Report — 2026-03-05

**Protocol Version:** V1.0 (Deletion & Cleanup Protocol)
**Mode:** DRY RUN — No files deleted.
**Auditor:** Claude Sonnet 4.6 (automated)

---

## Phase 1: Orphan Scanner Results

### Raw Output

**images bucket:** 5 "orphaned" paths reported
**documents bucket:** 2 "orphaned" paths reported

```
images:   inventory_item_definition, location-notes, locations, renewal-templates, unit
documents: location-notes, renewal-templates
```

### Critical Finding: Scanner Has a Folder-Detection Bug

**All 7 reported "orphans" are false positives.** The scanner is reporting storage *folder prefixes* as orphaned files, not actual uploaded files.

**Root cause:** The scanner uses `item.id === undefined` to detect folders (line 46 of `storage_orphan_scanner.ts`). Supabase's Storage API returns `id: null` (not `undefined`) for folder-level items. Because `null === undefined` evaluates to `false`, the `if` branch (recursive folder listing) is never entered. Every top-level item falls through to the `else` branch and is pushed into `allFiles` as a root-level file. These folder names (e.g., `"locations"`) are then checked against DB `file_url` columns, find no match, and are flagged as orphans.

**Consequence:** The scanner never descends into any folder. The actual files inside `images/locations/`, `images/location-notes/`, `images/unit/`, etc. were **never scanned**. True storage health is **unknown**.

**Fix required before first live purge:** Change line 46 from:
```ts
if (item.id === undefined) {
```
to:
```ts
if (item.id === null) {
```

> **DO NOT run `--dry-run=false` until this bug is fixed.** Doing so with the current code would attempt to delete the folder-prefix entries, which would either fail silently or produce unexpected behavior — actual orphaned files would remain untouched.

---

## Phase 2: Best-Effort Purge Verification

### `useLocationService.ts` — `deleteLocation` ✅ COMPLIANT

**Pattern:** collect → remove(storage) → delete(db)

```
1. Fetches location record to get source_image_url          (collect)
2. Parses path from URL, calls storage.remove([filePath])   (remove storage)
3. Wrapped in try/catch — failure logs warn, does not block  (best-effort)
4. Deletes the DB row regardless                             (delete db)
```

Fully compliant with the Hybrid Model spec.

---

### `useLocationNotes.ts` — `deleteNoteAttachment` ✅ COMPLIANT

**Pattern:** collect → remove(storage) → delete(db)

```
1. Fetches attachment record to get file_url + file_type     (collect)
2. Derives bucket from file_type, parses path from URL       (derive bucket)
3. Calls storage.remove([filePath]) in try/catch             (remove storage)
4. Deletes the DB row regardless                             (delete db)
```

Fully compliant.

---

### `useLocationNotes.ts` — `deleteLocationNote` ⚠️ NON-COMPLIANT (Gap)

**Pattern expected:** collect attachments → remove(storage) → delete(db note, cascades rows)
**Pattern actual:** delete(db note) only — storage files are never purged

When a note is deleted, the DB cascade correctly deletes the child `location_note_attachments` rows. However, `deleteLocationNote` **never fetches the attachment list or calls `storage.remove()`** before issuing the DB delete. Every note deletion creates guaranteed orphaned files in storage.

This is not a Best-Effort failure (network flake) — it is a structural omission. The Orphan Scanner is the only thing catching these.

**Additionally:** The function contains dead code from a prior draft:
- Fetches `note.created_by` but never acts on it
- Has empty `if (count === 0) {}` / `else {}` blocks (lines 155–158)

---

## Phase 3: Recommendations

### Priority 1 — Fix Scanner Before Any Live Purge (BLOCKING)

Fix `item.id === undefined` → `item.id === null` in `storage_orphan_scanner.ts:46`. Rerun in dry-run mode to get a true orphan report before scheduling any purge.

### Priority 2 — Patch `deleteLocationNote` (HIGH)

Add Best-Effort storage purge to `deleteLocationNote`. Before the DB delete:
1. Fetch all `location_note_attachments` for the note
2. Group by `file_type` to determine bucket
3. Call `storage.remove([...paths])` in a try/catch
4. Then proceed with the note DB delete

### Priority 3 — First Live Purge Readiness Criteria

The first live purge (`--dry-run=false`) should only proceed when:
- [ ] Scanner folder-detection bug is fixed
- [ ] A subsequent dry-run shows zero false positives
- [ ] Dry-run orphan list has been manually reviewed (path patterns sanity-checked)
- [ ] `deleteLocationNote` patch is deployed (prevents new orphans accumulating)

### Priority 4 — Log Cleanup (LOW, per Protocol §5)

Per the protocol, `import_staging` and `solver_tracking` records older than 180 days are candidates for auto-deletion. No automated mechanism exists yet. Schedule for a future maintenance task.

---

## Summary Table

| Component | Status | Finding |
|---|---|---|
| `storage_orphan_scanner.ts` | BROKEN | Folder-detection bug; all 7 reported orphans are false positives |
| `useLocationService.deleteLocation` | COMPLIANT | Correct Best-Effort purge |
| `useLocationNotes.deleteNoteAttachment` | COMPLIANT | Correct Best-Effort purge |
| `useLocationNotes.deleteLocationNote` | NON-COMPLIANT | Missing storage purge step; structural gap |
| First live purge readiness | NOT READY | Blocked on scanner fix + patch deployment |
