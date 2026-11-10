// The mono voice is retired from UI words (design 2026-10-29, "mono-retire").
// Geist (var(--font)) sets every word of UI and every figure. Geist Mono
// (var(--mono)) sets only text the user reads or copies AS CODE: code, hex and
// colour values, token and package names, IDs, routes, keyboard keys, and the
// CSS-value columns a tool outputs (px and rem columns, type steps).
//
// This test reads every stylesheet under src/styles and fails when var(--mono)
// appears in a rule whose selector is not on the list below. It exists because
// the voice came back once already: a new rule copies a neighbour, the
// neighbour is mono, and nothing in the build says so.
//
// TO ADD MONO to a selector: it has to be code (hex, code, kbd, token, value,
// glyph). Add the selector below, under its file, with that one-word reason, in
// the same commit. An entry is a file plus a selector, so the same selector in
// another file does not pass. A plain figure (a count, a size in bytes, a ratio,
// a date) is not a value: it takes var(--font) with tabular-nums and
// letter-spacing 0.
// TO REMOVE a selector: delete its line. A line whose selector no longer uses
// mono fails the "stale" check, so the list can only shrink as slices land.
//
// Reasons:
//   hex    a colour value (#rrggbb, rgb(), a hex input or chip)
//   code   code, markup, JSON, a CSS value pasted or shown as code, a file format token
//   kbd    a keyboard key
//   token  a design-token, package, storage-key, file, route, env var or ID name
//   value  a CSS-value column a tool outputs as code: px and rem columns, type steps
//   glyph  a symbol drawn from the mono face for its metrics
//   kit    a picture of an exported kit (a miniature of the kit's own page). Left by decision.
//   ask    prompt text; waiting on Dylan's open decision 1 (the AI prompt text voice)
//   debt   still mono and probably should not be. Each one is a selector a later
//          slice has to move to Geist, then delete from this list. The count can
//          only fall: DEBT_MAX below is the ceiling, and a new debt entry fails.
//
// Also guarded here:
//   - a literal "Geist Mono" or monospace font written in a stylesheet anywhere
//     but the --mono token itself (LITERAL_MONO_OK lists the legitimate ones);
//   - var(--mono) written inline in JS/JSX (INLINE_MONO_OK is today's count per
//     file, so it only stops new ones).

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = path.join(ROOT, 'src')
const STYLES = path.join(SRC, 'styles')

const REASONS = new Set(['hex', 'code', 'kbd', 'token', 'value', 'glyph', 'kit', 'ask', 'debt'])

// The ceiling for 'debt' entries. Lower it when you delete one; never raise it.
const DEBT_MAX = 13

// Keyed by stylesheet path under src/styles, then selector.
const ALLOWED = {
  'deferred/admin.css': {
    '.adm .mono': 'code',
    '.adm-copy-value': 'token',
    '.adm-lock .mono': 'code',
    '.adm-stripe-env': 'token',
    '.adm-stripe-input input': 'code',
  },
  'deferred/colour.css': {
    '.plb-picker-hex': 'hex',
    '.plb-tint-hex': 'hex',
  },
  'deferred/library.css': {
    '.ig-attrib code': 'code',
    '.pl-modal-prompt pre': 'ask',
  },
  'deferred/overlay.css': {
    '.cp-kbd': 'kbd',
  },
  'deferred/reading.css': {
    '.nf .nf-path': 'token',
    '.smap-link-route': 'token',
  },
  'deferred/tool-shell.css': {
    '.aipg-json': 'code',
    '.uis-cell-hex': 'hex',
    '.uis-detail-ident strong': 'token',
    '.uis-editor-result>input': 'code',
    '.uis-role-map dd': 'token',
    '.uis-seed-hex': 'hex',
  },
  'global.css': {
    '.adm-list-name.mono': 'code',
    '.adm-table .mono': 'code',
    '.code': 'code',
    '.cpk-hex': 'hex',
    '.fnote-todo-where code': 'code',
    '.hcmd-kbd kbd': 'kbd',
    '.pgal-hex': 'hex',
    '.pl-card-preview-text': 'ask',
    '.pnav-prev-chip': 'kit',
    '.pnav-prev-eyebrow': 'kit',
    '.pnav-prev-foot': 'kit',
    '.pnav-prev-meta': 'kit',
    '.pnav-search-kbd': 'kbd',
    '.storage-table .storage-key': 'token',
    '.tint-info .hex': 'hex',
    '.ui-pro-proof-cap code': 'code',
    '.ui-pro-rail-seed': 'hex',
    '.ui-pro-sub code': 'code',
  },
  'pages/alt-text.css': {
    '.alt-page .alt-row-deco-alt code': 'code',
    '.alt-page .alt-tips code': 'code',
  },
  'pages/auth-page.css': {
    '.aw-code': 'code',
    '.aw-step': 'hex',
  },
  'pages/brand-starter.css': {
    '.bs-page .bs-ladder-px': 'value',
    '.bs-page .bs-sample-hex': 'hex',
    '.bs-page .bs-swatch-hex': 'hex',
  },
  'pages/button-library.css': {
    '.blib-page .blib-note code': 'code',
    '.blib-page .blib-pre': 'code',
  },
  'pages/checkout.css': {
    '.checkout-page .checkout-error code': 'code',
    '.checkout-page .checkout-return-ref-code': 'code',
  },
  'pages/contrast.css': {
    '.cc .cc-hex-input': 'hex',
  },
  'pages/credits.css': {
    '.crd-foot code': 'code',
    '.crd-more summary code': 'code',
    '.crd-row--pkg .crd-row-name': 'token',
  },
  'pages/export-dialog.css': {
    '.xd-man-n': 'token',
  },
  'pages/export-preview.css': {
    '.xfp-code': 'code',
    '.xfp-file': 'token',
  },
  'pages/font-detail.css': {
    '.fgd-code': 'code',
    '.fgd-spec .fgd-weight-tag strong': 'value',
    '.fgd-wpill': 'value',
  },
  'pages/font-pair-board.css': {
    ':is(.fpr-page, .fpr-sheet) .fpr-wmenu': 'value',
    ':is(.fpr-page, .fpr-sheet) .fpr-wopt': 'value',
    '.fpr-page .fpr-frow-w': 'value',
  },
  'pages/from-image-dialog.css': {
    '.plb-imgsel-hex': 'hex',
    '.plb-imgslot-hex': 'hex',
    '.plb-loupe-hex': 'hex',
  },
  'pages/gradient.css': {
    '.grd .grd-code-text': 'code',
    '.grd .grd-gen-hex': 'hex',
    '.grd .grd-hex': 'hex',
    '.grd .grd-stop-hex': 'hex',
    '.grd-tintmenu-hex': 'hex',
  },
  'pages/help-router.css': {
    '.hlr-seed-hex': 'hex',
  },
  'pages/help.css': {
    '.hlp-run-hex': 'hex',
    '.hlp-run-note code': 'code',
    '.hlp-run-stop-hex': 'hex',
  },
  // the homepage boards: hex, size, byte and file-name values
  'pages/home-bookmarks.css': {
    '.bm-mono': 'value',
    '.bmp-mono': 'value',
  },
  'pages/home-exports.css': {
    '.hx-mono': 'value',
  },
  'pages/home-try.css': {
    '.ht-cv-bytes': 'value',
    '.ht-cv-meta': 'value',
    '.ht-pal-hex': 'value',
    '.ht-val': 'value',
  },
  // The icon editor sets code in mono: the pasted SVG markup, inline <code>, the SVG code box and
  // the colour picker's hex field and the hex shown in the colour row. Its figures (.ied-num, the
  // stroke and size number fields) are not listed: a plain figure takes var(--font).
  'pages/icon-editor.css': {
    '.ied-hex': 'hex',
    '.ied-nm': 'code',
    '.ied-ta': 'code',
    '.ied-note code': 'code',
    '.ied-code pre': 'code',
    '.ied-cpop .cpk-hex': 'hex',
  },
  'pages/icon-emoji-library.css': {
    '.iel-page .emd-value': 'code',
  },
  'pages/info.css': {
    '.ic-acc-body-inner kbd': 'kbd',
  },
  'pages/learn-article.css': {
    '.lart .lart-face-role code': 'code',
    '.lart .lart-formula code': 'code',
    '.lart .lart-hex': 'hex',
    '.lart .lart-ladder-nums': 'value',
    '.lart .lart-prose code': 'code',
    '.lart .lart-table-cap code': 'code',
  },
  'pages/legal.css': {
    '.lgl .lgl-p .storage-key': 'token',
  },
  'pages/palette-builder.css': {
    '.plb .plb-hex': 'hex',
    '.plb .plb-match-meta code': 'code',
    '.plb .plb-sw-hex': 'hex',
    '.plb .plb-val-v': 'hex',
    ':is(.plb, .tl-sheet-layer) .plb-seedchip-hex': 'hex',
  },
  'pages/palette-gallery.css': {
    '.lib-surface.pgl-page .pgal-chip': 'hex',
  },
  'pages/palette-preview-dialog.css': {
    '.pvd-chip-hex': 'hex',
  },
  'pages/principles.css': {
    '.prn-cap code': 'code',
    '.prn-cx-role b': 'token',
    '.prn-th-hex': 'hex',
    '.prn-th-token': 'token',
    '.prn-ty-name': 'token',
    '.prn-ty-px': 'value',
  },
  'pages/projects.css': {
  },
  'pages/semantic-color.css': {
    '.stc .stc-fam-token': 'token',
    '.stc .stc-hue-hex': 'hex',
    '.stc .stc-lead code': 'code',
  },
  'pages/seo-inspector.css': {
    '.seo-page .seo-tags-code': 'code',
    '.seo-page .seo-tags-note code': 'code',
  },
  'pages/spectrum-chrome.css': {
    '.spnav-search kbd': 'kbd',
  },
  'pages/spectrum-mobile.css': {
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
  },
  'pages/spectrum-tools.css': {
    '.spt .spt-art .spt-alt-l': 'code',
    '.spt .spt-art .spt-alt-s': 'code',
  },
  'pages/spectrum.css': {
    '.sp-search .hcmd-kbd kbd': 'kbd',
    '.sp-search .hcmd-prompt::after': 'glyph',
  },
  'pages/surface.css': {
    '.srf .scp-type-mono': 'code',
  },
  'pages/tint.css': {
    '.tt .tt-hex-input': 'hex',
    '.tt .tt-note-hex': 'hex',
    '.tt .tt-tip-hex': 'hex',
  },
  'pages/tool-layout.css': {
    ':is(.tl, .tl-sheet-layer) .tl-code': 'code',
    ':is(.tl, .tl-sheet-layer) .tl-kbd': 'kbd',
  },
  'pages/type-scale-kerbside.css': {
    '.tsc-page .tsk-tag': 'value',
  },
  'pages/type-scale.css': {
    '.tsc-page .tsc-dock-ratio-v': 'value',
    '.tsc-page .tsc-ratio-v': 'value',
    '.tsc-page .tsc-fr-chip': 'value',
    '.tsc-page .tsc-fr-opt': 'value',
    '.tsc-page .tsc-range .snapv-value': 'value',
    '.tsc-page .tsc-range .snapv-input': 'value',
    '.tsc-page .tsc-chip-n': 'token',
    '.tsc-page .tsc-row-name': 'token',
    '.tsc-page .tsc-row-num': 'value',
    '.tsc-page .tsc-width-px': 'value',
  },
  'pages/type-tools-nav.css': {
    '.ttn-mono': 'value',
  },
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

// "file::selector" for every rule that gives a mono declaration; plus a count of
// mono mentions outside any style rule, which has to be zero or the parser missed one.
function scan() {
  const used = new Set()
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
      for (const s of selectorsOf(selector)) used.add(`${rel}::${s}`)
    }
  }
  return { used, seen, inRules }
}

const { used, seen, inRules } = scan()

// Flatten { file: { selector: reason } } to { 'file::selector': reason }.
const FLAT = Object.fromEntries(
  Object.entries(ALLOWED).flatMap(([file, sels]) => Object.entries(sels).map(([sel, reason]) => [`${file}::${sel}`, reason])),
)

test('the scan finds every var(--mono) in a style rule', () => {
  assert.ok(inRules > 100, `expected well over 100 mono declarations, found ${inRules}: is src/styles being read?`)
  assert.equal(inRules, seen, 'a mono declaration sits somewhere the rule scanner does not reach (a nested block or an unknown at-rule)')
})

test('every allowlisted selector has a known one-word reason', () => {
  const bad = Object.entries(FLAT).filter(([, r]) => !REASONS.has(r)).map(([s, r]) => `${s} -> ${r}`)
  assert.deepEqual(bad, [], 'unknown reason; use one of: ' + [...REASONS].join(', '))
})

test('var(--mono) appears only on allowlisted selectors, in the file the entry names', () => {
  const offenders = [...used].filter((key) => !(key in FLAT)).map((key) => `  ${key.replace('::', '   in   ')}`)
  assert.deepEqual(
    offenders,
    [],
    'These selectors use var(--mono) but are not code. Use var(--font) (see the four roles in the mono-retire design), ' +
      'or, if the text really is code, add the selector under its file in ALLOWED in this file with a reason:\n' + offenders.join('\n'),
  )
})

test('no allowlisted selector is stale', () => {
  const stale = Object.keys(FLAT).filter((key) => !used.has(key))
  assert.deepEqual(stale, [], 'These selectors no longer use var(--mono) in that file. Delete them from ALLOWED so the list shrinks:\n  ' + stale.join('\n  '))
})

test('the debt list can only fall', () => {
  const debt = Object.values(FLAT).filter((r) => r === 'debt').length
  assert.ok(
    debt <= DEBT_MAX,
    `${debt} entries are tagged 'debt', more than the ${DEBT_MAX} allowed. Move the new selector to var(--font), ` +
      `or give it a real reason (hex, code, kbd, token, value, glyph, kit, ask). Do not raise DEBT_MAX.`,
  )
})

// ── Literal mono faces in stylesheets ────────────────────────────────────────
// The --mono token is defined once (global.css :root). Writing "Geist Mono" or
// monospace again in a rule is the same defect as a hard-coded colour: it skips
// the token and the allowlist above. @font-face blocks and the --mono token
// definition are removed before the scan; a var(--mono, <fallback>) fallback is
// the allowlist's business (above), not this one.
//
// "file :: declaration" -> how many times it may appear.
const LITERAL_MONO_OK = {
  // The mega-menu "Font Pair" moment: the second word swaps to the mono face as
  // a picture of a font pairing. Rule and keyframe both name the face.
  'global.css :: font-family:"Geist Mono",monospace': 2,
}

const LITERAL_MONO = /([\w-]+)\s*:\s*([^;{}]*(?:Geist Mono|monospace)[^;{}]*)/gi

function literalMonoUses() {
  const found = new Map()
  for (const file of cssFiles(STYLES)) {
    const rel = path.relative(STYLES, file).replace(/\\/g, '/')
    const css = stripComments(fs.readFileSync(file, 'utf8'))
      .replace(/@font-face\s*\{[^}]*\}/g, '')
      .replace(/--mono\s*:[^;}]*/g, '')
      .replace(/var\(\s*--mono\s*,[^)]*\)/g, 'var(--mono)')
    for (const m of css.matchAll(LITERAL_MONO)) {
      const key = `${rel} :: ${m[1]}:${m[2]}`.replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').trim()
      found.set(key, (found.get(key) || 0) + 1)
    }
  }
  return found
}

test('no stylesheet writes a literal Geist Mono or monospace font outside the --mono token', () => {
  const found = literalMonoUses()
  const over = [...found]
    .filter(([key, n]) => n > (LITERAL_MONO_OK[key] || 0))
    .map(([key, n]) => `  ${key}   (x${n}, allowed ${LITERAL_MONO_OK[key] || 0})`)
  assert.deepEqual(
    over,
    [],
    'Write font-family: var(--mono) (and put the selector on ALLOWED above) instead of naming the face. ' +
      'If the literal is legitimate, add it to LITERAL_MONO_OK with a one-line reason:\n' + over.join('\n'),
  )
  const stale = Object.keys(LITERAL_MONO_OK).filter((key) => (found.get(key) || 0) < LITERAL_MONO_OK[key])
  assert.deepEqual(stale, [], 'These LITERAL_MONO_OK entries no longer appear that often. Lower or delete them:\n  ' + stale.join('\n  '))
})

// ── var(--mono) written inline in JS/JSX ─────────────────────────────────────
// Inline styles and generated CSS strings skip the allowlist above. This is
// today's count per file; it can only stop new ones, so lower a number when you
// remove one. src/pages/StyleGuide.jsx documents the token, which is why it
// carries the most.
const INLINE_MONO_OK = {
  'pages/Admin.jsx': 5,
  'pages/StyleGuide.jsx': 13,
  'pages/SurfaceIndex.jsx': 1,
  'utils/exportTemplates/book/monograph.js': 2,
  'utils/exportTemplates/book/specification.js': 14,
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(p)
    return /\.(jsx?|tsx?)$/.test(e.name) ? [p] : []
  })
}

test('var(--mono) is not newly written inline in JS or JSX', () => {
  const over = []
  for (const file of sourceFiles(SRC)) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/')
    const n = (fs.readFileSync(file, 'utf8').match(MONO) || []).length
    if (n > (INLINE_MONO_OK[rel] || 0)) over.push(`  ${rel}: ${n} (allowed ${INLINE_MONO_OK[rel] || 0})`)
  }
  assert.deepEqual(
    over,
    [],
    'New inline var(--mono). Put the style in a stylesheet rule so it goes through the allowlist above, or use var(--font):\n' + over.join('\n'),
  )
})
