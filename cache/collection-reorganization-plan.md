# Collection Reorganization Plan
**Date:** 2025-12-12
**Goal:** Clean, focused collection structure honoring app's classic literature origin

## Proposed Structure

### **Row 1 (Top Tier - isPrimary=true):**
1. **Classic Literature** (sortOrder=0) - Honoring app's origin
   - Consolidates: Classic Literature, Quick Reads, Love Stories, Psychological Fiction, Gothic & Horror
   - All classic books in one place
   - ~20 books total

2. **Starting Over** (sortOrder=1) - Modern collection
   - 8 stories: Refugee Journey (3), Second Chance (1), Single Parent (2), Age Defiance (1), Always a Family (1)

3. **Breaking Barriers** (sortOrder=2) - Modern collection
   - 8 stories: Disability Overcome (3), Medical Crisis (2), Workplace Discrimination (1), First-Gen Success (2), Helen Keller (1)

4. **Finding Home** (sortOrder=3) - Modern collection
   - 7 stories: Community Builder (3), Cultural Bridge (2), Lost Heritage (1), Romantic Love (1)

5. **Building Dreams** (sortOrder=4) - Modern collection
   - 7 stories: Career Pivot (3), First-Gen Success (2), Teaching Dad (1), Immigrant Entrepreneur (1)

6. **Making a Difference** (sortOrder=5) - Modern collection
   - 6 stories: Grief to Purpose (1), Youth Activism (1), TED Talks (3), Teen Translating (1)

**Total: 6 collections** (1 classic + 5 modern)

## Benefits:
- ✅ Honors app's origin (Classic Literature first)
- ✅ Clean, manageable number (6 collections)
- ✅ Classic books consolidated (easier to find)
- ✅ Modern stories organized by theme
- ✅ Perfect for 2-row grid (3x3 or 2x3 layout)

## Implementation Steps:
1. Consolidate all classic books into "Classic Literature" collection
2. Create 5 new modern collections
3. Reassign stories from Modern Voices to new collections
4. Set Classic Literature to sortOrder=0 (first position)
5. Set modern collections to sortOrder 1-5
6. Archive/remove old classic sub-collections
7. Archive Modern Voices collection (or keep as isPrimary=false for reference)

