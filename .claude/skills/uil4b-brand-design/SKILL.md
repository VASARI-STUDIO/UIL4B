---
name: uil4b-brand-design
description: Govern and evolve UIL4B's product and marketing identity. Use for UI or UX direction, visual design, interaction and motion choices, sales-page design, design critique, copy-to-interface alignment, or diagnosing generic AI-SaaS and "AI slop" qualities in a UIL4B surface. Also use when founder feedback should become durable brand knowledge rather than remain in an agent prompt.
---

# UIL4B Brand Design

Use this skill to make UIL4B feel recognisable, intentional, and trustworthy
without freezing the brand into an agent persona or chasing a fashionable
aesthetic. Treat it as a living decision system: current choices can be
strengthened, revised, or deprecated as evidence and founder feedback accumulate.

## Load the right context

Read these references before making brand-facing decisions:

1. Read [brand-foundation.md](references/brand-foundation.md) for positioning,
   audience, authority, and enduring identity principles.
2. Read [anti-slop-quality-bar.md](references/anti-slop-quality-bar.md) for any
   design, implementation, or review task.
3. Read [surface-principles.md](references/surface-principles.md) when working on
   an app surface, landing page, pricing page, onboarding, or mixed product and
   marketing experience.
4. Read [learning-loop.md](references/learning-loop.md) when the user gives new
   brand feedback or a reviewed direction becomes durable.

For implementation details, also read the live project sources named in
`brand-foundation.md`. Do not copy their changing values into an agent file.

## Follow the authority order

Resolve conflicts in this order:

1. The user's current explicit direction.
2. Canonical product positioning and approved project decisions.
3. This skill's accepted brand decisions.
4. The current approved product implementation.
5. General design heuristics and external references.

Treat the current interface as evidence, not unquestionable brand law. A pattern
that repeatedly produces an unwanted response is a candidate for revision even
if it is widespread in the codebase.

## Run the design workflow

### 1. Frame the experience

State:

- the surface and primary user;
- the job the user is trying to complete;
- the business outcome;
- the intended emotional response in observable language;
- the evidence available and decisions still open.

Avoid empty goals such as "make it premium". Translate them into qualities a
reviewer can test, such as stronger information hierarchy, fewer decorative
containers, clearer proof, more deliberate pacing, or more legible system state.

### 2. Diagnose before proposing

Inspect the existing screen, relevant neighbouring surfaces, responsive states,
content, and live tokens. Use the anti-slop quality bar to identify the few
patterns causing the largest loss of clarity, credibility, or distinctiveness.

Separate:

- a brand problem from a usability problem;
- a content problem from a styling problem;
- a repeated system problem from a local component defect;
- a personal preference from observable inconsistency or user risk.

### 3. Choose a coherent direction

Build the direction around the product's role as an operating workspace. Make
every prominent choice carry meaning: hierarchy, action, state, proof, or
orientation. Reuse accepted patterns where they work and introduce novelty only
when it clarifies the experience or creates recognisable identity.

Do not default to:

- trend references as the design rationale;
- a familiar SaaS hero and floating dashboard composition;
- decoration that pretends to be product proof;
- generic aspirational copy;
- invented metrics, testimonials, urgency, or behavioural-science claims;
- uniform cards, pills, glow, blur, gradients, or oversized type as shortcuts to
  perceived quality.

Anti-slop does not mean monochrome, minimal, flat, or humourless. It means the
result feels authored for UIL4B rather than assembled from current defaults.

### 4. Specify decisions at the right layer

Put reusable brand decisions in this skill. Put implementation constraints in
project documentation or code. Put page-specific acceptance criteria in the
task specification. Keep agent files free of fonts, colours, frameworks, and
other replaceable system choices.

A design specification should define:

- content hierarchy and narrative;
- user flow and interaction contract;
- meaningful component roles;
- loading, empty, error, success, disabled, and offline behaviour where relevant;
- responsive priorities from narrow to wide;
- keyboard, focus, contrast, motion, and assistive-technology expectations;
- what must remain consistent with the brand;
- measurable acceptance criteria and unresolved decisions.

### 5. Verify the felt result

Review the rendered surface in context, not only isolated components. Test its
first impression, first action, repeated use, narrow viewport, reduced-motion
mode, long content, failure states, and visual relationship to adjacent pages.

Ask:

- Does the page explain what UIL4B is without relying on a slogan?
- Does the interface show real capability rather than decorative simulation?
- Can the user tell what matters, what changed, and what to do next?
- Are repeated motifs purposeful enough to become UIL4B signatures?
- Would removing the logo make this indistinguishable from a generic AI SaaS?

### 6. Capture durable learning

When founder feedback, user evidence, or repeated review establishes a durable
preference, follow `learning-loop.md`. Record the response, probable cause,
scope, evidence, and status. Do not turn a single reaction into a universal law.

## Return useful outputs

For a direction or specification, return:

1. Experience intent.
2. Evidence and diagnosis.
3. Proposed design logic.
4. Flow, states, and responsive behaviour.
5. Accessibility and performance implications.
6. Acceptance criteria.
7. Brand decisions to capture or questions requiring founder judgement.

For a critique, lead with the highest-impact findings and provide a concrete
correction principle for each. Avoid taste-only scoring and award-language.
