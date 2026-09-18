// Locked library rows — how a paid item is teased without handing it over.
//
// ── The rule this module exists to enforce ──────────────────────────────────
//
// A CSS blur is NOT a paywall. If the real values sit in the DOM behind
// `filter: blur()`, anyone reads them from devtools, from the accessibility
// tree, or by switching CSS off. That is worse than no tease at all, because it
// converts a working gate into a gate that only LOOKS like it works.
//
// So a locked row never receives its real values. Not blurred, not clipped, not
// `aria-hidden` — absent. `splitLockedLibrary` performs the swap itself and
// returns previews, so a caller cannot render a locked item's payload even by
// mistake: the real object never leaves this function.
//
// ── What a preview may carry ────────────────────────────────────────────────
//
// Only facts that are already public by construction, never the payload:
//
//   id     addresses the row. Meaningless on its own.
//   label  the item's NAME, when the name is the tease rather than the product.
//          A brand palette's name is the want ("Figma"); its five hex values are
//          the product. A community prompt is the opposite — its title IS the
//          idea being sold — so prompts pass no label.
//   tags   only where the tag set is already exposed as a public filter facet.
//   slots  HOW MANY values the row holds. A count, not the values.
//
// SANITISE_KEYS is applied to every preview, so a careless mapper that returns
// `colors` or `text` has them stripped before the object is handed back. The
// whitelist is the gate; the mapper is only a convenience.
//
// ── Why no decoy values ─────────────────────────────────────────────────────
//
// Rendering plausible fake hexes was considered and rejected. The palette
// surfaces copy to the clipboard, export CSS, hand off to the Gradient
// Generator and save into a project — a decoy that escaped into any of those
// is wrong data wearing the product's voice, and a paywall that manufactures
// wrong data is worse than one that leaks. `slots` drives neutral, tokenised
// shapes instead, which carry no colour information at all.

// ── BE HONEST ABOUT THE CEILING ─────────────────────────────────────────────
//
// What this module guarantees is that a withheld row never reaches the PAGE:
// not the DOM, not the accessibility tree, not the clipboard, not a deep link,
// not an export, and not the search predicate — which matters more than it
// sounds, because the haystacks index hex values and a search over the full
// library answers "what colour is the one I cannot see" to anyone who types it.
//
// What it does NOT do is keep the values off the visitor's machine. The
// libraries are static ES modules (paletteLibrary.js, gradientGallery.js,
// communityPrompts.js), so they are compiled into the route's JS chunk and the
// whole array is readable in devtools by anyone who looks. That was already
// true of the paid brands and the Pro prompts before the tier cap; the cap
// makes it larger rather than new, because most of each library is now withheld
// from most visitors.
//
// It is recorded rather than fixed because fixing it needs a server: the data
// would have to be fetched per entitlement, and api/ is full at 12/12 routes
// with a test that fails the build on a thirteenth. The same ceiling is written
// down in SaveTypeSystem.jsx for the save cap, and it is the same trade: what is
// gated is the PRODUCT — the copy button, the handoff into the Builder, the
// export, the search — not the bytes.
//
// Keys a preview is allowed to carry. Anything else is dropped.
const SANITISE_KEYS = ['id', 'label', 'tags', 'slots']

// How many locked rows to tease before the call to action.
//
// The founder asked for "a couple". The number comes from what makes the value
// legible, not from the word:
//   - Fewer than three reads as a stub — an error state rather than a library
//     that continues.
//   - Three fills one row of the palette gallery grid at its desktop column
//     count, so the tease reads as "the next row", which is what it is.
//   - More than three buries the call to action under a scroll of grey
//     placeholders. The brand panel has 30 locked rows and the prompt library
//     8; rendering them all is the "tease that annoys" failure — a wall, not an
//     invitation.
// The quantity on the other side of the wall is communicated as a NUMBER in the
// CTA, the way Mobbin says "Access all 511,089 screens" rather than rendering
// half a million blurred thumbnails.
export const LOCKED_TEASE = 3

// ── THREE TIERS, NOT TWO ────────────────────────────────────────────────────
//
// Founder instruction, 2026-09-18: "for the galleries non logged in users get 3
// free ones logged in get 10 and paid get full". The module was built for two
// answers — entitled or not — and this is the third: an account is now worth
// something on its own, so the ladder is anonymous → free account → Pro.
//
// It applies to the three galleries that hand over a COPYABLE PAYLOAD (palettes,
// gradients, prompts). Curated Resources and the Font Gallery are outside it:
// they publish external links and Google Fonts, so there is nothing of ours to
// meter. The Icon Library has its own rule (pack-level, see the brief).
//
// WHY A COUNT AND A FLAG, RATHER THAN ONE OR THE OTHER. The flag (`pro` on a
// palette, `free` on a prompt) says WHICH rows may ever be free; the count says
// HOW MANY of them this viewer gets. A row that fails the flag is never open at
// any tier below Pro, so the fail-closed default that already existed — a new
// prompt without `free: true` is locked — keeps working exactly as written.
//
// WHY THE COUNT IS SAFE HERE AND WAS NOT SAFE BEFORE. A count over a list the
// USER orders is not a gate: that was the original prompt-library defect, where
// "free" meant the first twelve of whatever the search box had built, so any
// locked row could be walked into position. The count applied here is over the
// CANONICAL list the caller passes — a static module array — and it is applied
// inside this function, before search, sort or any filter can reach the data.
// Callers must therefore hand in the library, not a view of it. PromptLibrary
// sorts the OPEN set afterwards, which can no longer move the boundary.
export const GALLERY_TIER_LIMITS = Object.freeze({
  // Enough to read the surface as a library that continues rather than as a
  // stub, and exactly the desktop column count of the palette grid — so the
  // teased row below reads as the next row. Same reasoning as LOCKED_TEASE.
  anonymous: 3,
  free: 10,
  pro: Infinity,
})

// Which rung this viewer is on. Fail-closed in both directions and for the same
// reason `unlocked` demands an exact `true`: a subscription still resolving is
// not a subscription, and an auth state still resolving is not an account.
// Anything that is not exactly `true` falls to the rung below.
export function galleryTier({ isPro, signedIn } = {}) {
  if (isPro === true) return 'pro'
  if (signedIn === true) return 'free'
  return 'anonymous'
}

// The cap for a tier. An unknown tier gets the tightest one, so a typo or a
// future rung nobody wired up shows less rather than everything.
export function galleryLimit(tier) {
  return Object.prototype.hasOwnProperty.call(GALLERY_TIER_LIMITS, tier)
    ? GALLERY_TIER_LIMITS[tier]
    : GALLERY_TIER_LIMITS.anonymous
}

// How many more rows the NEXT rung up opens — the only number that makes the
// signed-out wall honest. Telling a visitor "another 98 with Pro" when seven of
// them arrive with a free account is the same class of untruth as a count line
// that says 71 while showing 3.
//
//   eligible  how many rows pass `isOpen` at all (splitLockedLibrary returns
//             it), because a free account cannot open more than exist.
//   shown     how many this viewer has now.
// Zero for anyone who is not anonymous: from the free rung the next step is
// Pro, and the wall there already states the true remaining count.
export function accountTierGain({ tier, eligible, shown } = {}) {
  if (tier !== 'anonymous') return 0
  const reach = Math.min(GALLERY_TIER_LIMITS.free, Math.max(0, Number(eligible) || 0))
  return Math.max(0, reach - Math.max(0, Number(shown) || 0))
}

// Strip a preview down to the whitelist. Undefined values are dropped so a
// preview never carries an empty `label` that a component would render as a
// blank line.
function sanitise(preview) {
  const out = {}
  for (const key of SANITISE_KEYS) {
    if (preview[key] !== undefined) out[key] = preview[key]
  }
  return out
}

// Split a library into the rows a viewer may have and the rows they may not.
//
// `unlocked` must be exactly `true` to open the gate. Anything else — false,
// undefined, a subscription still resolving, a thrown lookup — locks. That is
// the fail-closed half: the check sits HERE, before the data is produced, not
// on a button that a locked row still carries the values behind.
//
//   items     the full library, in its CANONICAL order — never a filtered,
//             sorted or searched view of it. See the tier note above.
//   unlocked  true when this viewer is entitled to all of it.
//   isOpen    (item) => true when the row may be free at all.
//   preview   (item) => the non-sensitive facts to tease it with.
//   tease     how many locked rows to preview (default LOCKED_TEASE).
//   limit     how many open rows this viewer's tier allows. Defaults to
//             Infinity, which is the two-tier behaviour every existing caller
//             had — PaletteBuilder's brands panel and any other flag-only gate
//             keep working unchanged by passing nothing.
//
// Returns:
//   open       real items the viewer may have, untouched, at most `limit`.
//   locked     sanitised previews — at most `tease` of them, never payloads.
//   remaining  how many rows this viewer does not have. The CTA's number.
//   eligible   how many rows pass `isOpen` regardless of the cap. The tier
//              arithmetic needs it and it is a fact about the LIBRARY, not
//              about any row, so it discloses nothing.
export function splitLockedLibrary(items, { unlocked, isOpen, preview, tease = LOCKED_TEASE, limit = Infinity } = {}) {
  const all = Array.isArray(items) ? items : []
  if (unlocked === true) {
    return { open: all, locked: [], remaining: 0, eligible: all.length }
  }
  // A non-numeric or negative cap collapses to zero rather than to Infinity:
  // the same fail-closed reflex as `unlocked`, so a limit that arrives
  // undefined from a half-resolved tier shows nothing instead of everything.
  // Infinity itself is the only way to ask for no cap, and it is the default.
  const cap = limit === Infinity ? Infinity : Math.max(0, Math.floor(Number(limit) || 0))
  const open = []
  // Two locked piles, kept apart only so the tease can be drawn from the right
  // one. `over` is the tail of rows this viewer WOULD have at a higher tier —
  // the rows immediately after the ones on screen — so teasing those makes the
  // placeholders read as the next row of the same library, which is what they
  // are. `shut` is everything the flag locks outright.
  const over = []
  const shut = []
  let eligible = 0
  for (const item of all) {
    if (isOpen(item) === true) {
      eligible += 1
      if (open.length < cap) open.push(item)
      else over.push(item)
    } else shut.push(item)
  }
  const withheld = [...over, ...shut]
  return {
    open,
    locked: withheld.slice(0, Math.max(0, tease)).map(item => sanitise(preview(item))),
    remaining: withheld.length,
    eligible,
  }
}
