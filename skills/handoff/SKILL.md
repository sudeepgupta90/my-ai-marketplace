---
name: handoff
description: Compress the current session into a handoff document so work can continue in a fresh session or move to a different agent. Use when the context window is filling up, when the user says to hand off, wrap up, continue later, or start fresh, or when switching to another tool or teammate mid-task.
---

# Handoff

Produce a document that lets someone — a fresh session, a different agent, or a person — resume this work without re-deriving what was already established.

## When to reach for this

- Context is filling and the session will be summarized or restarted
- The user is stopping for the day and wants to resume cleanly
- Work is moving to another agent (Codex, Gemini) or another person
- A long investigation reached a conclusion worth preserving beyond this session

## What makes a handoff good

A handoff is not a transcript summary. It is **the minimum a competent stranger needs to continue**. Optimise for what would otherwise be re-derived at cost: decisions and their reasons, dead ends already ruled out, and the exact next action.

Write it to a file the next session can read — default `docs/handoff-<topic>.md`, or a path the user names. Do not print a long handoff into the conversation; the point is that it survives the conversation ending.

## Structure

```markdown
# Handoff: <topic>

**Status:** <one sentence: what is done, what is in flight>
**Updated:** <absolute datetime>

## Goal
What we are trying to achieve, and why. Absolute dates, no "yesterday".

## Current state
What exists now. Name real files and functions with paths. Distinguish
"built and verified" from "built but untested" from "planned".

## Decisions made
| Decision | Why | Alternatives rejected |
Enough that the next session does not reopen a settled question.

## Dead ends
What was tried and did not work, and the symptom. This is often the highest
value section: it is pure cost to rediscover.

## Next action
The single specific thing to do next, concrete enough to start immediately.
Then anything queued behind it.

## Open questions
Things genuinely undecided, and who or what can decide them.
```

## Rules

1. **Verify before asserting.** Every file path and command in the handoff must be real. A handoff that points at a function that does not exist is worse than none — the reader trusts it and loses time.
2. **Absolute dates.** "Last Tuesday" is meaningless to a session that starts in three weeks.
3. **State what is unverified.** If tests were never run, say so. Never imply completion that did not happen.
4. **Prefer pointers to prose.** A path plus a line number beats a paragraph of description.
5. **Keep it short enough to be read.** If it exceeds roughly two pages, the detail belongs in the codebase or a design doc that the handoff links to.

## Cross-agent handoffs

When the next reader is a different tool, avoid Claude-specific vocabulary. Say "run the tests with `npm test`" rather than naming a slash command that only exists here. Skill and plugin names are Claude-specific; describe the capability instead. `AGENTS.md` is the portable convention most agents read, so a handoff that will cross tools belongs alongside it rather than in Claude-only configuration.
