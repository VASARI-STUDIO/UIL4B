# UIL4B brand foundation

## Purpose

This reference holds the durable identity logic that design-facing agents and
contributors share. It does not duplicate every live token or route. Read the
repository sources below for current implementation values.

## Canonical product truth

UIL4B is the operating workspace for UI system creation: users build, organise,
validate, and export interface foundations without tab-hopping.

Its primary audience is product and web designers, front-end developers, and
indie hackers who assemble and hand off UI systems. The product is one brand,
account, and subscription organised into three connected surfaces:

- **Workspace** for creating systems and project outputs.
- **Discover** for finding, saving, remixing, and submitting useful resources.
- **Learn** for understanding the principles behind the work.

Use `docs/reference/positioning.md` as the canonical source for positioning,
audience, surface definitions, naming, and current-versus-north-star scope.
Use `CLAUDE.md` (Direction) for product direction, `src/data/pipeline.js` for the
current delivery queue and known-unfixed bugs, and `CHANGELOG.md` for what has
shipped.

## Identity principles

### Operative, not performative

UIL4B should reveal real operations, choices, states, and outputs. Visual theatre
must not substitute for product capability or evidence.

### Authored, not assembled

Patterns should reflect UIL4B's actual workflows and information. A familiar
component is welcome when it is the clearest solution; a composition becomes
generic when familiar patterns accumulate without product-specific reasoning.

### Systematic, not sterile

The product should feel coherent enough to trust and flexible enough to invite
experimentation. System consistency is a base for expression, not an excuse to
make every surface identical.

### Confident, not inflated

Use specific outcomes, visible proof, and clear limits. Avoid prestige language,
false authority, fabricated social proof, or aesthetic excess used to imply
value the experience does not demonstrate.

### Dense where useful, calm where consequential

Creative exploration can support comparison and productive density. Decisions,
errors, billing, destructive actions, and hand-off states need calm hierarchy
and unambiguous feedback.

## Current implementation sources

Read these files instead of embedding replaceable values in agents:

- `src/styles/global.css` for live colour, typography, spacing, radius, motion,
  elevation, and theme values.
- `docs/reference/css-conventions.md` for styling and responsive conventions.
- `docs/reference/constants-and-config.md` for canonical constants.
- `docs/reference/build-and-verify.md` for verification.
- `docs/reference/human-validation-zones.md` for founder-gated surfaces.
- Existing approved neighbouring screens for current visual continuity.

Current values describe the implemented system, but they are not permanently
protected brand decisions. If the user asks to change the system, evaluate the
change through this skill and update the appropriate source of truth.

## Decision status

Use these labels when extending this reference:

- **Canonical**: explicitly approved and expected across UIL4B.
- **Accepted**: proven in a reviewed surface; reusable with context.
- **Candidate**: promising but not yet established.
- **Deprecated**: retained for history but should not spread.

Record the scope. A sales-page pattern is not automatically an app-shell pattern,
and a local component decision is not automatically a brand rule.
