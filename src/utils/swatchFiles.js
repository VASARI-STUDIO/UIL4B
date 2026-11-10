// Adobe swatch files for a design: .ase (Adobe Swatch Exchange, read by
// Illustrator, InDesign, Photoshop, Affinity and Procreate) and .aco (Photoshop's
// own swatch file, read by Photoshop and Procreate).
//
// swatchGroups(design) lists the colours once, in named groups, and both writers
// take that list. Swatch names use the token names (`primary/500`, `on-surface/muted`).
// ASE keeps the groups. ACO has no groups, so the light and dark interface colours
// carry a `light/` or `dark/` prefix there.
//
// BYTE LAYOUTS (all big-endian). ASE has no official public spec;
// the layout follows the widely used reader and writer descriptions.
//   ASE  'ASEF', u16 major 1, u16 minor 0, u32 block count, then blocks.
//        Block: u16 type, u32 length of the data that follows, data.
//        0xC001 group start: name.   0xC002 group end: no data.
//        0x0001 colour entry: name, 'RGB ', 3 x float32 (0-1), u16 colour type (0 = global).
//        Name: u16 length in characters including the null, UTF-16BE, u16 null.
//   ACO  Section 1: u16 version 1, u16 count, then per colour u16 colour space
//        (0 = RGB), 4 x u16 (R, G, B in 0-65535, the fourth 0).
//        Section 2: u16 version 2, u16 count, the same colour records, each followed
//        by a name: u32 length in characters including the null, UTF-16BE, u16 null.
//
// Colours are 8-bit RGB. Pure functions, no React, no DOM.

import { generateTintScale } from './colors.js'
import { tintLabelsFor } from './tintLabels.js'
import { readBook } from './bookModel.js'
import { paletteRole, kitPalette, kitSemantic, interfaceRoles, ROLE_TOKENS } from './systemRoles.js'
import { darkInterfaceRoles } from './semanticModes.js'
import { tintConfigFor, DEFAULT_DESIGN } from '../data/designDefaults.js'
import { semanticShades, SEMANTIC_ROLES, SEMANTIC_STEPS } from '../data/semanticPresets.js'

// The tint steps a brand-tints group holds. A ramp also has 25, 950 and 975 stops
// in some lengths; the groups stop at 900.
const TINT_GROUP_STEPS = new Set(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'])

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
const up = (hex) => String(hex).toUpperCase()
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** The interface colours as swatches, named like the ROLE_TOKENS tokens. */
function roleSwatches(roles) {
  const swatches = [{ name: 'primary', hex: up(roles.primary) }]
  for (const [key, path] of ROLE_TOKENS) {
    // The token path ['on-surface', '$root'] is named `on-surface`.
    const name = path.filter((p) => p !== '$root').join('/')
    swatches.push({ name, hex: up(roles[key]) })
  }
  return swatches
}

/**
 * The swatch groups for a saved design, in file order:
 * Brand, one "Brand tints - <Role>" group per palette colour, Semantic - Light,
 * Semantic - Dark, States. Hex is upper-case `#RRGGBB`.
 */
export function swatchGroups(design) {
  const book = readBook(design)
  const groups = []

  // Brand and its tints.
  const saved = design?.tints || {}
  const d = DEFAULT_DESIGN.tints
  const tintSettings = {
    lumBias: num(saved.lumBias, d.lumBias),
    satDecay: num(saved.satDecay, d.satDecay),
    oled: typeof saved.oled === 'boolean' ? saved.oled : d.oled,
  }
  const tintBase = tintConfigFor({ tints: tintSettings, palette: { base: book.palette[0] || '#000000' } })
  const roles = book.palette.map((_, i) => paletteRole(i))
  if (book.palette.length) {
    groups.push({ group: 'Brand', swatches: book.palette.map((hex, i) => ({ name: roles[i], hex: up(hex) })) })
  }
  book.palette.forEach((hex, i) => {
    const ramp = generateTintScale({ ...tintBase, hex })
    const steps = tintLabelsFor(ramp.length)
    const swatches = []
    ramp.forEach((stop, k) => {
      if (TINT_GROUP_STEPS.has(steps[k])) swatches.push({ name: `${roles[i]}/${steps[k]}`, hex: up(stop) })
    })
    groups.push({ group: `Brand tints – ${capital(roles[i])}`, swatches })
  })

  // Interface colours, light then dark. The light set has no `primary` of its own:
  // the action fill is the palette's primary colour.
  const palette = kitPalette(design)
  const light = interfaceRoles(palette, kitSemantic(design))
  const lightPrimary = palette.find((p) => p.id === 'pine').hex
  groups.push({ group: 'Semantic – Light', swatches: roleSwatches({ ...light, primary: lightPrimary }) })
  groups.push({ group: 'Semantic – Dark', swatches: roleSwatches(darkInterfaceRoles(palette, design?.states)) })

  // States: the 500 stop of each.
  const shades = semanticShades(design?.states)
  const at = SEMANTIC_STEPS.indexOf('500')
  groups.push({ group: 'States', swatches: SEMANTIC_ROLES.map((role) => ({ name: `${role}/500`, hex: up(shades[role][at]) })) })

  return groups
}

/* ── Byte helpers ─────────────────────────────────────────────────────────── */

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

// The names ACO cannot group get a mode prefix; everything else keeps its name.
const acoName = (group, name) => {
  if (group === 'Semantic – Light') return `light/${name}`
  if (group === 'Semantic – Dark') return `dark/${name}`
  return name
}

/** Characters (UTF-16 code units) in a name, plus the null. */
const nameUnits = (name) => name.length + 1

/** Writes `name` as UTF-16BE then a null; returns the next offset. */
function putName(view, offset, name) {
  for (let i = 0; i < name.length; i++) view.setUint16(offset + i * 2, name.charCodeAt(i), false)
  view.setUint16(offset + name.length * 2, 0, false)
  return offset + (name.length + 1) * 2
}

/* ── ASE ──────────────────────────────────────────────────────────────────── */

/** An Adobe Swatch Exchange file for `groups` (as swatchGroups returns them). */
export function buildAse(groups) {
  // Size every block first so the buffer is exact.
  const nameBytes = (name) => 2 + nameUnits(name) * 2
  let size = 12
  let blocks = 0
  for (const { group, swatches } of groups) {
    size += 6 + nameBytes(group) // group start
    blocks += 1
    for (const s of swatches) {
      size += 6 + nameBytes(s.name) + 4 + 12 + 2 // colour entry
      blocks += 1
    }
    size += 6 // group end
    blocks += 1
  }

  const bytes = new Uint8Array(size)
  const view = new DataView(bytes.buffer)
  bytes.set([0x41, 0x53, 0x45, 0x46], 0) // 'ASEF'
  view.setUint16(4, 1, false)
  view.setUint16(6, 0, false)
  view.setUint32(8, blocks, false)

  let o = 12
  const name = (text) => {
    view.setUint16(o, nameUnits(text), false)
    o = putName(view, o + 2, text)
  }
  for (const { group, swatches } of groups) {
    view.setUint16(o, 0xc001, false)
    view.setUint32(o + 2, nameBytes(group), false)
    o += 6
    name(group)
    for (const s of swatches) {
      view.setUint16(o, 0x0001, false)
      view.setUint32(o + 2, nameBytes(s.name) + 4 + 12 + 2, false)
      o += 6
      name(s.name)
      bytes.set([0x52, 0x47, 0x42, 0x20], o) // 'RGB '
      o += 4
      for (const v of rgbOf(s.hex)) {
        view.setFloat32(o, v / 255, false)
        o += 4
      }
      view.setUint16(o, 0, false) // global colour
      o += 2
    }
    view.setUint16(o, 0xc002, false)
    view.setUint32(o + 2, 0, false)
    o += 6
  }
  return bytes
}

/* ── ACO ──────────────────────────────────────────────────────────────────── */

/** A Photoshop swatch file (.aco) for `groups`; groups are flattened. */
export function buildAco(groups) {
  const colours = groups.flatMap(({ group, swatches }) => swatches.map((s) => ({ name: acoName(group, s.name), hex: s.hex })))
  const v1 = 4 + colours.length * 10
  const v2 = 4 + colours.reduce((sum, c) => sum + 10 + 4 + nameUnits(c.name) * 2, 0)
  const bytes = new Uint8Array(v1 + v2)
  const view = new DataView(bytes.buffer)

  const put = (o, hex) => {
    view.setUint16(o, 0, false) // RGB
    rgbOf(hex).forEach((v, i) => view.setUint16(o + 2 + i * 2, v * 257, false)) // 8-bit to 16-bit
    view.setUint16(o + 8, 0, false)
    return o + 10
  }

  let o = 0
  view.setUint16(o, 1, false)
  view.setUint16(o + 2, colours.length, false)
  o += 4
  for (const c of colours) o = put(o, c.hex)

  view.setUint16(o, 2, false)
  view.setUint16(o + 2, colours.length, false)
  o += 4
  for (const c of colours) {
    o = put(o, c.hex)
    view.setUint32(o, nameUnits(c.name), false)
    o = putName(view, o + 4, c.name)
  }
  return bytes
}
