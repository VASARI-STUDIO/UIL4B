// Projects in known states for the /projects dashboard specs (52, 141, 146).
//
// Every project is saved data with a fixed shape and a known age, so a spec can compare the page with a
// hand-checked string ("1 of 4 parts set. Edited 1 day ago.") instead of re-working the page's own sum.
//
//   complete()   all four parts: five colours, Fraunces over Manrope, a 17px / 1.333 scale, six tints.
//                Its type scale runs 17, 23, 30, 40 px (17 x 1.333^n, rounded), so the caption reads "17 to 40px".
//   noTints()    the same without tints: the next step is the Tint tool (the one part with a motion).
//   half()       colours only: 1 of 4 parts, and the type scale is next.
//   blank()      the defaults untouched: 0 of 4 parts, so the palette is next and the mini has no colour strip.
//   many(n)      n colour-only projects with different names, newest first, an hour apart.
import { DEFAULT_DESIGN } from '../../../src/data/designDefaults.js'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export const ago = (ms) => new Date(Date.now() - ms).toISOString()
const clone = () => JSON.parse(JSON.stringify(DEFAULT_DESIGN))

export const COMPLETE_COLOURS = ['#1A0B2E', '#4B1F9E', '#8B5CF6', '#C9F24D', '#F5F3FF']
export const HALF_COLOURS = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']

export function complete(id = 'p-done', name = 'Violet Lime', updatedAt = ago(2 * HOUR)) {
  const design = clone()
  design.palette.colors = [...COMPLETE_COLOURS]
  design.fonts.heading.family = 'Fraunces'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1A0B2E', '#2E1650', '#4B1F9E', '#6C3FD4', '#8B5CF6', '#B69BF0']
  return { id, name, design, createdAt: ago(9 * DAY), updatedAt }
}

export function noTints(id = 'p-notints', name = 'Offcut', updatedAt = ago(2 * HOUR)) {
  const p = complete(id, name, updatedAt)
  p.design.tints.scale = []
  return p
}

export function half(id = 'p-half', name = 'Harbour Rebrand', updatedAt = ago(26 * HOUR)) {
  const design = clone()
  design.palette.colors = [...HALF_COLOURS]
  return { id, name, design, createdAt: ago(9 * DAY), updatedAt }
}

export function blank(id = 'p-blank', name = 'Default Project', updatedAt = ago(6 * DAY)) {
  return { id, name, design: clone(), createdAt: ago(9 * DAY), updatedAt }
}

export const archived = (project) => ({ ...project, archived: true })

const NAMES = ['Offcut', 'Shallow End', 'Tenner', 'Pilot Light', 'Quarry Road', 'Marlin', 'Northgate', 'Haberdash', 'Tidemark', 'Foxglove', 'Cobalt Row', 'Dovetail', 'Lantern']
/** n colour-only projects, the first the newest. Names are distinct and none contains another. */
export function many(n) {
  return Array.from({ length: n }, (_, i) => half(`m-${i + 1}`, NAMES[i], ago((i + 1) * HOUR)))
}
