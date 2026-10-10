import assert from 'node:assert/strict'
import { test } from 'node:test'
import { placePopover } from '../../src/hooks/usePopover.js'

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
  placePopover({ getBoundingClientRect: () => anchor }, panel)
  return { side: attributes.get('data-pop-side'), left: parseFloat(styles.get('--select-left')), top: parseFloat(styles.get('--select-top')), maxHeight: parseFloat(styles.get('--pop-max-h')) }
}

test('listboxes flip upward, stay below navigation and clear the bottom tabs', t => {
  const result = fixture(t, { left: 100, right: 220, top: 650, bottom: 686 }, { height: 900, tabsTop: 740 })
  assert.equal(result.side, 'top')
  assert.equal(result.left, 8)
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
