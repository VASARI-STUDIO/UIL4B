// The themed style guide carries the fonts its CSS names, and a font the deploy lacks is a coded refusal, never a hollow document or a bare 500.
//
//  1. EVERY NAMED FONT IS THERE: for each theme with the `guide` row and a few brands (the sample, a bundled pair, a catalogue serif pair, a name the
//     catalogue does not know), every font family the CSS names has an @font-face, and each face's file is in the zip (html) or embedded as a
//     data: url (pdf). Break: drop a face from allFaces in engine/doc.js, or delete a font file the theme names from themes/../fonts/.
//  2. A MISSING FONT IS font_missing: a font read that fails while a guide page is drawn comes out of renderThemeExport as code 'font_missing'
//     (the route answers 422), not as a page "left out" that empties the document and ends as 500 build_failed.
//     Break: take the `font_missing` line out of leaveOut in api/_lib/exportThemeRoute.js.
// Test seam: renderThemeExport (api/_lib/exportThemeRoute.js). The missing-font test goes first: the engine caches a font once read.
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { renderThemeExport, loadEngine } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES, themeHasRow } from '../../src/data/exportThemes.js'

const THEMES = EXPORT_THEMES.map((t) => t.id).filter((id) => themeHasRow(id, 'guide'))
const palette = (colors) => ({ colors, base: colors[0], harmony: 'auto' })
const face = (family, weight, category) => ({ family, weight, category })
const TEAL = ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27']
const BRANDS = {
  sample: {},
  'bundled pair': { design: { palette: palette(TEAL), fonts: { heading: face('Barlow Condensed', 700, 'sans-serif'), body: face('Roboto', 400, 'sans-serif') } }, projectName: 'Tide & Co.' },
  'catalogue serif pair': { design: { palette: palette(TEAL), fonts: { heading: face('Playfair Display', 700, 'serif'), body: face('Lora', 400, 'serif') } }, projectName: 'Harbour Press' },
  'unknown family': { design: { palette: palette(TEAL), fonts: { heading: face('Nonesuch Display', 700, 'serif'), body: face('Nonesuch Text', 400, 'sans-serif') } }, projectName: 'Nonesuch' },
}
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+|inherit|initial|unset)$/

test('a font read that fails while a guide page is drawn is font_missing, not a page left out', async () => {
  const E0 = await loadEngine()
  const E = {
    ...E0,
    // once the context is built, the pages cannot read its roles: the stand-in for a font read that fails in a page
    makeCtx(...a) {
      const ctx = E0.makeCtx(...a)
      Object.defineProperty(ctx, 'roles', { get() { throw Object.assign(new Error('fontFile: no file X in fonts/'), { code: 'font_missing' }) }, configurable: true })
      return ctx
    },
  }
  for (const theme of THEMES) {
    for (const format of ['pdf', 'html', 'md']) {
      await assert.rejects(renderThemeExport({ theme, row: 'guide', format }, E), (e) => e.code === 'font_missing', `${theme} ${format}`)
    }
  }
})

// Every family a stylesheet names: font-family declarations, and custom properties that hold a font stack (they end in a generic family).
const named = (css) => {
  const out = new Set()
  for (const m of css.matchAll(/(?:font-family|--[\w-]+)\s*:\s*([^;}]+)/g)) {
    const parts = m[1].split(',').map((s) => s.trim())
    if (!parts.some((p) => GENERIC.test(p)) && !/^font-family/.test(m[0])) continue
    for (const p of parts) { const q = /^["']([^"']+)["']$/.exec(p); if (q) out.add(q[1]); else if (!GENERIC.test(p) && !p.startsWith('var(')) out.add(p) }
  }
  return out
}
const faces = (css) => [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => ({
  family: /font-family:\s*["']?([^;"']+)["']?/.exec(m[1])?.[1],
  src: /url\(\s*['"]?([^'")]+)/.exec(m[1])?.[1],
}))
const styleOf = (html) => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')

for (const theme of THEMES) {
  for (const [label, input] of Object.entries(BRANDS)) {
    test(`theme ${theme} (${label}): every font the guide's CSS names is in the zip and in the print document`, async () => {
      const { zip } = await renderThemeExport({ theme, row: 'guide', format: 'html', ...input })
      const z = await JSZip.loadAsync(zip)
      const files = Object.keys(z.files).filter((f) => !z.files[f].dir)
      const top = files[0].split('/')[0]
      const pages = files.filter((f) => f.endsWith('.html'))
      assert.ok(pages.length > 1, `${theme}: the zip holds its pages`)
      for (const f of pages) {
        const css = styleOf(await z.file(f).async('string'))
        const declared = faces(css)
        assert.ok(declared.length > 0, `${f}: no @font-face`)
        for (const d of declared) {
          assert.ok(d.src && !/^(https?:|\/\/)/.test(d.src), `${f}: ${d.family} loads from outside`)
          const path = `${top}/${d.src}`
          assert.ok(files.includes(path), `${f}: ${d.family} names ${d.src}, which is not in the zip`)
          assert.ok((await z.file(path).async('uint8array')).length > 1000, `${path} is empty`)
        }
        for (const fam of named(css)) assert.ok(declared.some((d) => d.family === fam), `${f}: the CSS names "${fam}" and declares no face for it`)
      }

      const { html } = await renderThemeExport({ theme, row: 'guide', format: 'pdf', ...input })
      const css = styleOf(html)
      const declared = faces(css)
      assert.ok(declared.length > 0, `${theme} pdf: no @font-face`)
      for (const d of declared) assert.match(d.src || '', /^data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}/, `${theme} pdf: ${d.family} is not embedded`)
      for (const fam of named(css)) assert.ok(declared.some((d) => d.family === fam), `${theme} pdf: the CSS names "${fam}" and declares no face for it`)
    })
  }
}
