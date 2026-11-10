// The words /plans may not print again, and the questions it must answer.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const PLANS = read('src/pages/Pricing.jsx')
const SPECTRUM_FACTS = read('src/components/spectrum/spectrumFacts.js')

const pagesDir = path.join(process.cwd(), 'src/pages')
const pageSources = fs.readdirSync(pagesDir, { recursive: true })
  .filter((f) => /\.(jsx|js)$/.test(String(f)))
  .map((f) => [String(f), fs.readFileSync(path.join(pagesDir, String(f)), 'utf8')])

test('Pricing.jsx never says the tools "cost us nothing"', () => {
  assert.ok(!/cost us nothing/i.test(PLANS), 'the FAQ or the Free note says "cost us nothing" again')
  assert.match(PLANS, /You don’t need a card, and there’s no time limit/, 'the Free card note is gone')
})

test('the homepage FAQ never says the tools "cost us nothing" and answers the generation question as /plans does', () => {
  assert.ok(!/cost us nothing/i.test(SPECTRUM_FACTS), 'spectrumFacts.js says "cost us nothing"')
  const answer = (src) => /q: 'What counts as one generation\?',\s*a: '([^']+)'/.exec(src)?.[1]
  assert.ok(answer(SPECTRUM_FACTS), 'the homepage generation answer was not found')
  assert.equal(answer(SPECTRUM_FACTS), answer(PLANS), 'the homepage and /plans answers to "What counts as one generation?" differ')
  assert.match(answer(SPECTRUM_FACTS), /, because they run in your browser\.$/)
})

test('no page says "Pricing unavailable right now", and the three price surfaces never call the service "unreachable"', () => {
  assert.ok(pageSources.length > 10, 'read too few pages for this check to mean anything')
  for (const [file, src] of pageSources) {
    assert.ok(!/Pricing unavailable right now/.test(src), `${file} says "Pricing unavailable right now"`)
  }
  // Other pages use the word for their own things; the price surfaces share one outage vocabulary.
  for (const file of ['Pricing.jsx', 'Checkout.jsx', 'Settings.jsx']) {
    const src = pageSources.find(([f]) => f === file)[1]
    assert.ok(!/unreachable/i.test(src.replace(/^\s*\/\/.*$/gm, '').replace(/'unreachable'|"unreachable"/g, '')), `${file} says "unreachable" in its copy`)
  }
})

test('the FAQ answers when you are charged, how to cancel and whether you get a refund', () => {
  const faq = /const FAQS = \[([\s\S]*?)\r?\n\]\r?\n/.exec(PLANS)
  assert.ok(faq, 'the FAQS array was not found')
  const questions = [...faq[1].matchAll(/q: '([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(questions, [
    'When am I charged?',
    'How do I cancel?',
    'Can I get a refund?',
    'Do prices include tax?',
    'What happens to my work if Pro ends?',
    'Do my files get uploaded?',
    'What counts as one generation?',
  ])
})

test('the FAQ does not offer the 14-day withdrawal, which has no screen to start it', () => {
  const faq = /const FAQS = \[([\s\S]*?)\r?\n\]\r?\n/.exec(PLANS)[1]
  assert.ok(!/withdraw|14[- ]day/i.test(faq), 'the FAQ promises a withdrawal that no screen offers')
})
