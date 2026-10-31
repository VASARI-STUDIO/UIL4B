// /info, /learn/help and /feedback: what the pages say is read from the
// registries that decide it, and the labels are set in the UI sans.
//
// Test seam: src/data/infoTools.js (pure data) for the tool lists, and the
// page sources for the wiring that cannot be imported in bare Node.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import { CREATE_GROUPS } from '../../src/data/toolTree.js'
import { infoToolGroup } from '../../src/data/infoTools.js'
import { AI_TERMS_PATH } from '../../src/config/aiImageConsent.js'
import en from '../../src/locales/en.json' with { type: 'json' }
import enUS from '../../src/locales/en-US.json' with { type: 'json' }

const INFO = stripComments(read('src/pages/InfoCentre.jsx'))
const FEEDBACK = stripComments(read('src/pages/Feedback.jsx'))
const HELP_CSS = read('src/styles/pages/help.css')
const INFO_CSS = read('src/styles/pages/info.css')

const INFO_GROUP_IDS = ['colour', 'type', 'imagery', 'icons', 'ai']

test('each /info tool section lists exactly the live, listed tools of its Create group', () => {
  for (const id of INFO_GROUP_IDS) {
    const group = CREATE_GROUPS.find((g) => g.id === id)
    const shown = infoToolGroup(id)
    const expected = group.tools.filter((t) => !t.hidden && !t.soon).map((t) => t.id)
    assert.deepEqual(shown.tools.map((t) => t.id), expected, `${id}: the /info list drifted from the tool tree`)
    assert.ok(shown.tools.length > 0, `${id}: a section with no tools is a section to delete`)
    assert.equal(shown.label, group.label, `${id}: the section is titled by the group's own label`)
  }
})

test('/info lists the tools the typed copy used to leave out, and none that are hidden or Soon', () => {
  const ids = (g) => infoToolGroup(g).tools.map((t) => t.id)
  assert.ok(ids('imagery').includes('3d-converter'))
  assert.ok(ids('ai').includes('alt-text'))
  assert.ok(!ids('ai').includes('auto-builder'), 'a hidden tool is listed')
  assert.ok(!ids('ai').includes('ai-prompt'), 'a Soon tool is listed')
  assert.throws(() => infoToolGroup('nope'))
})

test('/info reads its tool sections from the tree and types no tool name or legal path', () => {
  for (const id of INFO_GROUP_IDS) {
    assert.ok(INFO.includes(`GROUP.${id}.label`) || INFO.includes(`infoToolGroup('${id}')`),
      `/info no longer reads the ${id} group`)
  }
  assert.ok(INFO.includes('AI_IMAGE_SENT') && INFO.includes('AI_TERMS_PATH'),
    '/info no longer reuses the AI image notice and its Terms link')
  assert.equal(AI_TERMS_PATH, '/terms#terms-s4')
  assert.ok(!INFO.includes('terms#terms-s4'), '/info types the Terms path instead of reading it')
  for (const phrase of ['Colour Studio', 'fully searchable', 'Imagery, Icons', 'Free vs Pro', 'Saving & syncing']) {
    assert.ok(!INFO.includes(phrase), `/info carries "${phrase}" again`)
  }
  assert.ok(!/title: '[^']* & /.test(INFO), 'a typed section title uses "&" instead of "and"')
})

test('/info sends upgrades to /plans and keeps the Settings link on the Subscription tab', () => {
  assert.match(INFO, /<Link to="\/plans">Plans<\/Link>/)
  assert.match(INFO, /<Link to="\/settings" state=\{\{ section: 'support' \}\}>Settings<\/Link>/)
  assert.ok(!INFO.includes('Settings → Subscription'))
})

test('/info collapses panels with hidden="until-found", set on the element, and numbers nothing', () => {
  assert.ok(!/\binert=/.test(INFO), 'a collapsed panel is inert again, which hides it from find-in-page')
  assert.ok(INFO.includes("'until-found'"), 'the collapsed state is not hidden="until-found"')
  assert.ok(INFO.includes("addEventListener('beforematch'"), 'nothing opens a panel when find-in-page matches in it')
  assert.ok(INFO.includes("addEventListener('hashchange'"), 'a fragment change does not open its section')
  assert.ok(!INFO.includes('ic-acc-no'), 'the accordion numeral is back')
  assert.ok(!/counter-(reset|increment)|ic-acc-no/.test(INFO_CSS.replace(/\/\*[\s\S]*?\*\//g, '')),
    'info.css numbers the sections again')
})

test('/learn/help carries no section numerals and sets its labels in the UI sans', () => {
  const css = HELP_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.ok(!/counter-(reset|increment)|counter\(/.test(css), 'help.css numbers the bands again')
  assert.ok(!/\.hlp-h2::before/.test(css))
  for (const sel of ['.hlp-start-opens', '.hlp-hint', '.hlp-run-cap']) {
    const rule = css.match(new RegExp(`${sel.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
    assert.ok(rule, `${sel} has no rule`)
    assert.ok(rule[1].includes('var(--font)') && !rule[1].includes('var(--mono)'), `${sel} is not set in the UI sans`)
    assert.ok(!/text-transform:\s*uppercase/.test(rule[1]), `${sel} is uppercased in CSS`)
  }
  assert.match(read('src/pages/HelpCentre.jsx'), />Opens with \{step\.opensWith\}</)
})

test('/feedback: type and send labels come from the locale, and offline blocks Send', () => {
  for (const [name, locale] of [['en', en], ['en-US', enUS]]) {
    assert.equal(locale.feedback.helpRequest, 'Help request', `${name} feedback.helpRequest`)
    assert.equal(locale.feedback.send, 'Send', `${name} feedback.send`)
    assert.match(locale.feedback.offline, /^You're offline\./, `${name} feedback.offline`)
  }
  assert.ok(!FEEDBACK.includes('Help Request'), 'the help type label is typed again')
  assert.ok(FEEDBACK.includes("t('feedback.send')") && !FEEDBACK.includes("t('common.submit')"))
  assert.match(FEEDBACK, /import useOnline from '..\/hooks\/useOnline'/)
  assert.match(FEEDBACK, /disabled=\{busy \|\| !online\}/)
  assert.match(FEEDBACK, /id="fb-offline" role="status"/)
  assert.match(FEEDBACK, /aria-describedby=\{online \? undefined : 'fb-offline'\}/)
})
