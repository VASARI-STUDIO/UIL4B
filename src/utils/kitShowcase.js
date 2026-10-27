// The Showcase layout's markup pieces: the user's typefaces as specimens, the type
// scale as a waterfall, the colours as weighted stripes and the tokens as a code
// band, built from the record kitSelections returns and the token map. Pure: the
// helpers it needs (escaping, the ink picker, the contrast function) arrive as
// arguments, so this file imports nothing from uiKitExport.js.
//
// The template (src/templates/kit/showcase.html) owns the structure, the copy and
// the styling; this file only turns data into the pieces it places.

import { fitTitle, clampTitle, specimenScale, safeHex } from './exportTemplates/shared.js'
import { isNeutral } from './exportTemplates/roles.js'

// The family name on the cover, in its own face: two lines at most, measured at a
// 1200 px field. The template scales the size with the screen, so the break holds.
const COVER_FIT = Object.freeze({ maxLines: 2, steps: [160, 120, 88], measure: 1200 })
// The body face's name above its sample, and the name in the heading band.
const BODY_NAME_FIT = Object.freeze({ maxLines: 2, steps: [96, 72, 56], measure: 1200 })
const SAMPLE_FIT = Object.freeze({ maxLines: 3, steps: [128, 96, 72, 56], measure: 1200 })

// The waterfall's room on a printed page, in mm: the table's height budget, the
// specimen column's width, a row's padding and its four-line label.
const SCALE_FIT = Object.freeze({ roomMm: 170, widthMm: 100, padMm: 6, textMm: 14 })
// The most of a name a waterfall row sets: a longer one is cut at a whole word.
const STEP_CHARS = 24

// Stripe heights in units: the primary, a brand colour, a neutral. If the page
// cannot give every stripe 9 mm at these, the weights close up (still in order).
const WEIGHTS = Object.freeze([3, 2, 1])
const TIGHT_WEIGHTS = Object.freeze([2.5, 1.5, 1])
const STRIPE_ROOM_MM = 200
const STRIPE_MIN_MM = 9
const STRIPE_MAX_MM = 14

// A colour this close to the canvas gets a hairline so the stripe holds its edge.
const PALE_RATIO = 1.5

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** `text` cut at a whole word to at most `max` characters, with a closing ellipsis. */
export function cutWords(text, max) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const words = t.split(' ')
  let out = ''
  for (const w of words) {
    const next = out ? `${out} ${w}` : w
    if (next.length > max - 1) break
    out = next
  }
  return `${(out || words[0]).replace(/[\s,;:.\-]+$/, '')}…`
}

// The body sample's size by its length, so a long description sets smaller.
const sampleSize = (text) => (text.length <= 90 ? 40 : text.length <= 180 ? 32 : text.length <= 320 ? 26 : 22)

/**
 * @param sel   kitSelections(...)
 * @param h     { tokens, esc, on, g, contrast, grade, roles, date, tokenCount, embedded, chrome }
 *   tokens      the template token map (kitTemplateTokens)
 *   on          the ink to set on a fill
 *   g           number formatter (six significant digits)
 *   contrast    (hexA, hexB) → ratio
 *   grade       ratio → 'AAA' | 'AA' | 'AA large' | 'Fails AA'
 *   roles       [[name, tokenKey, use]] the interface colour roles
 *   tokenCount  tokens in the CSS and JSON downloads
 *   embedded    { family: licence name } for each selected family that is embedded
 *   chrome      the publisher faces this layout loads
 * @returns {Object<string,string>} the template's placeholders, without the @@
 */
export function showcaseParts(sel, h) {
  const { tokens, esc, on, g, contrast, grade, roles, date, tokenCount, embedded = {}, chrome = [] } = h
  const hex = (v) => safeHex(v, '#000000')
  const iso = date.toISOString().slice(0, 10)
  const title = sel.title
  const display = sel.fonts.display
  const body = sel.fonts.body
  const canvas = hex(tokens['color-background'])
  const copy = (value, label, text = value) => `<button class="cv" data-copy="${esc(value)}" aria-label="Copy ${esc(label)}"><code>${esc(text)}</code></button>`
  const licenceOf = (family) => (embedded[family] ? `${embedded[family]}. Included in this file.` : 'Not included in this file.')
  const families = new Set([display.name, body.name])

  // ── Cover: the heading face's name in that face, then one accent rule ─────
  const coverFit = fitTitle(display.name, COVER_FIT)
  const coverFamily = coverFit.clamp ? clampTitle(display.name, coverFit.size, COVER_FIT) : display.name
  // The rule is the accent where it shows against the canvas; a pale accent
  // would lose the one moment, so the primary draws it instead.
  const rule = contrast(hex(tokens['color-accent']), canvas) >= 3 ? 'var(--color-accent)' : 'var(--color-primary)'
  const facts = [
    plural(families.size, 'typeface'),
    plural(sel.colours.length, 'colour'),
    plural(tokenCount, 'token'),
    `Issued ${iso}`,
  ].join(' · ')

  // ── Heading band: the project's name ──────────────────────────────────────
  const nameFit = fitTitle(title, SAMPLE_FIT)
  const headSample = nameFit.clamp ? clampTitle(title, nameFit.size, SAMPLE_FIT) : title

  // ── Body band: the identity description, else the palette's names ─────────
  const palette = sel.colours.map((c) => `${c.name} ${hex(c.hex)}`)
  const description = String(sel.personalisation?.description || '').trim()
  const bodySample = description || `${palette.join(', ')}.`
  const bodyFit = fitTitle(body.name, BODY_NAME_FIT)
  const bodyName = bodyFit.clamp ? clampTitle(body.name, bodyFit.size, BODY_NAME_FIT) : body.name
  const cut = sel.colourCount > sel.colours.length
  const sampleNote = description
    ? ''
    : cut
      ? `The first ${sel.colours.length} of ${sel.colourCount} colours are named here. All ${sel.colourCount} are in the CSS and JSON downloads.`
      : 'Your colours, named and written as values.'

  // ── The type scale: the six largest steps, largest first ──────────────────
  const steps = [...sel.typeScale].sort((a, b) => b.size - a.size).slice(0, 6)
  const stepSample = (t) => (t.font === 'display'
    ? cutWords(title, STEP_CHARS)
    : cutWords(description || palette.slice(0, 3).join(', '), 60))
  const { k, label: specimenHead } = specimenScale(steps.map((t) => ({ name: stepSample(t), px: t.size })), SCALE_FIT)
  const scaleRows = steps.map((t) => {
    const key = t.name.toLowerCase().replace(/ /g, '-')
    const family = sel.fonts[t.font].name
    const leading = g(Math.round(t.size * t.line * 10) / 10)
    return `<tr><th scope="row"><span class="nm"><b>${esc(t.name)}</b><small>${esc(family)}</small></span></th><td class="vals">${copy(`var(--text-${key})`, `${t.name} size`, `${g(t.size)} px / ${g(t.line)} / ${t.weight}`)}<small>Size, line height, weight</small><small class="var">--text-${key}</small><small>${leading} px line</small></td><td class="spec"><p style="--s:${g(t.size)};line-height:${t.line};font-family:var(--font-${t.font});font-weight:${t.weight}">${esc(stepSample(t))}</p></td></tr>`
  }).join('')
  const scaleTable = `<thead><tr><th scope="col">Step</th><th scope="col">Values</th><th scope="col">${esc(specimenHead)}</th></tr></thead><tbody>${scaleRows}</tbody>`

  // ── Colour: stripes weighted by how much room the colour should have ──────
  const weightsFor = (set) => sel.colours.map((c, i) => (i === 0 ? set[0] : isNeutral(c.hex) ? set[2] : set[1]))
  let weights = weightsFor(WEIGHTS)
  let units = weights.reduce((sum, w) => sum + w, 0)
  if (units * STRIPE_MIN_MM > STRIPE_ROOM_MM) {
    weights = weightsFor(TIGHT_WEIGHTS)
    units = weights.reduce((sum, w) => sum + w, 0)
  }
  const unitMm = Math.round(Math.min(STRIPE_MAX_MM, STRIPE_ROOM_MM / Math.max(units, 1)) * 10) / 10
  const stripes = sel.colours.map((c, i) => {
    const v = hex(c.hex)
    const ink = on(v)
    const pale = contrast(v, canvas) < PALE_RATIO
    return `<li><button class="stripe${pale ? ' pale' : ''}" style="--w:${weights[i]};background:${v};color:${ink}" data-copy="${v}"><span class="s-name"><span class="sr-only">Copy </span><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span><code>${v}</code><span class="s-lands"><small>Where it lands</small>${esc(capital(c.lands))}</span><span class="s-grade"><small>As text on the canvas</small><b>${c.onCanvas.toFixed(2)}:1</b> ${grade(c.onCanvas)}</span></button></li>`
  }).join('')
  const colourNote = cut
    ? `The first ${sel.colours.length} of ${sel.colourCount} colours are shown. All ${sel.colourCount} are in the CSS and JSON downloads.`
    : `${plural(sel.colours.length, 'colour')}. A taller stripe is a colour you will use more. Select a stripe to copy its hex.`

  // ── States: the semantic colours, each graded in words ────────────────────
  const stateRows = sel.semantic.map((s) => {
    const ratio = contrast(s.hex, s.background)
    return `<tr><th scope="row"><span class="nm"><b>${esc(s.name)}</b><small>${esc(s.guidance)}</small></span></th><td>${copy(s.hex, `${s.name} colour`)}</td><td>${copy(s.background, `${s.name} background`)}</td><td class="ct${ratio < 4.5 ? ' weak' : ''}"><b>${ratio.toFixed(2)}:1</b><small>${grade(ratio)}</small></td><td class="samples"><span class="smp" style="color:${hex(s.hex)};background:${hex(s.background)}">${esc(s.message)}</span></td></tr>`
  }).join('')

  // ── Tokens: the declarations an engineer pastes, by group ─────────────────
  const seen = new Set()
  const line = (name, value) => {
    if (seen.has(name)) return ''
    seen.add(name)
    const text = `--${name}: ${value};`
    return `<li><button class="tk" data-copy="${esc(text)}" aria-label="Copy ${esc(`--${name}`)}"><code><span class="k">--${esc(name)}</span>: ${esc(value)};</code></button></li>`
  }
  const group = (name, rows) => `<div class="tk-group"><h3>${name}</h3><ul>${rows.join('')}</ul></div>`
  const colourLines = [
    ...sel.colours.map((c) => line(c.token.slice(2), hex(c.hex))),
    ...roles.map(([, key]) => line(key, hex(tokens[key]))),
    ...sel.semantic.flatMap((s) => [line(`color-${s.id}`, hex(s.hex)), line(`color-${s.id}-subtle`, hex(s.background))]),
  ]
  const typeLines = [
    line('font-display', tokens['font-display']),
    line('font-body', tokens['font-body']),
    ...sel.typeScale.flatMap((t) => {
      const key = t.name.toLowerCase().replace(/ /g, '-')
      return [line(`text-${key}`, tokens[`text-${key}`]), line(`leading-${key}`, tokens[`leading-${key}`]), line(`weight-${key}`, tokens[`weight-${key}`])]
    }),
  ]
  const spaceLines = sel.spacing.map((s) => line(`space-${s}`, `${s}px`))
  const shapeLines = [
    ...Object.entries(sel.radius).map(([name, v]) => line(`radius-${name}`, `${v}px`)),
    line('duration-fast', tokens['duration-fast']),
    line('ease-out', tokens['ease-out']),
  ]
  const tokenGroups = group('Colour', colourLines) + group('Type', typeLines) + group('Space', spaceLines) + group('Shape and motion', shapeLines)

  // ── Licences ──────────────────────────────────────────────────────────────
  const fontRows = [
    ['Headings', display.name],
    ['Body', body.name],
  ].filter(([, family], i, all) => all.findIndex(([, f]) => f === family) === i)
    .map(([role, family]) => `<tr><th scope="row">${esc(family)}</th><td>${role === 'Headings' && display.name === body.name ? 'Headings and body' : role}</td><td>${esc(licenceOf(family))}</td></tr>`)
    .concat([`<tr><th scope="row">Monospace</th><td>Token listing</td><td>Your system’s own face. Not included in this file.</td></tr>`])
    .concat(chrome.map((family) => `<tr><th scope="row">${esc(family)}</th><td>This document</td><td>SIL Open Font License. Included in this file.</td></tr>`))
    .join('')
  const docRows = [
    ['Name', title],
    ['Issued', iso],
  ].map(([k2, v]) => `<tr><th scope="row">${k2}</th><td class="long">${esc(v)}</td></tr>`).join('')

  return {
    COVER_FAMILY: esc(coverFamily),
    COVER_SIZE: String(coverFit.size),
    COVER_RULE: rule,
    COVER_NAME: esc(title),
    INDEX_NAME: esc(title),
    FACTS: esc(facts),
    HEAD_SAMPLE: esc(headSample),
    HEAD_SIZE: String(nameFit.size),
    HEAD_LICENCE: esc(licenceOf(display.name)),
    BODY_NAME: esc(bodyName),
    BODY_NAME_SIZE: String(bodyFit.size),
    BODY_SAMPLE: esc(bodySample),
    BODY_SIZE: String(sampleSize(bodySample)),
    BODY_LICENCE: esc(licenceOf(body.name)),
    SAMPLE_NOTE: esc(sampleNote),
    SCALE_TABLE: scaleTable,
    SCALE_K: String(k),
    STRIPES: stripes,
    STRIPE_UNIT: `${unitMm}mm`,
    COLOUR_NOTE: esc(colourNote),
    STATE_ROWS: stateRows,
    TOKEN_GROUPS: tokenGroups,
    TOKEN_TOTAL: esc(`The CSS and JSON downloads carry all ${tokenCount} tokens, including each colour’s tints.`),
    FONT_ROWS: fontRows,
    DOC_ROWS: docRows,
  }
}
