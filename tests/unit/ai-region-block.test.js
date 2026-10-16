// The region gate for the Gemini-backed tools. Google's Gemini API terms don't
// let the free tier serve users in the EEA, the UK or Switzerland, so those
// visitors are refused on the image tools. Where in the request that happens is
// pinned in ai-provider-path.test.js; this file pins WHO is blocked and how the
// browser reads the answer.
//
// The expected values below are written out by hand from the list of countries,
// not derived from the module's own arrays, so a code deleted from the module
// is a failure here rather than something both sides agree on.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  EEA_COUNTRIES,
  EU_TERRITORIES,
  countryFromHeaders,
  isGeminiBlockedCountry,
  geminiRegionBlocked,
} from '../../api/_lib/geoBlock.js'
import { regionFromReply, isRegionRefusal, REGION_ENDPOINT } from '../../src/utils/aiRegion.js'
import { stripJs } from '../helpers/strip-comments.js'

const header = (value) => ({ 'x-vercel-ip-country': value })

// EU 27, then Iceland, Liechtenstein, Norway, then the UK and Switzerland.
const REQUIRED = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
  'GB', 'CH',
]
// Parts of the EU that report their own ISO code.
const TERRITORIES = ['AX', 'GF', 'GP', 'MQ', 'RE', 'YT', 'MF']
// Open on purpose: Oscar ruled these are NOT blocked.
const OPEN = ['AU', 'US', 'NZ', 'JP', 'TR', 'UA', 'RS', 'AD', 'MC', 'SM', 'VA', 'GI', 'IM', 'JE', 'GG', 'XX']

test('the hand-written list is 32 distinct countries', () => {
  // Positive control: the loop below is only as good as the list it walks.
  assert.equal(REQUIRED.length, 32)
  assert.equal(new Set(REQUIRED).size, 32)
})

test('all 32 required countries are blocked', () => {
  for (const code of REQUIRED) {
    assert.equal(geminiRegionBlocked(header(code)), true, `${code} is not blocked`)
  }
})

test('the seven EU territories are blocked', () => {
  for (const code of TERRITORIES) {
    assert.equal(geminiRegionBlocked(header(code)), true, `${code} is not blocked`)
  }
})

test('the EEA list has 30 countries and no duplicates', () => {
  assert.equal(EEA_COUNTRIES.length, 30)
  assert.equal(new Set(EEA_COUNTRIES).size, 30)
  assert.equal(EU_TERRITORIES.length, 7)
})

test('countries Oscar ruled open are not blocked', () => {
  for (const code of OPEN) {
    assert.equal(geminiRegionBlocked(header(code)), false, `${code} is blocked`)
  }
})

test('a missing, empty or malformed header fails open', () => {
  assert.equal(geminiRegionBlocked({}), false)
  assert.equal(geminiRegionBlocked(undefined), false)
  assert.equal(geminiRegionBlocked(null), false)
  for (const bad of ['', '  ', 'D', 'DEU', '12', 'D1', null, undefined, 7, {}]) {
    assert.equal(geminiRegionBlocked(header(bad)), false, `${JSON.stringify(bad)} blocked someone`)
  }
  assert.equal(countryFromHeaders({}), null)
  assert.equal(countryFromHeaders(undefined), null)
})

test('the header is normalised: case, spaces, arrays and lists', () => {
  assert.equal(countryFromHeaders(header('de')), 'DE')
  assert.equal(countryFromHeaders(header(' de ')), 'DE')
  assert.equal(countryFromHeaders(header(['DE'])), 'DE')
  assert.equal(countryFromHeaders(header('DE, US')), 'DE')
  assert.equal(geminiRegionBlocked(header('de')), true)
  assert.equal(geminiRegionBlocked(header(' de ')), true)
  assert.equal(geminiRegionBlocked(header(['DE'])), true)
  assert.equal(geminiRegionBlocked(header('DE, US')), true)
  // Only the first entry counts: a list led by an open country is open.
  assert.equal(geminiRegionBlocked(header('US, DE')), false)
})

test('UK and EL are read as GB and GR', () => {
  assert.equal(countryFromHeaders(header('UK')), 'GB')
  assert.equal(countryFromHeaders(header('EL')), 'GR')
  assert.equal(geminiRegionBlocked(header('UK')), true)
  assert.equal(geminiRegionBlocked(header('EL')), true)
})

test('isGeminiBlockedCountry refuses anything that is not a country code string', () => {
  assert.equal(isGeminiBlockedCountry('DE'), true)
  assert.equal(isGeminiBlockedCountry('AU'), false)
  for (const bad of [null, undefined, '', 0, ['DE'], {}]) {
    assert.equal(isGeminiBlockedCountry(bad), false, `${JSON.stringify(bad)} counted as a country`)
  }
})

// ── what the browser makes of the server's answer ───────────────────────────

test('only an explicit blocked:true on a 200 blocks the page', () => {
  assert.equal(regionFromReply(true, { blocked: true }), 'blocked')
  assert.equal(regionFromReply(true, { blocked: false }), 'open')
  assert.equal(regionFromReply(true, {}), 'open')
  assert.equal(regionFromReply(true, null), 'open')
  assert.equal(regionFromReply(true, undefined), 'open')
  assert.equal(regionFromReply(true, { blocked: 'true' }), 'open')
  assert.equal(regionFromReply(true, { blocked: 1 }), 'open')
})

test('a failed check never blocks anyone, even if the body says blocked', () => {
  assert.equal(regionFromReply(false, { blocked: true }), 'open')
  assert.equal(regionFromReply(false, null), 'open')
})

test('a 451 or the region-unavailable code is a refusal; nothing else is', () => {
  assert.equal(isRegionRefusal(451, null), true)
  assert.equal(isRegionRefusal(451, {}), true)
  assert.equal(isRegionRefusal(200, { code: 'region-unavailable' }), true)
  assert.equal(isRegionRefusal(403, { code: 'region-unavailable' }), true)
  assert.equal(isRegionRefusal(429, { error: 'Daily limit reached' }), false)
  assert.equal(isRegionRefusal(500, { code: 'other' }), false)
  assert.equal(isRegionRefusal(200, null), false)
  assert.equal(isRegionRefusal(401, undefined), false)
})

test('the page asks the same URL the server answers', () => {
  assert.equal(REGION_ENDPOINT, '/api/ai?region=1')
})

// ── wiring ──────────────────────────────────────────────────────────────────
// SOURCE ASSERTION, kept on purpose: .jsx cannot be loaded here. What is
// guarded is that each tool page still asks the hook, still reads a refusal
// off its own responses and still renders the marker the browser test looks
// for. What the helpers do with those inputs is executed above, and what the
// rendered page does is executed in tests/user-sim/111-ai-region-block.spec.js.

const page = (name) => stripJs(fs.readFileSync(path.join(process.cwd(), 'src', 'pages', name), 'utf8'))

for (const name of ['AltTextGenerator.jsx', 'AiPromptGenerator.jsx']) {
  test(`${name} asks the region hook, reads refusals and renders the marker`, () => {
    const src = page(name)
    assert.match(src, /useAiRegion/, `${name} no longer calls the region hook`)
    assert.match(src, /isRegionRefusal\(/, `${name} no longer recognises a 451 from the server`)
    assert.match(src, /data-testid="ai-region-blocked"/, `${name} has lost the blocked-region marker`)
  })
}
