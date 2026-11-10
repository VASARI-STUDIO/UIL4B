// Icon Library reliability fixes that are pure enough to check without a browser.
//
// MUTATIONS (each turns the named test red):
//   - drop `|| !holding` from browseAll's reveal             -> 'a late reveal cannot empty the built-in grid'
//   - have recentIsFilled return `!!entry.filled` only        -> 'a recent outline glyph is never filled'
//   - drop the logodev line from handleGroupToggle             -> 'a collection chip leaves the Logo.dev pack'
//   - drop the fitsUrl check from fetchSvgText                 -> 'an answer that is not SVG is not cached'
//   - drop evictSvgText from the retry or the sanitiser branch -> 'Try again on the stage evicts what is held'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fitsUrl } from '../../src/utils/iconifyFetch.js'
import { recentIsFilled, SOLID_BUILTIN_PACK } from '../../src/utils/recentIcons.js'

const jsx = fs.readFileSync('src/pages/IconLibrary.jsx', 'utf8')

// The text of a block that starts at `start` and ends at the first `end` after it.
function between(start, end) {
  const at = jsx.indexOf(start)
  assert.ok(at >= 0, `${start} moved, so this would check nothing`)
  const stop = jsx.indexOf(end, at)
  assert.ok(stop > at, `${end} moved, so this would check nothing`)
  return jsx.slice(at, stop)
}

const BUILT_INS = [
  { n: 'check', c: 'action', p: 'L', d: 'M20 6L9 17l-5-5' },
  { n: 'github', c: 'brand', p: 'S', d: 'M12 .3a12 12 0 0 0-3.8 23.4z' },
]

test('a recent outline glyph is never filled, whatever flag was saved with it', () => {
  const staleOutline = { cdn: false, name: 'check', d: 'M20 6L9 17l-5-5', filled: true }
  assert.equal(recentIsFilled(staleOutline, BUILT_INS), false, 'the tick is a single open stroke')
  const solid = { cdn: false, name: 'github', d: 'M12 .3a12 12 0 0 0-3.8 23.4z', filled: false }
  assert.equal(recentIsFilled(solid, BUILT_INS), true, 'POSITIVE CONTROL: a Simple Icons glyph is solid')
  assert.equal(SOLID_BUILTIN_PACK, 'S')
})

test('an entry the built-in set no longer holds keeps its own flag, and a pack icon never fills', () => {
  assert.equal(recentIsFilled({ cdn: false, name: 'gone', d: 'M0 0', filled: true }, BUILT_INS), true)
  assert.equal(recentIsFilled({ cdn: false, name: 'gone', d: 'M0 0' }, BUILT_INS), false)
  assert.equal(recentIsFilled({ cdn: true, pack: 'lucide', name: 'check', filled: true }, BUILT_INS), false)
  assert.equal(recentIsFilled(null, BUILT_INS), false)
  assert.equal(recentIsFilled({ cdn: false, name: 'check', d: 'M20 6L9 17l-5-5' }), false, 'no built-in set loaded')
})

test('a late reveal cannot empty the built-in grid', () => {
  const reveal = between('const reveal = (timedOut = false) => {', 'setFirstPageTimeout(')
  assert.match(reveal, /rid !== reqId\.current \|\| !holding/, 'reveal returns once a page is out')
  // The page that ran out of packs hands over to the built-in set after reveal has run once.
  const settle = between('settled === allowedPacks.length', 'degraded > 0')
  assert.match(settle, /renderLocal\('', ''\)/)
})

test('a collection chip leaves the Logo.dev pack, which belongs to no collection', () => {
  const toggle = between('const handleGroupToggle = (key) => {', 'const handleIconClick')
  assert.match(toggle, /nextGroup && pack === 'logodev' \? '' : pack/)
  assert.match(toggle, /setPack\(scopePack\)/)
  assert.match(toggle, /doSearch\(query, \{ pack: scopePack, group: nextGroup \}\)/)
  assert.match(toggle, /browsePack\(scopePack, nextGroup, 'chip'\)/)
})

test('an answer that is not SVG is not cached', () => {
  const url = 'https://api.iconify.design/lucide/check.svg'
  assert.equal(fitsUrl(url, 'text/html; charset=utf-8', '<!doctype html><html><body>Sign in to Wi-Fi</body></html>'), false)
  assert.equal(fitsUrl(url, 'image/svg+xml', '<svg viewBox="0 0 24 24"></svg>'), true, 'POSITIVE CONTROL')
  const fetchSvg = between('function fetchSvgText(', 'function evictSvgText')
  assert.match(fetchSvg, /fitsUrl\(url, r\.headers\.get\('content-type'\), text\)/)
  assert.match(fetchSvg, /svgTextCache\.delete\(key\)/, 'a failure leaves nothing behind in the cache')
})

test('Try again on the stage evicts what is held and asks once more', () => {
  const retry = between('const retryLoad = () => {', 'setLoadTry(n => n + 1)')
  assert.match(retry, /evictSvgText\(activeIcon\.pack, activeIcon\.name\)/)
  assert.match(retry, /clearIconifyCooldown\(\)/)
  assert.match(retry, /setFetched\(\{ id: null, svg: null, err: false \}\)/)
  // Markup the sanitiser refuses is forgotten, so reopening the icon fetches it again.
  const fetchEffect = between('fetchSvgText(activeIcon.pack, activeIcon.name, {})', '}, [activeIcon, loadTry])')
  assert.match(fetchEffect, /if \(!clean\) evictSvgText\(activeIcon\.pack, activeIcon\.name\)/)
  // Both failure messages offer it.
  assert.equal((jsx.match(/<StageMsg failed=\{/g) || []).length, 2)
  assert.match(jsx, /className="ied-stage-retry" onClick=\{onRetry\}>Try again</)
})
