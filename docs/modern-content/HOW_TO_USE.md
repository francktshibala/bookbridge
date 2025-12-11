# How to Use the Reorganized Modern Content Files

**Simple guide to working with the new file organization**

---

## ✅ What Was Done

### **1. Documentation Reorganized**
- Split large 3,034-line file into 7 manageable phase files
- Each file is 200-800 lines (easy to navigate)
- Clear phase boundaries (no overlap)

### **2. Scripts Organized**
- Scripts moved to `scripts/modern-content/` subdirectories
- Organized by function (extract, generate, integrate, seed)
- Easier to find related scripts

### **3. Completion Log Updated**
- Added disability-overcome-2 to completion log
- All 13 modern stories now documented

---

## 📁 New File Structure

```
docs/modern-content/
├── README.md                    ← START HERE - Overview
├── WORKFLOW_GUIDE.md            ← Quick reference checklist
├── HOW_TO_USE.md                ← This file
├── 00-strategy-overview.md      ← High-level strategy
├── 01-story-selection.md        ← Phase 0: Steps 0-0.75
├── 02-content-creation.md       ← Phase 1: Steps 1-4.5
├── 03-preview-generation.md     ← Phase 2: Steps 7-9
├── 04-audio-generation.md      ← Phase 3: Steps 10-12
├── 05-integration.md            ← Phase 4: Steps 13-15
├── 06-completion-log.md         ← Track completions
└── technical/                   ← Technical reference
    ├── voice-settings.md
    ├── database-schemas.md
    ├── api-structures.md
    └── troubleshooting.md

scripts/modern-content/
├── extract-themes/              ← Theme extraction scripts
├── generate-preview/            ← Preview generation scripts
├── generate-bundles/            ← Bundle audio generation
├── integrate-database/          ← Database integration
└── seed/                        ← Database seeding
```

---

## 🚀 How to Implement a New Story

### **Step 1: Start Here**
Open `docs/modern-content/README.md` - read the overview

### **Step 2: Follow Phases in Order**

**Phase 0** → Open `01-story-selection.md`
- Do Steps 0.25 and 0.5 FIRST (validation gates)
- If story fails validation, STOP and pick different story

**Phase 1** → Open `02-content-creation.md`
- Create story text content
- Write background context and hook
- Simplify to CEFR level

**Phase 2** → Open `03-preview-generation.md`
- Generate combined preview text
- Generate preview audio (Enhanced Timing v3 required)

**Phase 3** → Open `04-audio-generation.md`
- Run pilot first (10 bundles)
- Generate all bundles
- Integrate into database

**Phase 4** → Open `05-integration.md`
- Create API endpoint
- Update frontend config (4 locations!)
- Test everything

**Phase 5** → Open `06-completion-log.md`
- Document completion
- Add learnings

### **Step 3: Reference Technical Files When Needed**
- Need voice IDs? → `technical/voice-settings.md`
- Need database format? → `technical/database-schemas.md`
- Need API structure? → `technical/api-structures.md`
- Having issues? → `technical/troubleshooting.md`

---

## 📝 Example Workflow

### **Starting a New Story:**

1. **Read** `README.md` (5 min)
2. **Open** `01-story-selection.md`
3. **Do** Step 0.25 (Source Material Check) - 10 min
4. **Do** Step 0.5 (Emotional Impact Validation) - 15 min
5. **If passed:** Continue to Phase 1
6. **If failed:** Pick different story

### **During Implementation:**

- **Writing content?** → Use `02-content-creation.md`
- **Generating audio?** → Use `04-audio-generation.md`
- **Need voice ID?** → Check `technical/voice-settings.md`
- **Creating API?** → Use `05-integration.md`

### **After Completion:**

- **Document** in `06-completion-log.md`
- **Note** any learnings or issues

---

## 🔍 Finding Scripts

### **Old Way (Before Reorganization):**
```
scripts/
├── generate-disability-overcome-2-bundles.js
├── generate-refugee-journey-2-bundles.js
├── generate-community-builder-2-bundles.js
├── integrate-disability-overcome-2-database.ts
├── integrate-refugee-journey-2-database.ts
... (500+ scripts mixed together)
```

### **New Way (After Reorganization):**
```
scripts/modern-content/
├── generate-bundles/
│   ├── generate-disability-overcome-2-bundles.js
│   ├── generate-refugee-journey-2-bundles.js
│   └── generate-community-builder-2-bundles.js
├── integrate-database/
│   ├── integrate-disability-overcome-2-database.ts
│   ├── integrate-refugee-journey-2-database.ts
│   └── integrate-community-builder-2-database.ts
└── seed/
    ├── seed-disability-overcome-2.ts
    └── seed-refugee-journey-2.ts
```

**Benefit:** Related scripts are together, easier to find

---

## 💡 Key Benefits

### **Before Reorganization:**
- ❌ One 3,034-line file (hard to navigate)
- ❌ 500+ scripts in one directory (hard to find)
- ❌ No clear workflow guide
- ❌ Hard to know which file to use when

### **After Reorganization:**
- ✅ 7 phase files (200-800 lines each)
- ✅ Scripts organized by function
- ✅ Clear workflow guide (README + WORKFLOW_GUIDE)
- ✅ Easy to know which file to use (follow phases)

---

## 🚨 Important Notes

1. **Old files still exist** - `docs/MODERN_CONTENT_EMOTIONAL_IMPACT_STRATEGY.md` is still there for reference, but use new files going forward

2. **Scripts are being moved** - Some scripts may still be in old location, check both places if needed

3. **Completion log moved** - Now at `docs/modern-content/06-completion-log.md` (also still in old location for now)

4. **Follow phases in order** - Each phase depends on the previous one

---

## 📚 Quick Reference

| What You Need | File to Open |
|--------------|--------------|
| Starting a new story | `README.md` → `01-story-selection.md` |
| Creating story text | `02-content-creation.md` |
| Generating preview | `03-preview-generation.md` |
| Generating audio | `04-audio-generation.md` |
| Connecting to app | `05-integration.md` |
| Documenting completion | `06-completion-log.md` |
| Voice IDs | `technical/voice-settings.md` |
| Database format | `technical/database-schemas.md` |
| API structure | `technical/api-structures.md` |
| Troubleshooting | `technical/troubleshooting.md` |

---

**Last Updated:** December 2025  
**Status:** ✅ Reorganized and ready to use

