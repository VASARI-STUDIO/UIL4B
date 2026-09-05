// Photographs of real work set in a typeface — the per-family slot, and the
// rules that decide whether one may be shown.
//
// ── THIS FILE IS DELIBERATELY EMPTY, AND THAT IS THE DECISION ───────────────
//
// The founder asked for two example tabs (2026-09-05): "For font examples i
// want 1 tab showing Usage examples using some made mockup use cases, but i
// want a tab showing real world use applications for each font and an image to
// show it i can collect images myself later if you cant do it".
//
// He chose the second half of his own sentence: BUILD IT EMPTY AND HE FILLS IT.
// So what ships is the tab, the layout, the shape of an entry and the rules an
// entry has to satisfy — and NOT ONE IMAGE, and NOT ONE INVENTED EXAMPLE. A
// placeholder photograph here would be the whole problem in miniature: it is
// either somebody's work used without permission, or it is a drawing of a
// product that does not exist, which PRODUCT.md calls a claim.
//
// ── WHY THE RULES ARE THE PRODUCT HERE ──────────────────────────────────────
//
// [fonts-in-use-surface] is BLOCKED, and it is blocked on exactly this: who
// owns the imagery, under what licence it may be shown, who curates it, and
// what provenance is displayed. Nothing in this file unblocks that. What it
// does is make the answer unavoidable at the moment someone adds a row —
// `isShowable` refuses an entry that cannot say where the image came from, who
// made the work and under what permission it appears, so a half-filled row
// renders NOTHING rather than an uncredited photograph.
//
// That is not belt-and-braces. An uncredited photograph on a public page IS the
// takedown surface the backlog item is protecting the product from, and the
// most likely way one arrives is somebody pasting a file path in a hurry.
//
// ── THE SHAPE OF AN ENTRY ───────────────────────────────────────────────────
//
// REAL_WORLD_USES is keyed by family name, spelled EXACTLY as the Google Fonts
// catalogue spells it ("Playfair Display", not "playfair-display"), because
// that is the string every caller already holds. Each value is an array, newest
// or best first; the panel shows them in the order given.
//
//   image    Path to the file, served from `public/`. A local file, not a hot
//            link: hotlinking someone's server is both a rights question and an
//            availability one.
//   alt      What is IN the photograph, for a reader who cannot see it. Never
//            "Playfair Display in use" — that describes the caption, not the
//            image.
//   title    What the work IS. "Menu for a wine bar", "Album sleeve".
//   credit   Who made or owns the work. A real name or organisation.
//   source   Where the image came from, as a URL that can be checked.
//   licence  Under what permission it is shown here. "Used with permission of
//            the studio", "CC BY 4.0", "Press kit, redistribution permitted".
//            A licence nobody can name is a licence the product does not have.
//
// Example of a COMPLETE entry, kept as a comment rather than as data so that it
// cannot render and cannot be mistaken for a shipped one:
//
//   'Playfair Display': [
//     {
//       image: '/font-uses/playfair-display-wine-list.jpg',
//       alt: 'A folded card menu on a dark table, its headings set in a high-contrast serif',
//       title: 'Wine list for a neighbourhood bar',
//       credit: 'Studio name',
//       source: 'https://example.com/the-page-it-came-from',
//       licence: 'Used with permission of the studio',
//     },
//   ],

/** Family name → the cleared uses for it. Empty until someone clears one. */
export const REAL_WORLD_USES = {}

// Every field an entry must carry before it may be drawn. All six are required
// and none has a default: a default would be this module inventing provenance,
// which is the one thing it exists to prevent.
export const REQUIRED_USE_FIELDS = ['image', 'alt', 'title', 'credit', 'source', 'licence']

/** True when a value is a non-empty string once trimmed. */
function filled(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * May this entry be shown?
 *
 * Fails closed on anything that is not an object with all six fields filled in.
 * The caller renders only what this returns true for, so an incomplete row is
 * absent rather than partial — there is no "image with a missing credit" state,
 * because that state is the defect.
 */
export function isShowable(use) {
  if (!use || typeof use !== 'object') return false
  return REQUIRED_USE_FIELDS.every(field => filled(use[field]))
}

/**
 * The showable uses for a family, in the order they were listed.
 *
 * Always an array. An unknown family, a family with no entries and a family
 * whose entries are all incomplete are the same answer to the panel — it has
 * nothing to show — and the panel says so in words rather than drawing an
 * empty grid.
 */
export function usesFor(family) {
  if (!filled(family)) return []
  const rows = REAL_WORLD_USES[family]
  if (!Array.isArray(rows)) return []
  return rows.filter(isShowable)
}
