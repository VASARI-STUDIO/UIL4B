// The Terms and the Privacy policy say where AI-tool submissions go. They name
// the providers api/ai.js actually calls, so the last test here keeps the two
// in step: a new image path or a new provider fails until the wording says so.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { read, stripComments } from './helpers/source-text.js'

const TERMS = stripComments(read('src/pages/Terms.jsx'))
const PRIVACY = stripComments(read('src/pages/Privacy.jsx'))
const aiSection = () => TERMS.slice(TERMS.indexOf('function Ai('), TERMS.indexOf('\n}', TERMS.indexOf('function Ai(')))

test('the Terms name the AI providers and what they may do with submissions', () => {
  const ai = aiSection()
  assert.match(ai, /third-party AI providers/)
  assert.match(ai, /Google Gemini/)
  assert.match(ai, /OpenRouter/)
  assert.match(ai, /improve its products/)
  assert.match(ai, /do not retain or train/)
})

test('the Terms page renders the statement', () => {
  const ai = aiSection()
  assert.match(ai, /processed by third-party AI providers under those providers&apos; own terms/, 'the AI section does not carry the provider statement')
  assert.match(ai, /may allow Google to use what it receives to improve its products/)
  assert.match(ai, /do not retain or train on it/)
  assert.match(TERMS, /\{ id: 'terms-s8', heading: '8\. AI features', render: Ai \}/, 'the AI section is not in SECTIONS')
})

test('the Privacy policy lists each AI provider with what it receives', () => {
  assert.match(PRIVACY, /'Google Gemini API \(Google LLC\)'[^\]]*'Images and text you send to those tools'/, 'the third-party list does not say Gemini receives images and text')
  assert.match(PRIVACY, /'OpenRouter \(OpenRouter, Inc\.\)[^\]]*'Text you send to those tools'/, 'the third-party list does not list OpenRouter')
  assert.match(PRIVACY, /Google may use what we send to improve its products/, 'the Privacy policy no longer says how Google may use submissions')
})

test('both legal pages carry a last-updated line, and the text lives in the pages, not the locales', () => {
  for (const file of ['src/pages/Terms.jsx', 'src/pages/Privacy.jsx']) {
    assert.match(read(file), /lgl-updated">Last updated: \d{1,2} [A-Z][a-z]+ 20\d\d</, `${file} no longer renders a dated last-updated line`)
  }
  // The pages were rewritten in English in place of the old locale-driven
  // text. A legal block left in a locale ships in the bundle as words no page
  // shows, which is how a stale claim outlives its correction.
  for (const name of fs.readdirSync(path.join(process.cwd(), 'src', 'locales'))) {
    const l = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'locales', name), 'utf8'))
    assert.ok(!('privacy' in l) && !('terms' in l), `${name} still holds an old privacy or terms block`)
  }
})

test('api/ai.js still reaches only the providers the legal pages name', () => {
  const src = read('api/ai.js')
  const inline = src.match(/inline_data:/g) || []
  assert.equal(inline.length, 2, 'a new image path exists — do the Terms still describe where it goes?')
  const hosts = new Set((src.match(/https:\/\/[a-z0-9.-]+/g) || []).map((u) => new URL(u).hostname))
  const ai = [...hosts].filter((h) => h !== 'api.resend.com' && h !== 'uil4b.com')
  assert.deepEqual(ai.sort(), ['generativelanguage.googleapis.com', 'openrouter.ai'],
    'api/ai.js calls a provider the legal pages do not name')
})

test('the OpenRouter route is still locked to no-retention hosts, which is what the Terms say', () => {
  const src = read('api/ai.js')
  assert.match(src, /data_collection: 'deny'/)
  assert.match(src, /zdr: true/)
})
