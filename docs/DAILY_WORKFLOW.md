# BookBridge Daily Workflow Instructions

## Copy & Paste Commands for Claude Code

### 🌅 Start of Each Day

**Method 1 - Simple Command (if files already loaded):**
```
Check TODO.md for today's tasks in the current sprint week. Review SPRINT_PLANS.md for this week's goals and acceptance criteria. Let's complete today's tasks.
```

**Method 2 - Auto-Load Command (recommended - paste this and Claude loads everything):**
```
Read docs/TODO.md, docs/SPRINT_PLANS.md, docs/ARCHITECTURE.md, and docs/UX_DESIGN.md. Then check TODO.md for today's tasks in the current sprint week. Review SPRINT_PLANS.md for this week's goals and acceptance criteria. Focus on implementing mindblowing UI/UX features that are both accessible and visually stunning. Let's complete today's tasks.
```

**Method 3 - Quick Start:**
```
Read the files in docs/ folder. What's on the TODO for today?
```

### 🌙 End of Each Day

**Auto-Load End of Day Command:**
```
Read docs/TODO.md and docs/SPRINT_PLANS.md. Update TODO.md to mark completed tasks. Document any blockers or changes needed. Commit today's work with a descriptive message. What's the priority for tomorrow based on our sprint plan?
```

### 📁 Essential Context Files to Load

**Always load these files:**
- `docs/TODO.md` - Daily task checklist with UI/UX priorities
- `docs/SPRINT_PLANS.md` - Weekly goals and acceptance criteria  
- `docs/ARCHITECTURE.md` - Technical decisions and patterns
- `docs/UX_DESIGN.md` - Mindblowing UI/UX specifications and guidelines
- **Current sprint's code** - Whatever you're actively building

**Load when needed:**
- `docs/TESTING_STRATEGY.md` - When writing tests
- `docs/SECURITY.md` - When implementing auth/security
- `docs/MASTER_PLAN.md` - For strategic decisions
- Cost optimization files in `docs/` - For AI implementation

### 🚀 Start of Sprint Command
```
Read docs/SPRINT_PLANS.md and docs/TODO.md. Review this week's sprint plan and today's TODO items. What should we tackle first?
```

### 💡 Quick Reference Commands

**When implementing UI/UX features:**
```
Read docs/UX_DESIGN.md. Review the specific design specifications for this feature. How do we make this both visually stunning AND accessible? Check the accessibility integration requirements.
```

**When stuck:**
```
Read docs/ARCHITECTURE.md. Review the technical approach for this feature. What's the accessibility-first way to implement this?
```

**Before implementing AI personality features:**
```
Read docs/UX_DESIGN.md section on AI Personality System. Also check docs/model_selection_strategy.md and docs/redis_caching_strategy.md. How do we create engaging AI responses while keeping costs under budget?
```

**Before implementing visual features:**
```
Read docs/UX_DESIGN.md for design specifications. Ensure all animations respect prefers-reduced-motion and maintain WCAG 2.1 AA compliance. Test with keyboard navigation and screen readers.
```

**Before security features:**
```
Read docs/SECURITY.md. Review security best practices. What security measures should we implement for this feature?
```

**Weekly checkpoint:**
```
Read docs/SPRINT_PLANS.md and docs/TODO.md. Review this week's acceptance criteria. Have we met all the goals? What needs to be completed before moving to the next sprint?
```

### 📅 Deployment Timeline Reference

- **Week 4**: Internal testing site
- **Week 8**: Private beta (accessibility testers)
- **Week 10**: Soft launch (50 beta users)
- **Week 12**: PUBLIC LAUNCH

### 🎯 Success Metrics to Track Daily

- **UI/UX Excellence:** Visual appeal + accessibility compliance 
- **WCAG 2.1 AA compliance:** 100% target for all new features
- **Animation Performance:** Smooth 60fps, <2s load times
- **AI costs:** Target <$40/day in testing
- **Test coverage:** Target 80%+ including accessibility tests
- **User Engagement:** Time on app, return rate, feature usage
- **Accessibility audit results:** Screen reader, keyboard navigation
- **User feedback:** Both functionality AND visual appeal satisfaction

---

## 🎨 **NEW: UI/UX Implementation Commands**

### **Starting 3D Book Shelf Implementation:**
```
Read docs/UX_DESIGN.md section on "3D Animated Book Shelf". Review the design specifications, accessibility requirements, and implementation details. Let's build the magical book shelf interface that creates a "wow factor" while maintaining full accessibility.
```

### **Working on AI Personality Enhancement:**
```
Read docs/UX_DESIGN.md section on "Enhanced AI Personality System" and docs/ARCHITECTURE.md AI integration details. How do we upgrade from generic responses to engaging, educational personality that adapts to each book?
```

### **Implementing Gesture Controls:**
```
Read docs/UX_DESIGN.md section on "Magical Gesture Controls". Review all gesture specifications and their accessibility alternatives. Ensure every gesture has keyboard and screen reader equivalents.
```

### **Before any visual feature:**
```
Read docs/UX_DESIGN.md for this specific feature. Check: 1) Visual specifications, 2) Accessibility integration, 3) Performance requirements, 4) Mobile optimization. Test with prefers-reduced-motion and high contrast modes.
```

---

**Remember:** Our new motto is "Accessibility-First Delight" - every feature must be both visually stunning AND fully accessible. Legal compliance and accessibility remain top priority, but now we're also creating an experience users will love and remember.