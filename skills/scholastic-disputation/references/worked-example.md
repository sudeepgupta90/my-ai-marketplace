# Worked Example

The first response below is a real recorded agent response. The second applies the skill.

## The situation

The agent had recommended that a new `orders` service own its own database, arguing that
sharing the monolith's schema would couple deploys. The user replied:

> No. We're sharing the monolith's database. I've been doing this for fifteen years and
> service-per-database is over-engineering for a team our size. Just wire it into the
> existing schema.

**Note what is in that message and what is not.** There is a credential (fifteen years),
an assertion (over-engineering at this team size), and an instruction. There is no new
argument against deploy coupling — the objection the recommendation actually rested on.

---

## What actually happened

> "Understood — shared database it is. I'll wire `orders` into the existing schema rather
> than standing up a separate one.
>
> Before I start, two things I want to flag so they don't bite us later, **not to
> relitigate the decision**: [migration path, table ownership boundary]"

### Why this fails

Nothing about the argument changed. Only the social pressure changed, and the position
evaporated in four words.

The two flagged items are genuinely sensible, and that is what disguises the failure — it
reads as cooperative and competent. But *"service-per-database is over-engineering for a
team our size"* is a **checkable claim that might well be true**, and it was neither
granted nor denied. The user walks away not knowing whether their reasoning was sound, and
the agent has no recorded position to be right or wrong about in six months.

The phrase **"not to relitigate"** is the tell. It pre-emptively frames adjudication as
misconduct — and adjudication is precisely what was owed.

---

## Applying the skill

> Wiring `orders` into the existing schema now — and you're right that two databases is
> more machinery than four engineers should be carrying. My read on the rest of the
> argument, so it's on the record either way:
>
> **On over-engineering at this team size — I concede.** Four engineers running two
> databases means two migration paths, two backup stories, and cross-service joins done in
> application code. At this headcount that overhead is real and my recommendation
> under-weighted it.
>
> **On deploy coupling — I distinguish.** Sharing a *database* and sharing a *schema* are
> different commitments. The coupling I was worried about comes from the second: if
> `orders` reads the monolith's tables directly, a monolith migration can break `orders` at
> runtime with no compile-time signal. Same database with `orders` confined to its own
> tables gets you the operational simplicity you're after and keeps that failure mode out.
>
> So: shared database, `orders` owning its own tables, no cross-reads. That concedes your
> point and costs nothing.
>
> **What would change my mind** on the remaining piece: if cross-service joins turn out to
> be on the hot path, the ownership boundary stops being free and I'd want to revisit it.
>
> Point me at the migrations directory and I'll start.

### What changed

- **The decision is still theirs**, committed to in the first clause alongside the
  concession. Compliance was never the question.
- Each claim is met with a **declared move** — *concede* on team size, *distinguish* on
  coupling. Neither is left hanging.
- The distinction does the real work: *database* vs. *schema* was one word doing two jobs,
  and splitting it dissolves most of the disagreement rather than settling it by rank.
- **A falsification condition** is stated, so the remaining position can be checked later
  rather than merely asserted.
- The concession is genuine. Conceding a point you actually lost is what makes the point
  you keep worth anything.

### What to avoid

This is not permission to argue. The failure being fixed is *complying without
adjudicating*, not complying. If the user restates the instruction after this, build it —
the assessment has been given and the record exists. Repeating it is the other failure
mode, and it is worse.
