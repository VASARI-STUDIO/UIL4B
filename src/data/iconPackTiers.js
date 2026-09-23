// WHO SEES WHICH ICON PACK. One table, one line per pack.
//
// ── The founder's rule, in his words ────────────────────────────────────────
//
// "the icon gallery i want to limit the amount of icons non logged in users can
//  see free users dont get access to brands and maybe some of the other packs
//  that dont have free public libraries built into them (some of the packs you
//  can search and their creators have a similar tool; for that pack only, these
//  ones probably need to stay visable to logged in free users."
//
// So the line is: DOES THIS PACK'S OWN CREATOR RUN A FREE BROWSER FOR IT?
// If they do, gating it here buys nothing — the visitor opens lucide.dev in the
// next tab and we have taught them to leave. If they do not, this surface is
// the thing of value and it is what Pro sells.
//
// Three tiers, and they WIDEN rather than overlap:
//
//   anon  visible to everyone, signed out included. A capped sample.
//   free  visible to anyone with an account. Includes everything in `anon`.
//   paid  visible on Pro. Includes everything in `free`.
//
// ── How to change who sees what ────────────────────────────────────────────
//
// Edit the `tier` word on that pack's line. Nothing else. No component code
// knows any pack name; `src/pages/IconLibrary.jsx` asks this module and does
// what it says. Moving `simple-icons` from 'paid' to 'free' is a one-word edit
// and the grid, the pack menu, the group chips, the search scope and the
// network requests all follow on the next render.
//
// ── Why every line carries a `why` ─────────────────────────────────────────
//
// Because for several packs THE RULE AND THE FOUNDER'S CALL DISAGREE, and a
// table that hid that would be a table nobody could audit. simpleicons.org,
// svgporn.com, devicon.dev, skillicons.dev, flagicons.lipis.dev, flagpack.xyz
// and openmoji.org are all free browsers run by the pack's own creator — and
// all seven sit in 'paid', because "free users dont get access to brands" and
// the flag and emoji sets were named paid explicitly. That is a PRODUCT
// decision rather than a browser-availability one, and each line says so in
// those words so the next person to read it knows it was decided, not missed.
//
// ── The house rule this table serves ───────────────────────────────────────
//
// src/utils/lockedPreview.js: a locked thing's payload never reaches the
// browser. Here that is stronger than not rendering — a pack the viewer cannot
// see is never REQUESTED. No /collection, no batched /{prefix}.json?icons=, no
// prefix in the /search scope. Fetch-then-hide would leak the payload and spend
// the rate limit that IconLibrary.jsx was rescued from on 2026-09-18.

// The tiers, widest last. Exported so a caller can compare rather than
// hard-code the ordering.
export const TIER_ORDER = ['anon', 'free', 'paid']
const RANK = { anon: 0, free: 1, paid: 2 }

/* ── THE TABLE ──────────────────────────────────────────────────────────────
 *
 * Every Iconify prefix in ICON_GROUPS (src/pages/IconLibrary.jsx), plus the one
 * non-Iconify pack the menu offers. tests/unit/icon-pack-tiers.test.js asserts
 * this table and that list are the SAME SET — add a pack to the library without
 * deciding its tier and the build goes red. */
export const ICON_PACK_TIERS = {
  // ── anon · the signed-out sample ─────────────────────────────────────────
  // All five are outlined interface sets and all five have a free official
  // browser, so they would be 'free' on the rule alone. They are 'anon'
  // because the founder wants a logged-out visitor to see the product work:
  // this is the sample, capped by ANON_ICON_CAP below.
  lucide:             { tier: 'anon', why: 'lucide.dev/icons — Lucide run it themselves, free, no account. Outlined, so it is also the signed-out sample.' },
  tabler:             { tier: 'anon', why: 'tabler.io/icons — Tabler run it themselves, free, no account. Outlined.' },
  iconoir:            { tier: 'anon', why: 'iconoir.com — Iconoir run it themselves, free, no account. Outlined.' },
  heroicons:          { tier: 'anon', why: 'heroicons.com — Tailwind Labs run it themselves, free, no account. Outlined.' },
  ph:                 { tier: 'anon', why: 'phosphoricons.com — Phosphor run it themselves, free, no account. Outlined.' },

  // ── free · the rule says the creator already gives these away ────────────
  mdi:                { tier: 'free', why: 'pictogrammers.com/library/mdi — the Pictogrammers run it themselves, free.' },
  'material-symbols': { tier: 'free', why: 'Google’s own icon browser at fonts.google.com — free, no account.' },
  solar:              { tier: 'free', why: 'figma.com/community — 480 Design publish the whole set free there. Named free by the founder.' },
  'fa6-solid':        { tier: 'free', why: 'fontawesome.com/search — Font Awesome run it themselves and the free tier browses without an account.' },
  bxs:                { tier: 'free', why: 'boxicons.com — BoxIcons run it themselves, free. The solid-set equivalent of the five above.' },

  // ── paid · brands ────────────────────────────────────────────────────────
  // Read the `why` before moving one of these. The first four HAVE a free
  // official browser; they are paid because brand marks are the founder's
  // named exclusion, which is a product decision, not an oversight.
  'simple-icons':     { tier: 'paid', why: 'simpleicons.org IS free and official — so this is a PRODUCT decision, not a browser one: "free users dont get access to brands".' },
  logos:              { tier: 'paid', why: 'svgporn.com is the creator’s own free browser — same product decision as simple-icons: brand marks.' },
  devicon:            { tier: 'paid', why: 'devicon.dev is the creator’s own free browser — same product decision as simple-icons: brand marks.' },
  'skill-icons':      { tier: 'paid', why: 'skillicons.dev is the creator’s own free browser — same product decision as simple-icons: brand marks.' },
  'vscode-icons':     { tier: 'paid', why: 'No browser at all — it ships as a VS Code extension and a GitHub repo. Brand and file-type marks.' },
  'token-branded':    { tier: 'paid', why: 'No browser at all — a GitHub repo of crypto token marks. Brand marks.' },
  logodev:            { tier: 'paid', why: 'img.logo.dev, a commercial API on our publishable token. Real company logos, and the one pack whose cost is ours.' },

  // ── paid · coloured decorative ───────────────────────────────────────────
  'flat-color-icons': { tier: 'paid', why: 'Icons8’s set: the SVGs live in a GitHub repo, not in a browser Icons8 run for this set, and it is decorative rather than an interface pack. JUDGEMENT CALL — change one word to disagree.' },

  // ── paid · flags ─────────────────────────────────────────────────────────
  'circle-flags':     { tier: 'paid', why: 'No browser — HatScripts/circle-flags is a GitHub repo. Named paid with the other flag sets.' },
  flag:               { tier: 'paid', why: 'flagicons.lipis.dev is the creator’s own free browser — named paid by the founder with the other flag sets.' },
  flagpack:           { tier: 'paid', why: 'flagpack.xyz is the creator’s own free browser — named paid by the founder with the other flag sets.' },
  cif:                { tier: 'paid', why: 'No browser — currency-flags is a GitHub repo. Named paid with the other flag sets.' },

  // ── paid · emoji ─────────────────────────────────────────────────────────
  twemoji:            { tier: 'paid', why: 'No live browser since Twitter archived it; the maintained fork is a GitHub repo. Named paid with the other emoji sets.' },
  'fluent-emoji':     { tier: 'paid', why: 'No browser — Microsoft ship it as a GitHub repo. Named paid with the other emoji sets.' },
  noto:               { tier: 'paid', why: 'No icon browser — Google ship a font specimen and a GitHub repo. Named paid with the other emoji sets.' },
  openmoji:           { tier: 'paid', why: 'openmoji.org is the creator’s own free browser — named paid by the founder with the other emoji sets.' },
}

/* ── THE SIGNED-OUT CAP ─────────────────────────────────────────────────────
 *
 * "limit the amount of icons non logged in users can see". Sixty, and the
 * number is derived rather than picked:
 *
 *   - There are five `anon` packs, so 60 divides into exactly TWELVE PER PACK.
 *     The sample then shows all five sets instead of 60 consecutive Lucide
 *     icons, which is what a flat cap would give: IconLibrary paints pack by
 *     pack, so the first N of the merged list is one pack until N passes 250.
 *   - Twelve is enough to read a set's personality — stroke weight, corner
 *     radius, optical size — which is the only thing a sample has to do.
 *   - PAGE_SIZE is 120, so 60 fits on the first paint with no scroll and no
 *     second tranche: a signed-out visit costs five /collection requests and
 *     five batched glyph requests, full stop.
 *
 * Change ANON_ICON_CAP and ANON_PER_PACK follows. */
export const ANON_ICON_CAP = 60

/** How many names to take from each `anon` pack so the cap spreads across all of them. */
export function anonPerPack(packs) {
  const n = packs.filter((p) => tierOf(p) === 'anon').length
  return n > 0 ? Math.ceil(ANON_ICON_CAP / n) : ANON_ICON_CAP
}

/** The tier a pack sits in, or null when the table has never heard of it. */
export function tierOf(prefix) {
  return ICON_PACK_TIERS[prefix]?.tier ?? null
}

/**
 * What a viewer is entitled to. FAIL-CLOSED, in the shape lockedPreview.js
 * argues for: only an explicit `true` widens the gate.
 *
 *   resolving  auth or billing has not answered yet. Treated as signed out, so
 *              a slow Firestore read can never briefly open a paid pack.
 *   isPro      must be exactly true. A subscription still loading, a thrown
 *              lookup, `undefined` — all of them land on the narrower tier.
 *   user       any truthy session is an account, which is the free tier.
 */
export function viewerTier({ user, isPro, resolving } = {}) {
  if (resolving === true) return 'anon'
  if (isPro === true) return 'paid'
  return user ? 'free' : 'anon'
}

/**
 * May this viewer see this pack?
 *
 * Paid sees everything, INCLUDING prefixes absent from the table — the Iconify
 * /search endpoint answers from the whole registry when it is left unscoped,
 * which is what a Pro search has always done and is not a thing to take away.
 * Every narrower tier requires the prefix to be in the table, so an unknown
 * pack is refused rather than waved through.
 */
export function canSeePack(prefix, tier) {
  if (tier === 'paid') return true
  const packTier = tierOf(prefix)
  if (packTier === null) return false
  return RANK[packTier] <= RANK[tier]
}

/**
 * The packs this viewer may browse, in the order the caller gave them — so the
 * grid's pack-by-pack sort is unchanged for anyone who can see everything.
 *
 * `packs` is IconLibrary's own ALL_PACKS. Passing it in rather than importing
 * it keeps this module free of the page (and of React, and of CSS), which is
 * what lets tests/unit import it under plain `node --test`.
 */
export function visiblePacks(packs, tier) {
  return packs.filter((p) => canSeePack(p, tier))
}

/* ── COPY ───────────────────────────────────────────────────────────────────
 *
 * FOUNDER: THESE SIX SENTENCES ARE PLACEHOLDERS AND THEY ARE YOURS TO REWRITE.
 * They live here, beside the table, so changing what a wall says is the same
 * kind of one-file edit as changing who sees a pack — no component code.
 *
 * They were written to state a FACT rather than make a pitch: what the rule is,
 * and what is on the other side of it. Nothing claims a benefit, nothing
 * invents urgency, and no count is hard-coded — every number is passed in from
 * the live table. The two action labels are the app's existing words ("Log in"
 * is the nav trigger's own label; "See what Pro includes" is what the palette
 * and prompt libraries already say). */
export const ICON_GATE_COPY = {
  // Under the capped signed-out grid.
  anon: {
    heading: (n) => `Another ${n.toLocaleString()} icon ${n === 1 ? 'pack' : 'packs'} with a free account`,
    body: (cap) => `Signed out, this grid shows the first ${cap} icons from the outlined packs.`,
    action: 'Log in',
  },
  // When a signed-out visitor picks a pack or group that needs an account.
  // `label` is a pack name OR a group name, so the sentence has to read for
  // both: "Solar needs a free account", "Solid needs a free account".
  lockedFree: {
    heading: (label) => `${label} needs a free account`,
    body: 'The solid sets open once you are signed in.',
    action: 'Log in',
  },
  // When any viewer picks a pack or group that is Pro.
  lockedPro: {
    heading: (label) => `${label} is Pro`,
    body: 'Brand marks, flags, emoji and the coloured sets.',
    action: 'See what Pro includes',
  },
}
