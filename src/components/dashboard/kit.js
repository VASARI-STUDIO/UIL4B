// What the kit sheet draws, read off a saved project (or off the example kit).
//
// The sheet shows one project's four parts in the app's next-step order: Palette, Type scale, Font pair,
// Tints. Each part is either set (its plate shows the real saved values) or unset (a one-line note and
// "Not set"). "Set" is projectDigest's own reading, so it agrees with the project page and the cap.
//
// The example kit (Kerbside, a sample bike courier) is drawn for a visitor with no project of their own: it
// goes through the same function, so the example and a real kit cannot look different by accident.

import { DEFAULT_DESIGN, tintConfigFor } from '../../data/designDefaults'
import { generateTintScale } from '../../utils/colors'
import { projectDigest, relativeTime } from '../../utils/userHome'
import { ratioName } from '../userhome/workspace'

const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c)
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)

// The luminance maths behind a hex label: ink or near-black, whichever reads better on that colour.
const lum = (hex) => {
  const n = parseInt(hex.slice(1, 7), 16)
  const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
/** The label colour (a CSS value) that reads best on `hex`. */
export function inkOn(hex) {
  if (!isHex(hex) || hex.length < 7) return 'var(--ink)'
  const l = lum(hex)
  return ratio(l, lum('#0B0C0E')) >= ratio(l, lum('#EFEEEA')) ? 'var(--on-ink)' : 'var(--ink)'
}

/** The eleven-step ramp the Tint tool would build from `hex`, with the project's own tint settings. */
function previewRamp(design, hex) {
  try {
    return generateTintScale({ ...tintConfigFor(design), hex }).filter(isHex)
  } catch {
    return []
  }
}

// The example: Kerbside, a sample bike courier. Not a person's work and never saved.
const EXAMPLE_COLOURS = ['#FF5A1F', '#1A1A1A', '#E6E4DE', '#FFFFFF']
const EXAMPLE_DESIGN = {
  ...DEFAULT_DESIGN,
  palette: { ...DEFAULT_DESIGN.palette, base: EXAMPLE_COLOURS[0], colors: EXAMPLE_COLOURS },
  fonts: {
    heading: { family: 'Archivo', weight: 800, category: 'sans-serif' },
    body: { family: 'IBM Plex Sans', weight: 400, category: 'sans-serif' },
  },
  typeScale: { ...DEFAULT_DESIGN.typeScale, base: 15, ratio: 1.618 },
  tints: { ...DEFAULT_DESIGN.tints, scale: previewRamp({ ...DEFAULT_DESIGN, palette: { ...DEFAULT_DESIGN.palette, base: EXAMPLE_COLOURS[0] } }, EXAMPLE_COLOURS[0]) },
}
export const EXAMPLE_PROJECT = Object.freeze({ id: null, name: 'Kerbside', design: EXAMPLE_DESIGN })
const EXAMPLE_SAMPLE = 'Book a pickup by ten and your parcel is there by twelve, set in IBM Plex Sans 400.'

/** The four plates' data in the strip's order. */
function partsOf(project, name) {
  const d = project.design || {}
  const digest = projectDigest(project)
  const done = Object.fromEntries(digest.parts.map((p) => [p.id, p.done]))
  const tool = Object.fromEntries(digest.parts.map((p) => [p.id, p.tool]))

  const colours = digest.colors.filter(isHex)
  const paletteSet = !!done.palette && colours.length > 0
  const palette = {
    id: 'palette', name: 'Palette', set: paletteSet, tool: tool.palette, linkLabel: 'Open in Palette Builder',
    stops: colours.map((c) => ({ c: c.toUpperCase(), on: inkOn(c) })),
    meta: `${colours.length} ${colours.length === 1 ? 'colour' : 'colours'}`,
    note: 'Start with one colour. The other three parts build on it.',
  }

  const base = digest.scaleBase
  const r = digest.scaleRatio
  const lh = Number(d.typeScale?.lineHeight) || 1.5
  const steps = [3, 2, 1, 0].map((i) => Math.round(base * r ** i))
  const scale = {
    id: 'type-scale', name: 'Type scale', set: !!done['type-scale'], tool: tool['type-scale'], linkLabel: 'Open in Type Scale',
    label: ratioName(r) || `Ratio ${r}`,
    lines: steps.map((px) => ({ px, size: Math.min(px, 72), lh: px >= 32 ? Math.round(Math.min(px, 72) * 1.1) : Math.round(px * lh) })),
    meta: `${base} to `, mono: `${steps[0]}px`,
    note: `Pick a ratio and ${name}'s sizes run from body text to display.`,
  }

  const heading = d.fonts?.heading || {}
  const body = d.fonts?.body || {}
  const hFamily = digest.heading
  const bFamily = digest.body
  const hWeight = heading.weight ?? 700
  const bWeight = body.weight ?? 400
  const fonts = {
    id: 'fonts', name: 'Font pair', set: !!done.fonts, tool: tool.fonts, linkLabel: 'Open in Font Pair',
    heading: { family: hFamily, weight: hWeight }, body: { family: bFamily, weight: bWeight },
    meta: `${hFamily} over ${bFamily}`,
    hLabel: `Heading, ${hWeight}`, bLabel: `Body, ${bFamily} ${bWeight}`,
    sample: project === EXAMPLE_PROJECT ? EXAMPLE_SAMPLE : `Pack my box with five dozen liquor jugs, set in ${bFamily} ${bWeight}.`,
    note: 'No fonts paired yet.',
  }

  const saved = (Array.isArray(d.tints?.scale) ? d.tints.scale : []).filter(isHex)
  const tintsSet = !!done.tints && saved.length > 0
  const seed = colours[0]
  const preview = !tintsSet && paletteSet && seed ? previewRamp(d, seed) : []
  const tints = {
    id: 'tints', name: 'Tints', set: tintsSet, tool: tool.tints, linkLabel: 'Open in Tint',
    stops: tintsSet ? saved : preview,
    count: saved.length,
    seed: paletteSet && seed ? { c: seed.toUpperCase(), on: inkOn(seed) } : null,
    note: 'Needs a palette first.',
  }
  return { palette, scale, fonts, tints, digest }
}

/**
 * The sheet for a real project. `pill` is the one next step; with all four parts set the next move is the
 * contrast check.
 */
export function kitFromProject(project) {
  const name = project?.name || 'Untitled project'
  const { palette, scale, fonts, tints, digest } = partsOf(project, name)
  const next = digest.next
  const when = relativeTime(project?.updatedAt || project?.createdAt)
  const pill = next
    ? { text: `Continue: ${lower(next.action)}`, href: next.tool, cls: next.id === 'tints' ? 'nx' : '' }
    : { text: 'Continue: check the contrast', href: '/create/contrast', cls: '' }
  return {
    title: name,
    // The page's own heading face once the project has paired fonts; the page face until then.
    face: fonts.set ? fonts.heading : null,
    meta: `${digest.done} of ${digest.total} parts set.${when ? ` Edited ${when}.` : ''}`,
    region: `${name}, latest project`,
    pill,
    parts: [palette, scale, fonts, tints],
  }
}

/** The example kit, with the words the signed-out visitor and the empty account each get. */
export function exampleKit(kind) {
  const { palette, scale, fonts, tints } = partsOf(EXAMPLE_PROJECT, 'Kerbside')
  const head = kind === 'empty'
    ? {
        title: 'Start your first brand kit', wrap: true, region: 'Start your first brand kit',
        meta: 'This one is an example: Kerbside, a sample bike courier.',
      }
    : {
        title: 'Every kit has four parts', wrap: true, region: 'Example brand kit',
        meta: 'This one is an example: Kerbside, a sample bike courier. No account needed to start.',
      }
  return { ...head, face: null, pill: null, parts: [palette, scale, fonts, tints] }
}
