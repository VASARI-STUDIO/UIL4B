// Tailwind v4 theme: the design tokens as a CSS-first `@theme` file.
//
// Reads the same token list as the CSS and JSON exports (designTokens), so a name
// that is in both is the same token with the same value. Each token maps to the
// Tailwind v4 theme namespace that makes it a utility:
//   color.*            --color-*            bg-primary, text-primary, border-primary
//   font.heading/body  --font-*             font-heading, font-body
//   font.size.<step>   --text-<step>        text-heading-1, with its --line-height,
//                                           --letter-spacing and --font-weight
//   line-height.*      --leading-*          leading-heading
//   letter-spacing.*   --tracking-*         tracking-heading
// Left out on purpose: font weights (set per text size above, and `--font-weight-*`
// would make a second `font-heading` utility), the type ratio, the gradient, and
// the base size (Tailwind's `text-base` stays its own).
//
// Values are literal: hex colours in lower case, sizes in rem against a 16px root
// (the px value in a trailing comment). The file is standalone, so it needs no
// other stylesheet to resolve.
//
// Pure function over a plain design object.

import { designTokens } from './designTokens.js'
import { SITE_ORIGIN } from './routeMeta.js'

const rem = (px) => `${Number((px / 16).toFixed(5))}rem`
const name = (path) => path.filter((p) => p !== '$root').join('-')
// Steps set in the heading face and weight; the rest use the body's.
const HEADING_STEPS = new Set(['display', 'heading-1', 'heading-2', 'heading-3', 'lead'])

/** The theme variables, in file order: [[name, value, comment?]]. */
export function tailwindVars(design) {
  const tokens = designTokens(design)
  const one = (p) => tokens.find((t) => t.path.join('.') === p)?.value
  const out = []
  for (const t of tokens) {
    const [group, ...rest] = t.path
    if (group === 'color') out.push([`--color-${name(rest)}`, String(t.value).toLowerCase()])
    else if (group === 'font' && t.type === 'fontFamily') {
      out.push([`--font-${rest[0]}`, t.value.map((f, i) => (i === 0 ? `"${String(f).replace(/["\\]/g, '')}"` : f)).join(', ')])
    } else if (group === 'font' && rest[0] === 'size' && rest[1] !== 'base') {
      const step = rest[1]
      const kind = HEADING_STEPS.has(step) ? 'heading' : 'body'
      out.push([`--text-${step}`, rem(t.value.value), `${t.value.value}px`])
      out.push([`--text-${step}--line-height`, String(one(`line-height.${kind}`))])
      out.push([`--text-${step}--letter-spacing`, `${one(`letter-spacing.${kind}`)}em`])
      out.push([`--text-${step}--font-weight`, String(one(`font.weight.${kind}`))])
    } else if (group === 'line-height') out.push([`--leading-${rest[0]}`, String(t.value)])
    else if (group === 'letter-spacing') out.push([`--tracking-${rest[0]}`, `${t.value}em`])
  }
  return out
}

/** The utilities a variable makes, for the file's own documentation and the tests. */
export function utilityFor(varName) {
  const m = /^--(color|font|text|leading|tracking)-(.+)$/.exec(varName)
  if (!m || m[2].includes('--')) return null
  const [, ns, key] = m
  return { color: `bg-${key}`, font: `font-${key}`, text: `text-${key}`, leading: `leading-${key}`, tracking: `tracking-${key}` }[ns]
}

/**
 * The theme as a stylesheet. `watermark` adds the free-tier credit as the last line.
 * Import it after Tailwind: `@import "tailwindcss"; @import "./tailwind.css";`.
 */
export function buildTailwindCss(design, { projectName = 'Design System', watermark = true, date = new Date() } = {}) {
  const safe = String(projectName ?? '').replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ')
  const lines = [
    '/*',
    ` * ${safe}: Tailwind v4 theme`,
    ` * Generated ${date.toISOString().slice(0, 10)}.`,
    ' *',
    ' * Use after the Tailwind import:  @import "tailwindcss";  @import "./tailwind.css";',
    ' * Colours are utilities (bg-primary, text-on-surface); sizes are text-<step>.',
    ' * To drop Tailwind\'s own palette, add  --color-*: initial;  at the top of @theme.',
    ' * Sizes are rem against a 16px root, with the px value beside each.',
    ' */',
    '@theme {',
  ]
  for (const [n, v, note] of tailwindVars(design)) lines.push(`  ${n}: ${v};${note ? ` /* ${note} */` : ''}`)
  lines.push('}')
  if (watermark) lines.push('', `/* Made with UIL4B: ${SITE_ORIGIN} */`)
  return `${lines.join('\n')}\n`
}
