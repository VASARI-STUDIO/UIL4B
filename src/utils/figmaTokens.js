// The design tokens as three files Figma can import as variables: one primitives
// file and one semantic file per mode (light, dark).
//
// WHY THREE FILES. Figma's variables import makes one mode per file, and it
// creates a variable only when the token is in every file imported together with
// the same type. So the two semantic files carry exactly the same names and types,
// and only their values differ. The primitives are a separate collection with one
// mode.
//
// WHAT FIGMA TAKES, and so what is written here:
//   - colours (sRGB), numbers, strings and font families that are one string.
//   - no gradients, no typography composites and no $root keys: a $root token has
//     no stable name in Figma, so the exact brand colour is a `<role>/base`
//     variable instead (it is not the 500 stop).
//   - groups become slash names: color `primary` step `500` is `primary/500`.
//   - a semantic variable points at its primitive with the
//     `com.figma.aliasData` extension, by collection and variable name. The
//     $value beside it is the resolved colour, so a file imported without the
//     primitives still shows the right colour.
//
// Pure functions over a plain design object. No React, no DOM.

import { designTokens, dtcgColor } from './designTokens.js'

const SET_NAME = 'Primitives'
const ALIAS_KEY = 'com.figma.aliasData'

// Semantic names: the role's group, then `default` unless the role has a variant.
const SEMANTIC_NAMES = new Map([
  ['color.background', 'background/default'],
  ['color.surface', 'surface/default'],
  ['color.on-surface.$root', 'on-surface/default'],
  ['color.on-surface.muted', 'on-surface/muted'],
  ['color.border', 'border/default'],
  ['color.primary.$root', 'primary/default'],
  ['color.primary.hover', 'primary/hover'],
  ['color.on-primary', 'on-primary/default'],
  ['color.focus', 'focus/default'],
  ['color.disabled', 'disabled/default'],
  ['color.on-disabled', 'on-disabled/default'],
])

const WHITE = '#ffffff'
const BLACK = '#000000'

/** The primitive variable name of a palette, semantic or tint token path. */
const primitiveName = (path) => path.slice(1).map((seg) => (seg === '$root' ? 'base' : seg)).join('/')

/** Sets a leaf at a slash-separated name, creating the groups on the way. */
function put(doc, name, leaf) {
  const segments = name.split('/')
  let node = doc
  for (const seg of segments.slice(0, -1)) {
    if (!node[seg]) node[seg] = {}
    node = node[seg]
  }
  node[segments[segments.length - 1]] = leaf
}

const colour = (hex) => ({ $type: 'color', $value: dtcgColor(hex) })
const numeric = (value) => ({ $type: 'number', $value: value })

const json = (doc) => `${JSON.stringify(doc, null, 2)}\n`

/** Primitives: palette, tints, state ramps, black and white, and type values. */
function primitives(tokens) {
  const doc = {}
  put(doc, 'base/white', colour(WHITE))
  put(doc, 'base/black', colour(BLACK))

  for (const t of tokens) {
    if (t.type === 'color' && t.path[0] === 'color' && !t.section) {
      put(doc, primitiveName(t.path), colour(t.value))
    }
  }

  const fonts = tokens.filter((t) => t.type === 'fontFamily')
  for (const t of fonts) put(doc, `font/family/${t.path[t.path.length - 1]}`, { $type: 'fontFamily', $value: String(t.value[0]) })
  for (const t of tokens) {
    const last = t.path[t.path.length - 1]
    if (t.type === 'dimension' && t.path[0] === 'font' && t.path[1] === 'size') put(doc, `font/size/${last}`, numeric(t.value.value))
    else if (t.type === 'fontWeight') put(doc, `font/weight/${last}`, numeric(t.value))
    else if (t.path[0] === 'line-height') put(doc, `line-height/${last}`, numeric(t.value))
  }
  return doc
}

/** The semantic file for one mode: 'light' reads each token's value, 'dark' its dark value. */
function semantic(tokens, mode) {
  const doc = {}
  const present = new Set(tokens.filter((t) => t.type === 'color' && t.path[0] === 'color' && !t.section).map((t) => primitiveName(t.path)))
  for (const t of tokens) {
    const name = SEMANTIC_NAMES.get(t.path.join('.'))
    if (!name) continue
    // The brand colour is itself a primitive (`primary/base`), so its light value points there.
    const own = name === 'primary/default' ? t.path : undefined
    const source = mode === 'dark' ? t.dark : { value: t.value, alias: t.alias || own }
    if (!source) continue
    const hex = String(source.value).toLowerCase()
    // The primitive the colour comes from: an aliased token, else base/white or
    // base/black, else none (the colour is written as a literal).
    let target = source.alias ? primitiveName(source.alias) : null
    if (target && !present.has(target)) target = null
    if (!target && hex === WHITE) target = 'base/white'
    if (!target && hex === BLACK) target = 'base/black'
    const leaf = colour(hex)
    if (target) leaf.$extensions = { [ALIAS_KEY]: { targetVariableSetName: SET_NAME, targetVariableName: target } }
    put(doc, name, leaf)
  }
  return doc
}

/**
 * The three Figma variable files for a design: [{ name, text }].
 * Import 1-primitives into one collection, then both semantic files into a second
 * collection (one mode each).
 */
export function figmaTokenFiles(design) {
  const tokens = designTokens(design)
  return [
    { name: '1-primitives.tokens.json', text: json(primitives(tokens)) },
    { name: '2-semantic.light.tokens.json', text: json(semantic(tokens, 'light')) },
    { name: '2-semantic.dark.tokens.json', text: json(semantic(tokens, 'dark')) },
  ]
}
