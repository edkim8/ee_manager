# Git Workflow Policy

**Date**: 2026-01-31  
**Effective**: Immediately for all future changes

---

## Standard Workflow: Pull Requests Required

All feature branches must go through PR review before merging to `main`.

### Process

1. **Agent creates feature branch**
   ```bash
   git checkout -b feature/description
   ```

2. **Agent commits work**
   ```bash
   git add .
   git commit -m "feat: description"
   git push origin feature/description
   ```

3. **Agent creates PR**
   ```bash
   gh pr create --base main --head feature/description \
     --title "feat(scope): Description" \
     --body "## Summary
   Brief description
   
   ## Changes
   - Item 1
   - Item 2
   
   ## Verification
   - [x] Tests pass
   - [x] Documentation updated
   
   ## Builder
   [Agent Name]"
   ```

4. **User reviews PR on GitHub**
   - Check diff
   - Review documentation
   - Test locally if needed

5. **User merges PR**
   ```bash
   gh pr merge feature/description --squash  # or --merge
   ```

---

## Exception: Direct Merge Allowed

Direct merge to `main` is acceptable ONLY for:
- ✅ Critical hotfixes blocking work
- ✅ Documentation-only changes (typos, clarifications)
- ✅ Emergency bug fixes

**All other changes require PR review.**

---

## Benefits of PR Workflow

1. **Review Trail**: Visual diff of all changes
2. **Discussion Space**: Comment on specific lines
3. **Rollback Safety**: Easy to identify and revert
4. **CI/CD Integration**: Automated tests before merge
5. **Team Ready**: Workflow scales when adding collaborators

---

## Current Implementation

**Gemini Goldfish** (Asset Tables):
- Branch: `feature/asset-tables`
- Creates PR automatically
- User reviews and merges

**Claude Code** (Availabilities Table):
- Branch: `feature/availabilities-table`
- Creates PR automatically
- User reviews and merges

---

**Policy Owner**: Foreman (Antigravity)  
**Approved By**: User (Edward)
