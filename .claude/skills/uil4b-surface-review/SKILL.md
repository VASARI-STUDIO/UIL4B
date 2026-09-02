---
name: uil4b-surface-review
description: Run a repeatable visual review against a rendered UIL4B surface and return ranked, evidenced defects — each naming a route, a viewport, what a person would complain about, a severity, and a selector verified to exist in source. Use for anti-slop review, visual QA, a responsive or breakpoint pass, "does this look AI-built", "review this page", or any request for design defects rather than design direction. Complements `uil4b-brand-design`, which supplies the vocabulary; this skill supplies the procedure.
---

# UIL4B Surface Review

This is the **procedure**. `uil4b-brand-design` and its
`references/anti-slop-quality-bar.md` are the **vocabulary** — what slop is, what
each failure is called, and what the correction principle is. Load that for
naming and judgement; follow this for how to actually run a pass and what to
hand back.

> **Why this exists as its own skill.** The quality bar is a set of diagnostic
> lenses and a five-way verdict. It is excellent at telling you what you are
> looking at and useless at telling you where to stand. An agent handed only the
> quality bar returns an essay about the design language; an agent handed this
> returns nine numbered defects each with a route, a width and a selector. The
> founder asked for the second thing.

## The one rule that shapes everything else

**Measurement alone does not find this class of fault. Screenshots must be
reviewed by eye.**

The 2026-09-01 pass found **nine real defects on surfaces an automated geometry
sweep had rated completely clean**. Nothing was wrong with the sweep — no
element overflowed its container, no target was under 24px, no contrast pair
failed. The defects were things like a rail that scrolls with no indication it
scrolls, a heading that technically fits and reads as an orphan, a control that
is present and unfindable. None of those is a number.

So: capture, then **look**. An agent that reports only what a script measured
has not done this review, and should say so rather than presenting the sweep as
a visual pass.

## Run the pass

Read [references/review-procedure.md](references/review-procedure.md) and follow
it in order. It covers route and viewport selection, capture, the eye pass, the
finding format, severity, and the selector-verification step that keeps findings
actionable.

Two references carry the knowledge the procedure depends on:

- **[references/capture-artefacts.md](references/capture-artefacts.md)** — the
  things that look like defects in a screenshot and are not. **Read this before
  writing a single finding.** Three known artefacts in this app will each
  generate a confident, wrong, high-severity report if you have not.
- **[references/responsive-bands.md](references/responsive-bands.md)** — the
  widths this app actually breaks at, measured from `global.css`, and why
  641–900px is the band that keeps shipping broken.

## What a finding must carry

Every one, no exceptions:

| Field | Rule |
|---|---|
| **Route** | The real path (`/create/palette`), not a page name. |
| **Viewport** | The width you saw it at. If it spans a band, give the band. |
| **The complaint** | Written as a person would say it, not as a spec violation. "The Randomise button is just gone" — not "toolbar group exceeds available inline size". |
| **Severity** | BROKEN / POOR / POLISH. Defined in the procedure. |
| **Selector** | Verified to exist in source. Grep it. An invented selector is worse than none — it sends the next agent to a class that does not exist. |
| **Evidence class** | `measured` / `observed` / `inferred` / `judgement`, per `.claude/agents/README.md`. Taste is allowed; disguised taste is not. |

## Prefer the systemic finding

**Name the pattern, not the instances.** #298 closed six defects with one
finding — *"scrollbar-less rails with no overflow affordance"* — because the six
shared a cause. Reported one at a time they would have been six separate fixes,
six separate reviews, and the seventh instance would still have shipped.

`global.css` now carries that pattern as a standing note ("THE RECURRING
DEFECT", eleven instances on record). When you find a third instance of
anything, stop listing and go looking for the rest of the class.

A ranked list of twenty instances is a worse deliverable than four systemic
findings with their instances nested underneath.

## Mobbin is standing workflow

For any finding that proposes a different pattern, search Mobbin first and cite
the capture. `research` and `design` hold the Mobbin tools.

**"The existing pattern is already right" is a real and useful outcome.** #306
ran a Mobbin pass, found the shipped pattern matched what real products do, and
changed nothing about the design. Recording that is worth as much as a change —
it stops the next agent re-litigating a settled question. Say what you searched
and what it showed, then say you are leaving it alone.

Mobbin is a stills library and is **silent on motion, timing and easing**. Any
motion finding that cites neither Mobbin nor `motionsites` is `judgement` and
must be labelled that way.

## What this skill does not do

- **It does not set direction.** If the answer is "this surface needs a
  different concept", that is `uil4b-brand-design` and a design spec, not a
  defect list.
- **It does not claim usability evidence.** No participants, no task-success
  rates, no satisfaction scores. Predicted user confusion is a hypothesis and
  carries that label. See the evidence boundaries in
  `.claude/agents/README.md`.
- **It does not fix anything.** A review returns findings. Fixing them is a
  separate pass with its own gate.
