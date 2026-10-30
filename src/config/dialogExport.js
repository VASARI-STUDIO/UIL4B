// What the export dialog offers and in what order: three types, the categories
// under them, and which files (format ids from exportFormats.js) each category
// makes. The ids of the files and their Pro flags stay in exportFormats.js; this
// file only groups them, so a format cannot be live there and unreachable here
// (tests/unit/export-v3.test.js asserts each live format is in exactly one list).
//
// Plain data and pure functions, no React: the dialog, the gallery route and the
// tests all read it, and the tests run it under node.

import { GALLERY_CHECKOUT, normalisePick } from '../utils/kitGalleryPick.js'

// type -> category -> files.
//   shape    — the one-line size of the document, for the row's accessible name
//   pro      — every file in the category is Pro (the plan tag on its row)
//   files    — format ids, default first
//   layouts  — the EXPORT_TEMPLATES key the Layout step reads, or null for no step
//   preview  — which render sits at the top of the column
const category = (id, name, shape, pro, files, layouts, preview) =>
  Object.freeze({ id, name, shape, pro, files: Object.freeze(files), layouts, preview })

export const EXPORT_TYPES = Object.freeze([
  Object.freeze({
    id: 'brand',
    name: 'Brand book',
    line: '',
    categories: Object.freeze([
      category('book', 'Book', 'A4 pages', true, ['book', 'book-png', 'book-html'], 'book', 'book'),
      category('slides', 'Slides', '16:9', true, ['guidelines', 'guidelines-html'], 'guidelines', 'guidelines'),
      category('guide', 'Style guide', 'A4', false, ['html', 'png', 'jpeg', 'md'], null, 'guide'),
    ]),
  }),
  Object.freeze({
    id: 'kit',
    name: 'UI kit',
    line: 'One HTML page',
    categories: Object.freeze([category('kit', 'UI kit', 'One HTML page', false, ['kit'], 'kit', 'kit')]),
  }),
  Object.freeze({
    id: 'code',
    name: 'Code',
    line: 'CSS or JSON',
    categories: Object.freeze([category('code', 'Code', 'CSS or JSON', false, ['css', 'json'], null, 'code')]),
  }),
])

// Where the header Export opens with no earlier pick this session.
export const DEFAULT_PRESET = Object.freeze({ type: 'brand', category: 'book', file: 'book' })

const typeOf = (id) => EXPORT_TYPES.find((t) => t.id === id)

/** Where a file lives: { type, category } objects, or null for an id no category lists. */
export function exportLocation(formatId) {
  for (const type of EXPORT_TYPES) {
    const found = type.categories.find((c) => c.files.includes(formatId))
    if (found) return { type, category: found }
  }
  return null
}

/**
 * A preset made safe. Any part may be missing or wrong: a missing category is the
 * one that holds the file (else the type's first), a missing type is the one that
 * holds the file (else the default), and a file the category lacks is its first.
 */
export function resolvePreset(preset) {
  const want = preset && typeof preset === 'object' ? preset : {}
  const owner = exportLocation(want.file)
  const type = typeOf(want.type) || owner?.type || typeOf(DEFAULT_PRESET.type)
  const picked = type.categories.find((c) => c.id === want.category)
  const cat = picked || (owner && owner.type === type ? owner.category : type.categories[0])
  const file = cat.files.includes(want.file) ? want.file : cat.files[0]
  return { type: type.id, category: cat.id, file }
}

// ── The last pick, kept for the session ─────────────────────────────────────
export const LAST_PICK_KEY = 'uil4b.exportV3.last'

/** The last pick made this session, resolved, or null when there is none or it is unreadable. */
export function readLastPick({ storage = globalThis.sessionStorage } = {}) {
  try {
    const raw = storage.getItem(LAST_PICK_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object') return null
    return resolvePreset(v)
  } catch { return null }
}

export function storeLastPick(pick, { storage = globalThis.sessionStorage } = {}) {
  try {
    storage.setItem(LAST_PICK_KEY, JSON.stringify(resolvePreset(pick)))
    return true
  } catch { return false }
}

// ── The way to Pro ──────────────────────────────────────────────────────────
// Each Pro file as the gallery's pick (kitGalleryPick.js), so a pick survives the
// trip to checkout and "Back to your export" can reopen the dialog on it.
const GALLERY_PICKS = Object.freeze({
  book: Object.freeze({ design: 'book', format: 'pdf' }),
  'book-png': Object.freeze({ design: 'book', format: 'png' }),
  'book-html': Object.freeze({ design: 'book', format: 'html' }),
  guidelines: Object.freeze({ design: 'guidelines', format: 'pdf' }),
  'guidelines-html': Object.freeze({ design: 'guidelines', format: 'html' }),
})

/** The gallery pick for a Pro file, or null for a file that is not Pro. */
export const galleryPick = (formatId) => (Object.hasOwn(GALLERY_PICKS, formatId) ? GALLERY_PICKS[formatId] : null)

/** The preset a stored gallery pick reopens the dialog on. */
export function presetFromGalleryPick(pick) {
  const safe = normalisePick(pick)
  const file = Object.keys(GALLERY_PICKS).find((id) => GALLERY_PICKS[id].design === safe.design && GALLERY_PICKS[id].format === safe.format)
  return resolvePreset({ file: file || (safe.design === 'kit' ? 'kit' : undefined) })
}

/**
 * Where a Pro pick sends a free account. One rule: a signed-in account with a saved
 * project open goes straight to the trial checkout (the pick is stored first, so
 * the way back reopens it); anyone else, signed out or with no saved project, goes
 * to /plans. `pick` is the thing to store, and only set when going to checkout.
 */
export function resolveUpgradeTarget({ formatId, projectId, signedIn }) {
  const pick = galleryPick(formatId)
  const checkout = Boolean(signedIn && projectId && pick)
  return { to: checkout ? GALLERY_CHECKOUT : '/plans', checkout, pick: checkout ? pick : null }
}

// ── Offline ─────────────────────────────────────────────────────────────────
// The files that need the network to be made: the server builds the book and the
// slides, and the kit fetches its font files first. The style guide and the token
// files are made in the browser from the saved design.
const NEEDS_NETWORK = new Set(['kit', 'book', 'book-png', 'book-html', 'guidelines', 'guidelines-html'])

export const needsNetwork = (formatId) => NEEDS_NETWORK.has(formatId)
