// Every launch theme draws its whole brand book at both sizes: 31 pages on Pro and 7 on Free, and no page is quietly left out.
// The route leaves out a page that throws and only warns, so a broken layout shows up as a shorter book with a "[export] ... left out" warning.
// Break: make one page of a launch theme throw (e.g. `throw new Error('x')` at the top of a page in themes/34-set-square/pages-a4.js).
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { renderThemeExport, loadEngine } from '../../api/_lib/exportThemeRoute.js'

const LAUNCH = ['33-flyleaf', '34-set-square', '35-dispatch']
const SIZES = ['16x9', 'a4-portrait']
const DESIGN = { palette: { colors: ['#0A7562', '#033C31', '#4A9FBC', '#D9E6E1'] } }

test('each launch theme draws 31 brand pages on Pro and 7 on Free at both sizes, and leaves none out', async () => {
  const E = await loadEngine()
  const warnings = []
  const warn = mock.method(console, 'warn', (...args) => { warnings.push(args.join(' ')) })
  try {
    for (const theme of LAUNCH) for (const page of SIZES) for (const skeleton of [false, true]) {
      warnings.length = 0
      const { html } = await renderThemeExport({ theme, row: 'slides', format: 'pdf', design: DESIGN, projectName: 'Lumen', page, skeleton }, E)
      const where = `${theme} ${page} ${skeleton ? 'Free' : 'Pro'}`
      assert.equal((html.match(/<section[^>]*data-page=/g) || []).length, skeleton ? 7 : 31, `${where}: page count`)
      assert.deepEqual(warnings.filter((w) => /left out/.test(w)), [], `${where}: pages left out`)
    }
  } finally {
    warn.mock.restore()
  }
})
