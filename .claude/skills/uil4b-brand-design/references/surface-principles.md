# Product and sales surface principles

## Shared contract

Marketing and product surfaces should feel like parts of the same system while
optimising for different user states. Share product truth, language, identity,
and interaction quality. Do not force identical density or composition.

## App surfaces

The app serves an active task. Prioritise:

- orientation and current system state;
- efficient comparison, editing, validation, and export;
- progressive disclosure rather than feature theatre;
- persistent work, recoverable actions, and honest feedback;
- keyboard and narrow-screen operation;
- loading, empty, error, offline, success, and permission states.

Product personality should emerge through workflow, microcopy, information
design, and meaningful recurring motifs—not through decoration that competes
with the work.

## Sales and landing surfaces

The visitor is evaluating relevance, credibility, and effort. Prioritise:

- a concrete problem and outcome;
- a readable path from promise to real product evidence;
- product demonstrations with plausible content;
- clear audience and scope;
- honest differentiation and pricing implications;
- calls to action at moments of sufficient understanding.

Avoid assembling a generic hero, logo strip, three-card feature grid, testimonial
carousel, pricing block, and final CTA without a product-specific narrative.
Those structures are allowed when evidence and decision flow justify them.

## Pricing and conversion

Clarity outranks pressure. State what changes between plans and what the user can
do next. Do not invent urgency, scarcity, comparison anchors, or social proof.
Billing and authentication remain human-validation zones; read
`docs/reference/human-validation-zones.md` before proposing implementation.

## Bridging marketing to product

The user's first product session should fulfil the promise made by the sales
surface. Maintain consistent:

- terminology for Workspace, Discover, Learn, projects, and exports;
- examples and artefacts;
- expectations about free and paid capabilities;
- tone and degree of guidance;
- visual and behavioural identity.

A useful hand-off test is: after clicking the primary CTA, can the user see the
same job, object, and expected outcome within the first product view?

## Homepage product-proof continuity

**Canonical — founder direction, 2026-07-26. Scope: UIL4B homepage.**

- Lead with the concrete user problem (“No more tab hoarding”) and the connected
  workspace outcome, then move directly into working product evidence.
- The hero and live preview should read as one continuous interaction. When a
  hero control duplicates a preview-tab action, both controls must share state
  and remain usable without motion. In the approved 2026-07-28 chaos-to-calm
  variant below, the live satellites are stable route links rather than
  duplicate tab controls; only aria-hidden visual proxies converge.
- Homepage preview navigation represents only capabilities that work now.
  **Canonical — founder direction, 2026-07-31:** the activated Font Gallery,
  Font Pair and Type Scale tools resolve into a fifth Typography preview mode.
  Component tooling remains named as coming next and must not appear as a live
  preview tab until its real route is activated.
- Prefer honest workflow evidence—real controls, measured output, keyboard
  behavior, recovery states—over detached capability-stat strips.
- Do not insert an abstract manifesto caption between the promise and its proof.

## Homepage chaos-to-calm proof

**Canonical — explicit founder direction, 2026-07-28. Scope: UIL4B homepage
hero and its immediately adjacent mini-workbench only.**

- **Trigger:** review of the shipped connected hero/workspace bridge and approval
  of a stronger “No more tab hoarding” experience.
- **Observed direction:** show the real breadth of live tools as deliberate visual
  chaos, then resolve that breadth into a calm working surface. Eleven named tool
  destinations remain honest links; they do not become eleven preview tabs.
- **Interpretation:** the recognisable idea is not floating objects or orbit
  motion by itself. It is the causal change from scattered, independently useful
  tools to a smaller set of coherent working modes. This is a homepage narrative,
  not permission to make app surfaces chaotic.
- **Decision:** the hero may use an irregular authored arrangement of honest live
  tool links when their semantics and destinations remain stable. Decorative
  motion may visually group them into five workbench modes, but core copy, links
  and controls must remain available without the motion system.
- **Decision:** the calm workbench is persistent product proof, not a screenshot
  or capability carousel. Preview interactions stay bounded and hand off to the
  real tool without granting saved state, authentication, quota or paid
  capability.
- **Responsive scope:** reduced-motion and mobile presentations express the same
  scattered-to-organised idea through static hierarchy rather than compressed
  choreography.
- **Evidence:** founder-approved specification in
  `docs/build-plan/HOMEPAGE-CHAOS-TO-CALM.md`; acceptance remains contingent on
  rendered responsive, accessibility, performance and anti-slop review.

Do not generalise this into a brand-wide rule requiring satellites, convergence,
orbiting cards or dense heroes. Reuse requires a separate product-specific
reason and review.
