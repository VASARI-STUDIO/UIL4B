// The generated preview manifest against the files on disk, the capture hint
// a demo page can carry, and the bridge the "See it running" frame gets.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { PROMPT_PREVIEW_IDS, PROMPT_ANIM_IDS, promptPosterSrc, promptAnimSrc, promptPageSrc } from '../../src/data/promptPreviewAssets.js'
import { readCaptureHint } from '../../scripts/prompt-capture-hint.mjs'
import { framePreviewHtml } from '../../src/utils/previewFrame.js'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const PUBLIC = path.join(ROOT, 'public')
const onDisk = (url) => path.join(PUBLIC, ...url.split('/').filter(Boolean))
// The per-file budget the capture script encodes down to.
const ANIM_BUDGET = 400 * 1024

test('every listed preview has its page and poster on disk', () => {
  assert.ok(PROMPT_PREVIEW_IDS.length > 0)
  for (const id of PROMPT_PREVIEW_IDS) {
    assert.ok(fs.existsSync(onDisk(promptPageSrc(id))), `${id}: no demo page`)
    assert.ok(fs.existsSync(onDisk(promptPosterSrc(id))), `${id}: no poster`)
  }
})

test('every listed animation exists, belongs to a preview and fits the budget', () => {
  for (const id of PROMPT_ANIM_IDS) {
    assert.ok(PROMPT_PREVIEW_IDS.includes(id), `${id}: animated but has no preview`)
    const file = onDisk(promptAnimSrc(id))
    assert.ok(fs.existsSync(file), `${id}: listed as animated but the file is missing`)
    const bytes = fs.statSync(file).size
    assert.ok(bytes <= ANIM_BUDGET, `${id}: ${(bytes / 1024).toFixed(0)} KB is over the ${ANIM_BUDGET / 1024} KB budget`)
  }
})

test('no animation on disk is left out of the manifest', () => {
  const dir = path.join(PUBLIC, 'previews', 'prompts', 'anim')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.webp')) : []
  for (const f of files) {
    assert.ok(PROMPT_ANIM_IDS.includes(f.replace('.webp', '')), `${f} is on disk but not in PROMPT_ANIM_IDS`)
  }
})

test('capture hint: run and scroll modes are read, in any attribute order', () => {
  assert.deepEqual(
    readCaptureHint(`<head><meta name="uil4b-capture" content='{"mode":"run","ms":5000}'></head>`),
    { mode: 'run', ms: 5000 },
  )
  assert.deepEqual(
    readCaptureHint(`<meta content="{&quot;mode&quot;:&quot;scroll&quot;,&quot;stops&quot;:[0,0.5,&quot;#pricing&quot;]}" name="uil4b-capture" />`),
    { mode: 'scroll', stops: [0, 0.5, '#pricing'] },
  )
  assert.deepEqual(readCaptureHint('<meta name="viewport" content="width=device-width">'), { mode: 'default' })
})

test('capture hint: an unusable hint is reported, not guessed at', () => {
  for (const content of ['{mode:run}', '{"mode":"loop"}', '{"mode":"scroll"}', '{"mode":"scroll","stops":[]}']) {
    const hint = readCaptureHint(`<meta name="uil4b-capture" content='${content}'>`)
    assert.equal(hint.mode, 'default', content)
    assert.equal(hint.invalid, content, content)
  }
})

// Runs the bridge the frame is given in a bare context with a fake canvas and
// window, then fires `pagehide` as removing the frame does.
function runBridge() {
  const html = framePreviewHtml('<html><head></head><body></body></html>', 'https://example.test/previews/prompts/')
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1]
  const listeners = {}
  const lost = []
  function HTMLCanvasElement() {}
  HTMLCanvasElement.prototype.getContext = function (type) {
    if (!/webgl/.test(type)) return { kind: '2d' }
    const ctx = { lost: false, getExtension: (n) => (n === 'WEBGL_lose_context' ? { loseContext: () => { ctx.lost = true; lost.push(ctx) } } : null) }
    return ctx
  }
  const sandbox = {
    HTMLCanvasElement,
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn) },
    parent: { postMessage() {} },
    matchMedia: () => ({ matches: false }),
    document: { getElementById: () => null },
    scrollTo() {},
  }
  sandbox.window = sandbox
  vm.runInNewContext(script, sandbox)
  return { canvas: () => new HTMLCanvasElement(), fire: (t) => (listeners[t] || []).forEach((fn) => fn({})), lost }
}

test('the frame bridge releases every WebGL context when the frame goes away', () => {
  const b = runBridge()
  const a = b.canvas().getContext('webgl')
  const c = b.canvas().getContext('webgl2')
  b.canvas().getContext('2d')
  assert.equal(a.lost || c.lost, false, 'released before the frame was removed')
  b.fire('pagehide')
  assert.equal(a.lost, true, 'webgl context kept after pagehide')
  assert.equal(c.lost, true, 'webgl2 context kept after pagehide')
  assert.equal(b.lost.length, 2, 'a 2d context was treated as WebGL, or one was released twice')
})

test('the bridge and <base> go first in <head>, before any page script', () => {
  const html = framePreviewHtml('<!doctype html><html><head><script>1</script></head></html>', 'https://example.test/p/')
  const at = html.indexOf('<base href="https://example.test/p/">')
  assert.ok(at > 0 && at < html.indexOf('<script>1</script>'))
})
