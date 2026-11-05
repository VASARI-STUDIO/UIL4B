// The mono voice is retired from UI words (design 2026-10-29, "mono-retire").
// Geist (var(--font)) sets every word of UI. Geist Mono (var(--mono)) sets only
// text the user reads or copies AS CODE: code, hex and colour values, token and
// package names, IDs, routes, keyboard keys, and the CSS-value columns a tool
// outputs.
//
// This test reads every stylesheet under src/styles and fails when var(--mono)
// appears in a rule whose selector is not on the list below. It exists because
// the voice came back once already: a new rule copies a neighbour, the
// neighbour is mono, and nothing in the build says so.
//
// TO ADD MONO to a selector: it has to be code (hex, code, kbd, token, value,
// glyph). Add the selector below with that one-word reason, in the same commit.
// TO REMOVE a selector: delete its line. A line whose selector no longer uses
// mono fails the "stale" check, so the list can only shrink as slices land.
//
// Reasons:
//   hex    a colour value (#rrggbb, rgb(), a hex input or chip)
//   code   code, markup, JSON, a CSS value pasted or shown as code, a file format token
//   kbd    a keyboard key
//   token  a design-token, package, storage-key, file, route or ID name
//   value  a measured number or CSS-value column (px, ratio, bytes, dates)
//   glyph  a symbol drawn from the mono face for its metrics
//   debt   still mono and probably should not be. Each one is a selector a later
//          slice has to move to Geist, then delete from this list.
//
// Scope: CSS rules only. Inline styles in JSX (fontFamily: 'var(--mono)') are
// not read here.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const STYLES = path.join(ROOT, 'src', 'styles')

const REASONS = new Set(['hex', 'code', 'kbd', 'token', 'value', 'glyph', 'debt'])

const ALLOWED = {
  // deferred/admin.css
  '.adm .mono': 'code',
  '.adm-bar-value': 'value',
  '.adm-copy-value': 'token',
  '.adm-country-chip > span:last-child': 'value',
  '.adm-donut-count': 'value',
  '.adm-flag-cell': 'value',
  '.adm-lock .mono': 'code',
  '.adm-plan-interval': 'value',
  '.adm-stat-value': 'value',
  '.adm-stripe-env': 'token',
  '.adm-stripe-input input': 'code',
  '.adm-stripe-na': 'value',
  '.adm-tab-badge': 'debt',
  '.adm-user-count': 'value',
  '.adm-user-view-n': 'value',
  '.adm-users-table td[data-label="Joined"]': 'value',
  '.adm-users-table td[data-label="Last seen"]': 'value',
  // deferred/colour.css
  '.plb-picker-hex': 'hex',
  '.plb-tint-hex': 'hex',
  // deferred/library.css
  '.icust-code-box code': 'code',
  '.icust-paste-help code': 'code',
  '.icust-paste-input': 'code',
  '.ig-attrib code': 'code',
  '.pl-modal-prompt pre': 'code',
  // deferred/overlay.css
  '.cp-kbd': 'kbd',
  // deferred/reading.css
  '.nf .nf-path': 'token',
  '.smap-link-route': 'token',
  // deferred/tool-shell.css
  '.aipg-json': 'code',
  '.uis-cell-hex': 'hex',
  '.uis-detail-ident strong': 'token',
  '.uis-editor-result>input': 'code',
  '.uis-evidence dd': 'value',
  '.uis-role-map dd': 'token',
  '.uis-seed-hex': 'hex',
  // global.css
  '.adm-list-name.mono': 'code',
  '.adm-table .mono': 'code',
  '.code': 'code',
  '.cpk-hex': 'hex',
  '.fb-cap-value': 'value',
  '.fnote-todo-where code': 'code',
  '.hcmd-kbd kbd': 'kbd',
  '.ic span:not(:where(.ig-chip))': 'debt',
  '.pgal-hex': 'hex',
  '.pl-card-preview-text': 'debt',
  '.pnav-prev-chip': 'debt',
  '.pnav-prev-eyebrow': 'debt',
  '.pnav-prev-foot': 'debt',
  '.pnav-prev-meta': 'debt',
  '.pnav-search-kbd': 'kbd',
  '.storage-table .storage-key': 'token',
  '.tint-info .hex': 'hex',
  '.ui-pro-proof-cap code': 'code',
  '.ui-pro-rail-seed': 'hex',
  '.ui-pro-sub code': 'code',
  // pages/alt-text.css
  '.alt-page .alt-row-deco-alt code': 'code',
  '.alt-page .alt-row-size': 'value',
  '.alt-page .alt-tips code': 'code',
  // pages/aspect-ratio.css
  '.arc-page input[type="number"]': 'value',
  // pages/auth-page.css
  '.aw-code': 'code',
  '.aw-meta': 'debt',
  '.aw-step': 'debt',
  // pages/brand-starter.css
  '.bs-page .bs-ladder-px': 'value',
  '.bs-page .bs-sample-hex': 'hex',
  '.bs-page .bs-swatch-hex': 'hex',
  // pages/button-library.css
  '.blib-page .blib-note code': 'code',
  '.blib-page .blib-pre': 'code',
  // pages/checkout.css
  '.checkout-page .checkout-error code': 'code',
  '.checkout-page .checkout-return-ref-code': 'code',
  // pages/contrast.css
  '.cc .cc-hex-input': 'hex',
  // pages/credits.css
  '.crd-foot code': 'code',
  '.crd-more summary code': 'code',
  '.crd-row--pkg .crd-row-name': 'token',
  '.crd-scope li': 'debt',
  '.crd-tally b': 'value',
  // pages/export-dialog.css
  '.xd-man-n': 'value',
  // pages/export-preview.css
  '.xfp-code': 'code',
  '.xfp-file': 'token',
  // pages/file-converter.css
  '.fc .fc-field--num': 'value',
  '.fc .fc-status-bytes': 'value',
  // pages/font-gallery.css
  '.fg-page .fg-size-v': 'value',
  // pages/from-image-dialog.css
  '.plb-imgsel-hex': 'hex',
  '.plb-imgslot-hex': 'hex',
  '.plb-loupe-hex': 'hex',
  // pages/gradient.css
  '.grd .grd-angle-input': 'value',
  '.grd .grd-code-text': 'code',
  '.grd .grd-ctx-ratio': 'value',
  '.grd .grd-gen-hex': 'hex',
  '.grd .grd-handle-val': 'value',
  '.grd .grd-hex': 'hex',
  '.grd .grd-stop-hex': 'hex',
  '.grd-tintmenu-hex': 'hex',
  '.grd-tintmenu-label': 'debt',
  // pages/help-router.css
  '.hlr-allow output': 'value',
  '.hlr-ladder span': 'debt',
  '.hlr-read b': 'value',
  '.hlr-seed-hex': 'hex',
  // pages/help.css
  '.hlp-run-hex': 'hex',
  '.hlp-run-note code': 'code',
  '.hlp-run-stop-hex': 'hex',
  // pages/icon-emoji-library.css
  '.iel-page .emd-value': 'value',
  '.iel-page .icust-colour-help code': 'code',
  '.iel-page .icust-colour-value': 'value',
  '.iel-page .icust-mono': 'code',
  '.iel-page .icust-size-input': 'value',
  '.iel-page .icust-size-num': 'value',
  '.iel-page .icust-size-px': 'value',
  // pages/info.css
  '.ic-acc-body-inner kbd': 'kbd',
  // pages/learn-article.css
  '.lart .lart-face-role code': 'code',
  '.lart .lart-formula code': 'code',
  '.lart .lart-hex': 'hex',
  '.lart .lart-ladder-name': 'debt',
  '.lart .lart-ladder-nums': 'value',
  '.lart .lart-prose code': 'code',
  '.lart .lart-table-cap code': 'code',
  // pages/legal.css
  '.lgl .lgl-p .storage-key': 'token',
  // pages/model-converter.css
  '.v3d .v3d-busy-bytes': 'value',
  '.v3d .v3d-facts dd': 'value',
  '.v3d .v3d-result-size': 'value',
  // pages/palette-builder.css
  ':is(.plb, .tl-sheet-layer) .plb-seedchip-hex': 'hex',
  '.plb .plb-hex': 'hex',
  '.plb .plb-match-meta code': 'code',
  '.plb .plb-sw-hex': 'hex',
  '.plb .plb-val-v': 'value',
  // pages/palette-gallery.css
  '.lib-surface.pgl-page .pgal-chip': 'hex',
  // pages/palette-preview-dialog.css
  '.pvd-chip-hex': 'hex',
  // pages/principles.css
  '.prn-cap code': 'code',
  '.prn-cx-role b': 'debt',
  '.prn-th-hex': 'hex',
  '.prn-th-token': 'token',
  '.prn-ty-name': 'token',
  '.prn-ty-px': 'value',
  // pages/projects.css
  '.uh .uh-export-type': 'debt',
  // pages/semantic-color.css
  '.stc .stc-fam-token': 'token',
  '.stc .stc-hue-hex': 'hex',
  '.stc .stc-lead code': 'code',
  // pages/seo-inspector.css
  '.seo-page .seo-social-img span': 'debt',
  '.seo-page .seo-tags-code': 'code',
  '.seo-page .seo-tags-note code': 'code',
  // pages/settings.css
  '.stg .lang-tile-code': 'code',
  // pages/spectrum-mobile.css
  '.spm .spm-ic-fmt': 'debt',
  '.spm .spm-pb-add': 'debt',
  '.spm .spm-pb-adjlabel': 'debt',
  '.spm .spm-pb-hex': 'hex',
  '.spm .spm-pb-role': 'debt',
  '.spm .spm-pb-rowhex': 'hex',
  '.spm .spm-pb-slabel': 'debt',
  '.spm .spm-pb-sval': 'debt',
  '.spm .spm-pb-syslabel': 'debt',
  '.spm .spm-pb-tools': 'debt',
  '.spm .spm-pj-eyebrow': 'debt',
  '.spm .spm-pj-size': 'debt',
  '.spm .spm-pj-type': 'debt',
  '.spm .spm-round--me': 'debt',
  '.spm .spm-status': 'debt',
  // pages/spectrum-tools.css
  '.spt .spt-art .spt-alt-l': 'code',
  '.spt .spt-art .spt-alt-s': 'code',
  // pages/spectrum.css
  '.sp-ex-filebar b': 'token',
  '.sp-ex-filebar small': 'token',
  '.sp-ico-peek': 'debt',
  '.sp-search .hcmd-kbd kbd': 'kbd',
  '.sp-search .hcmd-prompt::after': 'glyph',
  // pages/surface.css
  '.srf .scp-type-mono': 'code',
  // pages/tint.css
  '.tt .tt-hex-input': 'hex',
  '.tt .tt-note-hex': 'hex',
  '.tt .tt-tip-head': 'debt',
  '.tt .tt-tip-ratio': 'value',
  // pages/tool-layout.css
  ':is(.tl, .tl-sheet-layer) .tl-code': 'code',
  ':is(.tl, .tl-sheet-layer) .tl-kbd': 'kbd',
  ':is(.tl, .tl-sheet-layer) .tl-pill--mono': 'code',
  // pages/type-scale.css
  '.tsc-page .tsc-row-name': 'token',
  '.tsc-page .tsc-row-num': 'value',
}

// var(--mono) and var(--mono, fallback), but not var(--mono-ink) or var(--mono-glow).
const MONO = /var\(\s*--mono\s*[,)]/g

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

// Every style rule as { selector, body }. Descends into @media, @supports,
// @container, @layer and @scope; skips @font-face, @keyframes and friends.
function rulesOf(css) {
  const out = []
  const walk = (start, end) => {
    let i = start
    while (i < end) {
      let j = i
      let quote = null
      while (j < end) {
        const c = css[j]
        if (quote) { if (c === '\\') j++; else if (c === quote) quote = null }
        else if (c === '"' || c === "'") quote = c
        else if (c === '{' || c === ';' || c === '}') break
        j++
      }
      const prelude = css.slice(i, j).trim()
      if (j >= end || css[j] !== '{') { i = j + 1; continue }
      let depth = 1
      let k = j + 1
      quote = null
      while (k < end && depth) {
        const c = css[k]
        if (quote) { if (c === '\\') k++; else if (c === quote) quote = null }
        else if (c === '"' || c === "'") quote = c
        else if (c === '{') depth++
        else if (c === '}') depth--
        k++
      }
      if (prelude.startsWith('@')) {
        if (/^@(media|supports|container|layer|scope)\b/.test(prelude)) walk(j + 1, k - 1)
      } else {
        out.push({ selector: prelude, body: css.slice(j + 1, k - 1) })
      }
      i = k
    }
  }
  walk(0, css.length)
  return out
}

// "a, :is(b, c) d" -> ["a", ":is(b, c) d"]: split on top-level commas only.
function selectorsOf(prelude) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const c of prelude) {
    if (c === '(' || c === '[') depth++
    if (c === ')' || c === ']') depth--
    if (c === ',' && depth === 0) { parts.push(cur); cur = '' } else cur += c
  }
  parts.push(cur)
  return parts.map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean)
}

function cssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? cssFiles(p) : p.endsWith('.css') ? [p] : []
  })
}

// selector -> files that give it a mono declaration; plus a count of mono
// mentions outside any style rule, which has to be zero or the parser missed one.
function scan() {
  const used = new Map()
  let seen = 0
  let inRules = 0
  for (const file of cssFiles(STYLES)) {
    const rel = path.relative(STYLES, file).replace(/\\/g, '/')
    const css = stripComments(fs.readFileSync(file, 'utf8'))
    // @font-face holds names, not var(), so it never matches.
    seen += (css.replace(/@font-face\s*\{[^}]*\}/g, '').match(MONO) || []).length
    for (const { selector, body } of rulesOf(css)) {
      const n = (body.match(MONO) || []).length
      if (!n) continue
      inRules += n
      for (const s of selectorsOf(selector)) {
        if (!used.has(s)) used.set(s, new Set())
        used.get(s).add(rel)
      }
    }
  }
  return { used, seen, inRules }
}

const { used, seen, inRules } = scan()

test('the scan finds every var(--mono) in a style rule', () => {
  assert.ok(inRules > 100, `expected well over 100 mono declarations, found ${inRules}: is src/styles being read?`)
  assert.equal(inRules, seen, 'a mono declaration sits somewhere the rule scanner does not reach (a nested block or an unknown at-rule)')
})

test('every allowlisted selector has a known one-word reason', () => {
  const bad = Object.entries(ALLOWED).filter(([, r]) => !REASONS.has(r)).map(([s, r]) => `${s} -> ${r}`)
  assert.deepEqual(bad, [], 'unknown reason; use one of: ' + [...REASONS].join(', '))
})

test('var(--mono) appears only on allowlisted selectors', () => {
  const offenders = [...used]
    .filter(([selector]) => !(selector in ALLOWED))
    .map(([selector, files]) => `  ${selector}   (${[...files].join(', ')})`)
  assert.deepEqual(
    offenders,
    [],
    'These selectors use var(--mono) but are not code. Use var(--font) (see the four roles in the mono-retire design), ' +
      'or, if the text really is code, add the selector to ALLOWED in this file with a reason:\n' + offenders.join('\n'),
  )
})

test('no allowlisted selector is stale', () => {
  const stale = Object.keys(ALLOWED).filter((selector) => !used.has(selector))
  assert.deepEqual(stale, [], 'These selectors no longer use var(--mono). Delete them from ALLOWED so the list shrinks:\n  ' + stale.join('\n  '))
})
