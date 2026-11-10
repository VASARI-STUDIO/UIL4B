// Every Gemini model the server calls must be one Google still serves. 2.0 Flash
// and the 1.5 family are retired, so a request naming them fails at Google and
// the tool behind it stops answering. 2.5 Flash thinks by default, and on a
// small output budget the thinking can use the whole budget and leave no reply,
// so every 2.5 call has to pass a thinking config.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { thinkingConfigFor } from '../../api/_lib/altText.js'

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1')

function apiSources(dir = 'api') {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...apiSources(p))
    else if (/\.(m?js)$/.test(e.name)) out.push([p, stripComments(readFileSync(p, 'utf8'))])
  }
  return out
}

const RETIRED = /['"`](?:models\/)?gemini-(?:1\.0|1\.5|2\.0)[\w.-]*['"`]/

test('no server file calls a retired Gemini model', () => {
  const files = apiSources()
  assert.ok(files.some(([p]) => p.endsWith('ai.js')), 'api/ai.js was not read; this check is reading nothing')
  const hits = files.filter(([, src]) => RETIRED.test(src)).map(([p, src]) => `${p}: ${src.match(RETIRED)[0]}`)
  assert.deepEqual(hits, [], `retired Gemini model named in server code:\n  ${hits.join('\n  ')}`)
})

test('Scan Photo and the text fallback use the shared model and pass a thinking config', () => {
  const src = stripComments(readFileSync('api/ai.js', 'utf8'))
  const model = /export const GEMINI_MODEL = '([^']+)'/.exec(src)?.[1]
  assert.ok(model, 'GEMINI_MODEL is not a plain string constant any more')
  assert.ok(thinkingConfigFor(model), `${model} needs no thinking config, so this check proves nothing; update it`)
  const scan = src.slice(src.indexOf('async function runScanPhoto'), src.indexOf('async function', src.indexOf('async function runScanPhoto') + 10))
  assert.match(scan, /const model = GEMINI_MODEL/, 'Scan Photo names its own model instead of the shared one')
  assert.match(scan, /thinkingConfig: thinkingConfigFor\(model\)/, 'Scan Photo sends no thinking config')
  const fallback = src.slice(src.indexOf('async function callGemini'), src.indexOf('async function', src.indexOf('async function callGemini') + 10))
  assert.match(fallback, /thinkingConfig: thinkingConfigFor\(GEMINI_MODEL\)/, 'the Gemini text fallback sends no thinking config')
})
