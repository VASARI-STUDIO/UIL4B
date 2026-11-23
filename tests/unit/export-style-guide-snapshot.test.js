// Holds the Swiss Field style guide byte for byte: the print document and style-guide.md, for the four brand names the guide's
// own test uses, each on one of its three palettes. The shared layout code under engine/ serves every themed guide, so a change
// there that moves one byte of this output shows up here first.
//
// The print document embeds its fonts and runs to 280 KB a brand, so the fixture keeps a SHA-256 of the whole document (that is
// the byte-for-byte check) and one of each page and of the head, which name the part that moved. The markdown is kept in full.
//
// A deliberate change: run this file with UPDATE_GUIDE_SNAPSHOT=1, read the fixture's diff, and say in the commit what changed.
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { renderThemeExport } from '../../api/_lib/exportThemeRoute.js'

const FIXTURE = new URL('./fixtures/style-guide-27-swissfield.json', import.meta.url)
const THEME = '27-swissfield'
const NAMES = ['Kerbside', 'Bright Harbour Studio', 'Wild Tide Collective', 'Northern Rivers Community Credit Union']
const PALETTES = [['#0A7562', '#033C31', '#4A9FBC', '#D9E6E1'], ['#F96B76'], ['#2E7BB8', '#F2B705', '#1B1B1B']]
const UPDATE = process.env.UPDATE_GUIDE_SNAPSHOT === '1'

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

// The document in parts: everything before the first page (the head, with fonts and CSS), then each page by id.
function parts(html) {
  const marks = [...html.matchAll(/<section class="pg" data-page="([a-z]+)"/g)]
  const out = { head: sha(html.slice(0, marks.length ? marks[0].index : html.length)), pages: {} }
  marks.forEach((m, i) => { out.pages[m[1]] = sha(html.slice(m.index, i + 1 < marks.length ? marks[i + 1].index : html.length)) })
  return out
}

async function render(i) {
  const colors = PALETTES[i % PALETTES.length]
  const args = { theme: THEME, row: 'guide', design: { palette: { base: colors[0], harmony: 'auto', colors } }, projectName: NAMES[i] }
  const quiet = mock.method(console, 'warn', () => {})
  try {
    const { html } = await renderThemeExport({ ...args, format: 'pdf' })
    const { md } = await renderThemeExport({ ...args, format: 'md' })
    return { print: { sha256: sha(html), bytes: Buffer.byteLength(html), ...parts(html) }, md }
  } finally { quiet.mock.restore() }
}

test('Swiss Field style guide: print document and markdown are unchanged for the four brands', async (t) => {
  // the guide prints its date, so the clock is held still
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-15T00:00:00Z') })
  t.after(() => mock.timers.reset())
  const now = {}
  for (let i = 0; i < NAMES.length; i++) now[NAMES[i]] = await render(i)
  if (UPDATE) { writeFileSync(FIXTURE, JSON.stringify(now, null, 2) + '\n'); return }
  assert.ok(existsSync(FIXTURE), 'the fixture is missing: run once with UPDATE_GUIDE_SNAPSHOT=1')
  const held = JSON.parse(readFileSync(FIXTURE, 'utf8'))
  assert.deepEqual(Object.keys(held), NAMES)
  for (const name of NAMES) {
    assert.equal(now[name].md, held[name].md, `${name}: style-guide.md changed`)
    const a = now[name].print, b = held[name].print
    if (a.sha256 === b.sha256) continue
    const moved = [...(a.head === b.head ? [] : ['head']), ...new Set([...Object.keys(a.pages), ...Object.keys(b.pages)])].filter((id) => id === 'head' || a.pages[id] !== b.pages[id])
    assert.fail(`${name}: the print document changed (${moved.join(', ') || 'page order'}; ${b.bytes} to ${a.bytes} bytes)`)
  }
})
