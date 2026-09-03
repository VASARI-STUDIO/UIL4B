# Product

<!-- impeccable:product-schema 1 -->

> **Written by `$impeccable init` on 2026-09-04.** This file is the durable
> product record every other Impeccable command reads before it designs
> anything.
>
> **It is deliberately short.** UIL4B already has a documentation authority map
> at [`docs/reference/doc-authority-map.md`](docs/reference/doc-authority-map.md),
> written because a wrong instruction in this repository does not announce
> itself: an agent that follows one confidently does not fail, so the same wrong
> work gets done again. A `PRODUCT.md` that re-listed the positioning, the
> routes, the backlog or the gate would be a second copy of four documents that
> already have one home each — which is exactly the drift the map exists to
> stop. **Where a fact has an owner, this file links to the owner.**
>
> **Provenance.** No structured question tool or decision page was reachable in
> the session that wrote this, so the interview step could not be run. Every
> fact below is drawn from the repository or from the founder's own words quoted
> in `CLAUDE.md` and `pipeline.js`; nothing is inferred taste. Lines marked
> **[unconfirmed]** are the writer's reading and want a founder yes/no.

## Platform

web

## Users

Product and web designers, front-end developers, and indie hackers who assemble
and hand off UI systems. The audience, the core promise and the free/Pro line
are owned by
[`docs/reference/positioning.md`](docs/reference/positioning.md) — read it
there rather than here.

## Product Purpose

Owned by [`docs/reference/positioning.md`](docs/reference/positioning.md), whose
one-line positioning is canonical and must not be contradicted. The surface
split (Create / Discover / Learn) and the Workspace-is-an-internal-name rule are
owned by [`CLAUDE.md`](CLAUDE.md) and guarded in shipped copy by
`tests/unit/surface-vocabulary.test.js`.

## Operating Context

The user is mid-build with a real deadline, moving between colour, type, tokens
and export, and the product's whole claim is that they do not have to leave to
do the next step. That is why continuity between surfaces is a product property
and not a nicety.

## Capabilities and Constraints

Every one of these has an owner; this section exists to name them, not to repeat
them.

| For | Open |
|---|---|
| Frameworks, AI backends, client/server boundary | `docs/reference/tech-stack.md` |
| Pages, contexts, components, the `/api` 12-function cap | `docs/reference/architecture.md` |
| Routes, and which are live vs Soon | `src/data/toolTree.js`, then `docs/build-plan/tool-tree.md` |
| Live token values (colour, radius, type, motion) | `src/styles/global.css` |
| What is queued, blocked or known-broken | `src/data/pipeline.js` |
| The verify gate and how to run it | `docs/reference/build-and-verify.md` |
| Founder-gated auth / Stripe files | `docs/reference/human-validation-zones.md` |
| Founder-only console and credential work | `docs/OWNER-ACTIONS.md` |
| Ideas awaiting a founder verdict | `docs/PROPOSALS.md` |

## Brand Commitments

- The product is **UIL4B**. The user-facing surface labels are **Create**,
  **Discover** and **Learn**; "Workspace" is an internal code name and must not
  appear in UI copy.
- **Two typefaces ship, and only two:** Manrope and JetBrains Mono, self-hosted.
  There is no third family and no serif — `--serif` resolves to Manrope, the
  same value as `--font`, and is a misnamed alias rather than a face. Any design
  that promises typographic contrast from `--serif` is promising something the
  value does not honour. Tracked as `serif-token-is-not-a-serif` in
  `src/data/pipeline.js`; the reasoning and two other imported-skill carve-outs
  are in `docs/reference/doc-authority-map.md`.
- Lucide is a live product surface, not a banned icon pack. See the same
  carve-out table before acting on an imported skill's ban list.
- Voice: the founder has asked for "real australian style english to sound like
  me not an AI written statement". **An agent must not write in that register on
  his behalf** — imitating the founder's voice is itself the failure the
  `hero-copy-still-reads-ai` item is about. Write plainly and leave the
  personality to him.

## Evidence on Hand

**This section is the one thing this file owns outright, and it is the section
other commands must read before writing a word of marketing copy.** It is split
into what is real and what does not exist.

**Real, and safe to show.** These are counted from the data the tools themselves
read, so a surface that displays them cannot advertise something the product
does not contain:

| Asset | Where it lives |
|---|---|
| 64 curated palettes | `src/data/paletteGallery.js` |
| 100 gradients, each with a stored type, angle and stops | `src/data/gradientGallery.js` |
| 20 community prompts | `src/data/communityPrompts.js` |
| 200,000+ icons | Iconify, via the Icon Library |
| Ten locales | `src/locales/` |
| Live type specimens | The two installed families, rendered directly |

**Does not exist, and must never be invented.** Nothing in this product has ever
had any of the following, and no surface may imply otherwise — not as
placeholder, not as "example", not as a greyed-out mock:

- customer names, logos, testimonials, quotes, case studies or press;
- user counts, revenue, growth, uptime or any usage metric;
- benchmarks, awards, ratings or comparisons against named competitors;
- a team, headcount, funding or founding biography;
- scarcity, urgency or social-proof claims of any kind.

**Decorative mock-ups count as claims.** A drawing of a product UI filled with
grey placeholder bars is a picture of something that does not exist, and it
reads as a component that failed to load. Where a surface wants to show what the
product holds, it shows the real thing from the table above. Where the thing is
not built yet, it shows **nothing** — an unbuilt feature with no preview is what
makes live and unbuilt read apart without hunting for a badge.

## Product Principles

Three, derived from decisions already taken and recorded in this repository.

1. **Soon means not built, and is never dressed as built.** The product ships
   honest coming-soon states rather than demo-ware. A Soon item gets a badge, no
   preview, and no focus stop it has not earned.
2. **Show the contents, do not describe them.** This product's subject matter is
   visual and it is all real and already in the repo. A surface that describes a
   palette instead of showing one has chosen the weaker option for no reason.
3. **One home per fact; everything else links.** Applied to the product, not
   just the docs: a tool list, a route, a count or a token value has exactly one
   authority, and a second copy is a defect even while the two still agree.
   `docs/reference/doc-authority-map.md` owns the mechanism.

## Accessibility & Inclusion

Product-level commitments, each enforced by something that fails rather than by
convention. Named by file, never by count.

- **Contrast is measured, not asserted.** Small text does not use `--accent`;
  `--accent-strong` exists for it. Guarded by
  `tests/user-sim/39-accent-contrast.spec.js`.
- **Reduced motion is a resolved preference layer**, not a media query alone,
  because a CSS duration override cannot reach a `setState` loop. Guarded by
  `tests/user-sim/27-motion-guards.spec.js`.
- **Theme is three-state** — Light / Dark / System — and both themes are
  supported surfaces. Every new surface is checked in both. Guarded by
  `tests/unit/theme-resolution.test.js` and
  `tests/user-sim/41-theme-control.spec.js`.
- **Keyboard contracts are asserted on the markup that ships.** When a control
  is restructured, its keyboard assertions move onto the new markup; they are
  not deleted with the old.
- **Ten locales are live**, so user-facing copy is a translation task and not a
  free edit.

## What this file does not own

If you came here for one of these, you are in the wrong file. This table is the
routing answer for Impeccable commands specifically; the full map is
[`docs/reference/doc-authority-map.md`](docs/reference/doc-authority-map.md).

| Looking for | It is not here. Open |
|---|---|
| The visual world: palette, type ramp, spacing, components | `src/styles/global.css`, then `docs/reference/design-language-v2.md` |
| What "AI slop" is and what each failure is called | `.claude/skills/uil4b-brand-design/references/anti-slop-quality-bar.md` |
| How to actually run a visual or responsive review | `.claude/skills/uil4b-surface-review/` |
| The backlog, and what is blocked | `src/data/pipeline.js` |
| The gate, and how to run it | `docs/reference/build-and-verify.md` |
| What shipped and which decisions are already made | `CHANGELOG.md` |

**No `DESIGN.md` was written.** Impeccable offers one, and it was declined on
purpose: this project's visual world already has an owner in `global.css` (live
token values) and `docs/reference/design-language-v2.md` (the shipped V2
language), and the authority map records that **every doc table of design values
in this repository has drifted at least once**. A `DESIGN.md` would be a third
copy of values whose only trustworthy home is the stylesheet. If a future
command needs one, it should record *decisions and their reasons* and still
point at `global.css` for every value.
