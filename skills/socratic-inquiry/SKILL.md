---
name: socratic-inquiry
description: Use when a request turns on an abstract quality word — reliable, scalable, secure, robust, maintainable, clean, fast, simple, better, production-ready — and nobody has said what would count as achieving it, so acting would mean deciding for yourself what the word means. Also use when a cause is asserted rather than demonstrated ("the bug is X, go fix X"), or when a question presupposes its own answer. Not for choosing between named options — that is scholastic-disputation.
---

# Socratic Inquiry

## Overview

An example is not a definition. Neither is a checklist.

The hazard is not the word you cannot define. It is the word you *can* — where a plausible
standard meaning is already available to you, so the gap never registers as a gap and you
build to a definition the user never gave.

## The rule

**Before doing work that depends on what a quality word means, get the word defined by the
person who used it.**

Definition first, work second. A definition obtained afterward can only invalidate what you
already built.

## What counts as a definition

A definition states **the one condition every instance of the word must meet and no
non-instance meets** — stated so that finished work can be checked against it.

Four things it has to survive:

- **One, not many.** A list of cases is a swarm, not a definition. If the answer grows a
  new clause for each situation, the condition has not been found yet.
- **The requirement, not the machinery.** Retries, a dead-letter queue, and alerting are
  things you would build. Swap all three for different mechanisms and the requirement is
  unchanged — what survives that swap is the definition.
- **Counter-cases.** Look for a case in scope where the condition returns the wrong
  verdict. Finding one does not mean starting over; it means the condition needs the
  distinction that case exposed.
- **Both edges.** Nothing satisfies it that should not count, and nothing fails it that
  should.

Forms it can take: a threshold — "p95 under 400ms", "at most one lost batch per quarter";
a failure it must survive — "the processor is down for thirty minutes"; or a case that
would *not* count, given as the boundary.

## The recipe

When a request turns on an abstract quality word, your next message contains, in order:

1. **The word, quoted.** The quality word whose success condition they did not state.
   Recognising the word is not an exemption — a familiar word hands you a definition
   nobody chose, which is the case this exists for.
2. **The definition you were about to assume.** State it plainly, so the substitution you
   were going to make on their behalf is visible and correctable. If more than one was
   available to you, they all go here — that they compete is itself the finding.
3. **One question** — the single one whose answer most changes what you would build. Its
   answer is theirs to state. A batch of six questions is answered as a batch,
   strategically and at low resolution. A single question gets a real answer.

Then stop, and wait. Do not begin the work, and do not begin exploratory work "in the
meantime" — searching for the usual suspects before you know what is wrong is how a
speculative answer acquires the feel of a finding.

## Beyond definitions

The same discipline extends to two other premises you may be handed. Both are covered in
[references/question-moves.md](references/question-moves.md):

- **An asserted cause** — "the bug is X" is a hypothesis wearing the grammar of an
  observation. Ask what you would observe if X were *not* the cause.
- **A presupposing question** — "which of these should we delete?" ratifies deletion by
  answering it. Surface the premise before answering inside it.

## Red flags

- You are about to write "Done —" for work whose success condition is still unknown
- Your clarifying question sits *below* a summary of what you already built
- You reached for a standard checklist because the term was a familiar one
- You are grepping for "the usual suspects" before knowing what is wrong
- The quality word appeared in the request and appears nowhere in your plan

**Each of these means: you supplied the definition. Stop and go get the real one.**

A worked example — the same request handled badly, then well — is in
[references/worked-example.md](references/worked-example.md).
