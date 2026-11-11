// The /feedback page's copy follows the request type: a Help request reads as
// "Contact support", every other type as feedback. /contact and the links on the
// Help centre and Info centre open the form on Help request with `?type=help`.
//
// Test seam: feedbackCopyKeys() in src/utils/feedbackCopy.js (pure), the ten
// locale files, the redirect table, and the page sources for the wiring that
// cannot be imported in bare Node.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { feedbackCopyKeys } from '../../src/utils/feedbackCopy.js'
import { LEGACY_REDIRECTS, CLIENT_REDIRECT_ROUTES, mergeRedirectQuery } from '../../src/data/legacyRoutes.js'
import { read, stripComments } from './helpers/source-text.js'

const LOCALES = ['de', 'en-US', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
const HELP_KEYS = ['helpTitle', 'helpSubtitle', 'helpPlaceholder']
const locale = (code) => JSON.parse(read(`src/locales/${code}.json`))

test('a Help request reads the support copy, every other type the feedback copy', () => {
  const help = feedbackCopyKeys('help')
  assert.deepEqual(help, {
    title: 'feedback.helpTitle',
    subtitle: 'feedback.helpSubtitle',
    placeholder: 'feedback.helpPlaceholder',
  })
  for (const type of ['feature', 'bug', 'general', '', undefined]) {
    assert.deepEqual(feedbackCopyKeys(type), {
      title: 'feedback.title',
      subtitle: 'feedback.subtitle',
      placeholder: 'feedback.messagePlaceholder',
    }, `type ${JSON.stringify(type)} should read the feedback copy`)
  }
})

test('every key the helper can return exists, with words in it, in all ten locales', () => {
  assert.equal(fs.readdirSync(path.join(process.cwd(), 'src/locales')).filter((f) => f.endsWith('.json')).length, LOCALES.length,
    'a locale file was added or removed; update LOCALES here')
  const keys = [...Object.values(feedbackCopyKeys('help')), ...Object.values(feedbackCopyKeys('feature'))]
  for (const code of LOCALES) {
    const { feedback } = locale(code)
    for (const key of keys) {
      const own = key.replace('feedback.', '')
      assert.equal(typeof feedback[own], 'string', `${code} has no ${key}`)
      // Over one character, not three: a Korean or Japanese title can be three.
      assert.ok(feedback[own].trim().length > 1, `${code} ${key} is empty`)
    }
  }
})

test('the support copy is not the feedback copy, in any locale', () => {
  for (const code of LOCALES) {
    const { feedback } = locale(code)
    assert.notEqual(feedback.helpTitle, feedback.title, `${code}: the help heading repeats the feedback heading`)
    assert.notEqual(feedback.helpSubtitle, feedback.subtitle, `${code}: the help intro repeats the feedback intro`)
    assert.notEqual(feedback.helpPlaceholder, feedback.messagePlaceholder, `${code}: the help placeholder repeats the feedback one`)
  }
})

test('the English support copy says what the form is for', () => {
  for (const code of ['en', 'en-US']) {
    const { feedback } = locale(code)
    assert.equal(feedback.helpTitle, 'Contact support')
    assert.match(feedback.helpPlaceholder, /what were you trying to do/i)
    assert.match(feedback.helpPlaceholder, /what happened/i)
    assert.match(feedback.helpSubtitle, /trying to do/i)
  }
})

test('the feedback page takes its heading, intro and placeholder from the chosen type', () => {
  const form = stripComments(read('src/pages/Feedback.jsx'))
  assert.match(form, /import \{ feedbackCopyKeys \} from '..\/utils\/feedbackCopy'/)
  // From state, so switching the type in the form changes the copy both ways.
  assert.match(form, /const copy = feedbackCopyKeys\(type\)/)
  assert.match(form, /t\(copy\.title\)/)
  assert.match(form, /t\(copy\.subtitle\)/)
  assert.match(form, /t\(copy\.placeholder\)/)
  assert.ok(!form.includes("t('feedback.messagePlaceholder')"), 'the placeholder is the feedback one again, whatever the type')
  // The type a link names with `?type=` is read once, for the first render.
  assert.match(form, /TYPES\.some\(\(x\) => x\.id === params\.get\('type'\)\)/)
  assert.ok(form.includes("{ id: 'help', labelKey: 'feedback.helpRequest' }"))
})

test('/contact redirects to the form on Help request, at the edge and in the client', () => {
  assert.ok(LEGACY_REDIRECTS.some(([from, to]) => from === '/contact' && to === '/feedback?type=help'))
  assert.deepEqual(CLIENT_REDIRECT_ROUTES.filter(([from]) => from === '/contact'), [['/contact', '/feedback?type=help']])
  const edge = JSON.parse(read('vercel.json')).redirects.filter((r) => r.source === '/contact')
  assert.deepEqual(edge, [{ source: '/contact', destination: '/feedback?type=help', permanent: true }])
  // The visitor's own query rides along, and the destination's type wins.
  const landed = new URL(mergeRedirectQuery('/feedback?type=help', '?utm_source=mail&type=bug'), 'https://example.test')
  assert.equal(landed.pathname, '/feedback')
  assert.equal(landed.searchParams.get('type'), 'help')
  assert.equal(landed.searchParams.get('utm_source'), 'mail')
})

test('the Help centre and Info centre both link to the form on Help request', () => {
  // Read raw: these pages carry apostrophes in JSX text, which the comment
  // stripper is not built for, and the markup asserted here is not in a comment.
  const help = read('src/pages/HelpCentre.jsx')
  const info = read('src/pages/InfoCentre.jsx')
  assert.match(help, /<Link className="hlp-contact-link" to="\/feedback\?type=help">Contact support<\/Link>/)
  assert.match(info, /Still stuck\? <Link to="\/feedback\?type=help">Contact support<\/Link>/)
  // The content-report address stays where it was, under "Report something broken".
  assert.match(help, /mailto:support@uil4b\.com\?subject=Content%20report/)
})
