---
name: using-foundational-thinking
description: Use when starting any conversation - establishes when to check socratic-inquiry and scholastic-disputation before responding, so they aren't only invoked when they happen to occur to you.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance `socratic-inquiry` or `scholastic-disputation`
applies to what you are about to do, you ABSOLUTELY MUST invoke it via the `Skill` tool
before proceeding.

IF ONE OF THESE SKILLS APPLIES, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.
</EXTREMELY-IMPORTANT>

## The rule

**Check the two conditions below before doing the work, not after.** If it turns out
neither applies, proceed normally — you don't need permission to skip them.

- **`socratic-inquiry`** — the request turns on an abstract quality word (reliable,
  scalable, secure, robust, maintainable, clean, fast, simple, better, production-ready...)
  that nobody has defined; or a cause is asserted rather than demonstrated ("the bug is X,
  go fix X"); or a question presupposes its own answer ("which of these should we
  delete?"). Not for choosing between named options — that's the other skill.
- **`scholastic-disputation`** — a choice between two or more named options is owed ("X or
  Y?", "which should we use?"), including when their success criteria are still vague; or
  conflicting recommendations need adjudicating; or your own call is challenged; or a
  decision needs to be written down and defended later.

Then announce "Using [skill] to [purpose]" and follow it exactly.

## When a process skill also applies

`scholastic-disputation` and `socratic-inquiry` take priority over process skills like
`brainstorming` or `systematic-debugging` whenever their own trigger condition is present in
the same request — even if the request is also framed as brainstorming or debugging:

- A **named-option choice** in the request goes to `scholastic-disputation` first, even
  under "let's brainstorm" framing — brainstorming's context-gathering happens inside
  disputation's own process (stating each option's case), not as a separate phase before it.
- An **undefined quality word with no options named** goes to `socratic-inquiry` first, to
  get the term defined before brainstorming or debugging builds on an assumed meaning.
- If a request has **both** a named-option choice and an undefined quality word (e.g. "a
  more scalable X — A or B?"), it goes to `scholastic-disputation` alone — the equivocal
  term gets pinned down inside disputation's own distinguo step, not resolved separately
  first.

## Red flags

These thoughts mean STOP — you're about to supply a definition or a verdict nobody gave you:

| Thought | Reality |
|---|---|
| "I know what 'robust' means here" | A familiar meaning is not the user's meaning. Check. |
| "I'll just pick the sensible option" | If it's a named-option choice, that's scholastic-disputation's job. |
| "The bug is obviously X" | An asserted cause is a hypothesis, not a finding. Check. |
| "This is just a quick question" | Quick questions can still turn on undefined words. Check. |
| "I already explained my reasoning" | Explaining a verdict isn't the same as having disputed it. |

## User instructions

User instructions (CLAUDE.md, direct requests) take precedence over this skill, which in
turn overrides default behavior. Only skip these checks when the user has explicitly told
you to.
