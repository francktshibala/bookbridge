# BookBridge Daily Workflow Instructions

## Copy & Paste Commands for Claude Code

### 🌅 Start of Each Day
```
Check TODO.md for today's tasks in the current sprint week. Review SPRINT_PLANS.md for this week's goals and acceptance criteria. Let's complete today's tasks.
```

### 🌙 End of Each Day
```
Update TODO.md to mark completed tasks. Document any blockers or changes needed. Commit today's work with a descriptive message. What's the priority for tomorrow based on our sprint plan?
```

### 📁 Essential Context Files to Load

**Always load these files:**
- `docs/TODO.md` - Daily task checklist
- `docs/SPRINT_PLANS.md` - Weekly goals and acceptance criteria  
- `docs/ARCHITECTURE.md` - Technical decisions and patterns
- **Current sprint's code** - Whatever you're actively building

**Load when needed:**
- `docs/TESTING_STRATEGY.md` - When writing tests
- `docs/SECURITY.md` - When implementing auth/security
- `docs/MASTER_PLAN.md` - For strategic decisions
- Cost optimization files in `docs/` - For AI implementation

### 🚀 Start of Sprint Command
```
Read this week's sprint plan from SPRINT_PLANS.md and today's TODO items. What should we tackle first?
```

### 💡 Quick Reference Commands

**When stuck:**
```
Review ARCHITECTURE.md for the technical approach to this feature. What's the accessibility-first way to implement this?
```

**Before implementing AI features:**
```
Check docs/model_selection_strategy.md and docs/redis_caching_strategy.md. How do we keep AI costs under budget for this feature?
```

**Before security features:**
```
Review SECURITY.md for security best practices. What security measures should we implement for this feature?
```

**Weekly checkpoint:**
```
Review this week's acceptance criteria in SPRINT_PLANS.md. Have we met all the goals? What needs to be completed before moving to the next sprint?
```

### 📅 Deployment Timeline Reference

- **Week 4**: Internal testing site
- **Week 8**: Private beta (accessibility testers)
- **Week 10**: Soft launch (50 beta users)
- **Week 12**: PUBLIC LAUNCH

### 🎯 Success Metrics to Track Daily

- WCAG 2.1 AA compliance status
- AI costs (target: <$40/day in testing)
- Test coverage (target: 80%+)
- Accessibility audit results
- User feedback from testing

---

**Remember:** Always prioritize legal compliance and accessibility. When in doubt, check the master plan or ask for clarification before proceeding.