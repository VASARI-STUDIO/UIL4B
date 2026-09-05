// Every URL this site has retired, and the live URL that replaced it.
//
// ONE table, TWO consumers, so they can never drift:
//
//   1. `scripts/sync-vercel-rewrites.mjs` writes it into `vercel.json` as real
//      HTTP **301** redirects — the edge answer, and the only one a search
//      engine ever sees;
//   2. `src/App.jsx` renders the same pairs as React Router `<Navigate>`
//      routes — the client-side belt-and-braces, and the only answer that
//      exists under `vite preview` (which does not apply `vercel.json`), which
//      is what the browser-acceptance suite runs against.
//
// `tests/unit/redirects.test.js` fails the build if the two disagree, if any
// redirect is not a 301, if one chains into another, or if one loops.
//
// ── Why 301 and not 302 ──────────────────────────────────────────────────────
// A 302 says "the move is temporary, keep the old URL indexed". Google follows
// it but keeps the ORIGINAL URL in the index and does not consolidate signals
// onto the new one, which is the exact opposite of what a permanent rename
// needs. 301 is the instruction to replace the old URL with the new one and
// carry its ranking signals across. Everything in this table is permanent.
//
// ── Why this table exists at all ─────────────────────────────────────────────
// Before it, `vercel.json` had NO `redirects` key. Retired URLs matched no
// explicit rewrite, fell to the catch-all rewrite, and were served
// `dist/404.html`. That shell boots the SPA and React Router then performs the
// redirect, so **users were fine** — but the served document carries
// `noindex`, and no HTTP 301 existed anywhere, so every retired URL was
// answered with a page that says "do not index this" and passed no link equity
// to its replacement. Both halves are fixed here: the edge answers 301, and the
// client route stays as a fallback.
//
// ── The rule for new entries ────────────────────────────────────────────────
// A redirect must point at a LIVE destination, never at another entry in this
// table. Chains bleed signal at every hop and Google gives up after a few of
// them; the test enforces it, so retarget the old entry rather than adding a
// hop.

// The 2026-08-20 founder decision: "all the urls for the create tools should be
// /create/pagetitle not /color/ or other."
//
// `<pagetitle>` is the tool's own id from CREATE_GROUPS where that id already
// stands alone as a name, and the existing final segment for the category
// homes. Three slugs are NOT the bare id, because flattening removed the parent
// segment that had been carrying half the meaning:
//
//   · `semantic`  → `semantic-color`  (semantic *what*?)
//   · `ratio`     → `aspect-ratio`    (ratio *of what*? — and it is the term
//                                      people actually search for)
//   · the `component` group's home was `/ui-builder-cat`, whose "-cat" suffix
//     only ever existed to dodge a collision with the `/ui-builder` tool. It is
//     an internal artefact, not an identity, so it becomes `/create/components`
//     and the tool under it takes its real name, `component-designer`.
//
// Run-together words are hyphenated on the way through (`fontgallery` →
// `font-gallery`, `typescale` → `type-scale`): the redirect is being issued
// regardless, so this is the free moment to fix them, and it is what the
// founder decision asked for.
export const CREATE_ROUTE_MIGRATION = Object.freeze([
  // Colour
  ['/color', '/create/color'],
  ['/color/palette', '/create/palette'],
  ['/color/semantic', '/create/semantic-color'],
  ['/color/tint', '/create/tint'],
  ['/color/gradient', '/create/gradient'],
  ['/color/contrast', '/create/contrast'],
  // Icons & Emoji
  ['/icons-emoji', '/create/icons-emoji'],
  ['/icons', '/create/icons'],
  ['/emoji', '/create/emoji'],
  // Typography
  ['/typography', '/create/typography'],
  ['/fontgallery', '/create/font-gallery'],
  ['/fontpairs', '/create/font-pair'],
  ['/typescale', '/create/type-scale'],
  // UI components
  ['/ui-builder-cat', '/create/components'],
  ['/ui-builder', '/create/component-designer'],
  ['/box-shadow', '/create/box-shadow'],
  ['/auto-builder', '/create/auto-builder'],
  // Imagery & Media
  ['/imagery', '/create/imagery'],
  ['/file-converter', '/create/file-converter'],
  ['/ratio', '/create/aspect-ratio'],
  // AI Studio
  ['/ai-tools', '/create/ai-tools'],
  ['/alt-text', '/create/alt-text'],
  ['/ai-prompt', '/create/ai-prompt'],
  ['/landing-prompts', '/create/landing-prompts'],
])

// Redirects that already shipped as client-side `<Navigate>` routes and had no
// HTTP counterpart. They are the same defect as the block above — a retired URL
// answered with a `noindex` shell — so they are fixed in the same pass.
//
// NOTE the retargeting: the eight that used to land on a colour or media tool
// now point STRAIGHT at that tool's new `/create/*` URL. Leaving them aimed at
// the old path would have built `/palette` → `/color/palette` → `/create/palette`,
// a two-hop chain, on the day this landed.
export const RETIRED_ROUTES = Object.freeze([
  ['/welcome', '/home'],
  // Retargeted 2026-09-05. It pointed at /home, the SALES page, which was the
  // right answer while that was the only home there was. It is the wrong answer
  // now: signed-in visitors land on the User Home, and somebody who types
  // /dashboard is asking for a dashboard, not for the page selling them one.
  // /projects is live and is not itself in this table, so this is a single hop.
  ['/dashboard', '/projects'],
  ['/color/ui', '/create/color'],
  ['/color-studio', '/create/color'],
  ['/export', '/create/color'],
  ['/palette', '/create/palette'],
  ['/tints', '/create/tint'],
  ['/gradients', '/create/gradient'],
  ['/contrast', '/create/contrast'],
  ['/imgconvert', '/create/file-converter'],
  ['/video-frames', '/create/file-converter'],
  ['/docs', '/learn'],
  ['/docs-design', '/learn'],
  ['/docs-social', '/learn'],
  ['/docs-themes', '/learn'],
  ['/docs-brand', '/learn'],
  ['/docs-seo', '/learn'],
  ['/docs-marketing', '/learn'],
  ['/docs-ai', '/learn'],
  ['/design-reference', '/learn'],
  ['/resources', '/discover'],
  ['/prompts', '/discover/prompts'],
  ['/pricing', '/plans'],
  ['/site-map', '/sitemap'],
  ['/about', '/help#about'],
  ['/faq', '/help#faq'],
])

// The whole set, in the order it is written to vercel.json.
export const LEGACY_REDIRECTS = Object.freeze([
  ...CREATE_ROUTE_MIGRATION,
  ...RETIRED_ROUTES,
])

// Two of these are answered by an early return in App.jsx, ABOVE the router, so
// rendering a `<Route>` for them as well would be dead code. `/color/ui` needs
// the early return because the acceptance suite asserts it lands on the colour
// landing without re-entering the tool dispatcher; `/welcome` sits beside it.
export const EARLY_RETURN_REDIRECTS = Object.freeze(['/welcome', '/color/ui'])

// The pairs App.jsx renders as `<Navigate>` routes.
export const CLIENT_REDIRECT_ROUTES = Object.freeze(
  LEGACY_REDIRECTS.filter(([from]) => !EARLY_RETURN_REDIRECTS.includes(from)),
)
