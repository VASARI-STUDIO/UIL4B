// A `role="tab"` with no tabpanel is a role that lies.
//
// ── What was shipping ───────────────────────────────────────────────────────
//
// The 2026-09-18 independent review measured the rendered admin dashboard and
// found `[role=tabpanel]` count **0** and every tab's `aria-controls` **null**,
// while the tablist itself was otherwise exemplary — roving tabindex, arrow
// keys, `aria-selected`, a real focus ring, and a code comment claiming "now a
// real tablist". A screen reader was told "tab, selected" and then offered
// nothing to move into. `components/admin/CommunityQueue.jsx` was the second
// instance of the same shape.
//
// The app has a settled house pattern — tab + `aria-controls` + `tabpanel` +
// `aria-labelledby` — in Settings, FontDossier, FontGallery, FontBrowseDialog,
// IconEmojiLibrary, Plans, SeoInspector, TypeScale, TintTool, UiSystemLab and
// HomeWorkbench. Admin was the outlier in eleven.
//
// ── Why this is a source test and not a rendered one ────────────────────────
//
// /admin is behind `api/verify-admin`, and `vite preview` serves no serverless
// functions — the route redirects to sign-in, so the tablist cannot be rendered
// without a real session. That is a genuine limitation and it is stated rather
// than papered over: this file asserts the WIRING exists, and only a signed-in
// pass can confirm a screen reader lands where it should.
//
// Comment-blind, for the reason design-tokens.test.js was fixed on the same
// day: these files now contain prose ABOUT the pattern, and a test that matches
// its own explanation proves nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs as strip } from '../helpers/strip-comments.js'

const read = (p) => strip(fs.readFileSync(path.join(process.cwd(), p), 'utf8'))

const SURFACES = [
  ['src/pages/Admin.jsx', 'adm-panel'],
  ['src/components/admin/CommunityQueue.jsx', 'cq-panel'],
]

for (const [file, panelId] of SURFACES) {
  test(`${file} pairs every tab with a panel`, () => {
    const src = read(file)

    // It declares a tablist at all — the positive control. Without this the
    // assertions below pass vacuously on a file that lost its tabs entirely.
    assert.match(src, /role="tablist"/, `${file} no longer declares a tablist`)
    assert.match(src, /role="tab"/, `${file} no longer declares any tab`)

    // Every tab points at the panel...
    assert.match(src, new RegExp(`aria-controls="${panelId}"`),
      `a tab in ${file} does not name its panel — aria-controls is what lets a `
      + 'screen reader move from the tab into the content it selected')

    // ...and the panel exists, with that id.
    assert.match(src, /role="tabpanel"/, `${file} declares tabs but no tabpanel`)
    assert.match(src, new RegExp(`id="${panelId}"`),
      `${file} has no element with id="${panelId}" for its tabs to control`)

    // The panel is NAMED BY THE SELECTED TAB, not by a fixed string. One panel
    // serves every tab here — these panels fetch, so rendering all of them and
    // hiding the inactive ones (the Settings shape) would trade an
    // accessibility fix for a performance and quota regression. The accessible
    // name therefore has to follow the selection, which means an interpolated
    // aria-labelledby rather than a literal.
    assert.match(src, /aria-labelledby=\{`/,
      `${file}'s tabpanel must take its name from whichever tab is selected`)
  })
}

test('no tab anywhere in the admin surface is left without a panel', () => {
  // The systemic form. Two instances were found by review; this is what stops a
  // third being written. Any file under the admin surface that declares a tab
  // must also declare a tabpanel.
  const roots = ['src/pages/Admin.jsx']
  const dir = path.join(process.cwd(), 'src', 'components', 'admin')
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.jsx')) roots.push(path.join('src', 'components', 'admin', entry))
  }
  assert.ok(roots.length >= 2, `only ${roots.length} admin files found — the walk is not reaching them`)

  const offenders = roots.filter((rel) => {
    const src = read(rel)
    return /role="tab"/.test(src) && !/role="tabpanel"/.test(src)
  })
  assert.deepEqual(offenders, [],
    'these admin files declare a tab and no tabpanel, so a screen reader is told '
    + '"tab, selected" and given nothing to move into:\n  ' + offenders.join('\n  '))
})
