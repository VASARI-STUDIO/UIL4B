// The Manual layout's markup pieces: every value of the kit as a row of a ruled
// table, built from the record kitSelections returns and the token map. Pure:
// the helpers it needs (escaping, the ink picker, the contrast function) arrive
// as arguments, so this file imports nothing from uiKitExport.js.
//
// The template (src/templates/kit/manual.html) owns the structure, the copy and the
// styling; this file only turns data into the rows it places.

import { fitTitle, clampTitle, specimenScale, safeHex } from './exportTemplates/shared.js'

// The cover name: the user's heading face, at most two lines, measured at the
// field's width on a 1440 px screen.
const COVER_FIT = Object.freeze({ maxLines: 2, steps: [56, 40, 30], measure: 880 })

// The type table's room on a printed page, in mm: the table's height budget, the
// specimen column's width, a row's padding and its two-line row text.
const TYPE_FIT = Object.freeze({ roomMm: 140, widthMm: 80, padMm: 5, textMm: 7 })

// Foreground, background, label: the pairs an interface is built from.
const PAIRS = Object.freeze([
  ['Text on canvas', 'color-text', 'color-background'],
  ['Secondary text on canvas', 'color-text-muted', 'color-background'],
  ['Secondary text on surface', 'color-text-muted', 'color-surface'],
  ['Text on primary', 'color-on-primary', 'color-primary'],
  ['Text on accent', 'color-on-accent', 'color-accent'],
  ['Text on supporting colour', 'on-lilac', 'color-lilac'],
  ['Primary on canvas', 'color-primary', 'color-background'],
  ['Focus ring on canvas', 'color-focus', 'color-background'],
  ['Disabled text', 'color-disabled-text', 'color-disabled-background'],
])

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)

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
export function manualParts(sel, h) {
  const { tokens, esc, on, g, contrast, grade, roles, date, tokenCount, embedded = {}, chrome = [] } = h
  const hex = (v) => safeHex(v, '#000000')
  const iso = date.toISOString().slice(0, 10)
  const copy = (value, label, text = value) => `<button class="cv" data-copy="${esc(value)}" aria-label="Copy ${esc(label)}"><code>${esc(text)}</code></button>`
  const variable = (key, label) => copy(`var(--${key})`, `${label} CSS variable`, `--${key}`)
  const chip = (value) => `<i class="chip" style="background:${hex(value)}"></i>`
  // A ratio and its word, so a pass or a fail never rests on colour.
  const ratioCell = (ratio) => {
    const word = grade(ratio)
    return `<td class="ct${ratio < 4.5 ? ' weak' : ''}"><b>${ratio.toFixed(2)}:1</b><small>${word}</small></td>`
  }
  const families = new Set([sel.fonts.display.name, sel.fonts.body.name])

  // ── Cover ─────────────────────────────────────────────────────────────────
  const title = sel.title
  const fit = fitTitle(title, COVER_FIT)
  const coverTitle = fit.clamp ? clampTitle(title, fit.size, COVER_FIT) : title
  const facts = [
    plural(sel.colours.length, 'colour'),
    plural(families.size, 'family', 'families'),
    plural(tokenCount, 'token'),
    `Issued ${iso}`,
  ].join(' · ')

  // ── Colour: two rows per colour, so a colour never splits across a page ──
  const colourTable = sel.colours.map((c) => {
    const stops = Object.entries(c.scale).map(([stop, value]) => {
      const v = hex(value)
      return `<button class="stop" style="background:${v};color:${on(v)}" data-copy="${v}" aria-label="Copy ${esc(c.name)} ${stop}, ${v}"><span>${stop}${stop === '500' ? ' · Base' : ''}</span><code>${v}</code></button>`
    }).join('')
    return `<tbody class="colour"><tr><th scope="row">${chip(c.hex)}<span class="nm"><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span></th><td>${variable(c.token.slice(2), c.name)}</td><td>${copy(c.hex, `${c.name} hex`)}</td><td>${copy(c.oklch, `${c.name} OKLCH`)}</td>${ratioCell(c.onCanvas)}${ratioCell(c.onText)}<td class="lands">${esc(capital(c.lands))}</td></tr><tr class="ramp"><td colspan="7"><div class="stops" role="group" aria-label="${esc(c.name)} tints, 50 to 950">${stops}</div></td></tr></tbody>`
  }).join('')
  const cut = sel.colourCount > sel.colours.length
  const colourNote = cut
    ? `The first ${sel.colours.length} of ${sel.colourCount} colours are shown. All ${sel.colourCount} are in the CSS and JSON downloads.`
    : `${plural(sel.colours.length, 'colour')}, each with eleven tints. Select any value to copy it.`

  // ── Type ──────────────────────────────────────────────────────────────────
  const { k, label: specimenHead } = specimenScale(sel.typeScale.map((t) => ({ name: t.name, px: t.size })), TYPE_FIT)
  const typeRows = sel.typeScale.map((t) => {
    const key = t.name.toLowerCase().replace(/ /g, '-')
    const family = sel.fonts[t.font].name
    return `<tr><th scope="row"><span class="nm"><b>${esc(t.name)}</b><small>${esc(family)}</small></span></th><td>${copy(`var(--text-${key})`, `${t.name} size`, `${g(t.size / 16)}rem`)}<small>${g(t.size)} px</small></td><td>${copy(`var(--leading-${key})`, `${t.name} line height`, String(t.line))}<small>${g(Math.round(t.size * t.line * 10) / 10)} px</small></td><td>${copy(`var(--weight-${key})`, `${t.name} weight`, String(t.weight))}</td><td class="spec"><p style="font-size:${g(Math.round(t.size * k * 10) / 10)}px;line-height:${t.line};font-family:var(--font-${t.font});font-weight:${t.weight}">${esc(t.sample)}</p></td></tr>`
  }).join('')
  const typeTable = `<thead><tr><th scope="col">Step</th><th scope="col">Size</th><th scope="col">Line height</th><th scope="col">Weight</th><th scope="col">${esc(specimenHead)}</th></tr></thead><tbody>${typeRows}</tbody>`

  // ── Foundations ───────────────────────────────────────────────────────────
  const spaceRows = sel.spacing.map((s) => `<tr><th scope="row">${variable(`space-${s}`, `Space ${s}`)}</th><td><code>${s} px</code></td><td><code>${g(s / 16)} rem</code></td><td><i class="bar" style="width:${s}px"></i></td></tr>`).join('')
  const radiusRows = Object.entries(sel.radius).map(([name, v]) => `<tr><th scope="row">${variable(`radius-${name}`, `${capital(name)} radius`)}</th><td><code>${v} px</code></td><td>${capital(name === 'card' ? 'content' : 'controls')}</td><td><i class="corner" style="border-radius:${v}px"></i></td></tr>`).join('')
  const [x1, y1, x2, y2] = tokens['ease-out'].match(/-?[\d.]+/g).map(Number)
  const curve = `<svg class="curve" viewBox="-2 -2 52 36" aria-hidden="true"><path d="M0 32C${g(x1 * 48)} ${g(32 - y1 * 32)} ${g(x2 * 48)} ${g(32 - y2 * 32)} 48 0"/></svg>`
  const motionRows = `<tr><th scope="row">${variable('duration-fast', 'Fast duration')}</th><td><code>${tokens['duration-fast']}</code></td><td>Everyday feedback</td><td></td></tr><tr><th scope="row">${variable('ease-out', 'Ease out')}</th><td><code>${esc(tokens['ease-out'])}</code></td><td>A quick start and a gentle finish</td><td>${curve}</td></tr>`

  // ── Pairs, states and roles ───────────────────────────────────────────────
  const pairRows = PAIRS.map(([name, fg, bg]) => {
    const f = hex(tokens[fg])
    const b = hex(tokens[bg])
    const ratio = contrast(f, b)
    // Under 4.5:1 the pair is not offered for body text; under 3:1 it is not shown at all.
    const sample = ratio >= 4.5
      ? `<span class="smp" style="color:${f};background:${b}"><b>Aa</b> Body text</span>`
      : ratio >= 3
        ? `<span class="smp" style="color:${f};background:${b}"><b>Aa</b></span><small>Large text only</small>`
        : '<small>No sample: below 3:1</small>'
    return `<tr><th scope="row"><span class="nm"><b>${name}</b><small>${esc(`--${fg}`)} on ${esc(`--${bg}`)}</small></span></th><td><code>${f}</code></td><td><code>${b}</code></td>${ratioCell(ratio)}<td class="samples">${sample}</td></tr>`
  }).join('')

  const semanticRows = sel.semantic.map((s) => {
    const ratio = contrast(s.hex, s.background)
    return `<tr><th scope="row"><span class="nm"><b>${esc(s.name)}</b><small>${esc(s.guidance)}</small></span></th><td>${chip(s.hex)}${variable(`color-${s.id}`, s.name)}<small>${hex(s.hex)}</small></td><td>${chip(s.background)}${variable(`color-${s.id}-subtle`, `${s.name} background`)}<small>${hex(s.background)}</small></td>${ratioCell(ratio)}<td class="samples"><span class="smp" style="color:${hex(s.hex)};background:${hex(s.background)}">${esc(s.message)}</span></td></tr>`
  }).join('')

  const roleRows = roles.map(([name, key, use]) => `<tr><th scope="row">${chip(tokens[key])}<span class="nm"><b>${name}</b></span></th><td>${variable(key, name)}</td><td>${copy(tokens[key], `${name} value`)}</td><td>${use}</td></tr>`).join('')

  // ── Licences ──────────────────────────────────────────────────────────────
  const fontRows = [
    ['Headings', sel.fonts.display.name],
    ['Body', sel.fonts.body.name],
  ].filter(([, family], i, all) => all.findIndex(([, f]) => f === family) === i)
    .map(([role, family]) => `<tr><th scope="row">${esc(family)}</th><td>${role === 'Headings' && sel.fonts.display.name === sel.fonts.body.name ? 'Headings and body' : role}</td><td>${embedded[family] ? `${esc(embedded[family])}. Included in this file.` : 'Not included in this file.'}</td></tr>`)
    .concat(chrome.map((family) => `<tr><th scope="row">${esc(family)}</th><td>This document</td><td>SIL Open Font License. Included in this file.</td></tr>`))
    .join('')
  const docRows = [
    ['Name', title],
    ['Issued', iso],
  ].map(([k2, v]) => `<tr><th scope="row">${k2}</th><td class="long">${esc(v)}</td></tr>`).join('')

  return {
    COVER_TITLE: esc(coverTitle),
    COVER_SIZE: String(fit.size),
    INDEX_NAME: esc(title),
    FACTS: esc(facts),
    COLOUR_NOTE: esc(colourNote),
    COLOUR_TABLE: colourTable,
    TYPE_TABLE: typeTable,
    SPACE_ROWS: spaceRows,
    RADIUS_ROWS: radiusRows,
    MOTION_ROWS: motionRows,
    PAIR_ROWS: pairRows,
    SEMANTIC_ROWS: semanticRows,
    ROLE_ROWS: roleRows,
    FONT_ROWS: fontRows,
    DOC_ROWS: docRows,
  }
}
