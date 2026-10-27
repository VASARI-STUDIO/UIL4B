// The wall of real exports shown beside the log-in form: 15 files, each one
// exported from a UIL4B tool and captioned with the tool that made it.
//
// This module is the manifest. The art itself is either a WebP under
// /auth-wall/ (palette cards, type-pair specimens, the style-guide sheet) or
// data rendered by the wall component (icon SVGs, tint ramps, CSS excerpts),
// which lives in authWall.generated.js and is written by
// scripts/auth-wall/generate.mjs.
//
// THE CAPTION'S TOOL NAME IS READ FROM toolTree, never typed here, so a tool
// renamed in the nav is renamed on the wall. The checks below run when the
// module loads and throw: a row that points at a palette, icon group or tool
// that no longer exists must fail the build, not ship a caption that lies.

import { CREATE_GROUPS } from './toolTree.js'
import { LIBRARY_PALETTE_ROWS } from './paletteLibrary.js'
import { PREMADE_ICON_GROUPS, parseIconRef } from './iconGroups.js'
import { ICON_PACK_CREDITS } from './iconPackCredits.js'
import { EXPORT_FORMATS } from '../config/exportFormats.js'

/** How many icons a tile shows (a 3 x 3 grid). */
export const WALL_ICON_COUNT = 9

const TOOL_LABEL = Object.fromEntries(
  CREATE_GROUPS.flatMap((g) => g.tools).map((t) => [t.id, t.label]),
)

// kind: 'palette' | 'pair' | 'icons' | 'tint' | 'scale' | 'guide'
// sourceId is the palette row id, the icon group id, the "Heading + Body"
// pair, the tint source hex, the scale's ratio id or the project name.
// `asset` is a /auth-wall/ WebP path (a pair has a -light and a -dark twin).
const ROWS = [
  { id: 'p-ocean-deep', kind: 'palette', sourceId: 'ocean-deep', tool: 'palette', format: 'PNG', asset: '/auth-wall/p-ocean-deep.webp' },
  { id: 'f-playfair-roboto', kind: 'pair', sourceId: 'Playfair Display + Roboto', tool: 'font-pair', format: 'CSS', asset: '/auth-wall/f-playfair-roboto' },
  { id: 'i-wayfinding', kind: 'icons', sourceId: 'wayfinding', tool: 'icons', format: 'SVG' },
  { id: 't-2563eb', kind: 'tint', sourceId: '#2563EB', tool: 'tint', format: 'CSS' },
  { id: 'p-forest-floor', kind: 'palette', sourceId: 'forest-floor', tool: 'palette', format: 'PNG', asset: '/auth-wall/p-forest-floor.webp' },
  { id: 's-major-third', kind: 'scale', sourceId: 'base 16, major third', tool: 'type-scale', format: 'CSS', name: 'Major third from 16px' },
  { id: 'f-space-grotesk-bitter', kind: 'pair', sourceId: 'Space Grotesk + Bitter', tool: 'font-pair', format: 'CSS', asset: '/auth-wall/f-space-grotesk-bitter' },
  { id: 'i-media', kind: 'icons', sourceId: 'media', tool: 'icons', format: 'SVG' },
  // The style-guide sheet comes from the project export panel, which is not a
  // tool in the nav, so it names its export format instead of a tool.
  { id: 'g-ocean-deep-guide', kind: 'guide', sourceId: 'Ocean Deep kit', exportFormat: 'png', format: 'PNG', name: 'Ocean Deep kit', asset: '/auth-wall/g-ocean-deep-guide.webp' },
  { id: 'p-paper-ink', kind: 'palette', sourceId: 'paper-ink', tool: 'palette', format: 'PNG', asset: '/auth-wall/p-paper-ink.webp' },
  { id: 't-e76f51', kind: 'tint', sourceId: '#E76F51', tool: 'tint', format: 'CSS' },
  { id: 'f-merriweather-open-sans', kind: 'pair', sourceId: 'Merriweather + Open Sans', tool: 'font-pair', format: 'CSS', asset: '/auth-wall/f-merriweather-open-sans' },
  { id: 'i-settings', kind: 'icons', sourceId: 'settings', tool: 'icons', format: 'SVG' },
  { id: 's-perfect-fourth', kind: 'scale', sourceId: 'base 18, perfect fourth', tool: 'type-scale', format: 'CSS', name: 'Perfect fourth from 18px' },
  { id: 'p-terracotta-dusk', kind: 'palette', sourceId: 'terracotta-dusk', tool: 'palette', format: 'PNG', asset: '/auth-wall/p-terracotta-dusk.webp' },
]

const isFullRow = (r) => Array.isArray(r.colors) && r.colors.length > 0 && !r.slots && r.pro !== true

function describe(row) {
  const out = { ...row }
  if (row.kind === 'palette') {
    const src = LIBRARY_PALETTE_ROWS.find((r) => r.id === row.sourceId)
    if (!src || !isFullRow(src)) throw new Error(`authWall: ${row.id} needs a full free palette row, got "${row.sourceId}"`)
    out.name = src.name
    out.colors = src.colors
  } else if (row.kind === 'icons') {
    const group = PREMADE_ICON_GROUPS.find((g) => g.id === row.sourceId)
    if (!group || group.access !== 'free') throw new Error(`authWall: ${row.id} needs a free icon group, got "${row.sourceId}"`)
    const refs = group.icons.slice(0, WALL_ICON_COUNT)
    const packs = [...new Set(refs.map((ref) => parseIconRef(ref).pack))]
    if (packs.length !== 1 || !ICON_PACK_CREDITS[packs[0]]) throw new Error(`authWall: ${row.id} draws from ${packs.join(', ')}; the credit line names one known pack`)
    const c = ICON_PACK_CREDITS[packs[0]]
    out.name = group.label
    out.refs = refs
    out.credit = `${c.name}, ${c.spdx}`
  } else if (row.kind === 'tint') {
    out.name = `Tints of ${row.sourceId}`
  } else if (row.kind === 'pair') {
    const [heading, body] = row.sourceId.split(' + ')
    out.name = `${heading} and ${body}`
  }
  if (row.exportFormat) {
    const f = EXPORT_FORMATS.find((x) => x.id === row.exportFormat)
    if (!f || !f.live) throw new Error(`authWall: ${row.id} names export format "${row.exportFormat}", which is not live`)
    out.tool = null
    out.toolLabel = f.name.replace(/\s*\(.*\)$/, '')
  } else {
    if (!TOOL_LABEL[row.tool]) throw new Error(`authWall: ${row.id} names tool "${row.tool}", which is not in toolTree`)
    out.toolLabel = TOOL_LABEL[row.tool]
  }
  if (!out.name) throw new Error(`authWall: ${row.id} has no name`)
  out.caption = [out.name, `${out.toolLabel} · ${row.format}`]
  return Object.freeze(out)
}

if (new Set(ROWS.map((r) => r.id)).size !== ROWS.length) throw new Error('authWall: duplicate row id')

/** The wall, in display order. Neighbouring rows never share a kind. */
export const AUTH_WALL = Object.freeze(ROWS.map(describe))

for (let i = 1; i < AUTH_WALL.length; i += 1) {
  if (AUTH_WALL[i].kind === AUTH_WALL[i - 1].kind) throw new Error(`authWall: ${AUTH_WALL[i].id} follows a tile of the same kind`)
}
if (AUTH_WALL.length !== 15) throw new Error(`authWall: expected 15 rows, got ${AUTH_WALL.length}`)
