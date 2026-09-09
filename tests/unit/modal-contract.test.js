// `aria-modal="true"` is a PROMISE to assistive technology: everything outside
// this element is inert. Six of seven dialogs in the app made that promise and
// trapped nothing — Tab walked straight out into the page behind, the
// background scrolled, and closing dropped focus to the top of the document.
//
// Measured 2026-08-15, before the fix:
//
//   ProUpgradeModal   dialog  esc  --    --       --      (the upgrade surface)
//   LoginPopup        dialog  esc  lock  restore  trap    (the only correct one)
//   FeedbackModal     dialog  esc  lock  --       --      (on every page)
//   UIPreviewModal    dialog  esc  lock  --       --      (deleted since — see below)
//   ColorPickerPop    dialog  esc  --    --       --
//   PromptModal       dialog  esc  --    --       --
//   UIKitGuide        dialog  --   --    --       --      (a new user's first screen)
//
// Escape alone is the easy half. The trap is the half everyone skipped, and it
// is the half the attribute actually claims. This test exists so the next
// dialog cannot be added without it.
//
// UIPreviewModal has since been DELETED, and its row is kept rather than tidied
// away because this table is a dated measurement — editing one to match today is
// how a record stops being one. It was unreachable: imported only by TopBar,
// which nothing rendered once App.jsx moved to PillNav, and no built bundle ever
// contained a line of it. So the focus trap this file's fix gave it was work no
// user could ever benefit from, which is the part worth carrying forward — check
// a surface is reachable before spending a fix on it.
//
// ── WHAT CHANGED, AND WHY ───────────────────────────────────────────────────
//
// The hook's own contract used to be asserted by REGEX over useModalDialog.js:
// a match for `document.body.style.overflow = 'hidden'`, one for `e.key ===
// 'Escape'`, one for `e.key !== 'Tab'`, and — for the focus restore — a
// twenty-line static tracer that followed the identifier holding
// `document.activeElement` through assignments and `.push()` calls to see
// whether the cleanup called `.focus()` on something descended from it.
//
// All four proved the source CONTAINS those things. None proved any of them
// WORKS. The tracer is the clearest case: it was satisfied by a cleanup that
// focused a node carrying the opener, whether or not that node was the right
// one, whether or not it was still in the document, and whether or not focus
// actually moved. The one defect the hook exists to prevent — the restore
// silently landing on <body> because the opener's menu unmounted behind the
// dialog — is invisible to every regex that can be written about it, because
// the buggy and the fixed versions differ only in what happens at RUN TIME.
//
// So the hook is now EXECUTED, against a DOM small enough to hold a focus
// model: an opener that can be detached, a dialog with focusable children, a
// body whose overflow can be read back, and a Lenis stub that records stop and
// start. Every assertion below is about an observed state change.
//
// The file-wide sweeps (which dialog declares aria-modal, and does it trap)
// stay as source scans. Those are structural invariants over ~10 .jsx files —
// there is no single behaviour that stands in for "every dialog in the app",
// and .jsx cannot be loaded here at all.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const SRC = path.join(process.cwd(), 'src')
const HOOK_PATH = 'src/hooks/useModalDialog.js'

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.jsx$/.test(entry.name) ? [full] : []
  })
}

// The invariant is "this dialog traps focus", not "this dialog imports our
// hook". Four surfaces had already written a correct trap by hand before the
// shared hook existed — LoginPopup, ExportPanel, PillNav and IconLibrary — and
// two of those carry extra behaviour the hook does not (PillNav and ExportPanel
// also pause the app-wide Lenis so its rAF loop cannot fight the locked body).
// Rewriting working code to satisfy a test is how a test starts causing bugs,
// so both routes count. A local trap is recognised by it intercepting Tab.
const TRAPS_FOCUS = /useModalDialog|key !== 'Tab'|key === 'Tab'/

// `[aria-modal="true"]` also appears inside querySelector strings — PaletteBuilder
// uses one to suppress its spacebar shortcut while any dialog is open. That is a
// READ, not a declaration, and must not be counted as one.
const DECLARES_MODAL = /(?<!\[)aria-modal=(?:"true"|\{true\})/

const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ── A DOM small enough to hold a focus model ────────────────────────────────
//
// Only what this hook touches. Every method here exists because the hook calls
// it; nothing is modelled speculatively.

class El {
  constructor(dom, tag = 'div', { visible = true, focusable = true, disabled = false } = {}) {
    this._dom = dom
    this.tagName = tag.toUpperCase()
    this.children = []
    this.parentElement = null
    this.isConnected = false
    this.disabled = disabled
    this._attrs = new Map()
    this._visible = visible
    this._focusable = focusable
    this.tabIndex = focusable ? 0 : -1
    this.focusCount = 0
  }

  // The hook filters candidates on `el.offsetParent !== null` — the standard
  // "is this actually laid out" check. A hidden sibling reports null.
  get offsetParent() { return this._visible && this.isConnected ? this.parentElement : null }

  appendChild(child) {
    child.parentElement = this
    this.children.push(child)
    child._setConnected(this.isConnected)
    return child
  }

  _setConnected(v) {
    this.isConnected = v
    for (const c of this.children) c._setConnected(v)
  }

  /** Detach this node and its subtree, the way a menu unmounting behind a
   *  dialog does. The node survives as an object — which is exactly why
   *  `.focus()` on it is a silent no-op rather than a throw. */
  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter((c) => c !== this)
      this.parentElement = null
    }
    this._setConnected(false)
  }

  setAttribute(k, v) {
    this._attrs.set(k, String(v))
    if (k === 'tabindex') { this.tabIndex = Number(v); this._focusable = true }
  }

  getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null }
  hasAttribute(k) { return this._attrs.has(k) }

  contains(n) {
    for (let c = n; c; c = c.parentElement) if (c === this) return true
    return false
  }

  focus() {
    this.focusCount += 1
    // THE WHOLE POINT OF THE HARNESS. A detached node cannot take focus, and
    // the browser reports nothing when you ask it to — focus simply stays put,
    // or falls to <body>. Modelling that faithfully is what lets the restore
    // assertions below distinguish a working restore from a silent no-op.
    if (!this.isConnected || !this._focusable) return
    this._dom.document.activeElement = this
  }

  querySelectorAll(selector) {
    // The hook passes one long selector listing focusable tags. Rather than
    // implement CSS, honour the contract it depends on: candidate elements
    // that are focusable and not disabled, in tree order.
    assert.match(selector, /a\[href\]|button/,
      'the hook is querying with a selector this harness does not model')
    const out = []
    const visit = (n) => {
      for (const c of n.children) {
        if (c._focusable && !c.disabled && c.tabIndex >= 0) out.push(c)
        visit(c)
      }
    }
    visit(this)
    return out
  }

  querySelector(selector) {
    const visit = (n) => {
      for (const c of n.children) {
        if (c.getAttribute('data-sel') === selector) return c
        const found = visit(c)
        if (found) return found
      }
      return null
    }
    return visit(this)
  }
}

function makeDom() {
  const dom = {
    lenis: { stopped: 0, started: 0, stop() { this.stopped += 1 }, start() { this.started += 1 } },
    lenisPresent: true,
    marked: 0,
    unmarked: 0,
    listeners: [],
    // requestAnimationFrame, held rather than run: the hook now restores focus
    // a frame after cleanup, and the tests need to observe the gap.
    frames: [],
    frameSeq: 0,
  }
  /** Run every frame callback queued so far, the way the next paint would. */
  dom.frame = () => {
    const queued = dom.frames
    dom.frames = []
    for (const f of queued) f.fn()
  }

  const body = new El(dom, 'body')
  body.isConnected = true
  body.style = { overflow: '' }

  dom.document = {
    body,
    activeElement: body,
    addEventListener: (type, fn, capture) => dom.listeners.push({ type, fn, capture }),
    removeEventListener: (type, fn) => {
      dom.listeners = dom.listeners.filter((l) => !(l.type === type && l.fn === fn))
    },
  }

  dom.el = (tag, opts) => new El(dom, tag, opts)

  /** Dispatch a keydown the way the browser does to a capture listener. */
  dom.press = (key, { shiftKey = false } = {}) => {
    const event = { key, shiftKey, defaultPrevented: false, propagationStopped: false,
      preventDefault() { this.defaultPrevented = true },
      stopPropagation() { this.propagationStopped = true } }
    for (const l of [...dom.listeners]) if (l.type === 'keydown') l.fn(event)
    return event
  }

  return dom
}

// ── Loading the hook ────────────────────────────────────────────────────────
//
// `node --test` cannot import it: useModalDialog -> useSmoothScroll ->
// AppearanceContext, and that last hop is written without a file extension, so
// Vite resolves it and Node does not. (Verified: the import fails on
// "Cannot find module .../src/contexts/AppearanceContext".) That resolution gap
// is the real reason this file, and most of its siblings, reached for a regex.
// The repository's answer is the vm harness in
// reduced-motion-resolution.test.js, and this uses the same one.
const hookSource = fs.readFileSync(path.join(process.cwd(), HOOK_PATH), 'utf8')

const loadHook = (dom) => {
  let out = hookSource

  const rewrite = (re, to, what) => {
    assert.match(out, re,
      `this harness could not find ${what} in ${HOOK_PATH}. The file was refactored; `
      + 'update the rewrite so this test keeps executing the real source. Do NOT delete '
      + 'the test — it guards a contract that shipped broken on six of seven dialogs.')
    out = out.replace(re, to)
  }

  rewrite(/import \{ useEffect, useRef \} from 'react'/, '', 'the react import')
  rewrite(/import \{ getLenis \} from '\.\/useSmoothScroll\.js'/, '', 'the useSmoothScroll import')
  rewrite(/import \{ markScrollContainers \} from '\.\.\/utils\/scrollContainment\.js'/, '',
    'the scrollContainment import')
  rewrite(/^export default function useModalDialog/m, 'function useModalDialog',
    'the hook export')

  assert.ok(!/^\s*import\s/m.test(out),
    `${HOOK_PATH} has gained a static import this harness does not stub:\n  `
    + (out.match(/^\s*import\s.*$/m) || [''])[0].trim())

  // A React small enough to drive one hook: a stable ref, and an effect that
  // runs immediately and hands back its cleanup.
  let cleanup = null
  const refs = []
  let refCursor = 0
  const sandbox = {
    console,
    document: dom.document,
    assert,
    useRef: (init) => {
      const i = refCursor++
      if (refs.length <= i) refs[i] = { current: init }
      return refs[i]
    },
    useEffect: (fn) => { cleanup = fn() },
    getLenis: () => (dom.lenisPresent ? dom.lenis : null),
    markScrollContainers: () => { dom.marked += 1; return () => { dom.unmarked += 1 } },
    requestAnimationFrame: (fn) => { const id = ++dom.frameSeq; dom.frames.push({ id, fn }); return id },
    cancelAnimationFrame: (id) => { dom.frames = dom.frames.filter((f) => f.id !== id) },
  }

  const body = `(function(){\n${out}\n;return useModalDialog;\n})()`
  const useModalDialog = vm.runInNewContext(body, sandbox, { filename: HOOK_PATH })

  /** Mount the hook against `node`, the way a dialog component does.
   *
   *  React attaches a ref to its element BEFORE effects run, so by the time the
   *  effect body reads `ref.current` the dialog node is already there. Seed the
   *  slot the hook is about to ask for rather than calling useRef here first —
   *  doing that consumes index 0 and hands the hook a second, empty ref, which
   *  is a null `node` and a hook that silently does almost nothing. */
  return (onClose, options, node) => {
    refCursor = 0
    refs.length = 0
    refs[0] = { current: node }
    useModalDialog(onClose, options)
    const close = () => { const c = cleanup; cleanup = null; return c?.() }
    /** The effect re-running on the SAME component: React runs the old
     *  cleanup, then the effect body again, with the refs it already holds. */
    // The hook is called outside React on purpose — this whole harness is
    // that — and the rule keys on the function's NAME, which is why the
    // anonymous mount above never tripped it.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const rerun = () => { close(); refCursor = 0; useModalDialog(onClose, options) }
    return { ref: refs[0], close, rerun }
  }
}

/** A page with an opener inside a menu, and a dialog with three controls. */
function scene({ initialFocus = null, enabled = true, lenis = true } = {}) {
  const dom = makeDom()
  dom.lenisPresent = lenis

  const menu = dom.el('div', { focusable: false })
  const opener = dom.el('button')
  dom.document.body.appendChild(menu)
  menu.appendChild(opener)

  const dialog = dom.el('div', { focusable: false })
  dialog.tabIndex = -1
  dialog._focusable = true              // role="dialog" tabIndex={-1}
  const first = dom.el('button')
  const middle = dom.el('input')
  middle.setAttribute('data-sel', '.hue')
  const last = dom.el('button')
  dom.document.body.appendChild(dialog)
  for (const c of [first, middle, last]) dialog.appendChild(c)

  opener.focus()
  assert.equal(dom.document.activeElement, opener, 'scene setup: the opener should hold focus')

  const closes = []
  const mount = loadHook(dom)
  const handle = mount(() => closes.push(1), { enabled, initialFocus }, dialog)

  return { dom, menu, opener, dialog, first, middle, last, closes, ...handle }
}

// ── The file-wide sweeps, which stay source scans ───────────────────────────

test('every dialog that claims aria-modal actually traps focus', () => {
  const offenders = []
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8')
    if (!DECLARES_MODAL.test(src)) continue
    if (TRAPS_FOCUS.test(src)) continue
    offenders.push(path.relative(process.cwd(), file))
  }
  assert.deepEqual(offenders, [],
    'aria-modal="true" promises the rest of the page is inert. These declare it and trap '
    + 'nothing, so Tab walks straight out into the page behind:\n  ' + offenders.join('\n  '))
})

test('the guard above sees a real population, so it cannot pass by finding nothing', () => {
  const dialogs = walk(SRC).filter(f => DECLARES_MODAL.test(fs.readFileSync(f, 'utf8')))
  assert.ok(dialogs.length >= 10, `expected the app's dialog surfaces, found ${dialogs.length}`)
})

// ── The hook itself, EXECUTED ───────────────────────────────────────────────

test('the harness really runs the hook, so nothing below is vacuous', () => {
  // Positive control. If the rewrites silently produced a no-op function, every
  // assertion below would be checking a DOM nobody touched — and several of
  // them ("focus is not on the opener any more") would pass on that.
  const s = scene()
  assert.notEqual(s.dom.document.activeElement, s.opener,
    'mounting the hook moved no focus at all — it is not running')
  assert.equal(s.dom.listeners.filter(l => l.type === 'keydown').length, 1,
    'the hook installed no keydown listener')
  assert.equal(s.dom.marked, 1, 'the hook did not mark its scroll containers')
})

test('focus lands on the DIALOG, not on its first control', () => {
  // So a screen reader announces the dialog's label before its contents, and
  // the close button is one Tab away rather than already selected.
  const s = scene()
  assert.equal(s.dom.document.activeElement, s.dialog,
    'focus should land on the dialog element itself')
})

test('initialFocus moves the landing point to that one control', () => {
  const s = scene({ initialFocus: '.hue' })
  assert.equal(s.dom.document.activeElement, s.middle,
    'with initialFocus given, focus should land on the matching control')
})

test('the background scroll is locked on open and released on close', () => {
  const s = scene()
  assert.equal(s.dom.document.body.style.overflow, 'hidden', 'the body lock was not applied')
  assert.equal(s.dom.lenis.stopped, 1, 'Lenis was not stopped — the page behind can still scroll')
  assert.equal(s.dom.marked, 1, 'the dialog was not marked scrollable while Lenis is stopped')

  s.close()
  assert.equal(s.dom.document.body.style.overflow, '', 'the body lock was not released')
  assert.equal(s.dom.lenis.started, 1, 'Lenis was never restarted — the page is frozen for good')
  assert.equal(s.dom.unmarked, 1, 'the scroll-container marks were not cleaned up')
})

test('with Lenis absent the body lock still holds, and closing does not throw', () => {
  // Reduced motion never instantiates Lenis, so getLenis() returns null and the
  // browser is doing the scrolling again — the case the body lock does hold.
  const s = scene({ lenis: false })
  assert.equal(s.dom.document.body.style.overflow, 'hidden')
  s.close()
  assert.equal(s.dom.document.body.style.overflow, '')
})

test('Escape closes, and does not collapse the surface that opened it', () => {
  const s = scene()
  const event = s.dom.press('Escape')
  assert.equal(s.closes.length, 1, 'Escape did not call onClose')
  assert.ok(event.propagationStopped,
    'Escape must stopPropagation, or a dialog opened from inside another surface '
    + 'closes the whole stack instead of itself')
})

test('Tab wraps forwards at the last control', () => {
  const s = scene()
  s.last.focus()
  const event = s.dom.press('Tab')
  assert.ok(event.defaultPrevented, 'the trap must preventDefault or the browser moves focus out')
  assert.equal(s.dom.document.activeElement, s.first,
    'Tab from the last control must wrap to the first, not leave the dialog')
})

test('Shift+Tab wraps backwards at the first control, and from the dialog itself', () => {
  const s = scene()
  s.first.focus()
  const back = s.dom.press('Tab', { shiftKey: true })
  assert.ok(back.defaultPrevented)
  assert.equal(s.dom.document.activeElement, s.last,
    'Shift+Tab from the first control must wrap to the last')

  // Focus starts ON the dialog, which is not in the candidate list. Shift+Tab
  // from there must also wrap rather than escaping backwards into the page.
  const fresh = scene()
  fresh.dom.press('Tab', { shiftKey: true })
  assert.equal(fresh.dom.document.activeElement, fresh.last,
    'Shift+Tab from the dialog element must wrap to the last control')
})

test('a key that is neither Escape nor Tab is left alone', () => {
  // The trap must not swallow typing. A dialog with a text field in it would
  // be unusable, and this is the shape of over-broad handlers.
  const s = scene()
  const event = s.dom.press('a')
  assert.equal(s.closes.length, 0)
  assert.ok(!event.defaultPrevented, 'the handler is intercepting ordinary keys')
})

test('the keydown listener is removed on close, so a closed dialog traps nothing', () => {
  const s = scene()
  s.close()
  assert.equal(s.dom.listeners.filter(l => l.type === 'keydown').length, 0,
    'the keydown listener outlived the dialog')
  s.dom.press('Escape')
  assert.equal(s.closes.length, 0, 'a closed dialog still answers Escape')
})

test('closing returns focus to whatever opened the dialog', () => {
  const s = scene()
  assert.equal(s.dom.document.activeElement, s.dialog)
  s.close()
  s.dom.frame()
  assert.equal(s.dom.document.activeElement, s.opener,
    'focus was not returned to the control that opened the dialog')
})

// THE DEFECT THE FLOW AUDIT TRACED (#436): keydown@input → keypress@button →
// click. A synchronous restore puts the opener under the very key that closed
// the dialog, and an opener that clicks on Enter reopens it.
test('the restore waits a frame, so the key that closed the dialog cannot land on the opener', () => {
  const s = scene()
  s.close()
  assert.notEqual(s.dom.document.activeElement, s.opener,
    'focus reached the opener in the same tick as the close. The keypress of the Enter '
    + 'that closed the dialog is still to be dispatched, and it will land on this button.')
  assert.equal(s.dom.frames.length, 1, 'exactly one restore is queued for the next frame')
  s.dom.frame()
  assert.equal(s.dom.document.activeElement, s.opener,
    'after the frame the opener must hold focus — deferring is not the same as forgetting')
})

test('a dialog whose effect re-runs before the frame keeps its original opener', () => {
  // A caller that passes a fresh onClose each render re-runs the effect: old
  // cleanup, then the body again. activeElement at that moment is the dialog
  // itself, so a naive capture would make the dialog its own opener and the
  // queued restore would fire underneath a dialog that is still open.
  const s = scene()
  s.rerun()
  assert.equal(s.dom.frames.length, 0, 'the previous cleanup\'s frame must be cancelled, not left to fire under an open dialog')
  assert.equal(s.dom.document.activeElement, s.dialog, 'the re-run must not move focus')
  s.close()
  s.dom.frame()
  assert.equal(s.dom.document.activeElement, s.opener,
    'the re-run lost the real opener — the dialog recorded itself as the thing to return to')
})

test('the deferred restore yields to focus that moved somewhere live in the meantime', () => {
  // Closing one dialog can open another in the same event. That dialog has
  // taken focus by the time the frame fires; handing it back to the first
  // opener would be the hook fighting itself.
  const s = scene()
  const elsewhere = s.dom.el('button')
  s.dom.document.body.appendChild(elsewhere)
  s.close()
  elsewhere.focus()
  s.dom.frame()
  assert.equal(s.dom.document.activeElement, elsewhere,
    'the restore took focus away from an element that claimed it after the close')
})

// THE DEFECT THE STATIC TRACER COULD NOT SEE.
test('closing restores to a surviving ANCESTOR when the opener has unmounted', () => {
  // The Pro modal's most common opener is a row inside PaletteBuilder's colour
  // system menu, and that whole menu is gone by the time the modal closes.
  // `.focus()` on a detached node does nothing and reports nothing, so the
  // restore silently dropped the user on <body> — the exact failure this hook
  // exists to prevent, hidden behind code that looks correct.
  //
  // No regex can tell the fixed version from the broken one: both capture the
  // opener, both call .focus() in the cleanup. They differ only in what is
  // reachable at run time, which is why this assertion had to become an
  // execution.
  const s = scene()
  s.opener.remove()
  assert.ok(!s.opener.isConnected, 'scene setup: the opener should be detached')

  s.close()
  s.dom.frame()
  assert.notEqual(s.dom.document.activeElement, s.dom.document.body,
    'the opener had unmounted and focus fell to <body>. A keyboard user is now at '
    + 'the top of the document with no idea where they are — restore to the nearest '
    + 'ancestor that is still connected.')
  assert.equal(s.dom.document.activeElement, s.menu,
    'focus should land on the nearest surviving ancestor of the opener')
})

test('a container given tabindex to receive focus KEEPS it', () => {
  // Removing the attribute straight after .focus() blurs the element right back
  // to <body> — the browser drops focus the moment the node stops being
  // focusable — which is a silent no-op that looks like a working restore in
  // code review. tabindex="-1" means "reachable by script, never by Tab", so
  // leaving it costs nothing.
  const s = scene()
  s.opener.remove()
  s.close()
  s.dom.frame()
  assert.equal(s.menu.getAttribute('tabindex'), '-1',
    'the ancestor was made focusable and then had the attribute taken away again, '
    + 'which blurs it straight back to <body>')
})

test('enabled:false does nothing at all, so a closed dialog cannot lock the page', () => {
  // Several modals stay mounted and toggle on an `open` prop. Without this
  // guard the scroll lock applies to a closed dialog and never comes off.
  const s = scene({ enabled: false })
  assert.equal(s.dom.document.body.style.overflow, '',
    'a disabled dialog locked the background scroll')
  assert.equal(s.dom.listeners.length, 0, 'a disabled dialog installed a key handler')
  assert.equal(s.dom.document.activeElement, s.opener, 'a disabled dialog stole focus')
  assert.equal(s.dom.lenis.stopped, 0, 'a disabled dialog stopped Lenis')
})

// ── Invented proof ───────────────────────────────────────────────────────────
// The upgrade dialog carried five filled stars above "Loved by designers who'd
// rather build than tab-hop." There are no reviews, no ratings and nobody
// attributed to that sentence. It sat on the one surface where a user decides
// whether to trust us with money.
test('the upgrade dialog makes no claim we cannot source', () => {
  const body = stripJs(fs.readFileSync(path.join(SRC, 'components/ProUpgradeModal.jsx'), 'utf8'))
  assert.ok(!/Loved by designers/.test(body), 'the invented testimonial is back')
  assert.ok(!/ui-pro-proof-stars/.test(body), 'the unsourced star rating is back')
})

test('the upgrade dialog offers an explicit way to decline', () => {
  // Leaving "no" as the only choice without a button is the shape of a dark
  // pattern even when nothing behind it is coercive.
  //
  // Still a source scan, and it has to be: this is .jsx, which cannot be
  // loaded here at all. It keys on the SHAPE rather than a class name — a real
  // <button> whose click closes the dialog and which carries VISIBLE text. The
  // dialog also has a corner ✕ (`onClick={onClose}` too, but an icon with only
  // an aria-label), so a check for "some button closes this" would stay green
  // with the decline control deleted.
  const src = stripJs(fs.readFileSync(path.join(SRC, 'components/ProUpgradeModal.jsx'), 'utf8'))
  const BUTTON = /<button\b((?:[^>{]|\{(?:[^{}]|\{[^{}]*\})*\})*)>([\s\S]*?)<\/button>/g
  const buttons = [...src.matchAll(BUTTON)]
  assert.ok(buttons.length >= 4,
    `the JSX scan found ${buttons.length} buttons in a dialog that has several — it is not parsing`)

  const declines = buttons.filter(([, attrs, children]) =>
    /onClick=\{onClose\}/.test(attrs)
    && children.replace(/<[^>]*>/g, '').replace(/\{[\s\S]*?\}/g, '').trim().length > 0)
  assert.ok(declines.length,
    'no labelled button closes the upgrade dialog. The corner ✕ is not a way to decline — '
    + 'declining has to be exactly as easy as accepting, which means a real button with a '
    + 'real label sitting next to the one that says yes.')
})
