# Teacher Dashboard — Problem Brief (for independent research by Claude, Gemini, and Copilot)

## Context

BookBridge is a reading platform for **adult ESL learners**, with **ESL teachers** as the other primary user of this feature. (The product may expand to other customer segments later — school-age ESL, other language-learning contexts — but design for adult learners first; don't build for a future audience that doesn't exist yet.)

We are deliberately trying **not** to build unnecessary features. This brief exists to understand the underlying problem thoroughly — including where the problem is genuinely still open — before locking in a feature list.

## What teachers actually told us (verbatim, the only direct evidence we have)

From a real survey of ESL teachers using BookBridge, the Teacher Dashboard request was:

> "Teachers need to see student reading progress, time spent reading, completed books, and comprehension results."

That is the entire direct signal available. It is a feature list, not a problem description — treat everything below this line as an attempt to reconstruct the underlying problem from that one line plus reasoning, **not** as additional things teachers said. Please do your own independent reasoning rather than accepting our list as settled — the goal is multiple independent takes to compare.

## Problem components identified so far, and candidate solutions

Each item: the problem in plain language, then a candidate solution direction. These are a starting hypothesis, not a spec — please challenge, replace, or extend them.

**1. Not knowing if a student is actually reading, until it's too late**
Problem: A teacher assigns or recommends a book, then has no way to know if the student is progressing, stuck, or has quietly stopped, until it surfaces some other way (a conversation, a class activity, a placement test) — by which point the gap has existed for a while. Asking every student directly doesn't scale and isn't reliable.
Candidate solution: Let the teacher see, without asking, which students are actively progressing vs. stalled.

**2. Not knowing if reading is actually landing (comprehension)**
Problem: A learner can move through a book's words without understanding it. "Read it" and "understood it" are different facts, and today a teacher can't tell them apart.
Candidate solution: Some honest signal of understanding, tied to the specific book/level — see the open problem below; this is the least resolved part of the whole brief.

**3. Not knowing who's putting in real effort vs. coasting**
Problem: "Completed" alone hides the difference between a learner who worked hard on a genuinely challenging book and one who breezed through several easy ones. Neither effort nor difficulty is currently visible.
Candidate solution: Some measure of engagement that accounts for difficulty, not a raw time or page count that can be gamed or is incomparable across books.

**4. No persistent record at all, today**
Problem: Whatever a teacher currently knows about a student, they know from memory or by asking directly — nothing persists, so it resets whenever the teacher forgets or hands off a class.
Candidate solution: An always-current record that doesn't depend on the teacher's memory.

**5. Too many students to check on individually**
Problem (reasoned, not stated): Even with perfect data, a teacher can't manually scan every student's numbers regularly and reliably notice who needs help — attention, not data, is the bottleneck.
Candidate solution: Point the teacher at the few students who need something, rather than a full table they must interpret themselves.

**6. Knowing a student struggles doesn't say why, or what to do**
Problem (reasoned): "This student is behind" isn't actionable on its own. Is the material too hard? A specific misunderstanding? Disengagement? Without a likely reason, a teacher may act on the wrong thing.
Candidate solution: Pair any "needs attention" signal with a plausible reason and a next step.

**7. Wrong information is worse than no information**
Problem (reasoned): If a shown number is unreliable or gameable, a teacher who gets burned once stops trusting the whole tool, not just that number.
Candidate solution: Show "not enough data yet" rather than a confident-looking wrong number.

**8. Adult learners may not self-report confusion — arguably more than younger students, not less**
Problem (reasoned, revised for adult learners): Adult learners often have real stakes in appearing competent — workplace standing, pride, prior educational or personal experiences — and may be *less* likely than a child to admit "I don't understand," not more. Silence is more likely to mean "stuck and not saying so" than "fine."
Candidate solution: Treat inactivity/silence as worth surfacing by default, don't assume no news is good news.

**9. Teachers have very little spare time for a new tool**
Problem (reasoned): "We want to see progress" may really mean "without having to think about it." Anything requiring setup or real interpretation time will quietly stop being used regardless of theoretical value.
Candidate solution: Deliver value in the first few seconds, nothing to configure.

**10. Adult learners have varied, personal reasons for learning that a single dashboard metric can't capture**
Problem (reasoned, adult-specific, not yet well explored): Unlike a school classroom with a shared curriculum, adult ESL learners in the same class may be reading for different underlying reasons — workplace advancement, citizenship preparation, helping their kids with homework, daily life navigation, personal interest. A single "comprehension score" or "progress" number may mean something different for each of them, and a teacher may need different information depending on what each learner is actually trying to achieve. **We have not explored this enough. Treat it as genuinely open, not solved by the items above.**

## The specific open problem: comprehension checking

This is the part of the brief we most want independent research on, not a design we've already settled.

We do not know:
- **What kinds of questions or checks a teacher would actually want** to gauge understanding — main idea, vocabulary in context, inference, summarizing, something else entirely?
- **Which skills matter for adult ESL learners specifically** — is it the same skill taxonomy used for school-age reading comprehension, or does an adult, functional-language context call for different skills (e.g., understanding a workplace instruction vs. literary inference)?
- **How much this should be teacher-customizable vs. standardized.** Different teachers, different class goals, different learner populations across (potentially) different institutions may want to check different things. Should a teacher be able to choose which skill(s) to check per reading, or does that add complexity without real benefit?
- **How to make it reliable** — our own current comprehension-quiz system (built for a different feature, not the dashboard) has real, confirmed reliability problems worth knowing about before proposing a design: 5 questions per quiz, unlimited retakes, and the correct answers are technically visible to a student who inspects the page — none of which is fake data, but none of it can currently support a teacher treating a score as a real assessment.

There is already a separate, planned-but-unbuilt feature in our roadmap called "question-type selector" — letting a teacher or student choose which comprehension skill to practice per reading (main idea, vocabulary, inference, etc. was the original one-line description, itself unresolved in the same way). **Research should treat this as the same open problem as dashboard comprehension results, not two separate features** — solve them together.

## What we're asking each model to do

1. Independently decompose "what problem is BookBridge's Teacher Dashboard actually trying to solve for adult ESL teachers and their learners" into components — using the above as a starting point, not a constraint. Replace anything that seems wrong for an adult ESL context specifically.
2. For each component, propose one or more candidate solutions/features, in plain language, with reasoning for why it addresses the underlying problem (not just "because it's common in other ed-tech tools").
3. Specifically research and propose an approach to comprehension-checking that: works for varied adult-learner goals, can be reliable (resistant to guessing/gaming), and gives teachers meaningful choice over what's being checked without overwhelming them with configuration.
4. Flag explicitly which of your conclusions are grounded in real evidence (cite sources) vs. reasoned inference vs. genuine uncertainty — don't present a guess as a finding.

Results from each model will be compared side by side before any feature is prioritized or built.
