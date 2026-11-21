// What the export dialog offers and in what order: four rail categories (Branding, UI, Image, Code),
// the sub-categories under each (the tabs along the top of the dialog), and which files (format ids
// from exportFormats.js) each sub-category makes. The ids of the files and their Pro flags stay in
// exportFormats.js; this file only groups them, so a format cannot be live there and unreachable here
// (tests/unit/export-v3.test.js asserts each live format is in exactly one list).
//
// Plain data and pure functions, no React: the dialog, the gallery route and the
// tests all read it, and the tests run it under node.

import { GALLERY_CHECKOUT, normalisePick } from '../utils/kitGalleryPick.js'
import { isExportTheme } from '../data/exportThemes.js'
import { defaultThemeId, pickerTheme, themeFitsFile, themedFile, themedFileIsPro } from './exportThemePicker.js'

// rail category -> sub-category -> files.
//   shape    - the one-line size of the document, for the tab's accessible name
//   pro      - every file in the sub-category is Pro in every theme (the plan tag on its tab). The slides are free in the
//              Free pair's themes (src/data/exportThemes.js), so the theme decides and the sub-category is not marked
//   files    - format ids, default first
//   layouts  - the EXPORT_TEMPLATES key the file's layout list reads, or null for none
//   preview  - which render sits in the main stage
const category = (id, name, shape, pro, files, layouts, preview) =>
  Object.freeze({ id, name, shape, pro, files: Object.freeze(files), layouts, preview })

export const EXPORT_TYPES = Object.freeze([
  Object.freeze({
    id: 'branding',
    name: 'Branding',
    categories: Object.freeze([
      category('slides', 'Guidelines', 'Brand guidelines', false, ['guidelines', 'guidelines-html'], 'guidelines', 'guidelines'),
      category('book', 'Brand book', 'A4 pages', true, ['book', 'book-html'], 'book', 'book'),
      category('guide', 'Style guide', 'A4', false, ['html', 'md'], null, 'guide'),
    ]),
  }),
  Object.freeze({
    id: 'ui',
    name: 'UI',
    categories: Object.freeze([
      category('kit', 'UI kit', 'One HTML page', false, ['kit'], 'kit', 'kit'),
      category('apps', 'App-ready bundle', 'One zip', true, ['app-bundle'], null, 'bundle'),
    ]),
  }),
  Object.freeze({
    id: 'image',
    name: 'Image',
    categories: Object.freeze([
      category('guide-image', 'Style guide image', 'A4 sheet', false, ['png', 'jpeg'], null, 'guide'),
      category('book-pages', 'Book pages', 'A4 pages, 2K', true, ['book-png'], 'book', 'book'),
    ]),
  }),
  Object.freeze({
    id: 'code',
    name: 'Code',
    categories: Object.freeze([
      category('tokens', 'Tokens', 'CSS, JSON, Tailwind', false, ['css', 'json', 'tailwind'], null, 'code'),
      category('contrast', 'Contrast', 'Pairs that pass', false, ['contrast', 'contrast-json'], null, 'code'),
    ]),
  }),
])

// The rail before the four categories: a pick stored under one of these ids (or handed in by an older caller) still resolves.
const LEGACY_TYPES = Object.freeze({ brand: 'branding', kit: 'ui', apps: 'ui' })

// Where a free account starts: the guidelines as slides, in the first theme they are free in (defaultThemeId), so the first
// download works with no account and no payment.
export const FREE_START = Object.freeze({ type: 'branding', category: 'slides', file: 'guidelines' })

// Where the header Export opens with no earlier pick this session. Always a free pick, so a first press works for anyone.
export const DEFAULT_PRESET = FREE_START

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
 * A type from the earlier rail (brand, kit, apps) follows its file to where it lives now.
 */
export function resolvePreset(preset) {
  const want = preset && typeof preset === 'object' ? preset : {}
  const owner = exportLocation(want.file)
  if (owner && Object.hasOwn(LEGACY_TYPES, want.type)) return { type: owner.type.id, category: owner.category.id, file: want.file }
  const type = typeOf(want.type) || typeOf(LEGACY_TYPES[want.type]) || owner?.type || typeOf(DEFAULT_PRESET.type)
  const picked = type.categories.find((c) => c.id === want.category)
  const cat = picked || (owner && owner.type === type ? owner.category : type.categories[0])
  const file = cat.files.includes(want.file) ? want.file : cat.files[0]
  return { type: type.id, category: cat.id, file }
}

/**
 * True when the pick, in the theme (or the file's default theme when none), downloads with no Pro plan. The theme is the one
 * source: src/data/exportThemes.js through themedFileIsPro. A file that takes no theme is free unless its category is Pro.
 */
export function pickIsFree(pick, themeId) {
  const p = resolvePreset(pick)
  const home = exportLocation(p.file)
  if (!home || home.category.pro) return false
  return !themedFileIsPro(p.file, themeId && themeFitsFile(themeId, p.file) ? themeId : defaultThemeId(false, p.file))
}

/**
 * Where the dialog opens for an account: a Pro account on its pick; anyone else on its pick only when that pick is free for
 * them, else on FREE_START. The theme goes with the pick (undefined means the file's default theme).
 */
export function startFor(isPro, pick, themeId) {
  const p = resolvePreset(pick)
  const theme = themeId && themeFitsFile(themeId, p.file) ? themeId : undefined
  if (isPro || pickIsFree(p, theme)) return { pick: p, theme }
  return { pick: { ...FREE_START }, theme: undefined }
}

/**
 * The one-click way back to a free option from a Pro pick: the same file in a theme it is free in (the guidelines in Label,
 * the UI kit in Standards), else the free start. { pick, theme, label } for the button, or null when the pick is already free.
 */
export function freeWayOut(pick, themeId) {
  const p = resolvePreset(pick)
  if (pickIsFree(p, themeId)) return null
  const home = exportLocation(p.file)
  const sameFile = !home.category.pro && themedFile(p.file) ? defaultThemeId(false, p.file) : null
  const out = sameFile && !themedFileIsPro(p.file, sameFile)
    ? { pick: p, theme: sameFile }
    : { pick: { ...FREE_START }, theme: defaultThemeId(false, FREE_START.file) }
  const target = exportLocation(out.pick.file)
  return { ...out, label: `Use the free ${target.category.name} (${pickerTheme(out.theme).name})` }
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

/** The theme saved with the last pick, for this file only; null when none was saved, it is not a theme, or it cannot draw the file. */
export function readLastTheme(file, { storage = globalThis.sessionStorage } = {}) {
  try {
    const raw = storage.getItem(LAST_PICK_KEY)
    const v = raw ? JSON.parse(raw) : null
    if (!v || typeof v !== 'object' || resolvePreset(v).file !== file) return null
    return isExportTheme(v.theme) && themeFitsFile(v.theme, file) ? v.theme : null
  } catch { return null }
}

/** Keeps the pick for the session. `theme` is saved with it (the Pro button does, before it leaves the dialog). */
export function storeLastPick(pick, { storage = globalThis.sessionStorage, theme } = {}) {
  try {
    const safe = resolvePreset(pick)
    storage.setItem(LAST_PICK_KEY, JSON.stringify(isExportTheme(theme) && themeFitsFile(theme, safe.file) ? { ...safe, theme } : safe))
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
