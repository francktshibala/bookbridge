# Modern Content Workflow Guide

**Simple instructions for implementing modern stories**

---

## 🚀 Quick Start

### **Step 1: Read the README**
Open `docs/modern-content/README.md` - it explains the file structure

### **Step 2: Follow Phases in Order**
1. **Phase 0** (`01-story-selection.md`) - Validate story first
2. **Phase 1** (`02-content-creation.md`) - Create story text
3. **Phase 2** (`03-preview-generation.md`) - Generate preview
4. **Phase 3** (`04-audio-generation.md`) - Generate audio
5. **Phase 4** (`05-integration.md`) - Connect to app
6. **Phase 5** (`06-completion-log.md`) - Document completion

### **Step 3: Reference Technical Files When Needed**
- Need voice IDs? → `technical/voice-settings.md`
- Need database format? → `technical/database-schemas.md`
- Need API structure? → `technical/api-structures.md`
- Having issues? → `technical/troubleshooting.md`

---

## 📁 File Locations

### **Documentation Files**
- `docs/modern-content/README.md` - Start here
- `docs/modern-content/00-strategy-overview.md` - High-level strategy
- `docs/modern-content/01-story-selection.md` - Steps 0-0.75
- `docs/modern-content/02-content-creation.md` - Steps 1-4.5
- `docs/modern-content/03-preview-generation.md` - Steps 7-9
- `docs/modern-content/04-audio-generation.md` - Steps 10-12
- `docs/modern-content/05-integration.md` - Steps 13-15
- `docs/modern-content/06-completion-log.md` - Track completions

### **Scripts (Organized by Phase)**
- `scripts/modern-content/extract-themes/` - Theme extraction
- `scripts/modern-content/generate-preview/` - Preview generation
- `scripts/modern-content/generate-bundles/` - Bundle audio generation
- `scripts/modern-content/integrate-database/` - Database integration
- `scripts/modern-content/seed/` - Database seeding

### **Technical Reference**
- `docs/modern-content/technical/voice-settings.md`
- `docs/modern-content/technical/database-schemas.md`
- `docs/modern-content/technical/api-structures.md`
- `docs/modern-content/technical/troubleshooting.md`

---

## ✅ Implementation Checklist

### **Before Starting:**
- [ ] Read `README.md`
- [ ] Check `06-completion-log.md` for similar stories
- [ ] Review `00-strategy-overview.md` for context

### **Phase 0: Story Selection** (`01-story-selection.md`)
- [ ] Step 0: Content Planning
- [ ] Step 0.25: Source Material Check ⚠️ **DO THIS FIRST**
- [ ] Step 0.5: Emotional Impact Validation ⚠️ **MANDATORY GATE**
- [ ] Step 0.6: Voice Selection
- [ ] Step 0.75: Find Source Material

### **Phase 1: Content Creation** (`02-content-creation.md`)
- [ ] Step 1: Extract Source Text
- [ ] Step 2: Clean & Structure Text
- [ ] Step 2.6: Write Main Story
- [ ] Step 3: Create Background Context
- [ ] Step 3.5: Create Emotional Hook
- [ ] Step 4: Simplify to CEFR Level
- [ ] Step 4.5: Markdown Cleanup

### **Phase 2: Preview Generation** (`03-preview-generation.md`)
- [ ] Step 7: Generate Combined Preview Text
- [ ] Step 8: Generate Combined Preview Audio ⚠️ **Enhanced Timing v3**
- [ ] Step 9: Validate Combined Preview

### **Phase 3: Audio Generation** (`04-audio-generation.md`)
- [ ] Step 10: Script Validation
- [ ] Step 10.5: Generate Bundle Audio (PILOT FIRST)
- [ ] Step 11: Full Bundle Generation
- [ ] Step 11.5: Database Integration
- [ ] Step 12: Validate Audio

### **Phase 4: Integration** (`05-integration.md`)
- [ ] Step 13: Create API Endpoint
- [ ] Step 14: Frontend Config (4 locations!)
- [ ] Step 15: Test Reading Route

### **Phase 5: Completion** (`06-completion-log.md`)
- [ ] Add to completion table
- [ ] Document learnings
- [ ] Note any issues

---

## 🚨 Critical Rules

1. **Never skip validation** - Step 0.25 and 0.5 prevent wasted work
2. **Always run pilot first** - Step 10.5 catches issues early
3. **Enhanced Timing v3 is mandatory** - For both preview and bundles
4. **Update all 4 config locations** - Step 14 requires 4 updates
5. **Test before deploying** - Step 15 catches integration issues

---

## 💡 Tips

- **Follow phases in order** - Each depends on the previous
- **Reference technical files** - Don't memorize voice IDs or formats
- **Check completion log** - Learn from previous stories
- **Run pilots first** - Catch issues early
- **Document learnings** - Help future implementations

---

**Last Updated:** December 2025  
**Status:** ✅ Reorganized for easier workflow

