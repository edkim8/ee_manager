# Agent Termination & Dispatch Guide

**Date**: 2026-01-31  
**Purpose**: Guide for terminating current agents and starting fresh ones

---

## ✅ Ready to Terminate Current Agents

The dispatch commands are now **complete and self-contained**. You can safely terminate:
- ✅ Current Gemini Goldfish (Solver Agent)
- ✅ Current Claude Code (Schema Sync Agent)
- ✅ Current Foreman (Antigravity - this session)

---

## What's Included in Dispatch Commands

Both commands now have:
1. ✅ **Project Introduction** - Context for new agents
2. ✅ **Task Specification** - Clear objectives and requirements
3. ✅ **Context Files** - References to documentation
4. ✅ **Technical Details** - Column specs, patterns, constraints
5. ✅ **PR Workflow** - Automated PR creation steps
6. ✅ **Verification** - Testing requirements

**New agents will have everything they need to start fresh.**

---

## Dispatch Instructions

### For Gemini Goldfish (Asset Tables)

1. **Terminate current Gemini Goldfish session**
2. **Create branch**:
   ```bash
   git checkout -b feature/asset-tables
   ```
3. **Start NEW Gemini session**
4. **Copy entire message** from [GEMINI_ASSET_TABLES_COMMAND.md](file:///Users/edward/Dev/Nuxt/EE_manager/docs/handoff/GEMINI_ASSET_TABLES_COMMAND.md)
5. **Paste and send** to new Gemini agent

**Expected**: Gemini will build 4 pages and create PR automatically

---

### For Claude Code (Availabilities Table)

1. **Terminate current Claude Code session**
2. **Create branch**:
   ```bash
   git checkout -b feature/availabilities-table
   ```
3. **Start NEW Claude session**
4. **Copy entire command** from [CLAUDE_AVAILABILITIES_COMMAND.md](file:///Users/edward/Dev/Nuxt/EE_manager/docs/handoff/CLAUDE_AVAILABILITIES_COMMAND.md)
5. **Run in terminal** (it's a `claude` command)

**Expected**: Claude will build Availabilities page and create PR automatically

---

## After Agents Complete

### Review PRs on GitHub

1. **Check Gemini's PR**:
   - Review 4 asset list pages
   - Check search, filter, export functionality
   - Review LATEST_UPDATE.md

2. **Check Claude's PR**:
   - Review Availabilities page
   - Check metrics dashboard
   - Verify view queries
   - Review LATEST_UPDATE.md

### Merge PRs

```bash
# Merge Gemini's PR
gh pr merge feature/asset-tables --squash

# Merge Claude's PR
gh pr merge feature/availabilities-table --squash
```

---

## Parallel Development

**Both agents can work simultaneously!**
- Gemini on `feature/asset-tables`
- Claude on `feature/availabilities-table`

No conflicts expected (different layers and files).

---

## Current Session Status

**This Foreman session** can also be terminated after dispatch. The new agents have:
- All context files in `docs/`
- Implementation plan in artifacts
- Git workflow policy
- Dispatch commands

**Everything is documented and ready for fresh agents.**

---

## Summary

✅ **Dispatch commands complete** - Include project intro and PR workflow  
✅ **Safe to terminate** - Current Gemini, Claude, and Foreman  
✅ **Ready to dispatch** - New agents have all context  
✅ **Parallel work** - Both can work simultaneously  
✅ **PR workflow** - Automated PR creation included  

**You're ready to start fresh with new agents!**
