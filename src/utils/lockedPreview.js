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
//   items     the full library.
//   unlocked  true when this viewer is entitled to all of it.
//   isOpen    (item) => true when the row is free for everyone.
//   preview   (item) => the non-sensitive facts to tease it with.
//   tease     how many locked rows to preview (default LOCKED_TEASE).
//
// Returns:
//   open       real items the viewer may have, untouched.
//   locked     sanitised previews — at most `tease` of them, never payloads.
//   remaining  how many locked rows exist in total. The CTA's number.
export function splitLockedLibrary(items, { unlocked, isOpen, preview, tease = LOCKED_TEASE } = {}) {
  const all = Array.isArray(items) ? items : []
  if (unlocked === true) {
    return { open: all, locked: [], remaining: 0 }
  }
  const open = []
  const shut = []
  for (const item of all) {
    if (isOpen(item) === true) open.push(item)
    else shut.push(item)
  }
  return {
    open,
    locked: shut.slice(0, Math.max(0, tease)).map(item => sanitise(preview(item))),
    remaining: shut.length,
  }
}
