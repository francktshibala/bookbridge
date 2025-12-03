# Agent 2: Supabase Auth & Email Flow Specialist - Research Instructions

## 🎯 Your Role
You are a **Supabase Auth & Email Flow Specialist** with deep expertise in:
- Supabase authentication flows
- Email confirmation patterns
- User creation timing and race conditions
- Supabase admin API usage
- Alternative email delivery strategies

## 📋 Research Tasks

### Task 1: Supabase generateLink() API Investigation
**Objective**: Verify correct usage of `admin.generateLink()` for signup confirmations

**Actions**:
1. Research Supabase `admin.generateLink()` API documentation
2. Verify if `type: 'signup'` is correct for new user confirmations
3. Check if `password` parameter is required/optional
4. Investigate if there are alternative methods to generate confirmation links
5. Review Supabase best practices for confirmation link generation

**Deliverable**: Correct API usage documentation with code examples

---

### Task 2: User Creation Timing Analysis
**Objective**: Investigate timing issues between user creation and email sending

**Actions**:
1. Analyze Supabase user creation flow and timing
2. Review if user exists immediately after `signUp()` call
3. Investigate if retry logic is sufficient or if different approach needed
4. Check if there are Supabase hooks/triggers that might delay user creation
5. Review alternative approaches (webhooks, database triggers, etc.)

**Deliverable**: Timing analysis with recommended approach

---

### Task 3: Supabase Built-in Email Investigation
**Objective**: Determine if Supabase sends its own confirmation emails that conflict with Resend

**Actions**:
1. Check if Supabase automatically sends confirmation emails on signup
2. Investigate if SMTP configuration affects built-in emails
3. Review if we should disable Supabase emails and use Resend only
4. Check for email conflicts or duplicate sending

**Deliverable**: Supabase email behavior analysis

---

### Task 4: Alternative Confirmation Link Methods
**Objective**: Find alternative ways to generate confirmation links

**Actions**:
1. Research Supabase magic link generation
2. Investigate manual token generation methods
3. Review if we can use Supabase's resend API instead
4. Check if we can construct confirmation URLs manually

**Deliverable**: Alternative methods with pros/cons

---

### Task 5: Supabase Auth Hooks & Triggers
**Objective**: Investigate if database triggers or auth hooks can help

**Actions**:
1. Review Supabase database triggers for user creation
2. Check if auth hooks can send emails automatically
3. Investigate edge functions for email sending
4. Compare hook-based vs. API-based email sending

**Deliverable**: Hook/trigger analysis with recommendations

---

### Task 6: Best Practices Research
**Objective**: Research industry best practices for email confirmation flows

**Actions**:
1. Review Supabase community patterns for email confirmations
2. Investigate how other apps handle confirmation emails
3. Check if there's a recommended pattern for Resend + Supabase
4. Review error handling best practices

**Deliverable**: Best practices documentation

---

## 📁 Files to Review

**Supabase Integration**:
- `app/api/auth/send-confirmation/route.ts` (current implementation)
- `app/auth/signup/page.tsx` (signup flow)
- Supabase dashboard → Authentication → Email Templates

**Database**:
- Check Supabase dashboard for triggers/hooks
- Review user creation flow

**Documentation**:
- Supabase Auth API documentation
- Supabase admin API documentation

---

## 🎯 Research Output

Save your findings in: `docs/research/Agent2_Supabase_Auth_Findings.md`

**Required Sections**:
1. **Executive Summary**: Key findings and recommendations
2. **generateLink() Analysis**: Correct usage and alternatives
3. **Timing Analysis**: User creation timing and race conditions
4. **Supabase Email Behavior**: Built-in email sending analysis
5. **Alternative Methods**: Other ways to generate confirmation links
6. **Hooks & Triggers**: Database trigger and auth hook options
7. **Best Practices**: Industry patterns and recommendations
8. **Root Cause**: Most likely explanation from Supabase perspective
9. **Solution Recommendations**: Ranked fixes with Supabase focus
10. **Implementation Steps**: Step-by-step Supabase-focused fixes

---

## 🔍 Key Questions to Answer

1. Is `admin.generateLink()` the correct API for signup confirmations?
2. Does Supabase send its own confirmation emails automatically?
3. Are there timing issues with user creation?
4. Should we use Supabase's resend API instead of generating links?
5. Can we use database triggers or auth hooks for email sending?
6. What's the recommended pattern for Resend + Supabase integration?

---

## 📊 Success Criteria

Your research is successful if:
- ✅ Supabase API usage is verified/corrected
- ✅ Timing issues are identified and resolved
- ✅ Alternative methods are documented
- ✅ Best practices are recommended
- ✅ Solution is actionable with code examples

---

**Start by reading**: `docs/research/CONFIRMATION_EMAIL_RESEARCH_PLAN.md` for full context

