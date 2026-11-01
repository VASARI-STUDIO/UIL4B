import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasOpenOverlays, observeOpenOverlays, OPEN_OVERLAY_SELECTOR, suspendGuideForOverlays } from '../../src/utils/openOverlays.js'

function panel({ guide = false, hidden = false, parent = null } = {}) {
  return {
    guide, hidden, parent,
    closest(selector) {
      assert.equal(selector, '.bkit-card, [hidden], [aria-hidden="true"]')
      for (let node = this; node; node = node.parent) {
        if (node.guide || node.hidden) return node
      }
      return null
    },
  }
}

function root(panels = []) {
  return {
    panels,
    querySelectorAll(selector) {
      assert.equal(selector, OPEN_OVERLAY_SELECTOR)
      return this.panels
    },
  }
}

test('no overlays and the guide itself leave the card visible', () => {
  assert.equal(hasOpenOverlays(root()), false)
  assert.equal(hasOpenOverlays(root([panel({ guide: true })])), false)
  assert.equal(hasOpenOverlays(root([panel({ parent: panel({ guide: true }) })])), false)
})

test('hidden surfaces and surfaces inside hidden ancestors are ignored', () => {
  assert.equal(hasOpenOverlays(root([
    panel({ hidden: true }),
    panel({ parent: panel({ hidden: true }) }),
  ])), false)
})

test('one open surface suffices even alongside hidden surfaces and the guide', () => {
  assert.equal(hasOpenOverlays(root([
    panel({ guide: true }), panel({ hidden: true }), panel(),
  ])), true)
})

test('observer reports existing overlays, watches portals and deduplicates updates', () => {
  const document = root([panel()])
  const changes = []
  let notify, options, disconnected = false
  class Observer {
    constructor(callback) { notify = callback }
    observe(target, config) { assert.equal(target, document); options = config }
    disconnect() { disconnected = true }
  }
  const stop = observeOpenOverlays(document, open => changes.push(open), Observer)
  assert.deepEqual(changes, [true])
  assert.equal(options.subtree, true)
  assert.equal(options.childList, true)
  assert.equal(options.attributes, true)
  for (const attribute of ['class', 'role', 'hidden', 'aria-hidden', 'data-pop-side']) {
    assert.ok(options.attributeFilter.includes(attribute))
  }
  notify()
  document.panels.push(panel())
  notify()
  document.panels.shift()
  notify()
  assert.deepEqual(changes, [true], 'closing one of two overlays must not restore the guide')
  document.panels = []
  notify()
  assert.deepEqual(changes, [true, false])
  document.panels = [panel()]
  notify()
  assert.deepEqual(changes, [true, false, true])
  stop()
  assert.equal(disconnected, true)
})

test('attribute changes hide and reopen a mounted overlay', () => {
  const surface = panel({ hidden: true })
  const document = root([surface])
  const changes = []
  let notify
  class Observer {
    constructor(callback) { notify = callback }
    observe() {}
    disconnect() {}
  }
  const stop = observeOpenOverlays(document, open => changes.push(open), Observer)
  surface.hidden = false
  notify()
  surface.hidden = true
  notify()
  assert.deepEqual(changes, [false, true, false])
  stop()
})

function guideFixture() {
  const body = root()
  const document = { body, activeElement: body }
  let notify
  class Observer {
    constructor(callback) { notify = callback }
    observe() {}
    disconnect() {}
  }
  const field = {
    isConnected: true,
    blur() { document.activeElement = body },
    focus(options) {
      assert.deepEqual(options, { preventScroll: true })
      document.activeElement = this
    },
  }
  const cards = [0, 1].map(() => ({
    dataset: {}, attrs: new Map(),
    contains(node) { return node === field },
    setAttribute(name, value) { this.attrs.set(name, value) },
    removeAttribute(name) { this.attrs.delete(name) },
  }))
  return { document, field, cards, Observer, update(open) {
    body.panels = open ? [panel()] : []
    notify()
  } }
}

test('both cards become inert and inaccessible, then return without losing their nodes', () => {
  const f = guideFixture()
  const stop = suspendGuideForOverlays(f.document, f.cards, f.Observer)
  f.update(true)
  for (const card of f.cards) {
    assert.equal(card.inert, true)
    assert.equal(card.attrs.get('aria-hidden'), 'true')
    assert.equal(card.dataset.overlayHidden, 'true')
  }
  f.update(false)
  for (const card of f.cards) {
    assert.equal(card.inert, false)
    assert.equal(card.attrs.has('aria-hidden'), false)
    assert.equal(card.dataset.overlayHidden, 'false')
  }
  assert.equal(f.document.activeElement, f.document.body, 'restoring visibility must not focus the card')
  stop()
})

test('focus in a suspended card is released and restored only if focus has not moved elsewhere', () => {
  const f = guideFixture()
  const stop = suspendGuideForOverlays(f.document, f.cards, f.Observer)
  f.document.activeElement = f.field
  f.update(true)
  assert.equal(f.document.activeElement, f.document.body)
  f.update(false)
  assert.equal(f.document.activeElement, f.field)
  f.update(true)
  const toolbar = {}
  f.document.activeElement = toolbar
  f.update(false)
  assert.equal(f.document.activeElement, toolbar)
  stop()
})

test('a removed card control never receives restored focus', () => {
  const f = guideFixture()
  const stop = suspendGuideForOverlays(f.document, f.cards, f.Observer)
  f.document.activeElement = f.field
  f.update(true)
  f.field.isConnected = false
  f.update(false)
  assert.equal(f.document.activeElement, f.document.body)
  stop()
})

test('the overlay selector keeps every surface that must hide the guide card', () => {
  // Dropping an entry leaves the card on top of that surface; the browser spec
  // opens a listbox and the Create menu to prove the card hides and returns.
  assert.deepEqual(
    OPEN_OVERLAY_SELECTOR.split(',').map(s => s.trim()).sort(),
    ['.plb-sx', '.pnav-menu', '[data-pop-side]', '[role="dialog"]', '[role="listbox"]', '[role="menu"]'],
  )
})
