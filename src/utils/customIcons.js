// SAVED CUSTOM ICONS ("My icons") — the read side, kept out of the page so Node can test it.
//
// `vs-custom-icons` is localStorage, and anything on this origin can write to it
// (an old build, a browser extension, another tab, the console). The page used to
// trust what it read: each record's `svg` went straight into an <img> data: URI.
// An <img> blocks script, but the same markup also feeds the customiser and the
// sprite, so a stored record is now run through the allow-list sanitiser the
// moment it is loaded. A record that fails is dropped from what is shown (it is
// NOT deleted from storage: a save writes the stored list back, and removing a
// record the visitor made because the sanitiser has a size cap would lose it).
//
// Drawing: a custom icon is a <symbol> in the grid's hidden sprite, like a pack
// glyph. Its sprite key is namespaced (`custom:`) so it can never be the key of a
// `pack:name` glyph, and the sprite itself hands out every symbol id (`icsN`,
// never reused) and prefixes the ids inside an icon with it, so two customs that
// both define `id="a"` cannot meet.
import { sanitiseSvgInline } from './svgSanitise.js'
import { registerSymbols, symbolRef } from './iconSprite.js'

// A cleaned icon with nothing left to draw is not worth a grid cell.
const DRAWS_RE = /<(?:path|circle|ellipse|line|polyline|polygon|rect|use)[\s/>]/

/** The record with a cleaned `svg`, or null when it cannot be shown. */
export function cleanCustomIcon(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  if (typeof record.svg !== 'string') return null
  let clean
  try { clean = sanitiseSvgInline(record.svg) } catch { return null }
  if (!clean || !DRAWS_RE.test(clean.svg)) return null
  return { ...record, svg: clean.svg }
}

/** Every stored record that survives the sanitiser, in stored order. */
export function cleanCustomIcons(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const record of list) {
    const clean = cleanCustomIcon(record)
    if (clean) out.push(clean)
  }
  return out
}

/** The sprite key of a saved icon. Namespaced: never equal to a `pack:name` key. */
export const customSymbolKey = (icon) => `custom:${icon.key ?? icon.name}`

/**
 * Put the cleaned customs in the sprite. A saved icon's root carries its own
 * presentation (fill, stroke, width, cap, join, colour), which a pack glyph's does
 * not, so the symbol keeps those on a wrapping group (`root`).
 */
export function registerCustomSymbols(icons) {
  registerSymbols(icons.map((icon) => ({ key: customSymbolKey(icon), text: icon.svg, root: true })))
}

/** `#id` of the saved icon's symbol, '' when it is not in the sprite (draw an <img>). Read-only. */
export const customSymbolRef = (icon) => symbolRef(customSymbolKey(icon))
