import { contrastRatio, hctToHex, hexToHct } from './colors.js'
import { normaliseHex } from './paletteAdjust.js'

export const UI_SYSTEM_SHADES = [100, 200, 300, 400, 500, 600, 700, 800, 900]
export const UI_SYSTEM_GROUPS = [
  { id: 'brand', label: 'Brand' },
  { id: 'success', label: 'Success' },
  { id: 'warning', label: 'Warning' },
  { id: 'error', label: 'Error' },
  { id: 'information', label: 'Information' },
  { id: 'neutral', label: 'Neutral' },
]

const STATUS_KEYS = {
  success: { hue: 145, chroma: 54 },
  warning: { hue: 75, chroma: 58 },
  error: { hue: 25, chroma: 68 },
  information: { hue: 250, chroma: 58 },
}
const LIGHTER = [0.94, 0.78, 0.58, 0.32]
const DARKER = [0.78, 0.56, 0.34, 0.16]
const CHROMA_FACTOR = [0.22, 0.38, 0.58, 0.78, 1, 1.06, 1.1, 1.04, 0.9]
const BLACK = '#000000'
const WHITE = '#FFFFFF'

function roundHct(values) {
  return {
    h: Math.round(values[0] * 10) / 10,
    c: Math.round(values[1] * 10) / 10,
    t: Math.round(values[2] * 10) / 10,
  }
}

function toneScale(anchor) {
  const lighter = LIGHTER.map(amount => anchor + (100 - anchor) * amount)
  const darker = DARKER.map(amount => anchor * amount)
  return [...lighter, anchor, ...darker]
}

function contrastEvidence(hex) {
  const black = contrastRatio(hex, BLACK)
  const white = contrastRatio(hex, WHITE)
  const recommended = black >= white ? BLACK : WHITE
  const ratio = Math.max(black, white)
  return {
    black: Math.round(black * 100) / 100,
    white: Math.round(white * 100) / 100,
    recommended,
    ratio: Math.round(ratio * 100) / 100,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaUi: ratio >= 3,
    aaa: ratio >= 7,
  }
}

function generatedShade(group, step, index, requested, exactHex, overrideHex) {
  const requestedHct = {
    h: requested.h,
    c: Math.max(0, requested.c * (group.id === 'neutral' ? 1 : CHROMA_FACTOR[index])),
    t: requested.tones[index],
  }
  const source = overrideHex || exactHex || hctToHex(requestedHct.h, requestedHct.c, requestedHct.t)
  const hex = normaliseHex(source)
  if (!hex) throw new Error(`Invalid ${group.label} ${step} colour`)
  const achieved = roundHct(hexToHct(hex))
  const limited = !overrideHex && !exactHex && (
    requestedHct.c - achieved.c > 1.5 || Math.abs(requestedHct.t - achieved.t) > 1.2
  )
  return {
    step,
    hex,
    requested: {
      h: Math.round(requestedHct.h * 10) / 10,
      c: Math.round(requestedHct.c * 10) / 10,
      t: Math.round(requestedHct.t * 10) / 10,
    },
    achieved,
    limited,
    override: Boolean(overrideHex),
    contrast: contrastEvidence(hex),
  }
}

function makeGroup(definition, overrides) {
  const shades = UI_SYSTEM_SHADES.map((step, index) => generatedShade(
    definition,
    step,
    index,
    definition,
    definition.id === 'brand' && step === 500 ? definition.seed : null,
    overrides?.[`${definition.id}-${step}`],
  ))
  const warnings = []
  for (let index = 1; index < shades.length; index++) {
    if (shades[index - 1].achieved.t <= shades[index].achieved.t) {
      warnings.push(`${definition.label} has a limited perceived-tone range around ${shades[index].step}.`)
      break
    }
  }
  if (shades.some(shade => shade.limited)) {
    warnings.push(`${definition.label} reaches the display gamut boundary; requested and achieved HCT are shown.`)
  }
  if (shades.some(shade => shade.override) && warnings.length) {
    warnings.push(`${definition.label} overrides need review before export.`)
  }
  return { id: definition.id, label: definition.label, shades, warnings }
}

function shade(group, step) {
  return group.shades.find(item => item.step === step)
}

function nearestPassing(group, preferredStep, ink, minimum = 4.5) {
  const preferredIndex = UI_SYSTEM_SHADES.indexOf(preferredStep)
  const ranked = [...group.shades].sort((a, b) => (
    Math.abs(UI_SYSTEM_SHADES.indexOf(a.step) - preferredIndex)
    - Math.abs(UI_SYSTEM_SHADES.indexOf(b.step) - preferredIndex)
  ))
  return ranked.find(item => contrastRatio(item.hex, ink) >= minimum) || shade(group, preferredStep)
}

function role(hex, source) {
  return { hex, source }
}

function accentRoles(group, theme) {
  const dark = theme === 'dark'
  const ink = dark ? BLACK : WHITE
  const fill = nearestPassing(group, dark ? 300 : 600, ink)
  const container = shade(group, dark ? 800 : 100)
  const containerInk = container.contrast.recommended
  return {
    fill: role(fill.hex, `${group.id}-${fill.step}`),
    onFill: role(ink, ink === BLACK ? 'black' : 'white'),
    container: role(container.hex, `${group.id}-${container.step}`),
    onContainer: role(containerInk, containerInk === BLACK ? 'black' : 'white'),
  }
}

function makeScheme(groups, theme) {
  const byId = Object.fromEntries(groups.map(group => [group.id, group]))
  const dark = theme === 'dark'
  const canvas = shade(byId.neutral, dark ? 900 : 100)
  const surface = shade(byId.neutral, dark ? 800 : 100)
  const raised = shade(byId.neutral, dark ? 700 : 200)
  const text = nearestPassing(byId.neutral, dark ? 100 : 900, canvas.hex)
  const muted = nearestPassing(byId.neutral, dark ? 300 : 700, canvas.hex, 4.5)
  const border = nearestPassing(byId.neutral, dark ? 500 : 400, canvas.hex, 3)
  const roles = {
    canvas: role(canvas.hex, `neutral-${canvas.step}`),
    'on-canvas': role(text.hex, `neutral-${text.step}`),
    surface: role(surface.hex, `neutral-${surface.step}`),
    'surface-raised': role(raised.hex, `neutral-${raised.step}`),
    text: role(text.hex, `neutral-${text.step}`),
    'text-muted': role(muted.hex, `neutral-${muted.step}`),
    border: role(border.hex, `neutral-${border.step}`),
  }
  const pairs = []
  for (const id of ['brand', 'success', 'warning', 'error', 'information']) {
    const mapped = accentRoles(byId[id], theme)
    const name = id === 'brand' ? 'primary' : id
    roles[name] = mapped.fill
    roles[`on-${name}`] = mapped.onFill
    roles[`${name}-container`] = mapped.container
    roles[`on-${name}-container`] = mapped.onContainer
    pairs.push({
      name,
      fill: mapped.fill,
      foreground: mapped.onFill,
      ratio: Math.round(contrastRatio(mapped.fill.hex, mapped.onFill.hex) * 100) / 100,
    })
    pairs.push({
      name: `${name}-container`,
      fill: mapped.container,
      foreground: mapped.onContainer,
      ratio: Math.round(contrastRatio(mapped.container.hex, mapped.onContainer.hex) * 100) / 100,
    })
  }
  pairs.unshift({
    name: 'canvas',
    fill: roles.canvas,
    foreground: roles['on-canvas'],
    ratio: Math.round(contrastRatio(roles.canvas.hex, roles['on-canvas'].hex) * 100) / 100,
  })
  return { theme, roles, pairs }
}

export function createUiSystem(seed, options = {}) {
  const normalizedSeed = normaliseHex(seed)
  if (!normalizedSeed) throw new Error('Enter a valid six-digit HEX colour.')
  const seedHct = roundHct(hexToHct(normalizedSeed))
  const neutralTinted = options.neutralTinted !== false
  // Brand 500 is the system source of truth, not an independently editable
  // scale cell. Ignore stale or tampered overrides so roles and exports can
  // never contradict `system.seed`.
  const overrides = Object.fromEntries(
    Object.entries(options.overrides || {}).filter(([key]) => key !== 'brand-500'),
  )
  const definitions = [
    {
      id: 'brand',
      label: 'Brand',
      seed: normalizedSeed,
      h: seedHct.h,
      c: seedHct.c,
      tones: toneScale(seedHct.t),
    },
    ...Object.entries(STATUS_KEYS).map(([id, key]) => ({
      id,
      label: UI_SYSTEM_GROUPS.find(group => group.id === id).label,
      h: key.hue,
      c: key.chroma,
      tones: toneScale(52),
    })),
    {
      id: 'neutral',
      label: 'Neutral',
      h: seedHct.h,
      c: neutralTinted ? Math.min(8, Math.max(3, seedHct.c * 0.12)) : 0,
      tones: toneScale(52),
    },
  ]
  const groups = definitions.map(definition => makeGroup(definition, overrides))
  const warnings = []
  const rangeGroups = groups.filter(group => group.warnings.some(item => /limited perceived-tone range/i.test(item)))
  const gamutGroups = groups.filter(group => group.shades.some(shade => shade.limited))
  const overrideGroups = groups.filter(group => group.shades.some(shade => shade.override) && group.warnings.length)
  if (rangeGroups.length) {
    warnings.push(`Limited tone range in ${rangeGroups.map(group => group.label).join(', ')}; affected cells are marked for review.`)
  }
  if (gamutGroups.length) {
    warnings.push(`Limited display gamut in ${gamutGroups.map(group => group.label).join(', ')}; requested and achieved HCT are shown on marked shades.`)
  }
  if (overrideGroups.length) {
    warnings.push(`Overrides need review in ${overrideGroups.map(group => group.label).join(', ')} before export.`)
  }
  if (seedHct.t <= 1 || seedHct.t >= 99) {
    warnings.unshift('Brand 500 is at the end of the tone range. The exact seed is preserved, so adjacent shades have limited separation.')
  }
  const schemes = {
    light: makeScheme(groups, 'light'),
    dark: makeScheme(groups, 'dark'),
  }
  return {
    seed: normalizedSeed,
    neutralTinted,
    groups,
    schemes,
    warnings,
    hasOverrides: Object.keys(overrides).length > 0,
  }
}

function cssName(value) {
  return value.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export function uiSystemExports(system) {
  const scaleLines = system.groups.flatMap(group => group.shades.map(
    item => `  --ui-${group.id}-${item.step}: ${item.hex};`,
  ))
  const schemeCss = theme => Object.entries(system.schemes[theme].roles).map(
    ([name, value]) => `  --ui-${cssName(name)}: ${value.hex}; /* ${value.source} */`,
  )
  const css = [
    ':root {',
    ...scaleLines,
    '}',
    '[data-ui-theme="light"] {',
    ...schemeCss('light'),
    '}',
    '[data-ui-theme="dark"] {',
    ...schemeCss('dark'),
    '}',
  ].join('\n')

  const color = Object.fromEntries(system.groups.map(group => [
    group.id,
    Object.fromEntries(group.shades.map(item => [
      String(item.step),
      { $type: 'color', $value: item.hex },
    ])),
  ]))
  const semantic = Object.fromEntries(['light', 'dark'].map(theme => [
    theme,
    Object.fromEntries(Object.entries(system.schemes[theme].roles).map(([name, value]) => [
      name,
      {
        $type: 'color',
        $value: value.source.includes('-')
          ? `{color.${value.source.replace('-', '.')}}`
          : value.hex,
      },
    ])),
  ]))
  const dtcg = JSON.stringify({ color, semantic }, null, 2)
  const tailwindColors = Object.fromEntries(system.groups.map(group => [
    group.id,
    Object.fromEntries(group.shades.map(item => [item.step, item.hex])),
  ]))
  const tailwind = [
    '/** @type {import("tailwindcss").Config} */',
    'export default {',
    '  theme: {',
    '    extend: {',
    `      colors: ${JSON.stringify(tailwindColors, null, 8).replace(/\n/g, '\n      ')},`,
    '    },',
    '  },',
    '}',
  ].join('\n')
  return { css, dtcg, tailwind }
}
