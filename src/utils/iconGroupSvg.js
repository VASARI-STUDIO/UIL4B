// Turning a group's glyph bodies into files: one standalone SVG per icon, and
// one SVG sprite of <symbol>s for the whole group.
//
// Pure string work (no DOM), so the same function produces the on-screen
// preview (as a data: URI inside an <img>) and the exported file — the preview
// and the download cannot disagree.
//
// Colour: with a colour chosen, every `currentColor` in the body becomes that
// colour, so the file carries it on its own. With none, `currentColor` stays,
// and the file takes its colour from the CSS `color` where it is used.
//
// Stroke: every stroke-width in the body is rewritten to the group's weight.
// The packs a group may use draw at 1.5 or 2 natively (see
// src/data/iconGroups.js); rewriting all of them is what makes a mixed group
// one weight.

import { parseIconRef } from '../data/iconGroups.js'

const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i

function paint(body, { color, stroke } = {}) {
  let out = String(body || '')
  if (Number.isFinite(stroke) && stroke > 0) out = out.replace(/stroke-width="[^"]*"/g, `stroke-width="${stroke}"`)
  if (color && HEX.test(color)) out = out.replace(/currentColor/g, color.toLowerCase())
  return out
}

/** A standalone SVG file for one glyph. */
export function groupIconSvg(glyph, { color, stroke, size = 24 } = {}) {
  const w = glyph?.width || 24
  const h = glyph?.height || 24
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${w} ${h}">${paint(glyph?.body, { color, stroke })}</svg>`
}

/** The same SVG as an <img> src. */
export function groupIconDataUri(glyph, opts) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(groupIconSvg(glyph, opts))}`
}

/**
 * File names for a group's icons: the icon's own name, with the pack appended
 * only when two packs in the group share a name. Returned in the group's order.
 */
export function groupFileNames(refs) {
  const parsed = (refs || []).map(parseIconRef)
  const count = new Map()
  for (const { name } of parsed) count.set(name, (count.get(name) || 0) + 1)
  return parsed.map(({ pack, name }) => (count.get(name) > 1 ? `${name}-${pack}` : name))
}

/**
 * One SVG sprite for the group. Each icon is a <symbol> whose id is its file
 * name, used as `<svg><use href="sprite.svg#arrow-up"/></svg>`.
 * `entries` is [{ ref, glyph }] in the group's order; missing glyphs are skipped.
 */
export function groupSprite(entries, { color, stroke } = {}) {
  const list = (entries || []).filter((e) => e?.glyph)
  const ids = groupFileNames(list.map((e) => e.ref))
  const symbols = list.map((e, i) => {
    const w = e.glyph.width || 24
    const h = e.glyph.height || 24
    return `<symbol id="${ids[i]}" viewBox="0 0 ${w} ${h}">${paint(e.glyph.body, { color, stroke })}</symbol>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join('\n')}\n</svg>\n`
}
