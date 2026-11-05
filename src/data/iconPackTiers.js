// WHO SEES WHICH ICON PACK. One table, one line per pack.
//
// ── The rule ────────────────────────────────────────────────────────────────
//
// Signed-out visitors see a limited number of icons. Free users do not get
// brands, or other packs that have no free public library of their own (some
// packs can be searched via a tool their creators run; those stay visible to
// logged-in free users, for that pack only).
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
// Because for several packs THE RULE AND THE PRODUCT CALL DISAGREE, and a
// table that hid that would be a table nobody could audit. simpleicons.org,
// svgporn.com, devicon.dev, skillicons.dev, flagicons.lipis.dev, flagpack.xyz
// and openmoji.org are all free browsers run by the pack's own creator — and
// all seven sit in 'paid', because free users do not get brands and
// the flag and emoji sets are paid explicitly. Each line says so, so the
// next reader knows it was a product decision, not a miss.
//
// ── The house rule this table serves ───────────────────────────────────────
//
// src/utils/lockedPreview.js: a locked thing's payload never reaches the
// browser. Here that is stronger than not rendering — a pack the viewer cannot
// see is never REQUESTED. No /collection, no batched /{prefix}.json?icons=, no
// prefix in the /search scope. Fetch-then-hide would leak the payload and spend
// the rate limit that IconLibrary.jsx was rescued from.

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
  // because a logged-out visitor should see the product work:
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
  mingcute:           { tier: 'free', why: 'mingcute.com — MingCute Design run the icon browser themselves, free. Line and fill pairs on one grid.' },
  carbon:             { tier: 'free', why: 'carbondesignsystem.com/elements/icons/library — IBM run it themselves, free. Its logo-* brand marks are Pro (see PRO_ONLY_ICONS).' },
  fluent:             { tier: 'free', why: 'Microsoft publish it free on GitHub. Only the 24px Regular and Filled glyphs are listed (REGULAR_RULES).' },
  pixelarticons:      { tier: 'free', why: 'pixelarticons.com, free. The free set only, never the Pro glyphs.' },
  'radix-icons':      { tier: 'free', why: 'The Radix team publish it free. Drawn on a 15px grid.' },
  bi:                 { tier: 'free', why: 'icons.getbootstrap.com, free. Outline and fill pairs on a 16px grid.' },

  // ── paid · brands ────────────────────────────────────────────────────────
  // Read the `why` before moving one of these. The first four HAVE a free
  // official browser; they are paid because brand marks are an
  // explicit exclusion, which is a product decision, not an oversight.
  'simple-icons':     { tier: 'paid', group: 'brand', why: 'simpleicons.org IS free and official — so this is a PRODUCT decision, not a browser one: "free users dont get access to brands".' },
  logos:              { tier: 'paid', group: 'brand', why: 'svgporn.com is the creator’s own free browser — same product decision as simple-icons: brand marks.' },
  devicon:            { tier: 'paid', group: 'brand', why: 'devicon.dev is the creator’s own free browser — same product decision as simple-icons: brand marks.' },
  'skill-icons':      { tier: 'paid', group: 'brand', why: 'skillicons.dev is the creator’s own free browser — same product decision as simple-icons: brand marks.' },
  'vscode-icons':     { tier: 'paid', group: 'brand', why: 'No browser at all — it ships as a VS Code extension and a GitHub repo. Brand and file-type marks.' },
  'token-branded':    { tier: 'paid', group: 'brand', why: 'No browser at all — a GitHub repo of crypto token marks. Brand marks.' },
  logodev:            { tier: 'paid', group: 'brand', why: 'img.logo.dev, a commercial API on our publishable token. Real company logos, and the one pack whose cost is ours.' },

  // ── paid · coloured decorative ───────────────────────────────────────────
  'flat-color-icons': { tier: 'paid', group: 'colour', why: 'Icons8’s set: the SVGs live in a GitHub repo, not in a browser Icons8 run for this set, and it is decorative rather than an interface pack. JUDGEMENT CALL — change one word to disagree.' },

  // ── paid · flags ─────────────────────────────────────────────────────────
  'circle-flags':     { tier: 'paid', group: 'flag', why: 'No browser — HatScripts/circle-flags is a GitHub repo. Named paid with the other flag sets.' },
  flag:               { tier: 'paid', group: 'flag', why: 'flagicons.lipis.dev is the creator’s own free browser — named paid by the founder with the other flag sets.' },
  flagpack:           { tier: 'paid', group: 'flag', why: 'flagpack.xyz is the creator’s own free browser — named paid by the founder with the other flag sets.' },
  cif:                { tier: 'paid', group: 'flag', why: 'No browser — currency-flags is a GitHub repo. Named paid with the other flag sets.' },

  // ── paid · emoji ─────────────────────────────────────────────────────────
  twemoji:            { tier: 'paid', group: 'emoji', why: 'No live browser since Twitter archived it; the maintained fork is a GitHub repo. Named paid with the other emoji sets.' },
  'fluent-emoji':     { tier: 'paid', group: 'emoji', why: 'No browser — Microsoft ship it as a GitHub repo. Named paid with the other emoji sets.' },
  noto:               { tier: 'paid', group: 'emoji', why: 'No icon browser — Google ship a font specimen and a GitHub repo. Named paid with the other emoji sets.' },
  openmoji:           { tier: 'paid', group: 'emoji', why: 'openmoji.org is the creator’s own free browser — named paid by the founder with the other emoji sets.' },

  // ── paid · animated ──────────────────────────────────────────────────────
  // Iconify's free animated sets (all MIT), Pro only. `animated: true` is the
  // flag the rest of the app reads: these prefixes are NEVER requested from
  // api.iconify.design by the browser. Their listing and glyphs come from
  // GET /api/ai?animatedIcons=<prefix>, which checks the plan on the server
  // (api/_lib/icons/animated.js keeps the matching allowlist, and
  // tests/unit/animated-icons-endpoint.test.js pins the two together).
  'line-md':          { tier: 'paid', group: 'animated', animated: true, why: 'Material Line Icons — animated line icons, free on Iconify but Pro here: the animated sets are a Pro feature, served only through the server check.' },
  'svg-spinners':     { tier: 'paid', group: 'animated', animated: true, why: 'SVG Spinners — animated loaders, free on Iconify but Pro here: the animated sets are a Pro feature, served only through the server check.' },
  meteocons:          { tier: 'paid', group: 'animated', animated: true, why: 'Meteocons — animated weather icons, free on Iconify but Pro here: the animated sets are a Pro feature, served only through the server check.' },
}

/* ── PACKS THAT ARE NEVER SHOWN OR EXPORTED ─────────────────────────────────
 *
 * Not even on Pro. Pro search is unscoped, so it can return any Iconify set;
 * these are the sets whose own terms restrict this use. Remix Icon moved to a
 * licence that bars an icon library whose main feature is the icons, and
 * Streamline's terms bar apps that let users download its icons. canSeePack
 * reads this first, so every path that asks it (browse, search results, the
 * group export plan, the end band) refuses them. To block another set, add its
 * prefix here and nowhere else. */
export const BLOCKED_PACKS = Object.freeze({
  exact: Object.freeze(['ri']),
  // A family: 'streamline' and every 'streamline-*' (-flex, -plump, -color, ...).
  families: Object.freeze(['streamline']),
})

/** Is this prefix on the block-list? */
export function isBlockedPack(prefix) {
  if (typeof prefix !== 'string') return false
  const p = prefix.toLowerCase()
  return BLOCKED_PACKS.exact.includes(p) || BLOCKED_PACKS.families.some((f) => p === f || p.startsWith(`${f}-`))
}

/* ── ICONS INSIDE AN OPEN PACK THAT ARE PRO ONLY ────────────────────────────
 *
 * Brand marks are Pro (see the rule at the top), and Carbon carries 49 of them
 * inside an otherwise free pack, all named logo-*. A free or signed-out viewer
 * never lists, searches or fetches these; Pro sees them. One rule per pack. */
export const PRO_ONLY_ICONS = Object.freeze({
  carbon: (name) => name.startsWith('logo-'),
})

/** Does this pack keep this icon for Pro? */
export function isProOnlyIcon(prefix, name) {
  const rule = PRO_ONLY_ICONS[prefix]
  return typeof name === 'string' && !!rule && rule(name)
}

/** May this viewer see this one icon? Pack rules first, then the per-icon rule. */
export function canSeeIcon(prefix, name, tier) {
  if (!canSeePack(prefix, tier)) return false
  return tier === 'paid' || !isProOnlyIcon(prefix, name)
}

/** The names of one pack this viewer may see. Anything but 'paid' is held back. */
export function visibleIconNames(prefix, names, tier) {
  if (!PRO_ONLY_ICONS[prefix] || tier === 'paid') return names
  return names.filter((n) => !isProOnlyIcon(prefix, n))
}

/** How many of these names are held back for Pro. */
export function proOnlyIconCount(prefix, names) {
  return PRO_ONLY_ICONS[prefix] ? names.filter((n) => isProOnlyIcon(prefix, n)).length : 0
}

/** Is this one of the animated sets, which only ever load through the server's Pro check? */
export function isAnimatedPack(prefix) {
  return ICON_PACK_TIERS[prefix]?.animated === true
}

/** Every animated prefix in the table, in table order. */
export const ANIMATED_PACKS = Object.freeze(
  Object.keys(ICON_PACK_TIERS).filter((p) => ICON_PACK_TIERS[p].animated === true),
)

/* ── THE SIGNED-OUT CAP ─────────────────────────────────────────────────────
 *
 * "limit the amount of icons non logged in users can see". Sixty, and the
 * number is derived rather than picked:
 *
 *   - Five `anon` packs, so TWELVE PER PACK. A flat cap would show 60 Lucide
 *     icons, because IconLibrary paints pack by pack.
 *   - Twelve shows a set's stroke, corners and optical size, which is all a
 *     sample has to do.
 *   - PAGE_SIZE is 120, so 60 fits the first paint: a signed-out visit costs
 *     five /collection and five batched glyph requests.
 *
 * Change ANON_ICON_CAP and ANON_PER_PACK follows. */
export const ANON_ICON_CAP = 60

/**
 * How many names to take from each `anon` pack so `cap` spreads across all of
 * them. With no `cap` it is the share for the plain 60.
 */
export function anonPerPack(packs, cap = ANON_ICON_CAP) {
  const n = packs.filter((p) => tierOf(p) === 'anon').length
  return n > 0 ? Math.ceil(cap / n) : cap
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
  if (isBlockedPack(prefix)) return false
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

/* ── COPY ─────────────────────────────────────────────────────────────────
 * What each gate says, beside the table so a wording change is a one-file edit.
 * Every number is passed in from the live table, never typed. */
export const ICON_GATE_COPY = {
  // The band at the end of the grid (IconEndBand). `anon` sits under the capped
  // signed-out grid; `free` sits at the end of a signed-in free viewer's
  // results. Counts are passed in, never typed.
  end: {
    anon: {
      // `icons` is every icon a free account opens (iconsOpenTo, from the pack lists), not the 60 on screen.
      heading: (icons) => `Log in to access ${icons.toLocaleString('en-AU')} ${icons === 1 ? 'icon' : 'icons'}`,
      // `shown` is the icons on screen, `sets` the sets they come from, `all` the sets a free account opens.
      body: (shown, sets, all) => `You're seeing ${shown.toLocaleString()} ${shown === 1 ? 'icon' : 'icons'} from ${sets.toLocaleString()} ${sets === 1 ? 'set' : 'sets'}. A free account opens every icon across ${all.toLocaleString()} ${all === 1 ? 'set' : 'sets'}. Copying needs no account.`,
      action: 'Log in',
      secondary: 'See the plans',
    },
    free: {
      heading: 'Brand marks, flags and emoji are on Pro.',
      // `p` is how many packs Pro adds; `d` is the free daily copy allowance.
      body: (p, d) => `Pro adds ${p.toLocaleString()} more ${p === 1 ? 'pack' : 'packs'}, line caps and joins in the editor, and copying past ${d.toLocaleString()} icons a day.`,
      action: 'See what Pro includes',
    },
  },
  // When a signed-out visitor picks a pack or group that needs an account.
  // `label` is a pack name OR a group name, so the sentence has to read for
  // both: "Solar needs a free account", "Solid needs a free account".
  lockedFree: {
    heading: (label) => `${label} needs a free account`,
    body: 'A free account opens this pack and lifts the signed-out cap.',
    action: 'Log in',
  },
  // When any viewer picks a pack or group that is Pro.
  lockedPro: {
    heading: (label) => `${label} is Pro`,
    body: 'Brand marks, flags and the coloured sets.',
    action: 'See what Pro includes',
  },
  // The same wall for a SIGNED-OUT visitor. Logging in is the way in, but it
  // does not open a Pro pack, so the copy says so before the button does.
  lockedProAnon: {
    heading: (label) => `${label} is a Pro pack`,
    body: 'Log in to get started. Pro unlocks brand marks, flags and the coloured sets.',
    action: 'Log in',
    secondary: 'See Pro plans',
  },
}
