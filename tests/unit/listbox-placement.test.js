import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { placePopover } from '../../src/hooks/usePopover.js'
import { stripCss, stripJs } from '../helpers/strip-comments.js'

function fixture(t, anchor, { width = 240, height = 400, viewportWidth = 1280, viewportHeight = 800, navBottom = 64, tabsTop = 800 } = {}) {
  const previous = Object.fromEntries(['window', 'document', 'getComputedStyle'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  globalThis.window = { innerWidth: viewportWidth, innerHeight: viewportHeight }
  globalThis.document = { querySelector: selector => ({ getBoundingClientRect: () => selector === '.pnav' ? { top: 0, bottom: navBottom } : { top: tabsTop } }) }
  globalThis.getComputedStyle = () => ({ position: 'fixed', display: 'flex', visibility: 'visible' })
  const attributes = new Map()
  const styles = new Map()
  const panel = {
    dataset: { popFixed: 'true' }, offsetWidth: width, offsetHeight: height,
    getAttribute: key => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value),
    style: { setProperty: (key, value) => styles.set(key, value) },
  }
  placePopover({ getBoundingClientRect: () => ({ width: anchor.right - anchor.left, ...anchor }) }, panel)
  return { side: attributes.get('data-pop-side'), left: parseFloat(styles.get('--select-left')), top: parseFloat(styles.get('--select-top')), maxHeight: parseFloat(styles.get('--pop-max-h')), minWidth: parseFloat(styles.get('--select-min-w')) }
}

test('listboxes flip upward, stay below navigation and clear the bottom tabs', t => {
  const result = fixture(t, { left: 100, right: 220, top: 650, bottom: 686 }, { height: 900, tabsTop: 740 })
  assert.equal(result.side, 'top')
  assert.equal(result.left, 100)
  assert.ok(result.top >= 72)
  assert.ok(result.top + result.maxHeight <= 650)
})

test('downward listboxes cap their scroll area above fixed tabs', t => {
  const result = fixture(t, { left: 1100, right: 1278, top: 100, bottom: 136 }, { height: 900, tabsTop: 740 })
  assert.equal(result.side, 'bottom')
  assert.equal(result.left, 1032)
  assert.equal(result.top, 144)
  assert.ok(result.top + result.maxHeight <= 732)
})

test('short viewports do not force a minimum height behind the navigation', t => {
  const result = fixture(t, { left: 200, right: 300, top: 100, bottom: 136 }, { viewportHeight: 220, height: 900, tabsTop: 180 })
  assert.ok(result.maxHeight < 140)
  assert.ok(result.top >= 72)
  assert.ok(result.top + result.maxHeight <= 180)
})

test('wide fields keep their list aligned to the left at the trigger width', t => {
  const result = fixture(t, { left: 300, right: 774, top: 100, bottom: 136 }, { width: 180 })
  assert.equal(result.left, 300)
  assert.equal(result.minWidth, 474)
})

test('wide fields clamp using the trigger width rather than the content width', t => {
  const result = fixture(t, { left: 1000, right: 1474, top: 100, bottom: 136 }, { width: 180 })
  assert.equal(result.left, 798)
  assert.equal(result.minWidth, 474)
})

test('small lists retain a 180px minimum when clamped near the right edge', t => {
  const result = fixture(t, { left: 1200, right: 1270, top: 100, bottom: 136 }, { width: 100 })
  assert.equal(result.left, 1092)
})

test('a trigger wider than the viewport cannot push its list offscreen', t => {
  const result = fixture(t, { left: 20, right: 600, top: 100, bottom: 136 }, { width: 180, viewportWidth: 320 })
  assert.equal(result.left, 8)
  assert.equal(result.minWidth, 304)
})

for (const [viewportWidth, viewportHeight] of [[768, 1024], [834, 1112], [960, 1024], [1440, 1024]]) {
  for (const side of ['bottom', 'top']) {
    test(`${viewportWidth}px listboxes stay anchored when opening ${side}`, t => {
      const top = side === 'top' ? viewportHeight - 180 : 100
      const result = fixture(t, { left: 240, right: 360, top, bottom: top + 36 }, { width: 180, height: 220, viewportWidth, viewportHeight, tabsTop: viewportHeight })
      assert.equal(result.side, side)
      assert.equal(result.left, 240)
      assert.equal(result.top, side === 'top' ? top - 8 - 220 : top + 36 + 8)
      assert.equal(result.minWidth, 120)
    })
  }
}

test('select scrims catch outside presses at every width and dim only through 767px', () => {
  const css = stripCss(readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8'))
  assert.match(css, /\.menu-select-scrim\{display:block;position:fixed;inset:0;z-index:calc\(var\(--select-layer,130\) - 1\);background:transparent;animation:none\}/)
  assert.doesNotMatch(css, /\.menu-select-scrim\{display:none\}/)
  const responsive = css.slice(css.indexOf('@media(max-width:960px){', css.indexOf('.menu-select-scrim{')), css.indexOf('@keyframes menu-select-sheet-in'))
  const [tablet, phone] = responsive.split('@media(max-width:767px){')
  assert.match(tablet, /^@media\(max-width:960px\)\{/)
  assert.match(tablet, /\.menu-select-option\{min-height:44px\}/)
  assert.doesNotMatch(tablet, /\.menu-select-scrim|\.pop\.menu-select-list|::before|menu-select-sheet-in/)
  assert.ok(phone)
  assert.match(phone, /\.menu-select-scrim\{background:var\(--scrim\);animation:cp-fade/)
  assert.match(phone, /\.pop\.menu-select-list[^{}]*\{left:0;right:0;top:auto;bottom:0;[^}]*max-height:[^}]*animation:menu-select-sheet-in/)
  assert.match(phone, /\.menu-select-list::before\{content:'';display:block/)
  assert.match(phone, /html\.has-tabbar \.pop\.menu-select-list\{bottom:calc\(var\(--tabbar-h\) \+ env\(safe-area-inset-bottom\)\)\}/)
  assert.match(css, /@media\(pointer:coarse\)\{\.menu-select-option\{min-height:44px\}\}/)
})

test('select scrims retain their dismissal and parent-popover ownership', () => {
  const select = stripJs(readFileSync(new URL('../../src/components/tool/MenuSelect.jsx', import.meta.url), 'utf8'))
  const popover = stripJs(readFileSync(new URL('../../src/hooks/usePopover.js', import.meta.url), 'utf8'))
  assert.match(select, /data-pop-trigger=\{triggerId\} data-pop-scrim=\{listId\}/)
  assert.match(select, /onPointerDown=\{event => event\.stopPropagation\(\)\} onClick=\{event => \{ event\.stopPropagation\(\); close\(\) \}\}/)
  assert.match(popover, /getAttribute\('data-pop-scrim'\) === panel\?\.id\) return/)
  assert.match(popover, /if \(owner && panel\?\.contains\(document\.getElementById\(owner\)\)\) return/)
  assert.doesNotMatch(select + popover, /matchMedia\([^)]*960/)
})
