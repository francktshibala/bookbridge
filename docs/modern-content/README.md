# Modern Content Implementation Guide

**Your Complete Workflow for Adding Modern Stories to BookBridge**

---

## 🎯 Quick Start: How to Use These Files

### **🚀 FOR AGENTS: START HERE**
**👉 Read:** `AGENT_START_HERE.md` - **COMPLETE IMPLEMENTATION GUIDE IN ONE FILE**

This single file contains everything needed to implement a story from scratch:
- Complete 21-step workflow (embedded, not links)
- Files to read in order
- Critical success factors
- **Where to log completion** after each story
- Frontend config checklist (4 required locations)
- Quality validation

**Read `AGENT_START_HERE.md` first → you'll know everything.**

---

### **For Human Reference:**

1. **Read this file first** - Understand the workflow
2. **Follow Phase 0** (`00-strategy-overview.md`) - Select and validate your story
3. **Follow phases in order** - Each phase builds on the previous one
4. **Reference technical files** - When you need code examples or settings

### **File Organization:**

```
docs/modern-content/
├── README.md (this file) - Start here!
├── 00-strategy-overview.md - High-level strategy & story selection
├── 01-story-selection.md - Steps 0-1: Validation & source finding
├── 02-content-creation.md - Steps 2-4: Writing & content preparation
├── 03-preview-generation.md - Steps 7-8: Preview text & audio
├── 04-audio-generation.md - Steps 9-11: Bundle audio generation
├── 05-integration.md - Steps 12-15: Database, API, frontend
├── 06-completion-log.md - Track completed stories & learnings
└── technical/ - Technical reference files
    ├── voice-settings.md - Voice IDs, settings, production formula
    ├── database-schemas.md - Prisma models, timing formats
    ├── api-structures.md - API response formats
    └── troubleshooting.md - Common issues & fixes
```

---

## 📋 Complete Workflow (21 Steps)

### **Phase 0: Story Selection** → `01-story-selection.md`
- Step 0: Content Planning
- Step 0.25: Source Material Check ⚠️ **DO THIS FIRST**
- Step 0.5: Emotional Impact Validation ⚠️ **MANDATORY GATE**
- Step 0.6: Voice Selection
- Step 0.75: Find Source Material

**When to use:** Before starting any work - validates story is worth implementing

---

### **Phase 1: Content Creation** → `02-content-creation.md`
- Step 1: Extract Source Text
- Step 2: Clean & Structure Text
- Step 2.1: Assess Original Complexity
- Step 2.5: Narrative Structure Creation
- Step 2.6: Write Main Story
- Step 3: Create Background Context
- Step 3.5: Create Emotional Hook
- Step 4: Simplify to CEFR Level
- Step 4.5: Markdown Cleanup

**When to use:** Creating the story text content

---

### **Phase 2: Preview Generation** → `03-preview-generation.md`
- Step 7: Generate Combined Preview Text
- Step 8: Generate Combined Preview Audio ⚠️ **Enhanced Timing v3 required**
- Step 9: Validate Combined Preview

**When to use:** Creating the intro section users see first

---

### **Phase 3: Audio Generation** → `04-audio-generation.md`
- Step 10: Script Validation
- Step 10.5: Generate Bundle Audio (PILOT FIRST)
- Step 11: Full Bundle Generation
- Step 11.5: Database Integration
- Step 12: Validate Audio

**When to use:** Generating audio files for the main story

---

### **Phase 4: Integration** → `05-integration.md`
- Step 13: Create API Endpoint
- Step 13.2: Update Frontend Component
- Step 14: Frontend Config
- Step 15: Test Reading Route

**When to use:** Making the story visible and functional in the app

---

### **Phase 5: Completion** → `06-completion-log.md`
- Step 20: Document Completion
- Update completion log with learnings

**When to use:** After story is live - document what you learned

---

## 🔧 Technical Reference Files

Located in `technical/` subdirectory:

- **`voice-settings.md`** - Voice IDs, production settings, when to use which voice
- **`database-schemas.md`** - Timing format requirements, Prisma models
- **`api-structures.md`** - API response formats, required fields
- **`troubleshooting.md`** - Common errors and how to fix them

**When to use:** When you need specific technical details (voice IDs, code examples, etc.)

---

## 📁 Script Organization

Scripts are organized by phase in `scripts/modern-content/`:

```
scripts/modern-content/
├── extract-themes/ - Theme extraction scripts
├── generate-preview/ - Preview generation scripts
├── generate-bundles/ - Bundle audio generation scripts
├── integrate-database/ - Database integration scripts
└── seed/ - Database seeding scripts
```

**Naming Convention:** `{action}-{story-id}-{variant}.js` or `.ts`

**Example:** `generate-disability-overcome-2-bundles.js`

---

## ✅ Step-by-Step Workflow

### **1. Start Here: Phase 0 (Story Selection)**
Open `01-story-selection.md` and follow Steps 0-0.75
- ⚠️ **CRITICAL:** Don't skip Step 0.25 (Source Material Check)
- ⚠️ **CRITICAL:** Don't skip Step 0.5 (Emotional Impact Validation)
- If story fails validation, STOP and pick a different story

### **2. Create Content: Phase 1 (Content Creation)**
Open `02-content-creation.md` and follow Steps 1-4.5
- Extract or write story text
- Create background context and hook
- Simplify to target CEFR level

### **3. Generate Preview: Phase 2 (Preview Generation)**
Open `03-preview-generation.md` and follow Steps 7-9
- Generate combined preview text
- Generate preview audio with Enhanced Timing v3
- Validate format

### **4. Generate Audio: Phase 3 (Audio Generation)**
Open `04-audio-generation.md` and follow Steps 10-12
- Run pilot first (10 bundles)
- Generate all bundles
- Integrate into database

### **5. Integrate: Phase 4 (Integration)**
Open `05-integration.md` and follow Steps 13-15
- Create API endpoint
- Update frontend config
- Test everything

### **6. Document: Phase 5 (Completion)**
Open `06-completion-log.md` and document completion
- Add to completion table
- Document learnings
- Note any issues

---

## 🚨 Critical Rules

1. **Never skip validation steps** - Step 0.25 and 0.5 prevent wasted work
2. **Always run pilot first** - Step 10.5 catches issues before full generation
3. **Enhanced Timing v3 is mandatory** - For both preview and bundle audio
4. **Update all 4 config locations** - Step 14 requires 4 updates in `books.ts`
5. **Test before deploying** - Step 15 catches integration issues

---

## 📚 Related Files

- **`docs/research/MODERN_STORY_SOURCES_RESEARCH_PLAN.md`** - Story discovery guide
- **`docs/MODERN_VOICES_IMPLEMENTATION_GUIDE.md`** - Legacy technical guide (being phased out)
- **`docs/implementation/story-completion-log.md`** - Legacy completion log (being phased out)

**Note:** New stories should use this reorganized structure. Old files remain for reference.

---

## 💡 Tips for Success

1. **Follow phases in order** - Each phase depends on the previous one
2. **Reference technical files** - Don't memorize voice IDs or formats
3. **Check completion log** - Learn from previous stories
4. **Run pilots first** - Catch issues early
5. **Document learnings** - Help future implementations

---

**Last Updated:** December 2025  
**Status:** ✅ Reorganized for easier workflow

