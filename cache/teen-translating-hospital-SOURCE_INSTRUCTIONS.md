# Source Material Instructions for "Teen Translating for Parents Through Hospital Chaos"

## Step 1: Fetch Primary Source

**Source:** Vox First Person  
**Access:** Manual scrape from public site  
**URL:** Search Vox First Person for articles about teens translating for parents in medical emergencies

**Action:**
1. Visit Vox.com and search for "First Person" articles
2. Look for stories about teens/children translating for parents in hospitals
3. Copy the article text
4. Save to: `cache/teen-translating-hospital-source-vox.txt`

## Step 2: Find Additional Sources (2-3 more)

**Search Terms:**
- "teen translator hospital parents"
- "child medical interpreter"
- "teen translating for parents emergency"
- "young translator medical emergency"

**Potential Sources:**
- NPR articles
- Local news stories
- Interviews or profiles
- Academic case studies (extract themes only)

**Action:**
1. Find 2-3 additional sources
2. Save each to: `cache/teen-translating-hospital-source-{number}.txt`
3. Document sources in `cache/teen-translating-hospital-sources.md`

## Step 3: Extract Themes (NOT Text)

**Important:** We extract THEMES and EMOTIONAL MOMENTS only, NOT text. This is legal compliance.

**Themes to Extract:**
- Language barriers in medical settings
- Teen advocacy and responsibility
- Medical emergency situations
- Confidence building through crisis
- Family dynamics during emergencies

**Emotional Moments (7):**
1. Parents' medical emergency, can't communicate
2. Teen realizes she must translate
3. Fear of making mistakes with medical terms
4. First successful translation saves parent
5. Doctor's recognition of her skill
6. Confidence building moment
7. Realization of her own strength

**Action:**
1. Read all sources
2. Extract themes and emotional moments (NOT text)
3. Run: `node scripts/extract-teen-translating-themes.js`
4. Review extracted themes in `cache/teen-translating-hospital-themes.json`

## Legal Compliance

✅ **DO:**
- Extract themes and emotional moments
- Use multiple sources (factual research)
- Document facts (dates, locations, names)
- Create original narrative structure

❌ **DON'T:**
- Copy exact text from sources
- Use single source
- Copy unique phrasing or expressions
- Mimic source narrative structure

