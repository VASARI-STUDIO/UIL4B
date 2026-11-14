// The Pro themes ported from the engine (24 Standards, 32 Dieline, then 21 Presentation, 22 Ticket, 28 Riso: the keys of PAIR
// below), drawn through renderThemeExport.
//
// What is pinned here, and the change that makes each fail:
//  1. REGISTERED, PRO: every id is in the route's table and in src/data/exportThemes.js, Pro in every row, and each theme's own meta.id
//     matches its folder. Break: drop a THEMES entry in api/_lib/exportThemeRoute.js, or add `free: true` to a row in the data file.
//  2. EVERY ROW AND FORMAT RENDERS: the UI kit zip, the book (print HTML, site zip) and the slides (print HTML, zip) are non-empty.
//     Break: make a page in themes/32-dieline/ throw (read B.packaging with no DEFAULT_PACKAGING in geom.js).
//  3. NO SAMPLE BRAND IN A PROJECT'S EXPORT: with a project brand, nothing of the sample brand each theme was written for (its name, its
//     city, its first line) appears in any file. Break: read ctx.brand's sample slug in a lane (import BRANDS and use two-shores' data).
//  4. SLOT EDITION IS FINISHED (the brand's own words are placeholders there, as in 04, so the project name is not asserted): no private-use placeholder character, "undefined", "NaN" or "[object Object]" is printed.
//     Break: drop '24', '32' or '21' from PH_THEMES in the engine's pages.js, or stop ctx.placeholders.run finishing a string.
//  5. NO NODE ONLY CODE IN THE THEME FOLDERS: no node: import, child_process or process.env in these themes or the engine's mockup stub,
//     so the serverless function traces them. Break: import fs in themes/24-standards/helpers.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import JSZip from 'jszip'
import { renderThemeExport } from '../../api/_lib/exportThemeRoute.js'
import { EXPORT_THEMES, THEME_ROW_FORMATS, isThemeExportPro, themeHasRow } from '../../src/data/exportThemes.js'
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js'

// Theme id -> the sample brand its meta.brand names.
const PAIR = {
  '24-standards': 'two-shores', '32-dieline': 'kerbside', '21-presentation': 'kerbside',
  '22-ticket': 'encore', '28-riso': 'long-room',
}
const DESIGN = {
  palette: { base: '#2F6F5E', harmony: 'auto', colors: ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27'] },
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
}
const PROJECT = 'Tide Fold Bakery'
const PRIVATE_USE = String.fromCodePoint(0xE000) + '-' + String.fromCodePoint(0xF8FF)
const BAD = new RegExp(String.raw`\[object Object\]|\bundefined\b|\bNaN\b|[${PRIVATE_USE}]`)

const rows = (theme) => Object.entries(THEME_ROW_FORMATS).flatMap(([row, formats]) => (themeHasRow(theme, row) ? formats.map((format) => [row, format]) : []))

// The text of an export: the print document, or every text file in the zip
async function textsOf(out) {
  if (typeof out.html === 'string') return [['print', out.html]]
  const zip = await JSZip.loadAsync(out.zip)
  const list = []
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || !/\.(html|css|json|js|md|svg|txt)$/.test(name)) continue
    list.push([name, await zip.file(name).async('string')])
  }
  return list
}

test('every ported theme is in the table as a Pro theme with all three rows', () => {
  for (const id of Object.keys(PAIR)) {
    const t = EXPORT_THEMES.find((x) => x.id === id)
    assert.ok(t, `${id} is not in EXPORT_THEMES`)
    assert.ok(!t.free, `${id} must be Pro`)
    for (const row of Object.keys(THEME_ROW_FORMATS)) {
      assert.ok(themeHasRow(id, row), `${id} lacks ${row}`)
      assert.equal(isThemeExportPro(row, id), true, `${id} ${row} must need Pro`)
    }
  }
})

test('each theme module carries its own id and the sample brand it was written for', async () => {
  for (const [id, brand] of Object.entries(PAIR)) {
    const T = await import(`../../api/_lib/exportThemes/themes/${id}/index.js`)
    assert.equal(T.meta.id, id)
    assert.equal(T.meta.brand, brand)
    assert.ok(BRANDS[brand], `no sample brand ${brand}`)
  }
})

for (const [theme, sample] of Object.entries(PAIR)) {
  const data = BRANDS[sample].data
  const sampleWords = [data.name, data.city, data.lines?.primary].filter((s) => typeof s === 'string' && s.length >= 6)
  for (const [row, format] of rows(theme)) {
    test(`${theme} ${row} ${format}: renders from a project brand with no sample wording and nothing unfinished`, async () => {
      const out = await renderThemeExport({ theme, row, format, design: DESIGN, projectName: PROJECT })
      const texts = await textsOf(out)
      assert.ok(texts.length > 0 && texts.every(([, t]) => t.length > 0), 'an empty export')
      assert.ok(typeof out.html === 'string' ? out.html.length > 2000 : out.zip.length > 2000, 'the export is too small to be a document')
      const problems = []
      for (const [name, text] of texts) {
        const bad = BAD.exec(text)
        if (bad) problems.push(`${name}: printed ${JSON.stringify(bad[0])} near ${JSON.stringify(text.slice(Math.max(0, bad.index - 40), bad.index + 40))}`)
        for (const w of sampleWords) if (text.includes(w)) problems.push(`${name}: sample wording ${JSON.stringify(w)}`)
      }
      assert.deepEqual(problems, [])
    })
  }
}

test('the ported themes and the mockup stub hold no node-only code', () => {
  const files = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.js')) files.push(p)
    }
  }
  const base = new URL('../../api/_lib/exportThemes/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
  for (const id of Object.keys(PAIR)) walk(`${base}themes/${id}`)
  files.push(`${base}engine/mockup.js`, `${base}engine/scenes.js`)
  const offenders = []
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    if (/from\s+['"]node:|require\(|child_process|process\.env|process\.argv|\bimport\(['"]node:/.test(src)) offenders.push(f.slice(base.length))
  }
  assert.deepEqual(offenders, [])
})
