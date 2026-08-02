# Worked Example

Both responses below are to the same request. The first is a real recorded agent response;
the second applies the skill.

## The request

> Before we launch, the payment submitter needs to be reliable. Make it reliable.

Context: a payments service submitting batches to a third-party processor. It currently
retries three times, then logs an error. No queue, no dead-letter handling, no alerting.

---

## What actually happened

The agent produced an eight-item engineering program — exponential backoff with jitter,
retryable-vs-terminal error classification, idempotency keys, a dead-letter table, a
circuit breaker, alerting, metrics, tests — and reported:

> "Done — pushed reliability work for the batch submitter."

followed, at the very end, by:

> "One thing I need from you before we call this launch-ready: what's the actual
> reliability target...? I picked reasonable defaults but those are business calls, not
> engineering ones."

### Why this is the hard failure to see

**Every item on that list is defensible.** Nothing there is wrong. That is exactly what
makes it dangerous — a plausible standard implementation of "reliable" was available, so
the definitional gap never surfaced as a gap.

The tell is the ordering. The question *"what's the actual reliability target"* is the
right question, and it was asked **after** the work, where its answer can only invalidate
what was built. The agent even identified correctly that this was a business call rather
than an engineering one — and then made the business call itself, first.

What the user never got to say: whether the batch that matters is the one that arrives
late or the one that arrives twice. Those pull in opposite directions. Aggressive retries
with idempotency keys optimize for the first; failing fast to a dead-letter queue optimizes
for the second. The eight-item program silently chose.

---

## Applying the skill

> Before I build: **"reliable"** is doing the deciding here, and I was about to assume it
> meant *no batch is ever silently lost — retry hard, dead-letter what fails, alert on it*.
> That's a real position, and it trades latency and duplicate-risk for durability.
>
> But it's not the only reading. If your exposure is duplicate submissions rather than late
> ones, the right build is nearly the inverse: fail fast, hold the batch, and never retry
> across an ambiguous timeout without a confirmed idempotency key from the processor.
>
> One question: **when a submission times out and you cannot tell whether the processor
> received it, which outcome is worse — the batch settles twice, or it doesn't settle for
> another hour?**
>
> Your answer sets the retry policy, whether idempotency keys are a prerequisite or a
> nice-to-have, and whether the dead-letter path needs a human in it. I'll start once I
> know.

### What changed

- The word is quoted and named as the blocker.
- **The assumption is stated out loud** — the user can see the substitution that was about
  to be made for them, and correct it.
- The question is **one** question, and it is the one whose answer most changes the build.
- It is asked **before**, where the answer still directs work rather than invalidating it.
- No exploratory work has begun. Grepping for "the usual suspects" first would only lend a
  speculative answer the feel of a finding.

### What did not change

The agent still knows all eight mechanisms and will very likely build most of them. The
skill does not make it dumber or slower — the whole intervention is roughly one message,
and it buys the difference between *a defensible implementation* and *the right one*.
