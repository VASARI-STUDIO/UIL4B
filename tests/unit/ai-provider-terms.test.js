// The Terms and the Privacy policy say where AI-tool submissions go. They name
// the providers api/ai.js actually calls, so the last test here keeps the two
// in step: a new image path or a new provider fails until the wording says so.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { read, stripComments } from './helpers/source-text.js'

const locale = (name) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'locales', `${name}.json`), 'utf8'))

test('the Terms name the AI providers and what they may do with submissions', () => {
  for (const name of ['en', 'en-US']) {
    const text = locale(name).terms?.s4AiText
    assert.ok(text, `${name}.json has no terms.s4AiText`)
    assert.match(text, /third-party AI providers/)
    assert.match(text, /Google Gemini/)
    assert.match(text, /OpenRouter/)
    assert.match(text, /improve its products/)
    assert.match(text, /do not retain or train/)
  }
})

test('the Terms page renders the statement', () => {
  const src = stripComments(read('src/pages/Terms.jsx'))
  assert.match(src, /more: 'terms\.s4AiText'/, 'the statement is not listed in SECTIONS')
  assert.match(src, /\{s\.more && <p className="lgl-p">\{t\(s\.more\)\}<\/p>\}/, 'SECTIONS lists it but nothing renders it')
})

test('the Privacy policy lists the AI providers and the use, and points at its own section 6', () => {
  for (const name of ['en', 'en-US']) {
    const p = locale(name).privacy
    assert.ok(p.s3Items.some((i) => /AI providers listed in section 6/.test(i)), `${name}.json s3Items has no AI use`)
    assert.match(p.s6Title, /^6\./, 'the AI use line points at "section 6" but that is no longer the third-party list')
    assert.ok(p.s6Items.some((i) => /^Google Gemini/.test(i) && /images and text/.test(i)), `${name}.json s6Items does not list Gemini`)
    assert.ok(p.s6Items.some((i) => /^OpenRouter/.test(i)), `${name}.json s6Items does not list OpenRouter`)
  }
})

test('both legal pages carry a last-updated line that is not the pre-AI date', () => {
  for (const name of ['en', 'en-US']) {
    const l = locale(name)
    for (const page of ['terms', 'privacy']) {
      assert.match(l[page].lastUpdated, /2026/, `${name}.json ${page}.lastUpdated has no year`)
      assert.doesNotMatch(l[page].lastUpdated, /March/, `${name}.json ${page}.lastUpdated is still the date before the AI wording`)
    }
  }
  for (const file of ['src/pages/Terms.jsx', 'src/pages/Privacy.jsx']) {
    assert.match(read(file), /lgl-updated/, `${file} no longer renders the last-updated line`)
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
