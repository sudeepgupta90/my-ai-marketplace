# Question Moves

The six-move taxonomy below is Richard Paul and Linda Elder's twentieth-century
systematization (*The Thinker's Guide to the Art of Socratic Questioning*), not a classical
scheme. It is a useful checklist; it is not Plato, and should not be cited as if it were.

| Move | Asks | Bites when |
|---|---|---|
| **Clarification** | What do you mean by that word? What would *not* count as an instance? | A term is load-bearing and undefined |
| **Assumptions** | What has to be true for that to hold? What are you taking as given? | The premise is invisible because everyone shares it |
| **Evidence** | How do you know? What would we see if it were false? | A conclusion is being reported as an observation |
| **Implications** | If that holds, what else follows? Are you willing to accept that? | The claim is plausible alone and unacceptable in consequence |
| **Alternatives** | What would someone who disagrees say? What else explains this? | One explanation arrived first and was never competed |
| **Meta** | Why does this question matter? Is this the question to be asking? | The question itself is the thing that is wrong |

The last move is usually the most valuable and the least used.

---

## The asserted cause

> "The stale data bug is the Redis cache — the TTLs are wrong. Go fix the TTLs."

A diagnosis has been handed over with the grammar of an observation. It may be right. The
problem is that acting on it produces the same felt outcome whether it is right or wrong:
if the symptom is intermittent, changing the TTLs will *appear* to work.

**The move:** ask what you would observe if the stated cause were *not* the cause.

That question is answerable — it names logs, a reproduction, a measurement — and its answer
either promotes the hypothesis to a finding or produces a rival worth checking first. Stale
reads have several plausible sources that all present identically: missing invalidation on
write, a refresh race, an intermediary cache, clock skew, or a bug in whatever computes the
value being cached.

**What this is not:** refusing to act, or requiring proof before touching anything. One
concrete instance is usually enough to convert an assertion into something checkable.

## The presupposing question

> "Which tests should we delete to get velocity back up?"

The question embeds a premise — that the test suite is the constraint — and answering it
inside its own frame ratifies that premise silently. You can produce an excellent list of
tests to delete and have made things worse.

**The move:** surface the premise as a claim that could be false, then say what would
settle it. *"That assumes the suite is what's costing us. A four-minute suite is fast; if
it's been flat while velocity dropped, something else changed. Cycle-time data would tell
us in an hour."*

**Then answer the question anyway** if the premise survives, or if the user reaffirms it.
Surfacing a premise is not the same as refusing the request, and the elenchus is not
obstruction — the point is that the premise gets examined once, not that it gets vetoed.

## Sincere assent, one question at a time

Two constraints from the dialogues that hold up in practice:

**One question at a time.** Six questions are answered as a set — strategically, at low
resolution, optimizing for getting through them. One question is answered honestly, because
there is nothing to position against. Ask the one whose answer most changes what you do.

**Assent must be sincere.** Agreement offered to be agreeable is worthless: the
contradiction it produces later is a contradiction in someone's diplomacy, not in their
beliefs, and exposing it changes nothing. This applies to you as much as to them.

## Aporia is a result, not a failure

Reaching *"we do not actually know what we are trying to do here"* is a completed inquiry,
not an abandoned one. A confidently held false belief is worse than an acknowledged gap: the
false belief forecloses inquiry and the gap invites it (*Meno* 84a-c).

But numbness is a transition state, not a destination. Having dissolved a bad question, you
owe a better one. "So we don't really know anything" and a full stop is demoralization, not
method.
